# Markdown Converter 发布清单

更新时间: 2026-03-28 17:25:28
版本: 1.0.0

## 1. 上传包信息

- Chrome 上传包: release/chrome/markdown_converter-1.0.0.zip
- Chrome 包大小: 2,747,346 bytes
- Chrome 打包时间: 2026-03-28 17:17:32
- Firefox 上传包: release/firefox/markdown_converter-1.0.0.zip
- Firefox 包大小: 2,747,374 bytes
- Firefox 打包时间: 2026-03-28 17:25:28

## 2. 商店基础信息

- 扩展名称: Markdown Converter
- 版本号: 1.0.0
- 分类建议: Productivity, Developer Tools
- 一句话简介:
  - Convert Markdown to HTML, PDF, and PNG with live preview, Mermaid diagrams, and KaTeX math.
- 长描述建议:
  - Markdown Converter provides a local side panel editing experience for Markdown with instant preview, GitHub Flavored Markdown support, Mermaid diagram rendering, KaTeX formula rendering, and one-click export to HTML, PDF, and PNG screenshot.

## 3. 功能清单（可贴到审核说明）

- 单一侧边栏 UI（点击工具栏图标打开）
- 实时 Markdown 预览
- Mermaid 流程图渲染
- KaTeX 数学公式渲染
- 导出 HTML
- 导出 PDF（浏览器打印流程）
- 导出 PNG 截图
- 明暗主题切换
- 本地自动保存（storage）

## 4. 权限说明模板

### Chrome (Manifest V3)

- permissions:
  - storage: 保存用户输入内容和主题设置
  - sidePanel: 打开和显示侧边栏面板

### Firefox

- permissions:
  - storage: 保存用户输入内容和主题设置
- gecko id:
  - markdown-converter-ext@tiptinker.com
- gecko strict_min_version: 140.0 (Firefox 140+ required for data_collection_permissions support)
- data_collection_permissions: required: ["none"] (no data collected or transmitted)

## 5. 隐私与数据声明模板

- 数据收集: 不收集用户个人数据
- 数据传输: 不向外部服务器传输编辑内容
- 数据存储: 仅使用浏览器本地存储保存 lastContent 和 isDarkMode
- 第三方服务: 无远程 API 依赖，核心库随包分发

## 6. 发布前自检

- [ ] Chrome 包可在开发者模式成功加载
- [ ] Firefox 包可在 about:debugging 成功加载
- [ ] 点击工具栏图标可打开侧边栏
- [ ] Editor/Preview 两个标签切换正常
- [ ] HTML/PDF/Screenshot 导出可用
- [ ] Mermaid 与 KaTeX 渲染正常
- [ ] 主题切换与自动保存正常
- [ ] 通知提示不会遮挡底部按钮
- [ ] 标题前图标已移除（仅显示 Markdown Converter 文本）

## 7. 商店提交备注（建议）

- This extension runs locally in the browser side panel.
- User content is processed locally and is not uploaded to external services.
- Exported files are generated on-device.

## 8. 待你补充（发布前必填）

- [x] 官方网站 URL https://www.tiptinker.com/markdown-to-html-converter/
- [x] 支持页 URL https://www.tiptinker.com/contact-us/
- [x] 隐私政策 URL（若商店要求）https://www.tiptinker.com/privacy-policy/
- [x] 截图（至少 1-3 张）images/screenshot-1.png, screenshot-2.png, screenshot-3.png
- [x] 图标与宣传图（按商店尺寸要求）images/feature-graphic.png
