# GitHub Lens 🔍

<p align="right">
  <a href="./README.md">English</a> | <a href="./README.zh-CN.md">简体中文</a>
</p>

![GitHub Lens Banner](assets/banner.png)

> **AI 驱动的仓库探索工具。**  
> 在 GitHub 页面中直接获得摘要、技术洞察与智能推荐。

GitHub Lens 是一个浏览器扩展，会将 AI 能力直接注入 GitHub 侧边栏。无需反复阅读大量代码和 README，即可在几秒内完成仓库概览与技术评估。

---

## ✨ 核心功能

### 📋 仓库快速摘要
- **核心结论**：用一句话快速理解仓库用途。
- **技术栈识别**：自动识别主要语言、框架与依赖。
- **关键亮点**：总结项目价值与核心特性。

### 🌡️ 项目健康与发现
- **活跃度评估**：快速判断项目维护状态。
- **智能建议**：AI 给出“值得关注/谨慎使用”等建议。
- **关联发现**：自动推荐相似仓库、工具和相关文章。

### ⚙️ 高度可配置
- **多模型支持**：支持 Anthropic（Claude）、OpenAI、DeepSeek、Moonshot 等。
- **自定义提示词**：可按你的场景定制分析逻辑。
- **多语言输出**：支持中英文输出。

---

## 🚀 快速开始

### Chrome Web Store 下载
- [下载 GitHub Lens](https://chromewebstore.google.com/detail/github-lens/cljkhckgkdgkfklbcclkajiopnejfjbo)

### 前置要求
- [Node.js](https://nodejs.org/)（v18+）
- [pnpm](https://pnpm.io/)（v8+）

### 安装步骤
1. 克隆仓库：
   ```bash
   git clone https://github.com/lnmput/github-lens.git
   cd github-lens
   ```

2. 安装依赖：
   ```bash
   pnpm install
   ```

3. 启动开发模式：
   ```bash
   pnpm dev
   ```

### 加载扩展
1. 打开 Chrome，访问 `chrome://extensions/`。
2. 开启 **开发者模式**。
3. 点击 **加载已解压的扩展程序**，选择 Plasmo 生成的 `build/chrome-mv3-dev` 目录。

---

## 🛠️ 配置说明

1. 打开扩展 **Options**（右键扩展图标，或点击侧边栏设置按钮）。
2. 选择 **API Provider** 并填写 **API Key**。
3. 执行连接测试，确认可用。
4. 开始在 GitHub 页面中使用 AI 分析能力。

---

## 📁 项目结构

```text
.
├── assets/           # 扩展图标与静态资源
├── background/       # Service Worker 与后台逻辑
├── components/       # UI 组件与功能视图
├── contents/         # 内容脚本（GitHub 侧边栏注入）
├── lib/              # 核心逻辑、AI 提示词与工具函数
├── options/          # 扩展设置页
├── popup/            # 扩展弹窗
└── styles/           # 全局样式与 Tailwind 配置
```

---

## 🛡️ 隐私与安全
GitHub Lens 仅与用户选择的 AI 服务商通信。API Key 存储在浏览器本地，不会上传到我们的服务器。

---

## 📄 许可证
[MIT License](LICENSE)

---

<p align="center">
  为开源社区而构建 ❤️
</p>
