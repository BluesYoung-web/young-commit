# 说明

## 注意

> 工具依赖 `changelogen` 的命令行，如果使用发版功能之前未安装，则会自动全局安装最新版本。如有意外情况，请手动安装，**changelogen 当前为 0.5.5**

## 安装

```bash
npm i young-commit -g
```

## 基础使用

- 将修改添加到暂存区之后
- 命令行输入 `young-commit` 或者别名 `yc`

## 带参的快捷操作

```bash
USAGE young-commit [OPTIONS] 
# USAGE yc [OPTIONS] 

OPTIONS

     -i, --init    首次提交
  -r, --release    版本发布
```

## 灵感来源

[bumpp](https://github.com/antfu/bumpp)

[changelogen](https://github.com/unjs/changelogen)