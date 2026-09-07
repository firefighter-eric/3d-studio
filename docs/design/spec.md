# 早期界面设计记录

> 历史文档：本文保留最初的三标签、四模型原型与概念图，不是当前界面规范。现行四标签、统一模型库、设计理念和视觉规则见 [设计理念与产品规范](overview.md)；完整入口见 [文档总览](../README.md)。下文的旧名称、提示词与布局仅用于说明演变过程。

参考图使用内置 ImageGen 生成。`concept-initial.png` 是最早的单火箭方向，收到模型/场景/游戏三标签要求后由 `concept-model-library.png` 替代。后者实际原生尺寸为 **997 × 1577**。

当前站点名称统一为 **3D Studio**，覆盖导航、页脚、页面标题和赛车品牌文字。下方图片与生成提示保留为早期设计记录。

## 早期生成提示（历史记录）

Generate a fresh complete updated design specification for this Chinese 3D model studio app. Preserve the reference's exact near-black studio background, ivory-orange beautiful 3D retro rocket focal point, lime #d0ed87 CTA, clean Chinese typography, simple gray border, rounded showcase, restrained atmosphere and generous spacing. User changed product scope: the top navigation MUST be three equal clear tabs '模型' (active), '场景', '游戏'. Brand stays '形际' with 'FORM / SPACE'. Right small text '你的三维游乐场'. Create a full primary models library screen at 1536px wide, 1280px tall, legible code-native UI. Top page heading '模型' with subtitle '从每一个角度，发现想象。' and right '04 件作品'. Main upper hero panel height 500px, left title '探索者 01', small catalog 'EXPLORER / 001', exact paragraph '好奇心，是最好的推进器。' then '一枚为未知而生的口袋火箭。', text '原创设计 · 航天探索', lime button '查看模型', outlined secondary '玩游戏', bottom checkbox '选为创作素材'. Right half hero contains the same beautiful genuine three-dimensional rocket with orange ogive nose, ivory body, machined metallic engine, three orange swept fins, two dark teal round portholes and fine seams. Bottom right viewport hint '拖动旋转 · 滚轮缩放'. Below hero a small open heading '更多创作素材' with right '选择模型，组合你的世界'. Then THREE equal compact real asset preview cards in one horizontal row: 1 '玄武岩' with a low-poly chunky graphite rock, category '自然'; 2 '发射平台' with finished industrial octagonal dark gray launch pad with orange-yellow ring and small perimeter lights, category '建筑'; 3 '信号天线' with elegant parabolic satellite dish on metallic tripod tower and small coral receiver, category '设施'. Each card preview rendered in same dark studio with strong silhouette, at lower part a native '查看模型 ↗' link plus a small selection checkbox top-right. Do NOT add locked or fake assets. Minimal footer below: left 'FORM / SPACE'; right '让想象，成为可以触碰的世界。'. Scene library and game library will be separate tabs reusing these same visual tokens, not crammed into this screen. No upload, image-to-3D generation, accounts, faux progress, fake metrics, or extra models. This is the entire scrollable product library, not a marketing landing page. Match original design quality while updating navigation and providing the three additional asset cards. All text native UI, no UI will be shipped as a screenshot. Preserve white-orange sophisticated rocket look and acid-lime accent precisely.

## 原型阶段的实现规范

- 背景 `#0b1014`，文字 `#eff0e9`，辅助文字 `#929d9f`，边框 `#293237`，主要操作 `#d0ed87`。
- Inter Variable 本地字体；中文使用系统苹方/微软雅黑。大标题 29–60px；正文与控制设独立字号，不依赖浏览器默认样式。
- 顶部三导航；单一横向主作品展示；下方三件素材。窄屏改为模型在上、文字在下，额外素材采用横向紧凑条目。
- 统一线性图标、轻圆角按钮、细描边、少量轨道线。所有文案、按钮、选择状态均为 HTML。
- 查看器有独立全景取景、旋转/缩放、恢复、自动旋转。场景与游戏沿用同一颜色、字体和控件系统。
- 设计图只用作参考，不作为页面背景替代真实界面，也不作为火箭或其他模型的运行时贴片。

## 原型阶段的有意差异

用户明确授权原创程序化真三维模型，因此运行时使用可旋转、可复用的原创网格，采用干净的材质与较少的表面装饰。它们并非参考图中写实纹理和高密度机械细节的逐像素复制。模型和资产卡的比例按真实视角控制与多种屏幕尺寸重新取景；这属于真实三维交付的实现选择。

首屏核心文案、模型名称、三个导航、两种入口、选中素材流程与参考一致。附加素材的英文目录编号用于与模型详情保持识别一致。场景列表、实例添加和游戏菜单是用户明确新增要求，并沿用同一视觉系统。
