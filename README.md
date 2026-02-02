# Zotero Connector for MarginNote

<p align="center">
  <strong>在 MarginNote 中连接 Zotero，打通文献管理与阅读标注</strong>
</p>

<p align="center">
  <a href="https://github.com/Temsys-Shen/zotero-marginnote">GitHub</a>
  ·
  <a href="https://github.com/Temsys-Shen/zotero-marginnote/releases">Releases</a>
</p>

---

## 简介

MarginNote 非常适合读论文、整理文献中的关系和思路；而读论文离不开 Zotero。  
**Zotero Connector** 是 MarginNote 的插件，让你在 MN 里直接搜索 Zotero 文献、写入卡片，并跳转到 Zotero（本地或云端）的条目与附件，实现「文献管理 + 深度阅读」的一体化工作流。

- **支持本地与云端 API**：在 iPad 上也可通过 Zotero 云端 API 使用。
- **版本要求**：MarginNote ≥ 4.2.3。

---

## 功能概览

### 已实现 (v0.1.0)

| 功能 | 说明 |
|------|------|
| 从 Zotero 搜索文献 | 在 MN 内按关键词搜索 Zotero 库中的文献数据 |
| 将 Zotero 信息写入卡片 | 把标题、作者、年份等元数据写入 MN 卡片 |
| 跳转到 Zotero 文献/附件 | 点击链接可打开 Zotero 中对应条目或附件（本地/云端） |
| 本地 + 云端 API | 同时支持本地 Zotero 与 Zotero 云端，iPad 可用 |

### 计划中

- 在 Zotero 中加入到 MN 的反向链接
- 按 Collection / Tag 作为条件搜索
- 坏链检索与活链更新
- 笔记与标注的双向同步
- 导出 BibTeX 与参考文献表

---

## 工作流愿景

目标是从「Zotero 导入 → 在 MN 中标记与整理 → 导出参考文献」的完整写作流程：

| 阶段 | 状态 |
|------|------|
| 从 Zotero 导入文献 | 规划中 |
| 在 MN 中标记 | 规划中 |
| 在 MN 中整理、重排文献 | 规划中 |
| 从 MN 导出参考文献 | 规划中 |
| 在 MN 中完成写作全流程 | 目标 |

---

## 安装与使用

1. 前往 [Releases](https://github.com/Temsys-Shen/zotero-marginnote/releases) 下载最新 `.mnaddon` 文件。
2. 在 MarginNote 中通过「设置 → 插件」安装该 `.mnaddon`。
3. 安装后，在插件内按提示配置 Zotero 本地或云端 API（如 API Key、库 ID 等），即可开始搜索与写入卡片。

---

## 本地构建

从源码打包插件：

```bash
pnpm install # 其实不用，因为完全零依赖
pnpm run build
```

生成的 `zotero-connector-v0.1.0.mnaddon` 位于项目根目录，可拖入 MarginNote 安装。

---

## 项目结构（简要）

```
src/
├── main.js              # 插件入口
├── mnaddon.json         # 插件元信息
├── WebViewController.js # 网页/链接与 Zotero 跳转
├── webpage.html         # 前端搜索与展示
├── network.js           # 网络请求封装
└── ...
```

---

## 开源与贡献

本项目已开源至 GitHub，欢迎提 Issue 与 Pull Request：

- **仓库**：[Temsys-Shen/zotero-marginnote](https://github.com/Temsys-Shen/zotero-marginnote)

---

## 作者与许可

- **作者**：ShenShichao  
- 插件 ID：`top.museday.mn.zotero`  
- **许可**：[MIT](LICENSE)
