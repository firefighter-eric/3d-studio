# 3D Studio

一个中文三维工作室：找到模型，查看结构，把它加入场景，再通过动画和游戏体验它。模型、场景、动画和游戏共用资产，而不是四套独立展示。

[在线使用](https://3d-studio-hazel.vercel.app/) · [源码仓库](https://github.com/firefighter-eric/3d-studio) · [完整文档](docs/README.md) · [设计理念](docs/design/overview.md)

本文描述 **2026-09-07 的当前工作树**，包括猎鹰重型模型与双助推器回收短片。在线站点对应最近一次 Production 部署；本地实现、测试通过与正式发布是不同状态，发布核对方法见 [发布指南](docs/RELEASE.md)。

## 快速启动

使用 Node.js 24，版本约束见 [.nvmrc](.nvmrc) 和 [package.json](package.json)。在项目根目录执行：

```sh
nvm use           # 使用 nvm 时执行
npm ci
npm run dev
```

打开 [http://localhost:5180/](http://localhost:5180/)。开发端口固定为 **5180**，构建预览固定为 **5181**；重复启动会核对服务所属目录和响应，确认是本项目后复用。服务默认监听 `0.0.0.0`，可使用终端显示的局域网地址。完整环境要求、端口冲突处理见 [开发指南](docs/DEVELOPMENT.md)。

```sh
npm run check    # TypeScript 检查
npm test         # 玩法、模型、模型库、动画与视频一致性检查
npm run build    # TypeScript 检查并生成 dist/
npm run preview  # 提供已经构建的 dist/，不会自行重新构建
```

日常开发直接使用仓库中的模型、预览图和实时动画，无需先安装 Blender 或重新制作资产。

### Codex 一键运行

[运行配置](.codex/environments/environment.toml) 提供四个按钮，新建工作环境执行 `npm ci`：

| 按钮 | 实际命令 | 用途 |
| --- | --- | --- |
| 启动 3D Studio | `npm run dev` | 开发服务，访问 5180 |
| 运行测试 | `npm test` | 运行自动回归检查 |
| 检查并构建 | `npm run build` | 生成可发布的静态站点 |
| 预览生产版本 | `npm run build && npm run preview` | 重新构建，访问 5181 |

## 当前内容

| 入口 | 已实现能力 |
| --- | --- |
| 模型 `/#models` | 65 个模型、8 个品牌；中文 / 英文 / 别名搜索；品牌、类型、来源组合筛选；排序、多选和统一详情 |
| 场景 `/#scenes/moonbase` | 静海发射基地；16 个基础实例，最多新增 12 个；环绕查看、撤销、清空新增和本机保存 |
| 动画 `/#animations` | 星舰发射与超级重型塔架捕获；猎鹰重型双侧助推器分别着陆；播放、暂停、时间线、阶段与镜头切换 |
| 游戏 `/#games` | 《星际穿行》三维纵向射击；《湛蓝大奖赛》三圈海滨竞速；键盘 / 触屏、本地成绩和音效 |

模型涵盖 SpaceX、Apple、DJI、NVIDIA、Tesla、Microsoft、Sony 与原创作品。包括 Falcon 9、Starship、Falcon Heavy，NVL72 / B300 / DGX Spark / DGX Station，GTX 1080 Ti 至 RTX 5090 的五代公版显卡，以及 Tesla 产品、Xbox 与 PS5。完整数量、型号范围与来源见 [资产指南](docs/ASSETS.md)。

猎鹰重型「双芯归来」提供 **56 秒实时三维回收动画**，支持四种镜头、阶段跳转与慢速回放。同一套模型还能在本地导出 1080p、30 fps、无音轨 MP4；成片保存到被忽略的 `output/videos/`，不随 Git 或网站发布。参考、近似范围与导出命令见 [动画与视频](docs/ANIMATIONS.md)。

## 设计方向

**让模型容易被找到，让同一份模型真正被使用。** 首页优先服务检索：统一卡片、搜索和筛选，品牌与类型分别组织。用户不需要先猜模型在哪个品牌专区；搜索「电脑」能同时找到 Mac 与 DGX Spark。

详情保留一致的查看、选择、加入场景与下载位置，航天分级和 DJI 构型作为专属操作加入。深色展台、克制的黄绿强调色和真实三维画面把注意力留给模型。设计理由、信息架构、视觉规范、移动端与后续方向见 [设计理念与产品规范](docs/design/overview.md)。

## 文档导航

| 要做什么 | 阅读文档 |
| --- | --- |
| 了解设计目标、统一模型库与界面规范 | [设计理念](docs/design/overview.md) |
| 找模型、组合场景、观看动画、玩游戏 | [使用指南](docs/USER_GUIDE.md) |
| 理解模块、数据流、资产契约与本机存储 | [架构说明](docs/ARCHITECTURE.md) |
| 安装、运行、使用 Codex 按钮与排障 | [开发指南](docs/DEVELOPMENT.md) |
| 新增模型、导入 / 导出、生成预览与记录来源 | [资产指南](docs/ASSETS.md) |
| 修改回收动画、镜头或重建 MP4 | [动画与视频](docs/ANIMATIONS.md) |
| 选择测试范围、验证真实交互与媒体 | [测试指南](docs/TESTING.md) |
| 发布、区分 Preview / Production、回退 | [发布指南](docs/RELEASE.md) |

[文档总览](docs/README.md) 还收录品牌专项说明、游戏设计与历史验证记录。

## 技术与边界

React、TypeScript、Vite、Three.js、React Three Fiber 与 Drei；具体依赖由 lockfile 固定。站点是静态前端，没有后端服务、账户、云端保存、在线多人或 AI 生成接口。模型、预览图、纹理、字体和解码器随站点交付；制作资产时所需的下载与工具不属于浏览器运行依赖。

场景使用预设位置排列，尚未提供自由拖拽编辑；选择状态只保留在本次页面会话，已加入场景的实例与游戏记录保存在当前浏览器。动画为公开资料基础上的视觉重建，产品模型区分官网展示与外观重建，不是工程 CAD。部分原创建模只有实时组件，没有 GLB 下载；Tesla 汽车和游戏主机模型分别不等于可驾驶车型和主机模拟器。

Vercel 构建配置见 [vercel.json](vercel.json)，无需应用环境变量。运行、验证与发布流程以各专项文档为准。
