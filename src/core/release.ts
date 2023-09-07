/*
 * @Author: zhangyang
 * @Date: 2023-09-05 10:48:22
 * @LastEditTime: 2023-09-07 13:18:55
 * @Description:
 */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getLastGitTag } from 'changelogen'
import c from 'picocolors'
import prompts from 'prompts'
import semver, { clean as cleanVersion, valid as isValidVersion } from 'semver'
import type { ReleaseType } from 'semver'
import { $, execa } from 'execa'
import task from 'tasuku'
import which from 'which'

/**
 * Returns the next version number for all release types.
 */
function getNextVersions(
  oldVersion: string,
  preid = 'alpha',
): Record<ReleaseType | 'next', string> {
  const next: Record<string, string> = {}

  // 兼容 a.b.c.alpha.n 的情况，标准版本为 a.b.c-alpha.n
  const IsPointPreid = /\.([^0-9\.]+)/gim.test(oldVersion)

  if (IsPointPreid)
    oldVersion = oldVersion.replace(/\.([^0-9\.]+)/gim, '-$1')

  const parse = semver.parse(oldVersion)
  if (typeof parse?.prerelease[0] === 'string')
    preid = parse?.prerelease[0] || 'preid'

  for (const type of [
    'premajor',
    'preminor',
    'prepatch',
    'prerelease',
    'major',
    'minor',
    'patch',
  ] as ReleaseType[])
    next[type] = semver.inc(oldVersion, type, preid)!

  next.next = parse?.prerelease?.length
    ? semver.inc(oldVersion, 'prerelease', preid)!
    : semver.inc(oldVersion, 'patch')!

  if (IsPointPreid) {
    for (const key in next)
      next[key] = next[key].replace(/-([^0-9\.]+)/gim, '.$1')
  }

  return next
}

export async function release() {
  const tag = ((await getLastGitTag()) || 'v0.0.0').toLocaleLowerCase()
  if (tag.indexOf('v') !== 0)
    throw new Error('上一个 tag 不合法')

  const oldVersion = tag.substring(1)

  const next = getNextVersions(oldVersion)
  const PADDING = 13
  const answers = (await prompts([
    {
      type: 'autocomplete',
      name: 'release',
      message: `当前版本 ${c.green(oldVersion)}`,
      initial: 'next',
      choices: [
        { value: 'major', title: `${'major'.padStart(PADDING, ' ')} ${c.bold(next.major)}` },
        { value: 'minor', title: `${'minor'.padStart(PADDING, ' ')} ${c.bold(next.minor)}` },
        { value: 'patch', title: `${'patch'.padStart(PADDING, ' ')} ${c.bold(next.patch)}` },
        { value: 'next', title: `${'next'.padStart(PADDING, ' ')} ${c.bold(next.next)}` },
        {
          value: 'prepatch',
          title: `${'pre-patch'.padStart(PADDING, ' ')} ${c.bold(next.prepatch)}`,
        },
        {
          value: 'preminor',
          title: `${'pre-minor'.padStart(PADDING, ' ')} ${c.bold(next.preminor)}`,
        },
        {
          value: 'premajor',
          title: `${'pre-major'.padStart(PADDING, ' ')} ${c.bold(next.premajor)}`,
        },
        { value: 'none', title: `${'as-is'.padStart(PADDING, ' ')} ${c.bold(oldVersion)}` },
        { value: 'custom', title: 'custom ...'.padStart(PADDING + 4, ' ') },
      ],
    },
    {
      type: prev => (prev === 'custom' ? 'text' : null),
      name: 'custom',
      message: '请输入版本号，例如: a.b.c',
      initial: oldVersion,
      validate: (custom: string) => {
        return isValidVersion(custom) ? true : 'That\'s not a valid version number'
      },
    },
    {
      type: 'confirm',
      name: 'changePackageVersion',
      message: '是否修改 package.json',
      initial: false,
    },
  ], {
    onCancel: () => {
      console.log('------------------主动终止------------------')
      process.exit(0)
    },
  })) as {
    release: ReleaseType | 'next' | 'none' | 'custom'
    custom?: string
    changePackageVersion?: boolean
  }

  const newVersion
    = answers.release === 'none'
      ? oldVersion
      : answers.release === 'custom'
        ? cleanVersion(answers.custom!)!
        : next[answers.release]

  if (!newVersion)
    process.exit(1)

  await task.group(task => [
    task('准备 changelogen 的环境', async () => {
      try {
        await which('changelogen')
      }
      catch (error) {
        await $`npm i -g changelogen`
      }
    }),

    task('生成 CHANGELOG.md', async () => {
      await $`changelogen -r ${newVersion} --output`
    }),
    task('git commit & git tag', async ({ task }) => {
      if (answers.changePackageVersion) {
        // 运行时，当前运行目录下的 package.json
        const pkgPath = resolve(process.cwd(), './package.json')

        const file = await readFile(pkgPath, { encoding: 'utf-8' })
        const json = JSON.parse(file)
        json.version = newVersion
        await writeFile(pkgPath, JSON.stringify(json, null, 2), { encoding: 'utf-8' })
      }

      await task.group(t => [
        t('git add .', async () => {
          await $`git add .`
        }),
        t('git commit', async () => {
          await execa('git', ['commit', '-m', `chore(release): v${newVersion}`])
        }),
        t('git tag', async () => {
          await execa('git', ['tag', '-am', `chore: 🏡 release v${newVersion}`, `v${newVersion}`])
        }),
      ])
    }),
  ])
}
