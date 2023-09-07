/*
 * @Author: zhangyang
 * @Date: 2023-09-05 08:30:03
 * @LastEditTime: 2023-09-07 09:01:02
 * @Description:
 */
import { defineCommand, runMain, showUsage } from 'citty';
import { $, execa } from 'execa';
import prompts from 'prompts';
import { release } from './core';
import { readFile } from 'fs/promises';
import which from 'which';

const main = defineCommand({
  meta: new Promise(async (resolve) => {
    // 编译时，相对路径下的 package.json
    const info = await readFile(new URL('../package.json', import.meta.url), {
      encoding: 'utf-8',
    });
    resolve(JSON.parse(info));
  }),
  args: {
    init: {
      type: 'boolean',
      alias: 'i',
      description: '首次提交',
    },
    release: {
      type: 'boolean',
      alias: 'r',
      description: '版本发布',
    },
    version: {
      type: 'boolean',
      alias: 'v',
      description: '版本信息',
    },
    help: {
      type: 'boolean',
      alias: 'h',
      description: '展示工具使用方法',
    },
  },
  async run({ args }) {
    try {
      await which('git');
    } catch (error) {
      console.error('找不到 git 的安装位置');
      process.exit(1);
    }

    await $`git config --global core.unicode true`;

    if (args.version) {
      // @ts-ignore
      const verison = (await main.meta).version;
      console.log(`v${verison}`);
      process.exit(0);
    }

    if (args.help) {
      await showUsage(main);
      process.exit(0);
    }

    if (args.init) {
      await $`git init`;
      await $`git add .`;
      await execa('git', ['commit', '-m', 'feat: init: :tada: 项目初始化']);
      process.exit(0);
    }

    if (args.release) {
      await release();
      process.exit(0);
    }

    const CommitTypeMap = new Map<string, string>();
    CommitTypeMap.set('feat', '🚀 Enhancements');
    CommitTypeMap.set('pref', '🔥 Performance');
    CommitTypeMap.set('fix', '🩹 Fixes');
    CommitTypeMap.set('refactor', '💅 Refactors');
    CommitTypeMap.set('docs', '📖 Documentation');
    CommitTypeMap.set('build', '📦 Build');
    CommitTypeMap.set('types', '🌊 Types');
    CommitTypeMap.set('chore', '🏡 Chore');
    CommitTypeMap.set('examples', '🏀 Examples');
    CommitTypeMap.set('style', '🎨 Styles');
    CommitTypeMap.set('test', '✅ Tests');
    CommitTypeMap.set('ci', '🤖 CI');

    const answers = (await prompts([
      {
        type: 'autocomplete',
        name: 'type',
        message: '请选择你要提交的类型：',
        initial: 'feat',
        choices: Array.from(CommitTypeMap.entries()).map(([value, title]) => ({
          title: `${value}: ${title}`,
          value,
        })),
      },
      {
        type: 'confirm',
        name: 'breaking',
        initial: false,
        message: '是否为破坏性变更',
      },
      {
        type: 'text',
        name: 'msg',
        message: '请输入此次提交的描述：',
        validate: (val) => {
          if (val.trim() !== '') {
            return true;
          }
          return '请勿输入空字符串！！！';
        },
      },
    ], {
      onCancel: () => {
        console.log('------------------主动终止------------------');
        process.exit(0);
      }
    })) as {
      type: string;
      breaking: boolean;
      msg: string;
    };

    const { type, breaking, msg } = answers;
    const icon = CommitTypeMap.get(type).match(/.+\s/)[0];

    await execa('git', ['commit', '-m', `${type}${breaking ? '!' : ''}: ${icon}${msg}`]);
  },
  
});

runMain(main);
