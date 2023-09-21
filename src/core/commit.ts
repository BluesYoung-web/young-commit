/*
 * @Author: zhangyang
 * @Date: 2023-09-07 10:42:42
 * @LastEditTime: 2023-09-21 11:25:16
 * @Description:
 */
import { execa } from 'execa'
import prompts from 'prompts'

export async function commit() {
  const CommitTypeMap = new Map<string, string>()
  CommitTypeMap.set('feat', '🚀 Enhancements')
  CommitTypeMap.set('perf', '🔥 Performance')
  CommitTypeMap.set('fix', '🩹 Fixes')
  CommitTypeMap.set('refactor', '💅 Refactors')
  CommitTypeMap.set('docs', '📖 Documentation')
  CommitTypeMap.set('build', '📦 Build')
  CommitTypeMap.set('types', '🌊 Types')
  CommitTypeMap.set('chore', '🏡 Chore')
  CommitTypeMap.set('examples', '🏀 Examples')
  CommitTypeMap.set('style', '🎨 Styles')
  CommitTypeMap.set('test', '✅ Tests')
  CommitTypeMap.set('ci', '🤖 CI')

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
        if (val.trim() !== '')
          return true

        return '请勿输入空字符串！！！'
      },
    },
  ], {
    onCancel: () => {
      console.log('------------------主动终止------------------')
      process.exit(0)
    },
  })) as {
    type: string
    breaking: boolean
    msg: string
  }

  const { type, breaking, msg } = answers
  const icon = CommitTypeMap.get(type).match(/.+\s/)[0]

  await execa('git', ['commit', '-m', `${type}${breaking ? '!' : ''}: ${icon}${msg}`])
}
