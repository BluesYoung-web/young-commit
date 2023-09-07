/*
 * @Author: zhangyang
 * @Date: 2023-09-05 08:30:03
 * @LastEditTime: 2023-09-07 10:45:37
 * @Description:
 */
import { readFile } from 'node:fs/promises'
import { defineCommand, runMain, showUsage } from 'citty'
import { $ } from 'execa'
import which from 'which'
import { commit, init, publish, release } from './core'

const main = defineCommand({
  meta: new Promise(async (resolve) => {
    // 编译时，相对路径下的 package.json
    const info = await readFile(new URL('../package.json', import.meta.url), {
      encoding: 'utf-8',
    })
    resolve(JSON.parse(info))
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
    publish: {
      type: 'boolean',
      alias: 'p',
      description: '发布到 npm',
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
      await which('git')
    }
    catch (error) {
      console.error('找不到 git 的安装位置')
      process.exit(1)
    }

    await $`git config --global core.unicode true`

    if (args.version) {
      // @ts-expect-error
      const verison = (await main.meta).version
      console.log(`v${verison}`)
      process.exit(0)
    }

    if (args.help) {
      await showUsage(main)
      process.exit(0)
    }

    if (args.init) {
      await init()
      process.exit(0)
    }

    if (args.release) {
      await release()
      process.exit(0)
    }

    if (args.publish) {
      await publish()
      process.exit(0)
    }

    await commit()
  },

})

runMain(main)
