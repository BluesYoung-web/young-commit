/*
 * @Author: zhangyang
 * @Date: 2023-09-07 10:32:28
 * @LastEditTime: 2023-09-07 10:51:33
 * @Description:
 */
import { execa } from 'execa'
import task from 'tasuku'

export async function publish() {
  await task.group(task => [
    task('切换官方源', async () => {
      await execa('npm', ['config', 'set', 'registry', 'https://registry.npmjs.org'])
    }),
    task('发布到 npm', async () => {
      await execa('npm', ['publish', '--access', 'public'])
    }),
    task('切换淘宝源', async () => {
      await execa('npm', ['config', 'set', 'registry', 'https://registry.npmmirror.com'])
    }),
  ])
}
