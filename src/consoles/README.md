# 游戏主机模型

[文档总览](../../docs/README.md) · [设计理念](../../docs/design/overview.md) · [统一资产规范](../../docs/ASSETS.md) · [制作工具配置](../../docs/DEVELOPMENT.md)

四款独立模型：Microsoft Xbox Series X（Carbon Black 光驱版）、Xbox Series S（Robot White 数字版）、Sony PS5 轻薄光驱版与 PS5 Pro 数字版。均为 3D Studio 依据官方产品页面和技术资料制作的外观重建，非官方 CAD。造型与商标归各自权利人；没有导入第三方模型后改标为原创。

`products.ts` 保存品牌、版本、中文和英文搜索别名及官方来源，资料核对日期为 2026-09-07。主体尺寸以官方资料为参照：Series X 151 × 301 × 151 mm、Series S 竖放 65 × 275 × 151 mm、PS5 Slim 竖放 96 × 358 × 216 mm、PS5 Pro 竖放 89 × 388 × 216 mm。接口、曲面、光驱、风道与灯带为近似重建。PS5 下载模型包含展示用底座，不表示底座随官方产品附送；包围盒不能用于机箱、展柜装配验证。

`build.ts` 中的 Xbox 顶部 / 圆形散热孔是几何孔洞，PS5 四片外壳是有厚度的曲面，PS5 Pro 保留三道散热开缝。前后连接区域、显示与供电接口、光驱开口均使用三维几何。贴图仅为本项目绘制的小型标记，全部内嵌；未把产品照片贴成模型。

GLB 采用米、Y 向上、前控制面朝 +Z、X/Z 居中、底部 Y=0。网页与共享场景按最长边归一化展示。几何按材质合并，具名部件保留在 GLB 中，Draco 解码器沿用本地 `public/vendor/draco/`。每个模型上限 2 MiB、40 个 draw calls、15 万三角面。

```sh
npm run models:consoles
npm run dev
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs npm run models:consoles:previews
npm run test:consoles
```

预览图从实际模型查看器的 WebGL 画布生成，尺寸为 900 × 600。`manifest.json` 记录最终 GLB 的 SHA-256、字节数、解码后的三角面、材质数量和包围盒。重新建模后应重新导出、渲染预览并验证。

模型库通过 `brand=microsoft` / `brand=sony` 与 `type=console` 组合筛选，搜索 Xbox、微软、PS5、索尼或完整型号均可找到相应主机。详情支持环绕查看、缩放、下载和加入共享场景，不提供主机模拟器。
