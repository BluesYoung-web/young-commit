import { readFile, writeFile } from 'node:fs/promises';
import { defineCommand, showUsage, runMain } from 'citty';
import { execa, $ } from 'execa';
import which from 'which';
import task from 'tasuku';
import { resolve } from 'node:path';
import { getLastGitTag } from 'changelogen';
import c from 'picocolors';
import prompts from 'prompts';
import semver, { valid, clean } from 'semver';

async function init() {
  await task.group((task2) => [
    task2("git init", async () => {
      await execa("git", ["init"]);
    }),
    task2("git add .", async () => {
      await execa("git", ["add", "."]);
    }),
    task2("git commit", async () => {
      await execa("git", ["commit", "-m", "feat: init: :tada: \u9879\u76EE\u521D\u59CB\u5316"]);
    })
  ]);
}

function getNextVersions(oldVersion, preid = "alpha") {
  const next = {};
  const IsPointPreid = /\.([^0-9\.]+)/gim.test(oldVersion);
  if (IsPointPreid)
    oldVersion = oldVersion.replace(/\.([^0-9\.]+)/gim, "-$1");
  const parse = semver.parse(oldVersion);
  if (typeof parse?.prerelease[0] === "string")
    preid = parse?.prerelease[0] || "preid";
  for (const type of [
    "premajor",
    "preminor",
    "prepatch",
    "prerelease",
    "major",
    "minor",
    "patch"
  ])
    next[type] = semver.inc(oldVersion, type, preid);
  next.next = parse?.prerelease?.length ? semver.inc(oldVersion, "prerelease", preid) : semver.inc(oldVersion, "patch");
  if (IsPointPreid) {
    for (const key in next)
      next[key] = next[key].replace(/-([^0-9\.]+)/gim, ".$1");
  }
  return next;
}
async function release() {
  const tag = (await getLastGitTag() || "v0.0.0").toLocaleLowerCase();
  if (tag.indexOf("v") !== 0)
    throw new Error("\u4E0A\u4E00\u4E2A tag \u4E0D\u5408\u6CD5");
  const oldVersion = tag.substring(1);
  const next = getNextVersions(oldVersion);
  const PADDING = 13;
  const answers = await prompts([
    {
      type: "autocomplete",
      name: "release",
      message: `\u5F53\u524D\u7248\u672C ${c.green(oldVersion)}`,
      initial: "next",
      choices: [
        { value: "major", title: `${"major".padStart(PADDING, " ")} ${c.bold(next.major)}` },
        { value: "minor", title: `${"minor".padStart(PADDING, " ")} ${c.bold(next.minor)}` },
        { value: "patch", title: `${"patch".padStart(PADDING, " ")} ${c.bold(next.patch)}` },
        { value: "next", title: `${"next".padStart(PADDING, " ")} ${c.bold(next.next)}` },
        {
          value: "prepatch",
          title: `${"pre-patch".padStart(PADDING, " ")} ${c.bold(next.prepatch)}`
        },
        {
          value: "preminor",
          title: `${"pre-minor".padStart(PADDING, " ")} ${c.bold(next.preminor)}`
        },
        {
          value: "premajor",
          title: `${"pre-major".padStart(PADDING, " ")} ${c.bold(next.premajor)}`
        },
        { value: "none", title: `${"as-is".padStart(PADDING, " ")} ${c.bold(oldVersion)}` },
        { value: "custom", title: "custom ...".padStart(PADDING + 4, " ") }
      ]
    },
    {
      type: (prev) => prev === "custom" ? "text" : null,
      name: "custom",
      message: "\u8BF7\u8F93\u5165\u7248\u672C\u53F7\uFF0C\u4F8B\u5982: a.b.c",
      initial: oldVersion,
      validate: (custom) => {
        return valid(custom) ? true : "That's not a valid version number";
      }
    },
    {
      type: "confirm",
      name: "changePackageVersion",
      message: "\u662F\u5426\u4FEE\u6539 package.json",
      initial: false
    }
  ]);
  const newVersion = answers.release === "none" ? oldVersion : answers.release === "custom" ? clean(answers.custom) : next[answers.release];
  if (!newVersion)
    process.exit(1);
  await task.group((task2) => [
    task2("\u51C6\u5907 changelogen \u7684\u73AF\u5883", async () => {
      try {
        await which("changelogen");
      } catch (error) {
        await $`npm i -g changelogen`;
      }
    }),
    task2("\u751F\u6210 CHANGELOG.md", async () => {
      await $`changelogen -r ${newVersion} --output`;
    }),
    task2("git commit & git tag", async ({ task: task3 }) => {
      if (answers.changePackageVersion) {
        const pkgPath = resolve(process.cwd(), "./package.json");
        const file = await readFile(pkgPath, { encoding: "utf-8" });
        const json = JSON.parse(file);
        json.version = newVersion;
        await writeFile(pkgPath, JSON.stringify(json, null, 2), { encoding: "utf-8" });
      }
      await task3.group((t) => [
        t("git add .", async () => {
          await $`git add .`;
        }),
        t("git commit", async () => {
          await execa("git", ["commit", "-m", `chore(release): v${newVersion}`]);
        }),
        t("git tag", async () => {
          await execa("git", ["tag", "-am", `chore: \u{1F3E1} release v${newVersion}`, `v${newVersion}`]);
        })
      ]);
    })
  ]);
}

async function publish() {
  await task.group((task2) => [
    task2("\u5207\u6362\u5B98\u65B9\u6E90", async () => {
      await execa("npm", ["config", "set", "registry", "https://registry.npmjs.org"]);
    }),
    task2("\u53D1\u5E03\u5230 npm", async () => {
      await execa("npm", ["publish", "--access", "public"]);
    }),
    task2("\u5207\u6362\u6DD8\u5B9D\u6E90", async () => {
      await execa("npm", ["config", "set", "registry", "https://registry.npmmirror.com"]);
    })
  ]);
}

async function commit() {
  const CommitTypeMap = /* @__PURE__ */ new Map();
  CommitTypeMap.set("feat", "\u{1F680} Enhancements");
  CommitTypeMap.set("pref", "\u{1F525} Performance");
  CommitTypeMap.set("fix", "\u{1FA79} Fixes");
  CommitTypeMap.set("refactor", "\u{1F485} Refactors");
  CommitTypeMap.set("docs", "\u{1F4D6} Documentation");
  CommitTypeMap.set("build", "\u{1F4E6} Build");
  CommitTypeMap.set("types", "\u{1F30A} Types");
  CommitTypeMap.set("chore", "\u{1F3E1} Chore");
  CommitTypeMap.set("examples", "\u{1F3C0} Examples");
  CommitTypeMap.set("style", "\u{1F3A8} Styles");
  CommitTypeMap.set("test", "\u2705 Tests");
  CommitTypeMap.set("ci", "\u{1F916} CI");
  const answers = await prompts([
    {
      type: "autocomplete",
      name: "type",
      message: "\u8BF7\u9009\u62E9\u4F60\u8981\u63D0\u4EA4\u7684\u7C7B\u578B\uFF1A",
      initial: "feat",
      choices: Array.from(CommitTypeMap.entries()).map(([value, title]) => ({
        title: `${value}: ${title}`,
        value
      }))
    },
    {
      type: "confirm",
      name: "breaking",
      initial: false,
      message: "\u662F\u5426\u4E3A\u7834\u574F\u6027\u53D8\u66F4"
    },
    {
      type: "text",
      name: "msg",
      message: "\u8BF7\u8F93\u5165\u6B64\u6B21\u63D0\u4EA4\u7684\u63CF\u8FF0\uFF1A",
      validate: (val) => {
        if (val.trim() !== "")
          return true;
        return "\u8BF7\u52FF\u8F93\u5165\u7A7A\u5B57\u7B26\u4E32\uFF01\uFF01\uFF01";
      }
    }
  ], {
    onCancel: () => {
      console.log("------------------\u4E3B\u52A8\u7EC8\u6B62------------------");
      process.exit(0);
    }
  });
  const { type, breaking, msg } = answers;
  const icon = CommitTypeMap.get(type).match(/.+\s/)[0];
  await execa("git", ["commit", "-m", `${type}${breaking ? "!" : ""}: ${icon}${msg}`]);
}

const main = defineCommand({
  meta: new Promise(async (resolve) => {
    const info = await readFile(new URL("../package.json", import.meta.url), {
      encoding: "utf-8"
    });
    resolve(JSON.parse(info));
  }),
  args: {
    init: {
      type: "boolean",
      alias: "i",
      description: "\u9996\u6B21\u63D0\u4EA4"
    },
    release: {
      type: "boolean",
      alias: "r",
      description: "\u7248\u672C\u53D1\u5E03"
    },
    publish: {
      type: "boolean",
      alias: "p",
      description: "\u53D1\u5E03\u5230 npm"
    },
    version: {
      type: "boolean",
      alias: "v",
      description: "\u7248\u672C\u4FE1\u606F"
    },
    help: {
      type: "boolean",
      alias: "h",
      description: "\u5C55\u793A\u5DE5\u5177\u4F7F\u7528\u65B9\u6CD5"
    }
  },
  async run({ args }) {
    try {
      await which("git");
    } catch (error) {
      console.error("\u627E\u4E0D\u5230 git \u7684\u5B89\u88C5\u4F4D\u7F6E");
      process.exit(1);
    }
    await $`git config --global core.unicode true`;
    if (args.version) {
      const verison = (await main.meta).version;
      console.log(`v${verison}`);
      process.exit(0);
    }
    if (args.help) {
      await showUsage(main);
      process.exit(0);
    }
    if (args.init) {
      await init();
      process.exit(0);
    }
    if (args.release) {
      await release();
      process.exit(0);
    }
    if (args.publish) {
      await publish();
      process.exit(0);
    }
    await commit();
  }
});
runMain(main);
