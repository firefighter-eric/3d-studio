# 项目文档

[项目首页](../README.md) · [设计理念](design/overview.md) · [使用指南](USER_GUIDE.md)

整理日期：**2026-09-07**。本目录描述当前工作树，历史截图和测试结果保留原来的日期与验证范围。文档不承担线上版本指示器的作用；线上状态按 [发布指南](RELEASE.md) 核对。

## 从哪里开始

| 读者 / 任务 | 推荐阅读顺序 |
| --- | --- |
| 第一次使用 | [使用指南](USER_GUIDE.md) → [模型与来源](ASSETS.md) |
| 产品与设计 | [设计理念与产品规范](design/overview.md) → [战斗设计](design/combat.md) / [赛车设计](design/racing.md) |
| 接手开发 | [开发指南](DEVELOPMENT.md) → [架构说明](ARCHITECTURE.md) → [测试指南](TESTING.md) |
| 制作模型 | [资产指南](ASSETS.md) → 对应品牌专项说明 → [测试指南](TESTING.md) |
| 制作动画 / 视频 | [动画与视频](ANIMATIONS.md) → [资产契约](ASSETS.md) → [媒体验证](TESTING.md) |
| 准备交付 | [测试指南](TESTING.md) → [发布指南](RELEASE.md) |

## 当前规范

| 文档 | 负责回答的问题 |
| --- | --- |
| [设计理念与产品规范](design/overview.md) | 为什么这样组织？哪些体验必须一致？界面与内容怎样取舍？ |
| [使用指南](USER_GUIDE.md) | 如何搜索、选择、查看、下载、组合、播放和操作游戏？ |
| [架构说明](ARCHITECTURE.md) | 数据从哪里来？谁保存状态？渲染、模拟、生成器如何分工？ |
| [开发指南](DEVELOPMENT.md) | 如何安装、启动、构建、使用工具、定位常见故障与维护文档？ |
| [资产指南](ASSETS.md) | 收录了什么？模型的单位、原点、来源、层级和交付流程是什么？ |
| [动画与视频](ANIMATIONS.md) | 两套回收如何制作？哪些时间为编排？如何重新导出短片？ |
| [测试指南](TESTING.md) | 什么由自动测试证明？什么必须在浏览器里操作和看画面？ |
| [发布指南](RELEASE.md) | 如何让源代码、交付文件与 Production 一致？如何验证和回退？ |

## 专项说明

| 领域 | 入口 |
| --- | --- |
| DJI：型号、构型、官网源文件与重建精度 | [DJI 模型说明](DJI_MODELS.md) |
| NVIDIA：机柜、服务器、GPU 与桌面设备 | [NVIDIA 模块](../src/nvidia/README.md) |
| Tesla：车辆、机器人、能源与充电 | [Tesla 模块](../src/tesla/README.md) |
| Microsoft / Sony：Xbox 与 PS5 | [游戏主机模块](../src/consoles/README.md) |
| Apple / SpaceX / 原创赛车制作 | [资产指南](ASSETS.md) |
| 星际穿行的战斗与美术取舍 | [战斗设计](design/combat.md) |
| 湛蓝大奖赛的车辆、赛道与玩法 | [赛车设计](design/racing.md) |

## 历史与验证记录

以下是特定版本的记录，测试数量和截图不能直接代表今天的全部功能。旧品牌、三标签和 60 秒躲避原型仅作为演变背景。

| 记录 | 适用范围 |
| --- | --- |
| [早期界面设计](design/spec.md) | 初始参考图、旧品牌与模型 / 场景 / 游戏三标签原型 |
| [第一版验证](qa/verification.md) | 2026-09-05；早期模型、场景与躲避玩法 |
| [战斗版验证](qa/combat-verification.md) | 2026-09-05；三阶段母舰通关、键盘 / 触屏和平台回归 |
| [赛车验证](qa/racing-verification.md) | 2026-09-05；完整比赛、方向与多指操作 |
| [护栏修复验证](qa/racing-wall-verification.md) | 2026-09-05；车身与墙壁碰撞的专项证据 |
| [文档核对记录](qa/documentation-audit.md) | 2026-09-07；本次文档覆盖、源码一致性与链接检查 |

## 如何保持文档可信

文档解释约束和原因，机器可读清单保存精确数据。数量和型号以 [catalog.ts](../src/data/catalog.ts) / [model-library.ts](../src/data/model-library.ts) 为准；尺寸、来源、版本和文件统计以品牌的 `products`、`specs`、`manifest` 为准；命令以 [package.json](../package.json) 为准；发布构建以 [vercel.json](../vercel.json) 为准。

功能、字段或命令变更时，在同一项变更中更新对应规范及本索引的链接。已执行的检查记录日期、对象和结果；未执行的项目写为待验证。不要将一次历史成功改写为持续有效的保证。具体维护清单见 [开发指南](DEVELOPMENT.md)。
