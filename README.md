# Zotero Connector for MarginNote

<p align="center">
  <img src="src/logo.png" width="128" height="128" alt="Zotero Connector Logo">
</p>

<p align="center">
  <strong>打通学术阅读的「最后一公里」，实现 Zotero 与 MarginNote 4 的深度联动</strong>
</p>

<p align="center">
  <a href="https://github.com/Temsys-Shen/zotero-marginnote">GitHub</a>
  ·
  <a href="https://github.com/Temsys-Shen/zotero-marginnote/releases">Releases</a>
</p>

---

## 🌟 核心理念

**Zotero Connector** 是专为 MarginNote 设计的增强插件。它打破了文献管理工具（Zotero）与深度阅读工具（MarginNote）之间的隔阂，让两者能够高效协同工作。无论是导入元数据、双向跳转，还是多端同步，它都能为您提供流畅的工作流体验。

---

## ✨ 功能特性

### 1. 深度双向联动

- **正向跳转**：在 MarginNote 卡片中自动生成 Zotero 链接，点击即可精准定位至 Zotero 条目。
- **PDF 直达**：支持直接从卡片打开 Zotero 中的 PDF 附件（本地路径或云端链接）。
- **反向链接**：在 Zotero 文献条目下自动关联 MarginNote 笔记，实现从文献库一键追溯到阅读笔记。

### 2. 精准文献搜索

- **实时搜索**：在插件面板内直接通过关键词、标题或作者搜索 Zotero 库。
- **进阶过滤**：深度支持按 **Collection (分类)** 和 **Tag (标签)** 进行筛选，帮您在海量文献中快速锁定目标。

### 3. 一键元数据解析

- **快速建卡**：将 Zotero 条目的标题、作者、年份、文献类型等元数据一键提取并生成 MarginNote 脑图卡片。
- **精美排版**：内置高度优化的 HTML 卡片模板，信息清晰易读，兼具美观与实用性。

### 4. 全平台与多模式支持

- **双 API 支撑**：同时支持 **Local API**（连接桌面版 Zotero）与 **Cloud API**（适用于 iPad 等移动端场景）。
- **Webview 体验**：基于现代化的 Webview 技术，提供流畅的搜索交互界面。

### 5. 高级交互设计

- **悬浮窗系统**：完全可定制的悬浮窗，支持 **自由拖拽、动态缩放、双击最大化/还原**。
- **状态持久化**：智能记忆窗口位置与大小，确保您的阅读环境始终如其所愿。
- **视觉美学**：完美适配 MarginNote 4 的圆角、阴影及透明设计。

---

## 🚀 快速开始

### 下载插件

前往 [Releases](https://github.com/Temsys-Shen/zotero-marginnote/releases) 下载最新的 `.mnaddon` 文件。

### 基本配置

- **本地模式**：需要开启电脑端 Zotero。
- **云端模式**：在设置中填入您的 Zotero API Key，即可在 iPad 上脱离电脑独立使用。

---

## 🔧 开发与构建

如果您希望从源码自行打包或参与开发：

```bash
# 安装构建依赖
pnpm install

# 构建插件
pnpm run build
```

构建生成的 `.mnaddon` 文件将出现在项目根目录。

---

## 📄 项目结构

- `src/main.js`: 插件逻辑入口。
- `src/WebViewController.js`: 负责 UI 交互、窗口管理及桥接逻辑。
- `src/web/`: 核心界面 HTML/JS/CSS。
- `src/network.js`: 轻量级网络请求封装。

---

## 📜 开源协议

本项目采用 [MIT License](LICENSE) 协议开源。

---

**由 ShenShichao 开发 | 插件 ID: `top.museday.mn.zotero`**
