/*
 * @Author: zhangyang
 * @Date: 2023-09-07 10:37:09
 * @LastEditTime: 2023-09-07 10:39:55
 * @Description:
 */
import { execa } from 'execa'
import task from 'tasuku'

export async function init() {
  await task.group(task => [
    task('git init', async () => {
      await execa('git', ['init'])
    }),
    task('git add .', async () => {
      await execa('git', ['add', '.'])
    }),
    task('git commit', async () => {
      await execa('git', ['commit', '-m', 'feat: init: :tada: 项目初始化'])
    }),
  ])
}
