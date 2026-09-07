# 开发指南

[文档总览](README.md) · [架构说明](ARCHITECTURE.md) · [测试指南](TESTING.md) · [发布指南](RELEASE.md)

## 环境与安装

基础开发需要 Git、Node.js 24、npm 和支持 WebGL 的浏览器。Node 约束同时在 [.nvmrc](../.nvmrc) 和 [package.json](../package.json)；安装使用 [package-lock.json](../package-lock.json)，不要为消除版本提示随意改锁文件。

```sh
git clone https://github.com/firefighter-eric/3d-studio.git
cd 3d-studio
nvm use
npm ci
npm run dev
```

未使用 nvm 时，先安装满足 `24.x` 的 Node，再跳过 `nvm use`。克隆后直接使用已交付的模型、预览图与实时动画即可；Blender、Python、Chrome 自动化和 ffmpeg 只在相应资产制作流程需要。应用不需要 `.env`、API key、数据库或后端服务。

## 服务与 Codex 按钮

| 命令 | 行为 |
| --- | --- |
| `npm run dev` | Vite 开发服务，固定 `http://localhost:5180/` |
| `npm run check` | TypeScript 项目检查，不产生网站构建 |
| `npm test` | `tsx --test` 运行 package.json 明确列出的测试文件 |
| `npm run build` | TypeScript 检查，再执行 Vite 构建，输出 `dist/` |
| `npm run preview` | 提供现有 `dist/`，固定 `http://localhost:5181/` |

Codex 的四个动作定义在 [.codex/environments/environment.toml](../.codex/environments/environment.toml)：启动、测试、检查并构建、预览生产版本。最后一个按钮先构建再启动预览；CLI 的 `npm run preview` 本身不会构建。环境 setup 为 `npm ci`。

[scripts/serve.mjs](../scripts/serve.mjs) 默认绑定 `0.0.0.0` 并启用 strictPort。重复点击时先检查端口监听进程的真实 cwd，再检查开发 Vite ping 的 204 响应，或预览 HTML 与当前 `dist/index.html` 完全一致，之后才复用。占用者不明、其他项目占用或校验失败时直接报告冲突，不停止其他服务、不自动换端口。原终端中的新服务可用 Ctrl-C 正常结束。

只读诊断可以使用：

```sh
lsof -nP -iTCP:5180 -sTCP:LISTEN
curl -i -H 'Accept: text/x-vite-ping' http://127.0.0.1:5180/
```

普通 HTTP 200 或网页标题不足以证明是当前 checkout。macOS / Unix 的端口归属检查依赖 `lsof`，缺少该工具时不能自动确认已占用的服务。显式传入参数，例如 `npm run dev -- --host 127.0.0.1`，交由 Vite 处理，并跳过标准按钮的复用路径。

## 日常修改顺序

1. 先查看 `git status --short`，确认当前任务范围。已有未提交模型、视频或其他实现改动要保留。
2. 根据 [架构地图](ARCHITECTURE.md) 找到当前入口。统一库在 `ModelLibrary.tsx`，品牌旧收藏页不一定被使用。
3. 修改最小相关模块；保持资产 ID、来源、路由和已有本机数据兼容。新建分支通常使用 `codex/` 前缀。
4. 涉及建模时重建相关 GLB、清单和预览；涉及 Falcon Heavy 渲染源或模型时重建本地 MP4，并提交对应海报和清单。MP4 保留在 `output/videos/`，不提交或部署；交付的模型、预览图与生成器应保持一致。
5. 按 [测试指南](TESTING.md) 选择自动与实际浏览器验证；在同一项变更中更新相应文档。
6. 查看实际 diff，只有准备发布时才执行 [发布流程](RELEASE.md)。本地运行或测试不等于发布。

新增测试文件需要加入 `package.json` 的 `test` 列表；目前不是扫描全部测试文件的自动发现配置。简单文案或文档修改不必新增镜像测试，重点是事实和链接。

## 制作工具与再生命令

完整流程与输出契约见 [资产指南](ASSETS.md) / [动画与视频](ANIMATIONS.md)。下表用于快速定位，模型生成通常会覆盖相应交付文件和清单。

| 对象 | 命令 / 脚本 |
| --- | --- |
| 三款原创赛车 | `npm run models:export` |
| 三款 SpaceX 模型 | `npm run models:spacecraft`；单款如 `npm run models:spacecraft -- falcon-heavy` |
| Apple | Python 下载 → Blender 转换 → `npm run models:apple` |
| DJI | `npm run models:dji` → `node scripts/render-dji-previews.mjs` |
| NVIDIA | `npm run models:nvidia` → `npm run models:nvidia:previews`；两者支持型号参数 |
| Tesla | `npm run models:tesla` → `npm run models:tesla:previews` |
| Xbox / PS5 | `npm run models:consoles` → `npm run models:consoles:previews` |
| 猎鹰重型短片 | `npm run film:falcon-heavy` |
| 赛车完整平衡模拟 | `npm run test:race` |
| 射击完整平衡模拟 | `node_modules/.bin/tsx scripts/check-combat-balance.ts` |

### Chrome 与 Playwright

预览 / 视频脚本需要本机 Google Chrome，以及可导入的 Playwright 模块；Playwright 当前不是仓库 npm 依赖。已有环境可以设置 `PLAYWRIGHT_MODULE` 为模块入口绝对路径。若需独立工具目录，可在仓库外安装：

```sh
npm install --prefix /tmp/3d-studio-tools playwright
export PLAYWRIGHT_MODULE=/tmp/3d-studio-tools/node_modules/playwright/index.mjs
```

安装 Playwright 不等于安装 Google Chrome；这些脚本用 `channel: 'chrome'`。NVIDIA、Tesla、主机和视频脚本当前带 macOS Metal / ANGLE 启动参数，跨平台制作需先调整并验证浏览器启动配置，不能宣称在所有操作系统已验证。

先在一个终端启动 `npm run dev`，另一个终端运行预览或视频命令。导出过程中不要修改对应渲染源文件，以免 Vite 热更新造成前后帧不一致。仅视频脚本还支持自动查找宿主机 Codex 的 Playwright；其他预览脚本需要模块可导入或显式指定。

### 制作期环境变量

这些变量供本地脚本使用，不是部署所需配置，也不应作为 `VITE_` 变量注入网页。

| 变量 | 用途 / 默认值 |
| --- | --- |
| `PLAYWRIGHT_MODULE` | 预览 / 视频脚本所用 Playwright 模块入口 |
| `DJI_SOURCE_CACHE` | DJI 原始文件缓存；默认系统临时目录下 `3d-studio-dji-sources` |
| `DJI_PREVIEW_ORIGIN` | DJI 渲染服务，默认 `http://localhost:5180` |
| `NVIDIA_PREVIEW_ORIGIN` | NVIDIA 渲染服务，同上 |
| `TESLA_PREVIEW_ORIGIN` | Tesla 渲染服务，同上 |
| `CONSOLE_PREVIEW_ORIGIN` | 主机渲染服务，同上，变量名是单数 `CONSOLE` |
| `FALCON_FILM_ORIGIN` | 视频渲染的开发服务，同上；预览生产包没有导出接口 |
| `FFMPEG_PATH` | 视频编码器，默认从 PATH 查找 `ffmpeg` |

## 常见问题

| 现象 | 核对与处理 |
| --- | --- |
| 5180 / 5181 已占用 | 检查监听者 cwd 和服务响应；使用现有的本项目服务，或由其拥有者结束。不盲目杀进程 |
| 预览显示旧内容 | 先 `npm run build`，再 `npm run preview`；确认访问 5181 和正确目录 |
| 模型空白 / WebGL 失败 | 看网络中 GLB、贴图和本地 Draco 是否成功，再看控制台和硬件加速；等待就绪后检查实际画面 |
| 有 `THREE.Clock` 弃用提示 | 当前依赖组合的已知提示；与 pageerror / 加载失败分开记录，不能据此忽略其他错误 |
| GLB 或视频哈希测试失败 | 比较源文件与清单，按正确流程重建相关输出；不要改哈希来掩盖旧文件 |
| 找不到 Playwright / Chrome / ffmpeg | 检查制作工具安装与上表变量；这些不是运行网站所必需的依赖 |
| 下载官方源文件后指纹不符 | 保留旧缓存，核对产品来源与实际文件变更；确认后更新源记录和交付，不绕过固定指纹检查 |
| npm 缓存权限失败 | 可用隔离缓存，如 `npm ci --cache /tmp/3d-studio-npm`；不改全局目录权限来掩盖问题 |
| 刷新后选择丢失 | 模型选择是会话状态；只有已加入场景的实例持久化 |
| 本地 / 线上记录不同 | localStorage 按站点来源隔离，端口、主机名和协议变化都可能形成不同存储 |

## 文档随实现一起维护

| 变更 | 必须核对的文档 / 数据 |
| --- | --- |
| 新品牌、新型号、新构型 | 资产目录、搜索别名 / 分类、型号与来源清单、模型测试、资产指南数量及 README 摘要 |
| 新页面、导航或交互 | 设计理念、使用指南、架构路由、实际浏览器验证 |
| 新存储字段或迁移 | 架构中的状态表、兼容策略、损坏 / 旧数据检查 |
| 新导出流程 / 参数 | 开发指南、对应制作指南、package scripts、实际交付文件 |
| 动画 / 镜头变更 | 动画指南、反向回放与构图检查；本地视频、交付海报和元数据一起更新 |
| 测试或发布配置 | 测试指南、发布指南；保留旧 QA 记录的历史范围 |

新增文档从 [总览](README.md) 可达，并有返回链接。相对路径以文档自身目录为基准；精确统计优先引用机器清单，避免多个手写表独立漂移。截图和日志需注明验证对象、日期与尺寸；不要把临时目录或本机凭据作为可复现交付的一部分。
