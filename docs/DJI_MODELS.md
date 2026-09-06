# DJI 产品模型收藏

[文档总览](README.md) · [统一资产规范](ASSETS.md) · [使用指南](USER_GUIDE.md) · [制作工具配置](DEVELOPMENT.md)

型号资料核对日期：2026-09-06。本次收录按该日期的产品线各保留一代，共 19 款；不重复收录前代、颜色或套装，也不承诺随官网自动更新。RS、RS Pro、RS Mini 和 Mic、Mic Mini 分别作为独立产品线。同一产品的展开、折叠等状态在详情中切换，不增加卡片数量。

当前入口为统一模型库的「DJI」品牌筛选。类型、来源与搜索可以组合，详情仍提供构型切换；加入场景使用默认构型，下载使用当前查看构型。

| 类别 | 产品 | 模型来源 |
| --- | --- | --- |
| Osmo 相机 | [Osmo Pocket 4P](https://www.dji.com/cn/osmo-pocket-4p) | 外观近似重建；横屏 / 竖屏 |
| Osmo 相机 | [Osmo Action 6](https://www.dji.com/cn/osmo-action-6) | 外观近似重建 |
| Osmo 相机 | [Osmo 360 II](https://www.dji.com/cn/360-2) | 外观近似重建 |
| Osmo 相机 | [Osmo Nano](https://www.dji.com/cn/nano) | 外观近似重建 |
| 无人机 | [DJI Mavic 4 Pro](https://www.dji.com/cn/mavic-4-pro) | 外观近似重建；展开 / 折叠 |
| 无人机 | [DJI Air 3S](https://www.dji.com/cn/air-3s) | 外观近似重建；展开 / 折叠 |
| 无人机 | [DJI Mini 5 Pro](https://www.dji.com/cn/mini-5-pro) | 外观近似重建；展开 / 折叠 |
| 无人机 | [DJI Flip](https://www.dji.com/cn/flip) | 外观近似重建 |
| 无人机 | [DJI Neo 2](https://www.dji.com/cn/neo-2) | 外观近似重建 |
| 无人机 | [DJI Avata 360](https://www.dji.com/cn/avata-360) | 外观近似重建 |
| 无人机 | [DJI Lito X1](https://www.dji.com/cn/lito-x1) | 外观近似重建；展开 / 折叠 |
| 无人机 | [DJI Inspire 3](https://www.dji.com/cn/inspire-3) | 官网展示模型；环拍形态 / 仰拍形态 |
| 稳定器 | [Osmo Mobile 8P](https://www.dji.com/cn/osmo-mobile-8p) | 外观近似重建 |
| 稳定器 | [DJI RS 5](https://www.dji.com/cn/rs-5) | 外观近似重建 |
| 稳定器 | [DJI RS 4 Pro](https://www.dji.com/cn/rs-4-pro) | 官网展示模型 |
| 稳定器 | [DJI RS 4 Mini](https://www.dji.com/cn/rs-4-mini) | 官网展示模型；云台单机 / 云台套装 |
| 稳定器 | [DJI Ronin 4D](https://www.dji.com/cn/ronin-4d) | 外观近似重建 |
| 麦克风 | [DJI Mic 3](https://www.dji.com/cn/mic-3) | 外观近似重建 |
| 麦克风 | [DJI Mic Mini 2S](https://www.dji.com/cn/mic-mini-2s) | 外观近似重建 |

## 来源与精度

3 款产品来自 DJI 官网公开三维展示文件，共 5 个源 GLB。模型版权与商标属于 DJI，公开产品页面未提供独立再分发授权条款；本项目保留来源记录，不声明这些资产为原创或开放许可。

另外 16 款依据官方产品照片制作可旋转的三维网格，包含外壳、镜片、云台、按钮、接口、散热孔、旋翼或充电盒等主要外观结构。屏幕与标识贴图由脚本绘制，没有把产品照片贴在平面上冒充模型。由于没有测量数据或多视角扫描，尺寸、曲面与局部结构是外观近似。界面卡片、详情和 GLB 元数据都区分来源，不能将高面数解释为工程精度。

产品页面、照片参考和原始模型地址在 `src/dji/products.json`；原始源文件与交付 GLB 的 SHA-256、解码后的三角面数、包围盒和文件大小在 `src/dji/manifest.json`。全部 26 个构型约 18.55 MiB，均使用米制坐标、Y 轴向上、底部居中的原点。近似模型按估计比例导出，官网文件沿用展示模型的坐标比例。查看器与场景另作展品尺寸缩放，下载保留导出坐标。

## 导出与预览

```sh
npm run models:dji
npm run test:dji
# 启动 npm run dev 后，使用已安装 Playwright 的环境：
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/render-dji-previews.mjs
```

`scripts/import-dji.ts` 校验官方文件的固定指纹，源文件缓存默认为系统临时目录下的 `3d-studio-dji-sources`，可用 `DJI_SOURCE_CACHE` 覆盖。近似几何由 `src/dji/build.ts` 生成；生成器不进入前端运行包。导出使用 Draco 几何压缩和最高 4K 的高质量 WebP 内嵌纹理，不主动简化曲面。Draco 可能移除零面积三角面，因此统计来自重新解码的交付文件。

模型、纹理和 Draco 解码器均由本站提供，运行时不依赖 DJI CDN。库卡片使用真实 GLB 的 600 × 450 WebP 渲染图；进入详情、场景时模型按需加载。离开视图后回收无引用的模型资源，屏幕外的实时预览不保留 WebGL 画布。`DJI_PREVIEW_ORIGIN` 可覆盖预览脚本的默认地址 `http://localhost:5180`。

## 验证方法与历史结果

自动检查全部构型的真实 Draco 解码、文件指纹、嵌入资源、三角面数、尺寸与原点、来源标记，以及共享场景保存兼容性。当前浏览器验收检查统一库的品牌 / 类型 / 来源组合与返回上下文，以及实际模型渲染、视角控制、构型切换、下载文件、添加场景与刷新保留；覆盖 1440 px 桌面、390 / 320 px 窄屏和模拟加载失败后的重试。统一库没有分页控件，不再沿用早期独立收藏页的分页流程。近似外观仍需按创作用途判断，不用于测量或加工。

历史验证快照（2026-09-06 DJI 初次交付）：当时项目 59 项测试、TypeScript 检查与生产构建通过；19 个默认构型和 7 个额外构型均完成真实 Chrome 渲染，26 项交互断言通过。额外检查手机镜头与按钮之间的间距、旧模型滚动进入屏幕后重新加载。正常操作没有页面错误或 WebGL 上下文超限警告；仍有现有 Three.js 依赖的 `THREE.Clock` 弃用提示。这些数量不代表当前全部测试，后续按 [测试指南](TESTING.md) 验证。
