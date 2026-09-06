# NVIDIA 硬件模型

6 款独立 GLB：GB200 NVL72、GB300 NVL72、DGX B300、B300 SXM GPU、DGX Spark、DGX Station。全部为本项目依公开资料制作的外观重建，非 NVIDIA 官方 CAD。产品造型和商标属于 NVIDIA；不存在下载第三方模型后重新声明为原创的情况。

`products.ts` 保存型号、官方产品/技术来源与尺寸精度说明，资料核对日期为 2026-09-06。NVL72 的拓扑参考官方用户指南；DGX B300 采用 10U、482.6 × 442 × 904.2 mm 外廓；Spark 采用 150 × 50.5 × 150 mm 外廓。接口、孔位、线缆及小型结构近似。B300 GPU 为封装结构示意。DGX Station 参考官网 X 形前脸展示图，非特定 OEM 机箱，尺寸为估算。

`build.ts` 是可再生建模源，按材质合并静态细节，同时保留机柜框架、托盘、冷却管线和前后面板等具名层级。下载文件采用米、Y 向上、正面朝 +Z、X/Z 居中、底部 Y=0。网页和场景按最长边归一化展示。动态 PBR 光照；未提供碰撞体或工程仿真。

```sh
npm run models:nvidia
npm run test:nvidia
# 先运行 npm run dev。Playwright 可以来自主机已有安装：
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs npm run models:nvidia:previews
```

`manifest.json` 记录最终字节数、SHA-256、解码后的几何数量和实际包围盒。贴图是本项目生成的文字与金属纹理，内嵌于 GLB。Draco 解码器随项目保存在 `public/vendor/draco/`，不依赖外部 CDN。每个文件预算 2 MiB、40 个 draw calls、30 万三角面。

缩略图通过真实网页的 WebGL 画布渲染，输出为 `public/models/nvidia/*.webp`，与查看器使用同一份 GLB。模型变更后需重新导出、测试并渲染缩略图。
