# 动画与视频制作

[文档总览](README.md) · [模型制作](ASSETS.md) · [使用指南](USER_GUIDE.md) · [测试指南](TESTING.md)

当前动画库有两套基于已有模型的完整回收演示。它们都是公开参考基础上的视觉编排，不是遥测回放或工程仿真。时间线可随意跳转和回退；模型、部件状态、镜头与特效应在同一时刻保持一致。

## 两套体验的区别

| 项目 | 星舰：发射与回收 | 猎鹰重型：双芯归来 |
| --- | --- | --- |
| 地址 | `/#animations/starship-recovery` | `/#animations/falcon-heavy-recovery` |
| 使用模型 | `starship.glb` 的具名级段 | `falcon-heavy.glb` 中央芯级与两枚侧助推器 |
| 叙事重点 | 热分级后超级重型返回塔架，由塔臂承接 | 两枚侧助推器返场，分别落到两个地面平台 |
| 时间线 | T−10 秒至 T+425 秒，跨度 435 秒 | 剪辑时间 0–56 秒 |
| 播放速度 | 导演节奏、1×、4×、8× | 0.5×、1×、2× |
| 镜头 | 导演、自由跟随、塔架、特写 | 导演、双芯全景、LZ-1 / LZ-2 特写 |
| 成片文件 | 目前只有实时播放器 | 可在本地导出 1080p MP4；网站交付实时动画、海报和清单 |
| 音频 | 无音轨 | 实时演示与 MP4 均无音轨 |

共用空格播放 / 暂停、左右方向键跳转 5 秒、Home 回到起点、阶段列表和时间滑块。原生控件获得焦点时保留自己的键盘行为。后台暂停，结束后可重新开始；浏览器不支持全屏时继续在原窗口操作。

## 设计和实现规则

飞行轨迹是绝对时间的函数，播放器只管理时间、速率和播放状态。场景按采样结果设置位置、姿态、发动机点火、关节和镜头；烟尘等效果按可重建的时间规则处理。这样在 49 秒与 20 秒之间来回拖动时，腿、火焰和落地状态都会复位，而不是只倒退火箭位置。

镜头与轨迹分别设计：先保证运动连续、目标正确，再保证屏幕内能看懂过程。下降时火箭不能小到难以辨识，着陆时箭尖、腿和平台不能被画框或 UI 截断。HUD 的高度和点火数量来自同一采样结果，但这些值仍是编排数据。

修改动画时应保留这些行为：暂停时姿态不漂移；反向跳转无残留；后台恢复不突然追赶很长一段时间；阶段切换无不必要的速度跳变；触地 / 塔架承接后没有继续穿透地面或支承面。

## 猎鹰重型：双芯归来

构图参考已记录的 [SpaceX《Falcon Heavy & Starman》01:22 双芯着陆镜头](https://www.youtube.com/watch?v=A0FZIwabctw&t=82s)，结构参考 [Falcon Heavy 产品说明](https://www.spacex.com/vehicles/falcon-heavy/) 和 [Falcon 用户指南](https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf)。视频画面完全由项目自己的模型、场地、镜头和特效渲染，不包含原片画面或音乐。

使用现有 Block 5 风格建模，不是 2018 年某两枚飞行器的精确复制。中央芯级带上面级继续上升，回收镜头只跟随侧芯。LZ-1 / LZ-2 的地形、间距、设施、轨迹与烟尘都是视觉近似。

### 56 秒编排

| 剪辑起点 | 阶段 | 要表现的动作 |
| --- | --- | --- |
| 0 秒 | 三芯飞行 / 分离 | 侧芯离开中央组合，中央继续上升 |
| 8 秒 | 翻转 / 返场 | 两枚助推器转向与点火返场 |
| 18 秒 | 再入 | 短暂点火减速，栅格翼展开 |
| 25 秒 | 并行下降 | 分别对准两个平台，保持双芯可见 |
| 34 秒 | 着陆点火 | 中央发动机降低下降速度 |
| 41 秒 | 展开着陆腿 | 铰链展开，支柱随动 |
| 49 秒 | 双芯着陆 | 第一枚接地，第二枚在 49.65 秒接地，保持至片尾 |

这些是脚本时间，不是原任务时间。前半段压缩了飞行过程，末段突出独立接地。高度使用带速度约束的三次 Hermite 插值；镜头下降段持续跟随，到约 32 秒再转向同时交代平台的全景。

### 文件与职责

| 文件 | 责任 |
| --- | --- |
| [mission.ts](../src/animation/falcon-heavy/mission.ts) | 阶段、轨迹、部件采样、播放器、镜头计算 |
| [world.ts](../src/animation/falcon-heavy/world.ts) | 复用 GLB、场地、平台、腿与支柱、发动机、尾焰和烟尘 |
| [Canvas.tsx](../src/animation/falcon-heavy/Canvas.tsx) | R3F 场景接入、逐帧更新、开发模式的视频导出接口 |
| [Workspace.tsx](../src/animation/falcon-heavy/Workspace.tsx) | 实时播放控件、状态、镜头与参考 |
| [render-falcon-heavy-film.mjs](../scripts/render-falcon-heavy-film.mjs) | 确定性逐帧取图、ffmpeg 编码、海报与清单 |
| [mission.test.ts](../src/animation/falcon-heavy/mission.test.ts) | 姿态、触地、播放控制与镜头取景回归 |
| [film.test.ts](../src/animation/falcon-heavy/film.test.ts) | 视频、模型、直接渲染源与海报的一致性 |

### 重新渲染 MP4

先按 [开发指南](DEVELOPMENT.md) 准备 Chrome、Playwright 与 ffmpeg。只改镜头 / 轨迹时无需重新导出模型；修改了航天几何才先重建对应 GLB。

```sh
npm run models:spacecraft -- falcon-heavy
npm run dev
```

在另一个终端执行：

```sh
npm run film:falcon-heavy
```

脚本访问开发服务 `/?render=falcon-heavy#animations/falcon-heavy-recovery`，等待模型与字体就绪，按 `frame / 30` 采样 1,680 帧，将 PNG 流交给 ffmpeg，以 H.264 / yuv420p 编码并启用 faststart。视频先写临时 `.partial.mp4`，编码结束后替换最终文件。该接口受 `import.meta.env.DEV` 限制，不在生产网页开放。

MP4 输出到本地 `output/videos/`；海报与制作清单保留在 [public/videos](../public/videos)：

| 文件 | 内容 |
| --- | --- |
| `output/videos/falcon-heavy-dual-landing.mp4` | 本地导出；1920 × 1080，30 fps，56 秒，无音轨；Git 与部署忽略 |
| [falcon-heavy-dual-landing.jpg](../public/videos/falcon-heavy-dual-landing.jpg) | 45.2 秒画面，去除字幕的海报 |
| [falcon-heavy-dual-landing.json](../public/videos/falcon-heavy-dual-landing.json) | 本地成片路径、`local-only` 分发标记、时长、分辨率、帧数、来源、字节数及视频 / 模型 / 渲染源指纹 |

`PLAYWRIGHT_MODULE` 可指定模块入口；`FALCON_FILM_ORIGIN` 覆盖开发地址；`FFMPEG_PATH` 指定编码器。不要把生产预览地址作为导出服务，也不要在渲染过程中修改相应源码触发热更新。

MP4 与临时 `.partial.mp4` 都保存在 `output/videos/`，不会复制到 `dist/`。`.gitignore` 和 `.vercelignore` 同时忽略 `output/` 与 `*.mp4`；网页不显示 MP4 播放或下载入口。清单记录的 `file` 是仓库根目录下的本地路径，不是网站 URL。

视频测试直接追踪 `mission.ts`、`world.ts`、`Canvas.tsx` 的拼接指纹与模型指纹，不穷尽共享依赖、字体、Three.js 版本或 GPU 驱动差异。相关依赖、材质或字体变化时仍需判断是否重渲染并看画面；“确定性采样”不承诺跨 GPU 得到逐字节相同的视频。元数据测试也不等于视频完整解码和浏览器播放已通过，二者需按 [测试指南](TESTING.md) 另验。

## 星舰：发射与回收

参考记录为 [SpaceX 第五次试飞影片](https://www.youtube.com/watch?v=hI9HQfCAw64) 与 [试飞说明](https://www.spacex.com/updates/)，主题为 2024-10-13 的首次塔架捕获。阶段起点和运动是近似编排，没有使用真实遥测作为驱动。

| 时间线起点 | 阶段 |
| --- | --- |
| T−10 秒 | 点火准备 |
| T+0 秒 | 起飞与爬升 |
| T+159 秒 | 热分级；组合在约 161 秒分离 |
| T+165 秒 | 翻转与返场点火 |
| T+220 秒 | 关机与抛环；分级环约 221 秒释放 |
| T+280 秒 | 无动力下降 |
| T+391 秒 | 13 → 3 台发动机着陆点火 |
| T+409 秒 | 塔架进近 |
| T+419 秒 | 塔臂承接；维持至 T+425 秒 |

星舰上面级独立继续飞行，超级重型返回塔架。演示不包含猎鹰式再入点火、着陆腿落地或上面级的腹部下降。范围不含上面级后续再入 / 溅落，也不是通用动画编辑器。

复用 `starship.glb`，动画内将助推器本体调整到约 68 m，加 3 m 热分级环，星舰为约 50 m；模型库下载仍为 124 m 静态构型。具名级段、发动机摆动、捕获支点、分级环释放后的继承速度、塔臂承重与支柱运动共同构成回收过程。

| 文件 | 责任 |
| --- | --- |
| [mission.ts](../src/animation/mission.ts) | 轨迹、级段状态、发动机与播放时钟 |
| [camera.ts](../src/animation/camera.ts) | 镜头采样与过渡 |
| [RecoveryScene.tsx](../src/animation/RecoveryScene.tsx) | GLB 装配、场景更新、捕获与镜头控制 |
| [LaunchSite.tsx](../src/animation/LaunchSite.tsx) | 发射台、塔架、设施与海岸 |
| [FlightEffects.tsx](../src/animation/FlightEffects.tsx) | 连续点火包络、分层尾焰与烟雾 |
| [Animations.tsx](../src/pages/Animations.tsx) | 动画库与星舰播放器 UI |
| [mission.test.ts](../src/animation/mission.test.ts) | 分离、抛环、捕获、连续性与反向回放 |

静态场地按材质合并，重复特效使用实例化。近看可观察泵体、供给管线、舱盖、铰链与捕获支点；塔臂具有桁架、伸缩液压杆和承重下沉。真实几何开口、海岸延伸与雾化用于构图，仍属视觉重建。

## 修改后的验收

先运行相关采样 / 资产测试，再在真实浏览器检查起始、中段、分离、进近、结束和反向跳转。双芯需要检验第一枚已着陆而第二枚未着陆的短暂状态，最终两枚腿脚都落在平台；塔架捕获需检验支点与承托面接触、发动机关机及上面级独立飞行。切换全部镜头，覆盖桌面和窄屏，不只看一张结尾截图。

本地导出的 MP4 另需确认完整解码、实际可播放、画面正确且指纹与清单一致。网站只验证实时三维播放、海报与模型下载，并确认没有 MP4 请求或失效下载入口。
