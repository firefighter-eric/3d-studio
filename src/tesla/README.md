# Tesla 产品模型

12 款 3D Studio 原创外观重建模型，接入统一模型库的 Tesla 品牌、汽车／机器人／储能设备／充电桩分类。车辆仅用于查看和场景组合；不接入方程式赛车游戏。

| 模型 | 外观参考 | 官方资料 |
| --- | --- | --- |
| Model 3 | 焕新版，白色轿车 | [Model 3](https://www.tesla.com/model3) |
| Model Y | 焕新版，蓝色 SUV，贯穿灯带 | [Model Y](https://www.tesla.com/modely) |
| Model S | 红色溜背轿车 | [Model S](https://www.tesla.com/models) |
| Model X | 白色 SUV，闭合鹰翼门分缝 | [Model X](https://www.tesla.com/modelx) |
| Cybertruck | 钢色折面皮卡，封闭货厢 | [Cybertruck](https://www.tesla.com/cybertruck) |
| Semi | 三轴电动牵引车，不含挂车 | [Semi](https://www.tesla.com/semi) |
| Roadster | 新一代公开展示外观，红色跑车 | [Roadster](https://www.tesla.com/roadster) |
| Cybercab | We, Robot 金色展示外观，闭合车门 | [We, Robot](https://www.tesla.com/en_ca/we-robot) |
| Optimus | 黑白人形机器人，静态站姿 | [AI & Robotics](https://www.tesla.com/AI) |
| Powerwall 3 | 白色家用储能设备 | [Powerwall](https://www.tesla.com/powerwall) |
| Megapack | 2 XL 模块舱门与散热布局 | [Megapack](https://www.tesla.com/megapack) |
| Supercharger V4 | 高立柱与长充电线 | [Supercharger](https://www.tesla.com/supercharger) |

资料核对日期：2026-09-07。上述产品名与外观用于标识模型，不表示具体配置、产销状态或工程精度。尺寸和机械细节为展示估算；不包含精确底盘、内饰、动力系统、储能内部结构或可执行的机器人关节仿真。产品设计及商标属于 Tesla，模型不是官方 CAD，也不附带 Tesla 授权声明。

## 资产契约

- `build.ts`：确定性的 Three.js 几何与材质；独立车身、车轮、玻璃、灯组、机器人关节及能源设备结构。
- `products.ts`：名称、中文和英文别名、分类、外观参考及近似尺寸。
- `manifest.json`：每款最终 GLB 的尺寸、SHA-256、文件大小、面数与来源。
- `public/models/tesla/*.glb`：Y 轴向上，X/Z 居中，最低点 Y=0，单位为米。运行时归一化最长边，场景使用展示比例。
- `public/models/tesla/*.webp`：通过实际模型详情页渲染的 900 × 600 透明背景预览。没有把产品照片作为模型或预览替代品。
- 文件采用 Draco 压缩；复用仓库内 `public/vendor/draco/` 解码器。标签纹理由本项目生成并嵌入 GLB，没有远程纹理依赖。

## 重建

```sh
npm run models:tesla
npm run dev
# 另开一个终端；需可用的 Chrome 与 Playwright。
npm run models:tesla:previews
npm run test:tesla
```

`PLAYWRIGHT_MODULE` 可指向宿主机已有 Playwright 模块；`TESLA_PREVIEW_ORIGIN` 可指定当前项目服务地址，默认 `http://localhost:5180`。

资产测试验证所有文件可解码、哈希一致、无远程资源、落地点及中心正确，单件低于 1 MiB、16 万三角面和 24 次绘制。模型库测试覆盖中文别名、品牌与类型组合、来源筛选及 URL 状态。
