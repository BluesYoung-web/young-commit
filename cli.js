#! /usr/bin/env node
const program = require('commander');

const inquirer = require('inquirer');

const shell = require('shelljs');
 
if (!shell.which('git')) {
  shell.echo('Sorry, this script requires git');
  shell.exit(1);
}
 
program.version('1.0.0').parse(process.argv);


const optionList = [
  {
    name: 'type',
    type: 'list',
    message: '请选择你要提交的类型：',
    choices: [
      'feat     -> 新特性/功能',
      'fix      -> Bug 修复',
      'refactor -> 代码重构',
      'docs     -> 文档修改',
      'style    -> 代码格式修改，非 css',
      'test     -> 测试用例修改',
      'chore    -> 构建或者依赖的修改'
    ],
    filter: (val) => {
      return val.match(/\w+/)[0];
    }
  },
  {
    name: 'use_default_icon',
    type: 'confirm',
    message: '是否使用默认的 gitmoji ?'
  },
  {
    name: 'icon',
    type: 'input',
    message: '请输入你想使用的 gitmoji（只需名称，无需引号）：',
    when: ({ use_default_icon }) => {
      return !use_default_icon;
    },
    validate: (val) => {
      if (!val.indexOf(':') > -1) {
        return true;
      }
      return '只需名称，无需引号';
    }
  },
  {
    name: 'msg',
    type: 'input',
    message: '请输入此次提交的描述：',
    validate: (val) => {
      if (val.trim() !== '') {
        return true;
      }
      return '请勿输入空字符串！！！';
    }
  }
];

inquirer.prompt(optionList).then((answer) => {
  const { type = 'feat', icon, msg } = answer;
  const defaultIcons = {
    feat: 'sparkles',
    fix: 'bug',
    refactor: 'recycle',
    docs: 'memo',
    style: 'lipstick',
    test: 'white_check_mark',
    chore: 'hammer'
  }
  let gitmoji = '';
  if (icon) {
    gitmoji = icon;
  } else {
    gitmoji = defaultIcons[type];
  }
  const str = `${type}: :${gitmoji}: ${msg}`;
  shell.exec('git status');
}).catch(console.error);
