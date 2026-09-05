# 3D Studio

一个可直接打开使用的中文三维创作工作室。模型、场景和游戏共用同一套资产。

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

## Vercel 部署

上述 GitHub 仓库已与 Vercel 连接，Production 分支为 `main`。项目根目录的 `vercel.json` 已配置 Vite、`npm ci` 安装、先运行 25 项玩法与资产测试再构建，以及 `dist` 输出目录。不需要环境变量或后端服务。

绑定 Vercel 的 Git 集成后，推送到 `main` 会自动构建并发布 Production。模型、场景和游戏采用 hash 路由，刷新详情页不需要额外路径重写。运行资源、字体和星云背景全部随构建提供；`docs/` 为开发验证记录，不会进入网站构建产物。

## 本版功能

- **模型**：7 件原创程序化三维资产。赤焰 R1、潮汐 R2、流星 R3 三款 F1 风格开放轮式赛车，可旋转、缩放、下载 GLB 并直接驾驶；保留探索者 01 火箭、玄武岩、发射平台、信号天线。模型库可多选素材。
- **场景**：静海发射基地，初始 16 个资产实例。支持自由环绕、缩放、平移，将选择的模型加入基地、撤销上一个、清空新增。最多新增 12 个实例。新增布局保存在当前浏览器。
- **湛蓝大奖赛**：三款不同性能的赛车、954 米原创海滨环线、玩家与五名 AI 的三圈竞速。支持惯性漂移集氮、有限氮气、涡轮/护盾/电磁脉冲道具、草地减速、护栏和车辆碰撞、两档驾驶难度、键盘与多指触屏操作。具备倒计时、暂停、镜头切换、回正、全屏、引擎和事件音效、完整结算以及按赛车/难度保存的本机最佳成绩。
- **星际穿行**：完整的原创 3D 纵向射击。三重星区、编队战斗机、拦截机、重型护卫舰、补给舰，以及三阶段「厄瑞玻斯」母舰。双联脉冲、散弹、贯穿激光、追踪导弹；拾取同类补给可升至三级，换装保留各自等级。连击加分、修复补给、清弹冲击波、标准/新手难度、原创合成音效与背景音乐、暂停/继续/重开/胜负结算、浏览器本机记录。必须击毁母舰才能通关。

模型：`/#models`；场景：`/#scenes`；游戏：`/#games`。详细页面使用 hash 路由，支持直接访问、刷新以及浏览器前进后退。


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
