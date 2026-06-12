initMarkdownConverter({
    storageArea: typeof browser !== 'undefined'
        ? browser.storage.local
        : (typeof chrome !== 'undefined' && chrome.storage ? chrome.storage.local : undefined),
    mermaidIdPrefix: 'sidebar',
    screenshotMinimumWidth: 320,
    screenshotWidthOffset: 24,
    allowOpenFile: true,
    allowClear: true,
    copyMode: 'rendered'
});
