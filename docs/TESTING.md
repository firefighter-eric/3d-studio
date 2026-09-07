# 测试与交付验证

[文档总览](README.md) · [开发指南](DEVELOPMENT.md) · [发布指南](RELEASE.md)

测试分为源码 / 资产检查、实际浏览器交互、媒体检查与部署核对。它们证明不同的事：构建成功不能证明模型看得清，视频清单通过也不能证明浏览器播放正常。

## 根据变更选择检查

| 变更范围 | 自动检查 | 需要实际观察 / 操作 |
| --- | --- | --- |
| 文档 | 路径、链接、命令与源码一致；`git diff --check` | 必要时阅读渲染后的 Markdown，不要求重跑全部游戏 |
| 文案、布局、搜索 / 筛选 | TypeScript；相关模型库测试；构建 | 桌面 / 窄屏、焦点、空结果、返回列表上下文 |
| GLB、预览、型号或来源 | 对应资产测试、模型库测试、构建 | 实际解码、近看、构型、下载、加入场景与刷新 |
| 动画轨迹、关节、镜头 | 动画与相关模型测试；受影响视频重建 | 关键阶段、所有镜头、暂停、回退、接触与结束 |
| 游戏模拟或输入 | 玩法测试、相关完整平衡模拟、构建 | 普通输入、暂停 / 恢复、多指操作、完整受影响流程 |
| 共享渲染 / 依赖 | `npm test`、构建 | 模型、场景、两种动画及两款游戏的受影响流程 |
| 准备发布 | 完成相应范围检查，确认交付文件齐全 | Preview 与 canonical Production 分别验证 |

常规命令：

```sh
npm run check
npm test
npm run build
git diff --check
```

`build` 自带 TypeScript 检查。当前 `npm test` 显式列出测试文件，见 [package.json](../package.json)；新增文件必须注册。最近一次功能工作产生的 97 项通过记录是一个版本快照，不是固定的测试数量要求。每次执行以当前结果为准。

## 自动测试覆盖地图

| 文件 / 命令 | 主要覆盖 |
| --- | --- |
| [game/simulation.test.ts](../src/game/simulation.test.ts) | 输入、移动、武器 / 拾取、伤害与保护、母舰、暂停、胜负及对象池 |
| [racing/race.test.ts](../src/racing/race.test.ts) | 驾驶、方向、圈数与检查点、漂移 / 氮气 / 道具、碰撞与实际赛车 GLB |
| [spacecraft/spacecraft.test.ts](../src/spacecraft/spacecraft.test.ts) | 实际 GLB、层级、发动机、尺寸、资源及实例化后几何完整性 |
| [animation/mission.test.ts](../src/animation/mission.test.ts) | 星舰热分级、上面级独立飞行、抛环、发动机、塔架捕获与连续性 |
| [falcon-heavy/mission.test.ts](../src/animation/falcon-heavy/mission.test.ts) | 双侧分离、腿脚接地、独立触地时刻、回放与双芯镜头取景 |
| [falcon-heavy/film.test.ts](../src/animation/falcon-heavy/film.test.ts) | 始终检查模型 / 渲染源指纹、时长清单和海报；本地 MP4 存在时另查容器与文件指纹 |
| [apple/apple.test.ts](../src/apple/apple.test.ts) | 九款 GLB 解码、纹理、尺寸与原点、预览、本地解码器及场景保存 |
| [dji/dji.test.ts](../src/dji/dji.test.ts) | 产品 / 构型清单、实际 Draco 解码、指纹、来源与场景兼容 |
| [nvidia/nvidia.test.ts](../src/nvidia/nvidia.test.ts) | 型号区别、结构、指纹、解码、包围盒和文件预算 |
| [tesla/tesla.test.ts](../src/tesla/tesla.test.ts) | 全部模型 / 预览、目录、来源、尺寸、文件预算与场景接入 |
| [consoles/consoles.test.ts](../src/consoles/consoles.test.ts) | Xbox / PS5 品牌与版本、GLB / 预览、内嵌资源与尺寸 |
| [data/model-library.test.ts](../src/data/model-library.test.ts) | ID 唯一、中文 / 英文别名、交叉筛选、型号区分、排序和地址往返 |

品牌专用命令为 `npm run test:dji`、`test:nvidia`、`test:tesla`、`test:consoles`。Apple / SpaceX 可直接运行 `node_modules/.bin/tsx --test` 加对应文件路径。

完整玩法模拟单独运行：

```sh
npm run test:race
node_modules/.bin/tsx scripts/check-combat-balance.ts
```

平衡脚本使用普通控制输入验证可完成流程，不应通过改生命、跳时间或强制检查点制造通过。模拟通过不表示浏览器里已经实际通关；两者分别报告。

## 浏览器验证

先按 [开发指南](DEVELOPMENT.md) 确认端口属于本 checkout。可以使用实际浏览器或 Playwright；仓库目前没有 `test:e2e` 脚本、完整浏览器测试套件或独立 GitHub Actions 配置，不能声称 `npm test` 自动执行了下面的全部交互。

桌面可采用 1440 × 1000，窄屏至少检查 390 × 844 和 320 × 844。等待画布就绪、字体和必要资源后截图，同时收集 `pageerror`、控制台错误及失败请求。实际 GPU 渲染结果应可见，不能用无 WebGL 的 DOM 截图代替。

### 模型库、详情与场景

1. 默认库数量正确；试搜「电脑」「NV72」「1080Ti」「5090」「Xbox Series X」「PS5」「重型猎鹰」，核对命中而非只核对结果非空。
2. 组合品牌 / 类型 / 来源与排序；无结果可清除；刷新共享地址保持筛选。
3. 滚到下方卡片，打开详情再返回，检查筛选、滚动和键盘焦点；跨品牌选择不因筛选丢失。
4. 等待 `.canvas-shell[data-rendered="true"]` 或家族对应就绪状态；观察完整轮廓、材质、玻璃、贴图和底部位置。实际旋转 / 缩放使画面改变。
5. 航天分级、上面级与发动机镜头完整；DJI 切换全部受影响构型，下载对应实际文件。
6. 加入场景、刷新、撤销、清空新增和满额处理正确。下载文件与磁盘 / manifest 一致，不能只见到下载按钮。
7. 窄屏长型号名不溢出，操作可触达；离屏预览重新滚入仍能加载。必要时模拟加载失败并检查恢复。

### 回收动画

动画工作区提供 `data-animation`、`data-time`、`data-phase`、`data-playing`、`data-rendered` 等状态；它们方便等待与断言，不能代替对相机与接触面的检查。

星舰逐段检查起飞、热分级、抛环、下降、13 → 3 台发动机着陆点火、塔臂承接；确认上面级独立飞行，结束 `data-caught` 为真且助推器关机。Falcon Heavy 检查两枚侧芯分别接地：49 秒第一枚为真、第二枚为假，49.65 秒后两枚为真，腿脚与平台对齐。

两套都要测试暂停冻结、反向跳转、结束后重播、后台暂停、速率、全部镜头、阶段按钮和全屏；窄屏上画布与字幕不能裁掉关键对象。修改相机后检查中段与过渡，不只检查开始 / 结束。

### 游戏

从菜单正常开始，等待赛车 `data-ready="true"` 等实际就绪条件。测试连续输入和很短的按键、触屏拖动、多指组合、释放后不粘滞、失焦暂停和重开。赛车从多个方向检查屏幕左右转向、护栏和检查点；射击检查武器变化、子弹可辨、母舰预警、失败与通关。

涉及平衡或流程结束判定的改动，应在普通控制下完成受影响的完整比赛 / 战斗。若仅验证到中途，记录到达状态，不写“完整通关”。已有历史完整通关证据在 [QA 索引](README.md)，不自动覆盖后续代码。

## MP4 验证

MP4 是被忽略的本地制作输出，干净 checkout 和部署环境没有此文件。测试仅在文件缺失时跳过 MP4 二进制检查；权限、读取错误或指纹不一致仍然失败，海报和模型 / 渲染源检查始终运行。元数据测试没有运行 ffprobe 或逐帧解码。导出后另查视频流与完整文件：

```sh
ffprobe -v error -show_entries stream=codec_name,codec_type,width,height,pix_fmt,r_frame_rate,nb_frames:format=duration -of json output/videos/falcon-heavy-dual-landing.mp4
ffmpeg -v error -i output/videos/falcon-heavy-dual-landing.mp4 -f null -
```

预期为 H.264、yuv420p、1920 × 1080、30 fps、1,680 帧、56 秒且无音频流。随后用本地播放器查看下降和着陆片段，并对照清单指纹。网站验证实时动画的时间推进、状态、镜头与画面；确认 `dist/` 不含 MP4，网页没有请求 MP4 或显示对应下载入口。

## 记录结果

验证记录包含日期、checkout / commit 或工作树范围、环境 / 视口、操作、预期与实际、错误、截图 / 媒体和剩余问题。技术检查与人对外观 / 成片的审阅分别记录；自动通过不能代替审美判断或准确度声明。

文档修改使用 [本次文档核对记录](qa/documentation-audit.md)；游戏历史证据保留原文件。当前已知 `THREE.Clock` 弃用提示需与阻断错误分开，不能为了得到空日志忽略全部警告。代码改变后只有相关的新验证能支持交付结论。
