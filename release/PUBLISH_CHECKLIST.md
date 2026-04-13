# Markdown Converter Publishing Checklist

Last updated: 2026-04-05 04:14:50
Version: 1.1.0

## 1. Upload Package Information

- Chrome upload package: release/chrome/markdown_converter-1.1.0.zip
- Chrome package size: 3,660,779 bytes
- Chrome build time: 2026-04-05 04:14:49
- Firefox upload package: release/firefox/markdown_converter-1.1.0.zip
- Firefox package size: 3,661,342 bytes
- Firefox build time: 2026-04-05 04:19:09

## 2. Store Basics

- Extension name: Markdown Converter
- Version: 1.1.0
- Suggested categories: Productivity, Developer Tools
- Short description:
  - Convert Markdown to HTML, PDF, and PNG with live preview, Mermaid diagrams, and KaTeX math.
- Suggested long description:
  - Markdown Converter provides a local side panel editing experience for Markdown with instant preview, GitHub Flavored Markdown support, Mermaid diagram rendering, KaTeX formula rendering, and one-click export to HTML, PDF, and PNG screenshots.

## 3. Feature List (Can Be Pasted into Review Notes)

- Single side panel UI opened from the toolbar icon
- Real-time Markdown preview
- Mermaid diagram rendering
- KaTeX math rendering
- Export to HTML
- Export to PDF via the browser print flow
- Export to PNG screenshot
- Light and dark theme toggle
- Local auto-save using storage

## 4. Permission Explanation Template

### Chrome (Manifest V3)

- permissions:
  - storage: Saves user input content and theme settings
  - sidePanel: Opens and displays the side panel UI

### Firefox

- permissions:
  - storage: Saves user input content and theme settings
- gecko id:
  - markdown-converter-ext@tiptinker.com
- gecko strict_min_version: 140.0 (Firefox 140+ is required for data_collection_permissions support)
- data_collection_permissions: required: ["none"] (no data is collected or transmitted)

## 5. Privacy and Data Declaration Template

- Data collection: No personal user data is collected
- Data transmission: Edited content is not transmitted to external servers
- Data storage: Only browser local storage is used to save lastContent and isDarkMode
- Third-party services: No remote API dependencies; core libraries are bundled with the package

## 6. Pre-Publish Self-Check

- [ ] Chrome package loads successfully in Developer Mode
- [ ] Firefox package loads successfully in about:debugging
- [ ] Clicking the toolbar icon opens the side panel
- [ ] The Editor and Preview tabs switch correctly
- [ ] HTML, PDF, and Screenshot export all work
- [ ] Mermaid and KaTeX render correctly
- [ ] Theme switching and auto-save work correctly
- [ ] Toast notifications do not block the bottom buttons
- [ ] The icon before the title has been removed and only the text "Markdown Converter" is shown

## 7. Store Submission Notes (Suggested)

- This extension runs locally in the browser side panel.
- User content is processed locally and is not uploaded to external services.
- Exported files are generated on-device.

## 8. Items to Fill In Before Publishing

- [x] Official website URL https://www.tiptinker.com/markdown-to-html-converter/
- [x] Support page URL https://www.tiptinker.com/contact-us/
- [x] Privacy policy URL (if required by the store) https://www.tiptinker.com/privacy-policy/
- [x] Screenshots (at least 1-3) images/screenshot-1.png, screenshot-2.png, screenshot-3.png
- [x] Icon and promotional graphic (per store size requirements) images/feature-graphic.png
