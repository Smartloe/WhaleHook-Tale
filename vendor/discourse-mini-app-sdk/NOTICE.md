# 来源说明：@discourse-mini-app/sdk

本目录内容来自 linux.do 官方微应用开发指南仓库，未做任何修改：

- 仓库：https://github.com/linux-do/mapp-developer-guide
- 路径：`sdk/`
- 分支 / 提交：`master` @ `ae0b523297a8c25314304f2cd92270badc0ac629`（2026-11-11）
- 版本：`@discourse-mini-app/sdk` 0.3.0

vendoring 目的：该 SDK 未发布到 npm，而微应用运行包必须通过
`@discourse-mini-app/sdk/pack` 生成，因此随项目保留一份原始副本，
保证 `npm run build:mini` 可复现。请勿在此目录内修改代码；升级时整体替换。
