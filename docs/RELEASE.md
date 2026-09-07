# 构建、发布与回退

[文档总览](README.md) · [开发指南](DEVELOPMENT.md) · [测试指南](TESTING.md)

项目使用 GitHub 仓库 [firefighter-eric/3d-studio](https://github.com/firefighter-eric/3d-studio) 与 Vercel 静态部署。canonical 站点为 [3d-studio-hazel.vercel.app](https://3d-studio-hazel.vercel.app/)。本文是发布操作规范，不表示当前工作树已经发布。

## 仓库中的构建契约

| 设置 | 来源 / 值 |
| --- | --- |
| Node | [package.json](../package.json) 的 `24.x` 与 [.nvmrc](../.nvmrc) 的 `24` |
| 框架 | [vercel.json](../vercel.json) 的 `vite` |
| 安装 | `npm ci` |
| 构建 | `npm test && npm run build` |
| 输出 | `dist` |
| 应用环境变量 | 当前不需要 |
| 地址 | hash 路由，详情刷新无需服务端路径 rewrite |

Vercel Git 集成采用 `main` 为 Production 的项目约定，但该绑定是远端项目设置，不由 `vercel.json` 完整表达；实际发布前核对仓库、分支、项目和域名。分支 Preview 与 canonical Production 分别检查，不能拿前者的成功代替后者。

`public/` 中的模型、图片、清单和解码器随 Vite 输出。MP4 保留在 `output/videos/`，由 `.gitignore` 与 `.vercelignore` 排除，不随 Git 或网站发布；构建不会生成缺失 GLB、导入 USDZ 或渲染 MP4。`docs/` 是仓库文档，不在站点中提供文档页面，也不进入普通 Vite 输出；[.vercelignore](../.vercelignore) 还将其排除于 CLI 上传。

## 本地交付检查

先确认所需内容是否已经合入 / 发布，避免重复导入和空 PR。检查工作树并确认发布范围：

```sh
git status --short
git diff --stat
git diff --check
git log -5 --oneline
```

查看远端状态时可 `git fetch origin`，比较当前分支与目标分支。已有未提交的其他任务改动不能为了清理状态而覆盖、删除或混入当前发布。提交应包含同一变更的建模源、交付 GLB、预览、清单和文档；不包含 MP4、`output/`、缓存、凭据、临时导出文件或 `dist/`。排除已暂存或已提交的 MP4 时，还要核对本次将推送的提交历史；仅加入忽略规则不能移除已跟踪文件。

按 [测试指南](TESTING.md) 完成与范围相符的检查。准备发布功能变更时至少通过自动测试与构建，再对实际体验做验证。使用 `npm run build` 后的 `npm run preview` 检查生产包；不要只检查带热更新的开发服务。

## 提交与 PR

发布任务中使用可审阅分支，默认命名 `codex/<简短变更名>`。显式暂存本次文件，检查暂存 diff，再提交和推送；有混合改动时不要直接 `git add .`。通过团队当前使用的 GitHub 界面或 CLI 创建 PR。

PR 说明应让没看过对话的人理解：

1. 具体问题与修改后的行为，新增什么可用入口。
2. 资产来源、精度、交付文件或兼容性变化。
3. 已执行的检查与结果，以及未覆盖的真实限制。

以实际 PR 最终 diff 为准编写标题和说明，范围变化后同步更新。多行正文使用真实换行；若用 `gh`，写入临时正文文件并用 `--body-file` 传入。检查和评审通过后，按照本次发布任务完成合并；不要将草稿 PR、构建排队或 Preview 就绪当作正式发布。

## Production 核对

合并后核对部署的仓库、commit、目标环境与成功状态，并确认 canonical 域名实际指向该版本。`main` 有新提交不证明部署已经成功。

| 检查对象 | 需要的证据 |
| --- | --- |
| 源代码 | 本次合并对应的准确 commit，远端 `main` 包含它 |
| 部署 | 该 commit 的 Production 构建成功，canonical 域名指向它 |
| 页面 | 实际打开受影响库 / 详情，直接刷新路由正常，数量、名称和操作正确 |
| 静态资源 | 新模型、预览与 Draco 请求成功，下载与交付文件相符；构建不含 MP4，网页无 MP4 请求或下载入口 |
| 体验 | 真实渲染 / 播放 / 游戏交互正常，无新增阻断错误；需要时复验手机 |

当前发布保留两套实时回收动画，需要检查时间推进、关键着陆状态与镜头；模型发布要检查旋转 / 近看和场景接入。MP4 的本地验证按 [测试指南](TESTING.md) 执行，不计入线上交付。测试结果、版本与可访问地址一起报告，尚未完成的步骤明确写出。

合并后在保留其他任务工作的前提下同步本地。清理或切换分支前先检查工作树；干净的 `main` 可使用 `git pull --ff-only`。只有本地与远端范围一致、Production 已验证，才将本次发布记为完成。

## 发布失败与回退

构建失败时先读失败日志，区分 TypeScript / 玩法 / 资产或视频一致性问题。修复真正的问题，不删掉测试或篡改固定指纹；缺交付文件时回到对应制作流程补齐。干净 checkout 不包含本地 MP4，仅其二进制测试按设计跳过，海报、清单与源指纹检查仍须通过。

若生产出现回归，先确定最近一个确实验证过的正常部署与 commit，再在 Vercel 的回退 / 部署管理中恢复该版本，随后核对 canonical 站点。源码也应通过针对问题提交的 revert 或修复 PR 恢复一致；避免强推改写共享分支历史。不要在不知道父提交语义时盲目回退 merge commit。

回退仍要验证模型与媒体、页面路由和本机存储兼容。资产和 manifest 应作为同一版本恢复；只恢复代码而保留新 GLB 或旧海报可能产生混合版本。本项目没有数据库迁移，但浏览器本机数据可能来自更高版本，读取兼容仍需考虑。

## 发布记录的最低内容

记录日期、PR / commit、Production 结果、canonical URL、执行过的自动与浏览器验证、资源一致性和剩余限制。记录与证据可以在 PR 或专项 QA 文档中保存；不要把一次成功状态写成永远有效的 README 保证。
