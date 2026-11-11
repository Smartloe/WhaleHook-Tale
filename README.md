# 鲸钩物语 · WhaleHook Tale

> **非官方同人作品。** 本项目是 DeepSeek 二次元形象「鲸鱼娘」的粉丝同人小游戏，
> 与 DeepSeek 官方无任何关联，未获官方授权或背书。
>
> **完全免费、非商业、无广告、无内购、无捐赠解锁，禁止任何形式的商业用途。**
> 项目不使用官方 Logo、不包含官方素材；当前全部画面均为代码绘制的占位图形。

一个把经典《黄金矿工》的「抓金块」换成「钓鱼/钩取海中物件」的 2D 网页小游戏：
鲸鱼娘站在小船上，鱼钩在空中摆荡，按下空格或点击画面发射，钩中东西后按重量决定回收速度，
在 60 秒内凑够目标金币。

项目同时产出两种形态：

- **普通网页**：GitHub Pages / 任意静态托管
- **linux.do 微应用**：按平台规范打包成 `app.zip`，可上传到 https://linux.do/apps

## 当前状态（MVP）

- [x] 开始界面：标题、开始按钮、非官方同人声明
- [x] 一个关卡（浅湾）：60 秒 / 目标 300 金币
- [x] 鲸鱼娘、鱼钩、鱼线、水面/海底背景——全部用 Phaser Graphics 绘制，无图片依赖
- [x] 4 种可钩取物：小鱼（20 / 轻）、大鱼（60 / 中）、珍珠宝箱（150 / 重）、旧靴子（-15 / 轻）
- [x] 鱼钩状态机：`IDLE_SWING → SHOOTING → RETRACTING → SETTLE → IDLE_SWING`
- [x] 圆形碰撞、重量影响回收速度、金币结算与飘字
- [x] HUD：金币/目标、倒计时（≤10 秒变红）、关卡名
- [x] 结算界面：成功/失败、得分、再来一次、返回标题
- [x] 横屏（960×640）与竖屏（640×960）两套布局，按窗口比例自动选择
- [x] 微应用运行包：单个 IIFE `app.js` + `app.css` + 片段式 `index.html` + `strings.json` + `manifest.json`
- [x] 微应用首帧后调用 `lifecycle.ready()`，不申请任何权限

## 技术栈

- [Vite](https://vite.dev/) + TypeScript（`strict`）+ [Phaser 3](https://phaser.io/)
- 微应用打包使用 linux.do 官方 `@discourse-mini-app/sdk`（vendored，见 `vendor/`）
- 纯前端，无后端、无数据库、无外部请求

## 本地运行

```bash
npm install
npm run dev          # 开发服务器，浏览器打开提示的地址
npm run build        # 网页版：类型检查 + 构建，产物在 dist/
npm run preview      # 本地预览网页版构建产物
```

操作：**空格** 或 **点击画面** 发射鱼钩；鱼钩会自动摆荡，无需按住。

## 构建微应用运行包

```bash
# 先在社区应用页创建应用，拿到应用 ID（UUIDv7），再打包
MINI_APP_ID=<应用ID> MINI_APP_VERSION=0.1.0 npm run build:mini
```

产物：

- `dist-mini/web/app.js`：单个 IIFE，内含 Phaser 与全部游戏代码
- `dist-mini/web/app.css`：单个样式文件
- `dist-mini/package/app.zip`：上传到社区的应用运行包

打包脚本 `scripts/package.mjs` 会先做平台格式自检，任一项不通过直接报错：

- `index.html` 片段不得含 `<script>`、内联事件、内联 `style`、资源预连接、嵌套 iframe/object
- 五个基础文件必须齐全：`manifest.json` / `index.html` / `app.js` / `app.css` / `strings.json`
- `app.js` 内不得出现 `eval` / `new Function`（否则需要申报 `code.eval`）。Phaser 自带的
  webpack 全局探测已被 `vite.config.ts` 中的 `stripPhaserEvalShim` 替换掉，因此无需申请该权限
- `manifest.assets` 中的路径必须合法且真实存在

`MINI_APP_VERSION` 必须高于该应用已发布的最高正式版本；同一个 ZIP 的 SHA-256 重复上传会被平台拒绝（`BUILD_EXISTS`）。

## 上架 linux.do 微应用（流程）

1. **准备资格**：开发者资格由社区配置。入口在社区左侧「应用广场」https://linux.do/apps ，
   个人资料里的「应用」页面可创建应用。
   若该页面显示 **「尚无开发资格，请联系管理员」**，需要先联系管理员开通；也可以在
   微应用平台公告帖（https://linux.do/t/topic/3153778）下回帖讲创意申请 Beta 邀请。
   未获得资格前无法创建应用、上传 ZIP 或提审。
2. **创建应用**：填写名称、用途、说明、图标（平台按圆形裁切，请用方形居中图），
   复制分配到的**应用 ID**。仓库内 `branding/app-icon.png` 是 512×512 的占位图标，
   可直接上传替换；它不是官方 Logo。
3. **打包**：`MINI_APP_ID=<应用ID> MINI_APP_VERSION=0.1.0 npm run build:mini`。
4. **上传沙箱**：在应用管理页上传 `dist-mini/package/app.zip`，等待系统私信通知 sandbox 就绪。
   沙箱构建固定保留 **7 天**（可手动过期，不可恢复）。
5. **沙箱验证**：作者与管理员访问 `/apps-sandbox/<app-id>/<version>-<8位sha>` 检查本次版本；
   sandbox 不是公开分享链接。手机与桌面都建议各看一次。
6. **正式提审**：正式页「新建发布」，选择版本与构建，填写更新说明与审核备注；审核期间可撤回。
7. **上线**：审核通过后系统私信通知，作者手动选择生效版本（最多一个，也可全部取消下架）。

提交前自查（对应平台清单）：

| 平台要求 | 本项目状态 |
| --- | --- |
| ZIP 由 SDK `pack` 生成，ID/版本/权限/资源一致，无多余文件或秘密 | ✅ `scripts/package.mjs` |
| 首屏调用 `lifecycle.ready()` | ✅ `MenuScene` 首帧后调用（`src/platform/shell.ts`） |
| 手机、键盘、深浅主题、存储恢复、离开再打开可用 | ✅ 竖屏布局 / 空格键 / 固定深色画面 / 无进度需恢复 / `pagehide` 销毁 |
| 只使用公开 SDK，不访问父 DOM、论坛 Cookie、不绕过网络限制 | ✅ 仅 `getSDK()` + `lifecycle.ready()` |
| 剪贴板、全屏、媒体由明确操作触发；不伪装登录 | ✅ 未使用这些能力 |
| HTTP 服务 CORS、JWT 校验 | ✅ 无网络请求 |
| CDN 素材清单与 SHA-256 | ✅ 无远程素材 |
| sandbox 中检查本次版本与同一份 ZIP | 见流程第 5 步 |

权限：`manifest.json` 中 `permissions: []`。游戏不需要用户资料、存储或网络；如果后续加入
最高分存档，再申请 `storage.read` / `storage.write`。

已知限制：舞台尺寸在启动时按窗口比例选定，**旋转屏幕后需要重新进入应用**才能切换横竖屏布局。

## 目录结构

```
src/
  main.ts                 # 启动：选横/竖屏舞台、创建 Phaser、错误兜底
  types/game.ts           # CatchableData / HookState / HookTuning / 关卡与结算类型
  systems/
    StageLayout.ts        # 横屏 / 竖屏两套舞台坐标（船、竿尖、水域、边界、线长）
    LevelConfig.ts        # 关卡数据 + HOOK_MOTION（手感参数）
    Spawner.ts            # 水域内随机布点：在摆动扇区内、可触及、互不重叠
  objects/
    Hook.ts               # 鱼钩状态机、鱼线绘制、重量影响回收速度
    Catchable.ts          # 可钩取物（占位色块 + emoji，数据在 info 里）
    WhaleGirl.ts          # 鲸鱼娘占位角色 + 鱼竿 + 待机浮动
  ui/
    Hud.ts                # 金币/目标/倒计时/关卡 + 操作提示
    Button.ts             # 菜单与结算共用按钮
  platform/
    shell.ts              # 微应用外壳适配：SDK 连接、首帧 ready、错误展示、降级为普通网页
  scenes/
    BootScene.ts          # 预留资源加载入口，目前直接进菜单
    MenuScene.ts          # 标题、开始、同人声明
    GameScene.ts          # 主玩法循环
    ResultScene.ts        # 结算与重开
  strings.json            # 外壳文案（zh_CN / zh_TW / en）
  template.html           # 微应用片段式 index.html（无脚本、无内联样式）
  style.css               # 页面外壳样式
manifest.json             # 微应用清单（id 用应用页分配值，打包时可被环境变量覆盖）
scripts/package.mjs       # 打包 + 平台格式自检
vendor/                   # linux.do 官方 SDK 原始副本（未修改，见目录内 NOTICE）
```

## 手感参数（`src/systems/LevelConfig.ts`）

| 参数 | 当前值 | 说明 |
| --- | --- | --- |
| `swingAmplitudeDeg` | 70 | 从正下方算起的最大摆角 |
| `swingPeriodMs` | 2400 | 一次完整左右往复的时长 |
| `shootSpeed` | 900 px/s | 发射速度 |
| `baseRetractSpeed` | 520 px/s | 空钩回收速度 |
| `weightRetractFactor` | 0.55 | `速度 = base / (1 + weight × factor)` |
| `minRetractSpeed` | 110 px/s | 回收速度下限 |
| `settleMs` | 420 | 回收完成后的停顿 |
| `timeLimitMs` | 60000 | 关卡时长 |
| `targetScore` | 300 | 目标金币 |

舞台尺寸、竿尖位置、水域边界在 `src/systems/StageLayout.ts`：
横屏 960×640，竖屏 640×960；布局选择规则是窗口宽高比 < 0.95 用竖屏。

## 素材来源与许可（尚未接入）

MVP 阶段全部使用代码占位图形。要接入正式美术时，社区整理的候选来源如下（**接入前逐个核对作品页标注的许可**，以下仅为线索，不代表已获授权）：

- `TreapGoGo/deepseek-whale-girl`：角色参考图、生成提示词、社区二创与 ComfyUI 工作流（`treapgogo.github.io/deepseek-whale-girl`）。
- `phoiex/AAAAGENT`：鲸鱼娘设计稿、透明 PNG、512×512 头像与分层 PSD，适合做动画拆分或界面头像。
- `xxnb0/deepseek-chan-fanpack`：带表情差的贴纸素材，可用作游戏内反馈表情。
- 「蓝色大肥鱼」系列（`lmy414.github.io`）与档案馆 `fisharchive.cc`：二创图与表情包，注意原图转载/使用范围以作品页为准。
- Pixiv / Bilibili / BOOTH：搜索 `DeepSeek娘`、`鲸鱼娘`；形象原作者为「上善无形」，女仆装与 DeepSeek 元素版本出自「ZipZipPipe」。

许可义务（多数社区素材为 **CC BY-NC-SA 4.0**）：

1. **署名**原作者（通常是「上善无形」和/或「ZipZipPipe」），并在 README 与游戏内（标题页或制作人员页）列出所用素材及作者。
2. **禁止商业用途**——本项目本身免费非商业，符合这一条；但仍不得售卖、投放广告或设置付费解锁。
3. **相同协议共享**：对素材的二次修改需要以相同协议发布。
4. 下载原图不等于获得任意转载/商用授权；如作品页标注与上述不同，以作品页为准。

## 部署到 GitHub Pages（网页版）

1. 推送到 GitHub 仓库（默认分支 `main`）。
2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 推送后 `.github/workflows/deploy.yml` 会自动构建并发布 `dist/`。

`vite.config.ts` 中已设置 `base: './'`，因此项目页与自定义域名都能直接访问。

## 路线图

- [ ] 第 2 关起：更多物件种类、稀有度掉落表
- [ ] 音效与 BGM
- [ ] 正式美术：鲸鱼娘立绘、物件精灵图、场景背景（保持 `Catchable.info`、`WhaleGirl` 锚点、`HookTuning.pivot` 接口不变）
- [ ] 微应用本地最高分（`storage.read` / `storage.write`）
- [ ] 旋转屏幕后无需重进即可切换布局

## 版权与合规

- 本项目为**非官方同人作品**，与 DeepSeek 官方无关；不声称任何官方授权。
- **禁止商业用途**：不得售卖、投放广告、设置内购/赞助解锁，或以本项目进行任何形式的商业变现。
- 不使用官方 Logo 作为项目 Logo；不直接复制、提取官方素材。
- 正式美术需自制或使用授权明确的合规素材。
- 代码以 MIT 许可发布，该许可仅覆盖代码，不涵盖任何第三方角色形象相关权利。
