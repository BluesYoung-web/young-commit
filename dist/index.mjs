import { defineCommand, runMain } from 'citty';
import { $, execa } from 'execa';
import prompts from 'prompts';

const name = "young-commit";
const version = "1.0.2";
const description = "一个用于规范化 git 提交的命令行工具，可以根据 git 提交记录自动生成 changelog";

const main = defineCommand({
  meta: {
    name,
    version,
    description
  },
  args: {
    init: {
      type: "boolean",
      alias: "i",
      description: "\u9996\u6B21\u63D0\u4EA4"
    }
  },
  async run({ args }) {
    await $`git config --global core.unicode true`;
    if (args.init) {
      await $`git commit -m"init: :tada: 项目初始化"`;
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
          if (val.trim() !== "") {
            return true;
          }
          return "\u8BF7\u52FF\u8F93\u5165\u7A7A\u5B57\u7B26\u4E32\uFF01\uFF01\uFF01";
        }
      }
    ]);
    const { type, breaking, msg } = answers;
    const icon = CommitTypeMap.get(type).match(/.+\s/)[0];
    await execa("git", ["commit", "-m", `${type}${breaking ? "!" : ""}: ${icon}${msg}`]);
  }
});
runMain(main);
