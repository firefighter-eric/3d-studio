# 模型资产与制作规范

[文档总览](README.md) · [架构说明](ARCHITECTURE.md) · [动画与视频](ANIMATIONS.md) · [测试指南](TESTING.md)

## 当前收录

2026-09-07 按 [共享目录](../src/data/catalog.ts) 和 [模型库分类](../src/data/model-library.ts) 核对：**65 个模型、8 个品牌、21 种类型**。以下数量按模型卡片计算，构型不重复计数。

| 品牌 | 数量 | 收录范围 | 来源 |
| --- | ---: | --- | --- |
| SpaceX | 3 | Falcon 9 Block 5、Starship / Super Heavy、Falcon Heavy | 外观重建 |
| Apple | 9 | iPhone 17 Pro、MacBook Pro / Air、iPad Pro、Vision Pro、iMac、Mac mini、Watch Series 11、AirPods Pro 3 | 官网 AR 展示资产转换 |
| DJI | 19 | Osmo、无人机、稳定器、Ronin 与 Mic；共 26 个构型 | 3 款官网展示、16 款外观重建 |
| NVIDIA | 11 | GB200 / GB300 NVL72、DGX B300、B300 SXM 示意、DGX Spark / Station；GTX 1080 Ti、RTX 2080 Ti、3090、4090、5090 | 外观重建 |
| Tesla | 12 | Model 3 / Y / S / X、Cybertruck、Semi、Roadster、Cybercab、Optimus、Powerwall 3、Megapack、Supercharger V4 | 外观重建 |
| Microsoft | 2 | Xbox Series X 光驱版、Series S 数字版 | 外观重建 |
| Sony | 2 | PS5 轻薄光驱版、PS5 Pro 数字版 | 外观重建 |
| 原创 | 7 | 探索者 01、玄武岩、发射平台、信号天线、赤焰 R1、潮汐 R2、流星 R3 | 原创设计 |

合计 12 个「官网展示」、46 个「外观重建」、7 个「原创设计」。61 个模型有下载入口；前四种基础原创资产为实时组件，未单独交付 GLB。DJI 的额外构型另有文件，因此 GLB 文件数不等于卡片数。型号清单表示项目收录的版本，不表示市场上的所有产品或持续更新的“最新款”。

`NV72` 是 NVL72 的搜索别名；本项目将 `NV Studio` 作为 DGX Station 的检索别名，没有另一个同名硬件模型。RTX 系列采用明确记录的 Founders Edition 外观，不能泛化为所有非公版显卡。

## 模型、构型和实例

**模型**有稳定 `AssetId`，代表目录中的一件作品。**构型**是同一模型的折叠、展开或配件组合，例如 DJI 的 `default` 与额外变体。**实例**是在场景中引用某个 `AssetId` 并附带位置、旋转与比例；同一模型可以出现多个实例。

当前场景实例没有 `variant` 字段，加入 DJI 时使用默认构型；详情的「下载当前构型」则指向正在查看的文件。静态航天分级是查看状态，不改变完整 GLB 的下载内容。修改这些规则时需同时更新实例契约、存储校验和使用说明。

### 坐标与比例

| 环节 / 家族 | 规则 |
| --- | --- |
| 下载 GLB | 米制、Y 轴向上；包围盒包括附件、支架、底座或伸出的结构 |
| Apple / DJI / NVIDIA / Tesla / 主机 | X/Z 居中，最低点在 Y=0；具体来源模型的尺度精度见对应清单 |
| SpaceX | 原点在发动机出口平面；级段、关节、侧助推器保留自己的相对变换 |
| 原创赛车 | 米制、Y 向上、+Z 前进，保留可转向 / 自转的车轮节点 |
| 模型查看器 | 根据家族、包围盒和观察位置适配取景，不代表统一实物比例 |
| 共享场景 | 使用目录中的 `sceneScale`；产品按展品比例展示，三款 SpaceX 共同采用 `0.08` |
| 动画 | 说明参考构型及额外调整；例如星舰回收的级段比例与静态库规格不同 |

米制只描述坐标，不证明近似重建达到了实测精度。参考箭体直径、厂商标称长宽与完整模型包围盒也不是同一个量，不能拿包含底座、鼻锥附件、固定耳或襟翼的包围盒当装配尺寸。

### 层级、材质与资源

静态结构按材质合并，重复部件尽量共享几何；需要分离、旋转、伸缩的部件保持具名节点和关节原点。Falcon 系列保留级段、整流罩、栅格翼、着陆腿与支柱；Falcon Heavy 额外保留左右侧芯。Starship 保留 `booster`、`hotstage`、`ship` 等装配关系。赛车保留四个轮组。

下载使用通用 PBR 材质。纹理与缓冲区内嵌，品牌 Draco 压缩模型使用仓库中的 [本地解码器](../public/vendor/draco)。SpaceX 导出采用焊接、去重和清理，保留层级，不依赖 Draco；不要为了统一格式破坏动画节点。网页中的金属细节、灯光、尾焰与烟尘属于显示效果，并非都嵌入下载文件。

预览应由实际交付 GLB 渲染。不得用产品照片或概念图替代模型后声称已经建模；图片可作为有来源的建模参考。三维几何也不能仅靠面数判断质量，必须检查比例、轮廓、材质、结构和相机取景。

## 来源与交付清单

| 领域 | 型号 / 来源依据 | 交付记录 |
| --- | --- | --- |
| Apple | [products.json](../src/apple/products.json)、[specs.ts](../src/apple/specs.ts) | [manifest.json](../src/apple/manifest.json)：源指纹、转换日期、尺寸、输出指纹等 |
| DJI | [products.json](../src/dji/products.json)、[专项说明](DJI_MODELS.md) | [manifest.json](../src/dji/manifest.json)：来源类别、各构型文件及统计 |
| NVIDIA | [products.ts](../src/nvidia/products.ts)、[模块说明](../src/nvidia/README.md) | [manifest.json](../src/nvidia/manifest.json) |
| Tesla | [products.ts](../src/tesla/products.ts)、[模块说明](../src/tesla/README.md) | [manifest.json](../src/tesla/manifest.json) |
| Xbox / PS5 | [products.ts](../src/consoles/products.ts)、[模块说明](../src/consoles/README.md) | [manifest.json](../src/consoles/manifest.json) |
| SpaceX | [specs.ts](../src/spacecraft/specs.ts)、[build.ts](../src/spacecraft/build.ts) | [manifest.json](../src/spacecraft/manifest.json)：字节数、几何统计、尺寸、瓦片数和单位 |
| 原创赛车 | [cars.ts](../src/racing/cars.ts)、[赛车设计](design/racing.md) | [实际 GLB 测试](../src/racing/race.test.ts)，当前没有独立 manifest |

这些 manifest 当前不是一个统一 schema。SpaceX 清单没有资产 SHA-256 字段；其结构与尺寸由实际 GLB 测试核对，Falcon Heavy 视频清单另外记录所用模型指纹。不要声称所有家族都有相同的溯源字段或检查能力。

Apple 与部分 DJI 模型来自品牌公开展示资源，版权及商标归各自权利人，来源公开不等于开放再分发许可。外观重建的几何由本项目制作，产品造型与品牌标识仍需与“原创产品设计”区分。仓库未提供统一 LICENSE，也未把全部模型声明为开放许可。参考链接、来源日期和已有精度说明必须保留；添加素材时记录其实际授权信息，不自行补写“官方授权”。

## 制作流程

### SpaceX

[build.ts](../src/spacecraft/build.ts) 使用 Three.js 程序化几何与材质生成模型；[export-spacecraft.ts](../scripts/export-spacecraft.ts) 导出、去重、焊接与清理后写入 `public/models/` 和清单。

```sh
npm run models:spacecraft                 # 重建 Falcon 9、Starship、Falcon Heavy 三款
npm run models:spacecraft -- falcon-heavy  # 只更新指定模型及其清单记录
node_modules/.bin/tsx --test src/spacecraft/spacecraft.test.ts
```

下表为本次清单快照，精确数值以后续生成结果为准：

| 模型 | 参考组合 | 三角面 | 文件大小约值 |
| --- | --- | ---: | ---: |
| Falcon 9 Block 5 | 70 m；9 台 Merlin 1D + 1 台 MVac | 282,600 | 2.26 MiB |
| Starship / Super Heavy | 52 m + 72 m；33 台助推器发动机 + 6 台上面级发动机 | 1,156,388 | 8.82 MiB |
| Falcon Heavy | 70 m 三芯组合；27 台 Merlin 1D + 1 台 MVac | 732,868 | 2.88 MiB |

猎鹰重型复用猎鹰 9 号细化箭体和发动机，新增侧芯鼻锥、连接支架、独立分离结构，共 12 片栅格翼和 12 条可展开着陆腿。星舰包含逐片隔热瓦、焊缝、襟翼和捕获支点。发动机泵体、管路、螺栓等是公开参考基础上的视觉近似，非特定飞行器的工程 CAD。

参考记录：[Falcon 9](https://www.spacex.com/vehicles/falcon-9/)、[Falcon Heavy](https://www.spacex.com/vehicles/falcon-heavy/)、[Falcon 用户指南](https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf)、[Starship](https://www.spacex.com/vehicles/starship/)。模型范围和采用构型由本项目规格固定，不随网页更新自动变化。修改 `falcon-heavy.glb` 后须按 [动画指南](ANIMATIONS.md) 重建相关短片。

### Apple

九款来源为 Apple 产品官网的公开 AR USDZ。保留展示组合，例如 iPhone 正背双机、iPad 的键盘与 Pencil、iMac 键鼠、AirPods 耳机与充电盒、Vision Pro 头带。查看器按展品归一化，下载保留转换后的米制坐标。

```sh
python3 scripts/import-apple-models.py --download
blender --background --factory-startup --python scripts/import-apple-models.py
npm run models:apple
node_modules/.bin/tsx --test src/apple/apple.test.ts
```

下载阶段使用标准 Python；转换阶段由 Blender 5.x 的 Python 运行。macOS 的 Blender 可用 `/Applications/Blender.app/Contents/MacOS/Blender`。脚本目前固定使用 `/private/tmp/3d-studio-apple-source` 和 `/private/tmp/3d-studio-apple-raw` 缓存，不是可配置的跨平台目录；移植时需同时核对导入脚本和优化脚本。

转换会修复 USD 覆盖透明度到 glTF Alpha 的映射，保留玻璃、屏幕与织物。静态几何按材质合并，Draco 压缩，彩色贴图使用高质量 WebP、数据贴图无损 WebP，上限 2K。源文件已有指纹时先核对，变化后应检查内容，不能静默接受。

Apple PNG 预览在 `public/models/apple/` 与 GLB 同名。当前没有专用 Apple 预览 npm 命令：修改模型后在详情页等待 `data-rendered="true"`，关闭自动旋转、恢复统一视角，从实际 WebGL 画布保存 PNG，再检查卡片。不能把 `models:apple` 写成同时完成了预览再生。

### DJI

完整 19 款、26 个构型、3 款官方源文件与 16 款重建说明见 [DJI 专项指南](DJI_MODELS.md)。不以颜色和套装扩充重复卡片；产品线与收录日期以 `products.json` 为准。

```sh
npm run models:dji
# 另一个终端已经运行 npm run dev；Playwright 安装方法见开发指南
node scripts/render-dji-previews.mjs
npm run test:dji
```

导入校验原始指纹并缓存源 GLB，重建由 [dji/build.ts](../src/dji/build.ts) 完成。导出采用 Draco 和内嵌 WebP；统计从实际解码的交付文件计算。预览为 `public/models/dji/thumbnails/` 中的 600 × 450 WebP。官网模型沿用其记录的展示比例，重建模型的局部结构与比例有估计成分。

### NVIDIA、Tesla、Xbox 与 PS5

三个模块都包含 `products.ts`、`specs.ts`、`build.ts`、加载器、详情、manifest 与测试。制作顺序为修改规格 / 建模源、导出、在运行的详情页渲染缩略图、检查实际文件和界面。预览统一位于对应 `public/models/<family>/`，900 × 600 WebP。

| 家族 | 导出 | 预览 | 验证 |
| --- | --- | --- | --- |
| NVIDIA | `npm run models:nvidia` | `npm run models:nvidia:previews` | `npm run test:nvidia` |
| Tesla | `npm run models:tesla` | `npm run models:tesla:previews` | `npm run test:tesla` |
| 主机 | `npm run models:consoles` | `npm run models:consoles:previews` | `npm run test:consoles` |

NVIDIA 的导出与预览可加 `-- nvidia-rtx-5090` 等单款 ID；Tesla 与主机脚本目前按整组导出，不要假定有相同参数。来源、近似范围、变体与特征在各 [模块说明](README.md) 中详列。Tesla 汽车是静态展品，Optimus 是静态站姿；Xbox / PS5 模型不包含主机模拟器。

### 原创资产与赛车

探索者、玄武岩、发射平台和天线是 [Models.tsx](../src/components/Models.tsx) 中的实时网格；它们直接在模型、场景和适用玩法中复用。射击中的探索者加装战斗组件，背景为本地原创 [nebula.png](../public/game/nebula.png)，不是用背景图替代舰体或弹幕。

三款赛车由 [cars.ts](../src/racing/cars.ts) 生成：车身放样、前后翼、侧箱、悬挂、Halo、驾驶员与轮胎。没有真实车队涂装；模型查看器和竞速游戏共用 `formula-r1.glb` 至 `formula-r3.glb`。

```sh
npm run models:export
node_modules/.bin/tsx --test src/racing/race.test.ts
npm run test:race
```

## 文件预算与验收

预算是当前测试的防增长上限，不是每款模型的推荐目标或实测帧率。单件绘制数量指解码文件的网格 primitive 计数，不能等同整个场景的所有渲染 pass。

| 家族 | 当前自动检查中的主要上限 |
| --- | --- |
| SpaceX / Apple | 单 GLB 小于 12 MiB，另验尺寸、结构和资源 |
| NVIDIA | 单 GLB 小于 2 MiB；最多 40 个绘制 primitive；小于 30 万三角面 |
| Tesla | 单 GLB 小于 1 MiB；最多 24 个绘制 primitive；小于 16 万三角面 |
| 主机 | 单 GLB 小于 2 MiB；最多 40 个绘制 primitive；小于 15 万三角面 |
| DJI / 原创赛车 | 以各自实际文件测试和浏览器检查为准，不套用其他家族的统一预算 |

新增模型需依次确认：ID 与来源不重复；分类和中文 / 英文别名正确；GLB 可真正解码且无外部缓冲；单位、原点和可动节点符合约定；文件统计与清单一致；卡片预览、详情近看、下载、加入场景和刷新正常。模型影响动画或游戏时还要验证它们。详见 [测试指南](TESTING.md)。

提交应包含源代码、必要的型号 / 来源数据、交付文件、预览和清单。缓存、下载中间文件、临时录像与 `dist/` 不作为模型源提交；已正式导出的 `public/videos/` 短片则是应用内容。
