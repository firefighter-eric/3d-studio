# 3D Studio

一个可直接打开使用的中文三维创作工作室。模型、场景、动画和游戏共用同一套资产。

在线使用：[3D Studio](https://3d-studio-hazel.vercel.app/) · [驾驶《湛蓝大奖赛》](https://3d-studio-hazel.vercel.app/#games/azure-circuit) · [玩《星际穿行》](https://3d-studio-hazel.vercel.app/#games/starflight)。

源码仓库：[firefighter-eric/3d-studio](https://github.com/firefighter-eric/3d-studio)。

## 启动

推荐 Node.js 24 LTS，可用 `nvm use` 切换；Vercel 构建固定使用 Node.js 24（本地开发同时验证过 Node 25.8.2）。

```sh
npm install
npm run dev
```

打开 **http://localhost:5180/**。端口固定为 5180，避免与其他本地项目的 5173 冲突。服务绑定本机网络接口，局域网设备可使用终端显示的 Network 地址。

```sh
npm run check
npm test
npm run build
```

### Codex 一键运行

项目已配置 `.codex/environments/environment.toml`，在 Codex 顶部的运行菜单中选择：

| 按钮 | 操作 |
| --- | --- |
| 启动 3D Studio | 启动开发服务，打开 `http://localhost:5180/` 查看 |
| 运行测试 | 检查游戏、动画和模型资产 |
| 检查并构建 | TypeScript 检查并生成 `dist/` |
| 预览生产版本 | 重新构建并在 `http://localhost:5181/` 提供预览 |

开发和预览服务支持重复点击：确认端口属于当前项目且响应正确后复用现有服务。端口被其他服务占用时会报告冲突；不会停止进程或改用其他端口。自定义 CLI 参数仍由 Vite 处理。新建 Codex worktree 时会自动运行 `npm ci` 安装依赖。

## Vercel 部署

上述 GitHub 仓库已与 Vercel 连接，Production 分支为 `main`。项目根目录的 `vercel.json` 已配置 Vite、`npm ci` 安装、先运行玩法、资产与动画测试再构建，以及 `dist` 输出目录。不需要环境变量或后端服务。

绑定 Vercel 的 Git 集成后，推送到 `main` 会自动构建并发布 Production。模型、场景和游戏采用 hash 路由，刷新详情页不需要额外路径重写。运行资源、字体和星云背景全部随构建提供；`docs/` 为开发验证记录，不会进入网站构建产物。

## 本版功能

- **模型**：航天、赛车、自然与产品收藏共用一套三维素材清单。猎鹰 9 号 Block 5 与星舰 / 超级重型完整组合体支持高精度查看、分级展开、上面级 / 发动机视角与米制 GLB 下载。保留赤焰 R1、潮汐 R2、流星 R3 三款 F1 风格开放轮式赛车，以及探索者 01 火箭、玄武岩、发射平台、信号天线。模型库可多选素材。
- **场景**：静海发射基地，初始 16 个资产实例。支持自由环绕、缩放、平移，将选择的模型加入基地、撤销上一个、清空新增。最多新增 12 个实例。新增布局保存在当前浏览器。
- **湛蓝大奖赛**：三款不同性能的赛车、954 米原创海滨环线、玩家与五名 AI 的三圈竞速。支持惯性漂移集氮、有限氮气、涡轮/护盾/电磁脉冲道具、草地减速、护栏和车辆碰撞、两档驾驶难度、键盘与多指触屏操作。具备倒计时、暂停、镜头切换、回正、全屏、引擎和事件音效、完整结算以及按赛车/难度保存的本机最佳成绩。
- **星际穿行**：完整的原创 3D 纵向射击。三重星区、编队战斗机、拦截机、重型护卫舰、补给舰，以及三阶段「厄瑞玻斯」母舰。双联脉冲、散弹、贯穿激光、追踪导弹；拾取同类补给可升至三级，换装保留各自等级。连击加分、修复补给、清弹冲击波、标准/新手难度、原创合成音效与背景音乐、暂停/继续/重开/胜负结算、浏览器本机记录。必须击毁母舰才能通关。

模型：`/#models`；场景：`/#scenes`；动画：`/#animations`；游戏：`/#games`。详细页面使用 hash 路由，支持直接访问、刷新以及浏览器前进后退。

## 统一模型库

`/#models` 默认展示全部 64 个模型，SpaceX、Apple、DJI、NVIDIA、Tesla、Microsoft、Sony 与原创模型使用同一套卡片和详情操作。顶部搜索支持中文、英文和型号别名，例如「苹果」「Starship」「NV72」「1080Ti」「5090」「Xbox」「PS5」；品牌、类型、模型来源可组合筛选，支持推荐、名称和品牌排序。搜索「电脑」可同时找到 Mac 和 DGX Spark；筛选「游戏主机」可同时找到 Xbox 和 PS5。

筛选与排序保存在地址中，可直接分享或刷新；从详情返回时恢复列表筛选、滚动位置和上次查看卡片的键盘焦点。选择素材不会因筛选变化而丢失，可跨品牌加入同一场景。详情页共用查看器布局、视角工具、选择 / 加入场景 / 下载区域，并保留航天分级、观察位置及 DJI 构型切换。

分类、别名、来源和搜索逻辑位于 `src/data/model-library.ts`；统一列表位于 `src/pages/ModelLibrary.tsx`，详情位于 `src/pages/Workspaces.tsx`。缩略图复用已交付的模型渲染图，其余模型仅在卡片可见时加载三维预览。

## DJI 产品收藏

新增 19 款大疆产品，同一产品线只保留最新代，覆盖 Osmo 相机、无人机、稳定器和麦克风。3 款为官网展示模型，16 款依据官方照片制作并标注「外观重建」，详情说明近似范围。支持分类、搜索、来源筛选、旋转缩放、26 个构型的切换与 GLB 下载，以及加入共用场景。

打开 `/#models/dji-osmo-pocket-4p`，或在模型库选择品牌「DJI」。卡片预览来自实际三维模型渲染，来源、精度说明和可复现导出流程见 [DJI 模型说明](docs/DJI_MODELS.md)。运行 `npm run models:dji` 重建资产，`npm run test:dji` 校验全部交付文件。

## Apple 产品收藏

在模型库选择品牌「Apple」，可继续按电脑、手机、平板等类型筛选，或搜索 iPhone、Mac、iPad、Vision、Watch、AirPods。九款产品包括 iPhone 17 Pro、14 英寸 MacBook Pro、13 英寸 MacBook Air、iPad Pro、Apple Vision Pro、iMac、Mac mini、Apple Watch Series 11 和 AirPods Pro 3。

模型来自各产品官网公开的 AR USDZ，来源与源文件链接记录在 `src/apple/products.json`，SHA-256、核对日期和导出统计记录在 `src/apple/manifest.json`。保留官方展示组合：iPhone 正背双机、iPad 的妙控键盘与 Apple Pencil、iMac 的键鼠、AirPods 的耳机与充电盒、Vision Pro 的双编织头带。它们是产品外观展示资产，版权与商标归 Apple；不声明为本项目原创或工程 CAD。

打开 `/#models/apple-iphone-17-pro` 或 `/#models/apple-vision-pro` 可旋转、缩放、自动环绕、选择素材和下载 GLB。加入发射基地时按展品比例放大，仍支持撤销及本机布局保存；下载文件保留米制、Y 轴向上、底部居中的原点。卡片使用由实际 GLB 渲染的轻量 PNG，进入详情或加入场景时才请求对应模型。

转换使用 Blender 5.x，修正 USD 覆盖透明度到 glTF Alpha 的映射，保留屏幕、玻璃与织物纹理。静态几何按材质合并，Draco 压缩几何，颜色贴图使用高质量 WebP，数据贴图使用无损 WebP；贴图上限 2K，纹理全部内嵌。Draco 解码器随网站本地提供，没有运行时外部模型或贴图请求。

```sh
python3 scripts/import-apple-models.py --download  # 缓存官网 USDZ，并核对已有源文件指纹
blender --background --factory-startup --python scripts/import-apple-models.py
npm run models:apple                            # 优化 GLB 并更新导出清单
node_modules/.bin/tsx --test src/apple/apple.test.ts
```

macOS 的 Blender 可使用 `/Applications/Blender.app/Contents/MacOS/Blender`。USDZ 缓存与转换中间文件位于 `/private/tmp/3d-studio-apple-source` 和 `/private/tmp/3d-studio-apple-raw`。渲染预览位于 `public/models/apple/`，与模型共用同名文件。回归检查实际解码后的尺寸、原点、嵌入资源、文件指纹、预览与场景保存兼容性。

## 星舰发射与助推器回收动画

直接打开 `http://localhost:5180/#animations/starship-recovery`，或进入「动画」Tab。演示参考 2024-10-13 第五次试飞的首次成功塔架捕获，包含点火、上升、热分级、翻转返场、关机抛环、无动力下降、13 → 3 台发动机着陆点火、低速进近、塔臂承接九个阶段。星舰上面级在分离后独立继续飞行；不把整艘星舰送回塔架，也不混入猎鹰 9 号的再入点火或星舰上面级的腹部下降动作。

支持播放 / 暂停、可反向拖动的时间线、阶段跳转、回到起点、导演节奏 / 1× / 4× / 8×、导演 / 自由跟随 / 塔架镜头、全屏及手机操作。空格播放 / 暂停，左右方向键跳转 5 秒，Home 回到起点；控件获得焦点时保留其原生键盘操作。切换至后台自动暂停。默认暂停、无音轨；导演节奏加速中途飞行，最后约半分钟恢复 1×。时间线与部件状态为确定性采样，倒拖或重播会同时复位发动机、分级环、姿态与捕获臂。

复用 `starship.glb` 的具名级段，动画内调整为约 71 m 助推器（含 3 m 热分级环）与 50 m 上面级。塔架、承托面、上部捕获支点、发射台、管线、罐区、海岸地形、烟雾及尾焰为程序化生成；静态结构按材质合并，尾焰与烟雾采用实例化网格。原模型库的 124 m 构型及下载文件保持原规格。

参考：[SpaceX 第五次试飞官方影片](https://www.youtube.com/watch?v=hI9HQfCAw64)、[SpaceX 试飞说明](https://www.spacex.com/updates/)。阶段时间是近似值；轨迹、高度、速度、发动机推力与塔臂动作是可视化重建，不是实际遥测、工程仿真或特定 B12 / S30 飞行器的精确复刻。范围为起飞前 10 秒至约 T+07:05；不含上面级后续再入与溅落，也不是通用动画编辑器。

核心文件：`src/animation/mission.ts`（飞行采样 / 播放控制）、`RecoveryScene.tsx`（三维场景 / 镜头）、`LaunchSite.tsx`（发射场几何）、`mission.test.ts`（分级 / 捕获 / 连续性 / 反向回放）、`src/pages/Animations.tsx`（动画库与播放器）。模块按路由延迟加载。


## 猎鹰 9 号与星舰

直接打开 `http://localhost:5180/#models/falcon-9` 或 `http://localhost:5180/#models/starship`。鼠标拖动旋转、滚轮缩放、右键平移；手机支持双指操作。选择「上面级」或「发动机」可近距离查看，点击「分级展开」显示级间结构，猎鹰 9 号同时展开双瓣整流罩。下载的是完整组合体，保留具名级段和发动机节点。

| 资产 | 参考尺寸 | 三角面 | GLB | 主要细节 |
| --- | --- | --- | --- | --- |
| 猎鹰 9 号 Block 5 | 70 m 高 / 3.7 m 箭体直径 | 211,144 | 2.2 MiB | 9 台 Merlin 1D + MVac、4 片镂空栅格翼、4 组收拢着陆腿、双瓣整流罩、管线与标识 |
| 星舰 / 超级重型 | 124 m 高 / 9 m 箭体直径 | 929,456 | 9.8 MiB | 33 台助推器 Raptor、3 台上面级 Raptor + 3 台 RVac、9,642 片舰体隔热瓦及襟翼瓦片、4 片气动襟翼、通风热分级环、环焊钢板 |

GLB 以米为单位、Y 轴向上，原点位于发动机出口平面；两款模型以相同的 `0.08` 比例加入场景，保留彼此的高度比例。查看器为适应屏幕而分别缩放。模型采用本地程序化几何和 PBR 材质，没有运行时外部纹理、字体或模型请求。静态结构按级段与材质合并，发动机重复结构复用几何。

参考：[SpaceX Falcon 9](https://www.spacex.com/vehicles/falcon-9/)、[Falcon 用户指南，2025-05-09](https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf)、[SpaceX Starship](https://www.spacex.com/vehicles/starship/)；核对日期 2026-09-05。星舰明确采用官网公开的 52 m 上面级 + 72 m 助推器 / 33 + 6 发动机构型。整体尺寸和发动机数量依据公开资料，级段长度分配、焊缝、襟翼、瓦片与管线为视觉近似，不是特定试验飞行器的工程 CAD。几何由本项目制作，没有嵌入外部摄影或下载的第三方模型。

```sh
npm run models:spacecraft  # 重建两款 GLB，并更新几何 / 大小清单
npm test                  # 包含实际导出 GLB 的结构、尺寸、资源完整性与场景注册检查
```

建模源文件：`src/spacecraft/build.ts`；规格与来源：`src/spacecraft/specs.ts`；导出统计：`src/spacecraft/manifest.json`；加载与分级：`src/spacecraft/SpacecraftModel.tsx`。该建模生成器仅供导出使用，不进入前端运行包。

## 湛蓝大奖赛操作

直接打开 `http://localhost:5180/#games/azure-circuit`，选择赛车与难度，点击「驶向发车线」。默认开启自动油门；「轻松巡航」带辅助转向，「竞速挑战」由玩家自主转向。

| 操作 | 键盘 / 触屏 |
| --- | --- |
| 转向 | A D / 左右方向键；手机左右按钮 |
| 油门 / 刹车 | W / ↑ 与 S / ↓；关闭自动油门后显示手机油门按钮 |
| 漂移 | 按住 Shift 并转弯；手机可同时按住转向与漂移 |
| 氮气 | Space / 氮气推进按钮；有效漂移蓄满后松开，获得 1 次氮气，最多 3 次 |
| 道具 | E / 道具按钮；驶过彩色菱形补给拾取，最多携带 1 个 |
| 回到赛道 | R；原地对应的赛道位置回正，停顿 1.5 秒，不增加检查点 |
| 镜头 | C / 相机按钮；手机暂停菜单可切换 |
| 暂停 | P / Esc / 暂停按钮；切换窗口或进入后台时自动暂停 |

涡轮补充氮气；护盾保护 8 秒；脉冲使前方 45 米内最近且无护盾的对手减速。比赛必须顺序经过每圈 12 个检查点完成 3 圈；练习超过 4 分钟显示未完赛。声音在用户点击后初始化，可在暂停菜单关闭。

赛车采用 Three.js 程序化网格建模：车身截面放样、前后翼、侧箱、双叉臂悬挂、Halo、驾驶员、轮胎与轮毂。静态几何按材质合并，保留四个独立车轮节点；导出为 `public/models/formula-r1.glb` 至 `formula-r3.glb`。模型查看器与游戏实际加载同一份 GLB，单车约 644–650 KB，不依赖外部纹理。它们是原创街机风格车型，没有使用真实车队涂装。

```sh
npm run models:export  # 修改建模源代码后重新生成三款 GLB
npm run test:race      # 三款车 × 两档难度，完整三圈普通输入模拟
```

## 星际穿行操作

直接打开 `http://localhost:5180/#games/starflight`，选择标准挑战（5 格护盾）或新手巡航（7 格、较慢弹幕），点击「立即出击」。默认自动射击。

| 操作 | 键盘 / 触屏 |
| --- | --- |
| 移动 | WASD / 方向键；鼠标或触屏按住战斗区拖动 |
| 手动射击 | 按住 Space / J；关闭自动射击后也可按住战斗区开火 |
| 自动射击开关 | F / 左下角按钮 |
| 精细移动 | 按住 Shift |
| 冲击波 | X / B / 右下角按钮；消除弹幕、短暂无敌、伤害敌舰 |
| 暂停 | P / Esc / 右上角暂停按钮；切换窗口或后台时自动暂停 |

机身中心光点是子弹碰撞判定位置。S 是散弹，L 是贯穿激光，M 是追踪导弹，+ 修复 1 格护盾，B 补充 1 次冲击波（最多 3 次）。同类武器最高 LV.3。敌舰连击每 8 架提升一档倍率，最高 5 倍；受击或超过 3.8 秒未击毁会中断连击。第 90 秒母舰入场；母舰有三个装甲阶段，激光轨道提前 1.3 秒预警。

音效与背景音乐可分别关闭，声音仅在开始游戏等用户操作后初始化。默认不会请求任何外部音频。全屏使用浏览器 Fullscreen API，可用 Esc 或战区右上角退出按钮返回。环境背景为原创 ImageGen 本地资产 `public/game/nebula.png`，舰体与弹幕都是实时可交互 3D 网格。

完整模拟检查：`node_modules/.bin/tsx scripts/check-combat-balance.ts`。它仅使用普通方向输入与有限冲击波，不跳时、不改生命或伤害；用于验证两种难度能够完成全部关卡。

## 结构

```text
src/
  data/catalog.ts              资产、场景实例与游戏引用清单
  components/Models.tsx        共用火箭、玄武岩、发射台、天线模型组件
  components/StudioCanvas.tsx  三维查看器、相机控制、基地布局与灯光
  components/Interface.tsx     共用导航/按钮/视角工具栏
  pages/Libraries.tsx         模型、场景、游戏库
  pages/Workspaces.tsx        模型详情和场景工作区
  game/simulation.ts          独立于渲染器的游戏状态、计分、碰撞与输入
  game/simulation.test.ts     状态与玩法回归测试
  game/FlightScene.tsx        Three.js 战斗、弹幕实例池、爆炸与光束
  game/Ships.tsx              原创敌舰与探索者战斗改装；同色几何合并
  game/audio.ts              本地 Web Audio 音乐与战斗音效
  game/combat.css             纵向战斗区、HUD、菜单与手机布局
  pages/FlightGame.tsx        键盘/指针输入、DOM HUD、菜单与成绩
  racing/cars.ts             三款赛车参数与程序化网格建模源代码
  racing/FormulaCar.tsx       查看器与赛道共用的 GLB 加载组件
  racing/track.ts            闭合赛道、连续进度、最近点和小地图
  racing/race.ts             120Hz 驾驶物理、AI、检查点、漂移和道具
  racing/race.test.ts        玩法、碰撞方向与实际 GLB 结构回归测试
  racing/barriers.ts         连续护栏几何、整车碰撞范围与碰撞解算
  racing/RaceScene.tsx       海滨赛道、环境、车轮/特效与跟随相机
  racing/RaceAudio.ts        原创 Web Audio 引擎、漂移和事件音效
  racing/racing.css          赛车准备页、HUD、结算与触屏布局
  pages/RacingGame.tsx       键盘/多指输入、菜单、HUD 与本机成绩
  App.tsx                    应用组合、素材选择、路由和本机存储
```

技术栈：React 19、TypeScript、Vite 8、Three.js、React Three Fiber、Drei。几何、材质、环境灯和字体均在本地提供，无运行时外部资产下载。

资产使用稳定的 `AssetId`；场景实例保存 `assetId`、`position`、`rotation`、`scale`。游戏声明使用的模型及出发场景。模型库、场景和玩法中的火箭都来自 `Rocket` 组件，陨石复用 `Basalt`。游戏高频更新发生在独立模拟状态中，战斗采用 120Hz 固定步长，HUD 每约 100ms 更新。敌人、弹体和粒子采用有限对象池；弹体/爆炸使用实例化网格，静态舰体按材质合并几何。

赛车同样通过统一 `AssetModel` 入口供模型库与场景使用；游戏调用相同的 GLB 加载组件。驾驶与 AI 更新不依赖 React 重渲染，HUD 每约 80ms 同步。赛道静态几何按材质合并，赛车保留可动画的车轮；浏览器仅保存设置和有效完赛记录。

## 当前边界

- 没有接入图片转三维、自然语言生成游戏、账户、云端保存或后端服务，也没有伪装这些能力的按钮或进度。
- 场景新增素材按预设网格排列；本版不是自由拖拽的完整场景编辑器，也不含真实地图/GIS。
- 游戏库包含两款单人游戏；赛车对手为本地 AI，没有在线多人匹配。
- 本机布局和最高分不跨浏览器同步。WebGL 无法启动时显示恢复提示。
- 当前 R3F 版本在 Three.js 0.185 下会输出 `THREE.Clock` 弃用提示；实际验证无阻断控制台错误。

设计与验证：[`docs/qa/racing-wall-verification.md`](docs/qa/racing-wall-verification.md)、[`docs/design/racing.md`](docs/design/racing.md)、[`docs/qa/racing-verification.md`](docs/qa/racing-verification.md)、[`docs/design/combat.md`](docs/design/combat.md)、[`docs/qa/combat-verification.md`](docs/qa/combat-verification.md)。平台和原型历史记录保留在 [`docs/design/spec.md`](docs/design/spec.md)、[`docs/qa/verification.md`](docs/qa/verification.md)。


## NVIDIA 硬件模型

NVIDIA 共 11 款：**GB200 NVL72、GB300 NVL72、DGX B300、B300 GPU（SXM 示意）、DGX Spark、DGX Station**，以及五代 Founders Edition 公版显卡 **GTX 1080 Ti、RTX 2080 Ti、RTX 3090、RTX 4090、RTX 5090**。选择品牌「NVIDIA」后可按机柜 / 服务器 / GPU / 电脑筛选，支持旋转缩放、选择素材、加入场景与下载 GLB。直达 `http://localhost:5180/#models?brand=nvidia&type=gpu`。

这些是依 NVIDIA 官方产品资料和用户指南制作的外观重建；尺寸精度与参考链接在详情页说明。DGX Station 参考官网展示造型，非特定 OEM 量产机箱。下载采用米制，场景按展示比例缩放。每款 GLB 约 0.07–0.63 MB，贴图内嵌，Draco 解码器随项目提供；模型卡片使用真实三维渲染缩略图。

`npm run models:nvidia` 重新导出，`npm run test:nvidia` 验证实际 GLB 的解码、尺寸、文件哈希及场景接入。建模源、来源与缩略图再生方式见 [`src/nvidia/README.md`](src/nvidia/README.md)。

## Xbox 与 PlayStation 主机

模型库包含 **Xbox Series X、Xbox Series S、PS5 轻薄光驱版、PS5 Pro**。品牌分别为 Microsoft、Sony，类型统一为「游戏主机」。搜索完整型号可以区分 Series X / S，支持旋转缩放、真实模型预览、下载 GLB 和加入场景。直达 `http://localhost:5180/#models?type=console`。

四款均依据官方资料进行外观重建，包含散热孔、曲面外壳、前后接口和相应光驱轮廓。PS5 附展示底座，下载保留米制，局部细节近似。运行 `npm run models:consoles` 导出、`npm run models:consoles:previews` 渲染缩略图、`npm run test:consoles` 验证资产。来源与再生方式见 [`src/consoles/README.md`](src/consoles/README.md)。
