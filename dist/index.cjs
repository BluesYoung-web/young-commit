'use strict';

const citty = require('citty');
const execa = require('execa');
const prompts = require('prompts');
const changelogen = require('changelogen');
const c = require('picocolors');
const semver = require('semver');
const task = require('tasuku');
const promises = require('fs/promises');
const path = require('path');

function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e.default : e; }

const prompts__default = /*#__PURE__*/_interopDefaultCompat(prompts);
const c__default = /*#__PURE__*/_interopDefaultCompat(c);
const semver__default = /*#__PURE__*/_interopDefaultCompat(semver);
const task__default = /*#__PURE__*/_interopDefaultCompat(task);

function getNextVersions(oldVersion, preid = "alpha") {
  const next = {};
  const parse = semver__default.parse(oldVersion);
  if (typeof parse?.prerelease[0] === "string") {
    preid = parse?.prerelease[0] || "preid";
  }
  for (const type of [
    "premajor",
    "preminor",
    "prepatch",
    "prerelease",
    "major",
    "minor",
    "patch"
  ])
    next[type] = semver__default.inc(oldVersion, type, preid);
  next.next = parse?.prerelease?.length ? semver__default.inc(oldVersion, "prerelease", preid) : semver__default.inc(oldVersion, "patch");
  return next;
}
async function release() {
  const tag = (await changelogen.getLastGitTag()).toLocaleLowerCase() || "v0.0.0";
  if (tag.indexOf("v") !== 0) {
    throw new Error("\u4E0A\u4E00\u4E2A tag \u4E0D\u5408\u6CD5");
  }
  const oldVersion = tag.substring(1);
  const next = getNextVersions(oldVersion);
  const PADDING = 13;
  const answers = await prompts__default([
    {
      type: "autocomplete",
      name: "release",
      message: `\u5F53\u524D\u7248\u672C ${c__default.green(oldVersion)}`,
      initial: "next",
      choices: [
        { value: "major", title: `${"major".padStart(PADDING, " ")} ${c__default.bold(next.major)}` },
        { value: "minor", title: `${"minor".padStart(PADDING, " ")} ${c__default.bold(next.minor)}` },
        { value: "patch", title: `${"patch".padStart(PADDING, " ")} ${c__default.bold(next.patch)}` },
        { value: "next", title: `${"next".padStart(PADDING, " ")} ${c__default.bold(next.next)}` },
        {
          value: "prepatch",
          title: `${"pre-patch".padStart(PADDING, " ")} ${c__default.bold(next.prepatch)}`
        },
        {
          value: "preminor",
          title: `${"pre-minor".padStart(PADDING, " ")} ${c__default.bold(next.preminor)}`
        },
        {
          value: "premajor",
          title: `${"pre-major".padStart(PADDING, " ")} ${c__default.bold(next.premajor)}`
        },
        { value: "none", title: `${"as-is".padStart(PADDING, " ")} ${c__default.bold(oldVersion)}` },
        { value: "custom", title: "custom ...".padStart(PADDING + 4, " ") }
      ]
    },
    {
      type: (prev) => prev === "custom" ? "text" : null,
      name: "custom",
      message: "\u8BF7\u8F93\u5165\u7248\u672C\u53F7\uFF0C\u4F8B\u5982: a.b.c",
      initial: oldVersion,
      validate: (custom) => {
        return semver.valid(custom) ? true : "That's not a valid version number";
      }
    },
    {
      type: "confirm",
      name: "changePackageVersion",
      message: "\u662F\u5426\u4FEE\u6539 package.json",
      initial: false
    }
  ]);
  const newVersion = answers.release === "none" ? oldVersion : answers.release === "custom" ? semver.clean(answers.custom) : next[answers.release];
  if (!newVersion) {
    process.exit(1);
  }
  await task__default.group((task2) => [
    task2("\u751F\u6210 CHANGELOG.md", async () => {
      await execa.$`changelogen -r ${newVersion} --output`;
    }),
    task2("git commit & git tag", async () => {
      if (answers.changePackageVersion) {
        const pkgPath = path.resolve(process.cwd(), "./package.json");
        const file = await promises.readFile(pkgPath, { encoding: "utf-8" });
        const json = JSON.parse(file);
        json.version = newVersion;
        await promises.writeFile(pkgPath, JSON.stringify(json, null, 2), { encoding: "utf-8" });
      }
      await execa.$`git add .`;
      await execa.execa("git", ["commit", "-m", `chore(release): v${newVersion}`]);
      await execa.execa("git", ["tag", "-am", `chore: \u{1F3E1} release v${newVersion}`, `v${newVersion}`]);
    })
  ]);
}

const main = citty.defineCommand({
  meta: new Promise(async (resolve) => {
    const info = await promises.readFile(new URL("../package.json", (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (document.currentScript && document.currentScript.src || new URL('index.cjs', document.baseURI).href))), {
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
    }
  },
  async run({ args }) {
    await execa.$`git config --global core.unicode true`;
    if (args.init) {
      await execa.$`git init`;
      await execa.$`git add .`;
      await execa.$`git commit -m "init: :tada: 项目初始化"`;
      process.exit(0);
    }
    if (args.release) {
      await release();
      process.exit(0);
    }
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
    const answers = await prompts__default([
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
          if (val.trim() !== "") {
            return true;
          }
          return "\u8BF7\u52FF\u8F93\u5165\u7A7A\u5B57\u7B26\u4E32\uFF01\uFF01\uFF01";
        }
      }
    ]);
    const { type, breaking, msg } = answers;
    const icon = CommitTypeMap.get(type).match(/.+\s/)[0];
    await execa.execa("git", ["commit", "-m", `${type}${breaking ? "!" : ""}: ${icon}${msg}`]);
  }
});
citty.runMain(main);
