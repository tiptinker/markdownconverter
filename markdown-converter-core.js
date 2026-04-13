function createStorageAdapter(storageArea) {
    if (!storageArea) {
        return {
            get(keys, callback) {
                callback({});
            },
            set() {}
        };
    }

    return {
        get(keys, callback) {
            try {
                const result = storageArea.get(keys, callback);
                if (result && typeof result.then === 'function') {
                    result.then((items) => callback(items || {})).catch((error) => {
                        console.warn('Storage get failed:', error);
                        callback({});
                    });
                }
            } catch (error) {
                console.warn('Storage get failed:', error);
                callback({});
            }
        },
        set(values) {
            try {
                const result = storageArea.set(values);
                if (result && typeof result.catch === 'function') {
                    result.catch((error) => {
                        console.warn('Storage set failed:', error);
                    });
                }
            } catch (error) {
                console.warn('Storage set failed:', error);
            }
        }
    };
}

function initializeLibraries() {
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true
        });
    }

    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose'
        });
    }
}

function sanitizeHtml(html) {
    if (!html) {
        return '';
    }

    if (typeof DOMPurify !== 'undefined' && typeof DOMPurify.sanitize === 'function') {
        return DOMPurify.sanitize(html, {
            USE_PROFILES: { html: true }
        });
    }

    return fallbackSanitizeHtml(html);
}

function fallbackSanitizeHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = html;

    const blockedTags = new Set([
        'base',
        'embed',
        'form',
        'iframe',
        'link',
        'meta',
        'object',
        'script',
        'style'
    ]);
    const urlAttributes = new Set(['href', 'src', 'xlink:href']);
    const elements = template.content.querySelectorAll('*');

    for (const element of elements) {
        const tagName = element.tagName.toLowerCase();
        if (blockedTags.has(tagName)) {
            element.remove();
            continue;
        }

        for (const attribute of Array.from(element.attributes)) {
            const attributeName = attribute.name.toLowerCase();
            const attributeValue = attribute.value.trim();

            if (attributeName.startsWith('on') || attributeName === 'srcdoc') {
                element.removeAttribute(attribute.name);
                continue;
            }

            if (!urlAttributes.has(attributeName)) {
                continue;
            }

            if (!attributeValue) {
                continue;
            }

            const isSafeDataImage = /^data:image\//i.test(attributeValue);
            const isSafeUrl = /^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(attributeValue);

            if (!isSafeDataImage && !isSafeUrl) {
                element.removeAttribute(attribute.name);
            }
        }
    }

    return template.innerHTML;
}

const thematicBreakRegex = /^\s{0,3}(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/;

function normalizeMarkdown(markdownText) {
    const lines = (markdownText || '').replace(/\r\n/g, '\n').split('\n');
    const normalizedLines = [];

    lines.forEach((line, index) => {
        const isThematicBreak = thematicBreakRegex.test(line);

        if (isThematicBreak) {
            let consecutiveNonBlankLines = 0;
            let cursor = normalizedLines.length - 1;

            while (cursor >= 0 && normalizedLines[cursor].trim() !== '') {
                consecutiveNonBlankLines += 1;
                cursor -= 1;
            }

            let previousLine = null;
            for (let previousIndex = normalizedLines.length - 1; previousIndex >= 0; previousIndex -= 1) {
                if (normalizedLines[previousIndex].trim() !== '') {
                    previousLine = normalizedLines[previousIndex].trim();
                    break;
                }
            }

            const previousCharacter = previousLine ? previousLine[previousLine.length - 1] : null;
            const previousLineEndsLikeParagraph = ['.', ':', ';', '!', '?'].includes(previousCharacter);
            const shouldSeparateFromPreviousParagraph = normalizedLines.length > 0
                && normalizedLines[normalizedLines.length - 1].trim() !== ''
                && (consecutiveNonBlankLines > 1 || previousLineEndsLikeParagraph);

            if (shouldSeparateFromPreviousParagraph) {
                normalizedLines.push('');
            }
        }

        normalizedLines.push(line);

        if (isThematicBreak && index < lines.length - 1 && lines[index + 1].trim() !== '') {
            normalizedLines.push('');
        }
    });

    return normalizedLines.join('\n');
}

function renderMarkdownToHtml(markdownText) {
    if (typeof marked === 'undefined') {
        return '';
    }

    return sanitizeHtml(marked.parse(normalizeMarkdown(markdownText)));
}

function isEscapedCharacter(text, index) {
    let backslashCount = 0;

    for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) {
        backslashCount += 1;
    }

    return backslashCount % 2 === 1;
}

function isWhitespaceCharacter(character) {
    return !character || /\s/.test(character);
}

function isDigitCharacter(character) {
    return Boolean(character) && /\d/.test(character);
}

function findInlineDollarMathRanges(text) {
    const ranges = [];

    for (let startIndex = 0; startIndex < text.length; startIndex += 1) {
        if (text[startIndex] !== '$' || isEscapedCharacter(text, startIndex)) {
            continue;
        }

        if (text[startIndex + 1] === '$' || isWhitespaceCharacter(text[startIndex + 1])) {
            continue;
        }

        for (let endIndex = startIndex + 1; endIndex < text.length; endIndex += 1) {
            if (text[endIndex] !== '$' || isEscapedCharacter(text, endIndex)) {
                continue;
            }

            if (text[endIndex - 1] === '$') {
                continue;
            }

            if (isWhitespaceCharacter(text[endIndex - 1]) || isDigitCharacter(text[endIndex + 1])) {
                continue;
            }

            const mathText = text.slice(startIndex + 1, endIndex);

            if (isDigitCharacter(text[startIndex + 1]) && /\s/.test(mathText)) {
                continue;
            }

            ranges.push({
                start: startIndex,
                end: endIndex,
                math: mathText
            });

            startIndex = endIndex;
            break;
        }
    }

    return ranges;
}

function renderInlineDollarMath(container) {
    if (!container || typeof katex === 'undefined') {
        return;
    }

    const ignoredTags = new Set(['code', 'option', 'pre', 'script', 'style', 'textarea']);
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes = [];

    while (walker.nextNode()) {
        const textNode = walker.currentNode;
        const parentElement = textNode.parentElement;

        if (!parentElement) {
            continue;
        }

        if (ignoredTags.has(parentElement.tagName.toLowerCase()) || parentElement.closest('.katex') || parentElement.closest('.mermaid')) {
            continue;
        }

        textNodes.push(textNode);
    }

    for (const textNode of textNodes) {
        const text = textNode.textContent || '';
        const ranges = findInlineDollarMathRanges(text);

        if (!ranges.length) {
            continue;
        }

        const fragment = document.createDocumentFragment();
        let cursor = 0;

        for (const range of ranges) {
            if (range.start > cursor) {
                fragment.appendChild(document.createTextNode(text.slice(cursor, range.start)));
            }

            const prefix = text.slice(0, range.start);
            const suffix = text.slice(range.end + 1);
            const isStandaloneMath = ranges.length === 1
                && prefix.trim() === ''
                && suffix.trim() === '';
            const mathHost = document.createElement(isStandaloneMath ? 'div' : 'span');

            try {
                katex.render(range.math, mathHost, {
                    displayMode: isStandaloneMath,
                    throwOnError: false
                });
                fragment.appendChild(mathHost);
            } catch (error) {
                console.warn('Inline dollar math render error:', error);
                fragment.appendChild(document.createTextNode(text.slice(range.start, range.end + 1)));
            }

            cursor = range.end + 1;
        }

        if (cursor < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(cursor)));
        }

        textNode.parentNode.replaceChild(fragment, textNode);
    }
}

function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
}

function getMimeTypeFromAssetPath(assetPath) {
    const normalizedPath = assetPath.toLowerCase();

    if (normalizedPath.endsWith('.woff2')) {
        return 'font/woff2';
    }

    if (normalizedPath.endsWith('.woff')) {
        return 'font/woff';
    }

    if (normalizedPath.endsWith('.ttf')) {
        return 'font/ttf';
    }

    if (normalizedPath.endsWith('.otf')) {
        return 'font/otf';
    }

    return 'application/octet-stream';
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';

    for (let index = 0; index < bytes.length; index += chunkSize) {
        const chunk = bytes.subarray(index, index + chunkSize);
        binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
}

const inlineAssetCache = new Map();

async function getInlineAssetUrl(assetUrl) {
    if (inlineAssetCache.has(assetUrl)) {
        return inlineAssetCache.get(assetUrl);
    }

    const response = await fetch(assetUrl);
    if (!response.ok) {
        throw new Error(`Unable to load asset: ${assetUrl}`);
    }

    const buffer = await response.arrayBuffer();
    const mimeType = getMimeTypeFromAssetPath(assetUrl);
    const dataUrl = `data:${mimeType};base64,${arrayBufferToBase64(buffer)}`;
    inlineAssetCache.set(assetUrl, dataUrl);
    return dataUrl;
}

async function inlineCssAssetUrls(cssText, baseUrl) {
    const urlPattern = /url\(([^)]+)\)/g;
    const matches = Array.from(cssText.matchAll(urlPattern));

    if (!matches.length) {
        return cssText;
    }

    let inlinedCss = cssText;
    const seenUrls = new Map();

    for (const match of matches) {
        const rawUrl = match[1].trim();
        const cleanUrl = rawUrl.replace(/^['"]|['"]$/g, '');

        if (!cleanUrl || cleanUrl.startsWith('data:') || cleanUrl.startsWith('#')) {
            continue;
        }

        const absoluteUrl = new URL(cleanUrl, baseUrl).href;
        if (!seenUrls.has(rawUrl)) {
            try {
                seenUrls.set(rawUrl, `url("${await getInlineAssetUrl(absoluteUrl)}")`);
            } catch (error) {
                console.warn('Unable to inline CSS asset:', error);
                seenUrls.set(rawUrl, `url(${rawUrl})`);
            }
        }

        inlinedCss = inlinedCss.split(`url(${rawUrl})`).join(seenUrls.get(rawUrl));
    }

    return inlinedCss;
}

async function getKatexCssText() {
    const katexLink = document.querySelector('link[href*="katex"]');
    if (!katexLink) {
        return '';
    }

    try {
        for (const sheet of document.styleSheets) {
            if (sheet.href && sheet.href.includes('katex')) {
                let css = '';
                for (const rule of sheet.cssRules) {
                    css += `${rule.cssText}\n`;
                }

                if (!css) {
                    return '';
                }

                return inlineCssAssetUrls(css, sheet.href || katexLink.href);
            }
        }
    } catch (error) {
        console.warn('Unable to inline KaTeX CSS:', error);
    }

    return '';
}

function getExportThemePalette(isDarkMode) {
    return isDarkMode
        ? {
            bodyBackground: '#0f172a',
            surfaceBackground: '#1e293b',
            textColor: '#f8fafc',
            mutedTextColor: '#cbd5e1',
            borderColor: '#334155',
            codeBackground: '#020617',
            inlineCodeBackground: '#020617',
            tableHeaderBackground: '#020617',
            linkColor: '#38bdf8'
        }
        : {
            bodyBackground: '#ffffff',
            surfaceBackground: '#ffffff',
            textColor: '#1e293b',
            mutedTextColor: '#64748b',
            borderColor: '#e2e8f0',
            codeBackground: '#f1f5f9',
            inlineCodeBackground: '#f1f5f9',
            tableHeaderBackground: '#f8fafc',
            linkColor: '#0284c7'
        };
}

async function buildRenderedHtml(rendered, isDarkMode) {
    if (!rendered) {
        return '';
    }

    const katexCss = await getKatexCssText();
    const katexStyle = katexCss ? `<style>${katexCss}</style>` : '';
    const palette = getExportThemePalette(Boolean(isDarkMode));

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Export</title>
    ${katexStyle}
    <style>
        :root {
            color-scheme: ${isDarkMode ? 'dark' : 'light'};
        }
        html {
            background: ${palette.bodyBackground};
        }
        body {
            padding: 20px 40px;
            line-height: 1.6;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            background: ${palette.bodyBackground};
            color: ${palette.textColor};
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .markdown-body {
            max-width: 900px;
            margin: 0 auto;
            color: ${palette.textColor};
        }
        .markdown-body h1,
        .markdown-body h2,
        .markdown-body h3,
        .markdown-body h4,
        .markdown-body h5,
        .markdown-body h6 {
            color: ${palette.textColor};
            line-height: 1.25;
            margin-top: 24px;
            margin-bottom: 16px;
        }
        .markdown-body h1 {
            font-size: 32px;
            border-bottom: 1px solid ${palette.borderColor};
            padding-bottom: 0.3em;
        }
        .markdown-body h2 { font-size: 24px; }
        .markdown-body h3 { font-size: 20px; }
        .markdown-body p,
        .markdown-body li,
        .markdown-body td,
        .markdown-body th {
            color: ${palette.textColor};
        }
        .markdown-body blockquote {
            border-left: 4px solid ${palette.linkColor};
            color: ${palette.mutedTextColor};
            margin: 0 0 16px;
            padding-left: 16px;
        }
        .markdown-body a {
            color: ${palette.linkColor};
        }
        img { max-width: 100%; height: auto; }
        code {
            padding: 2px 6px;
            background-color: ${palette.inlineCodeBackground};
            border-radius: 3px;
        }
        pre {
            background-color: ${palette.codeBackground};
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
        }
        pre code {
            background: transparent;
            padding: 0;
        }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid ${palette.borderColor}; padding: 8px; text-align: left; }
        th { background-color: ${palette.tableHeaderBackground}; }
        .mermaid { display: flex; justify-content: center; margin: 16px 0; }
        .mermaid svg { max-width: 100%; height: auto; }
        .katex-display {
            overflow-x: auto;
            overflow-y: hidden;
            margin: 16px 0;
            padding: 0.35em 0;
            -webkit-overflow-scrolling: touch;
        }
        .katex-display > .katex {
            display: inline-block;
            overflow: visible !important;
            padding: 0.1em 0 0.2em;
        }
        .markdown-body .katex { line-height: 1.4; }
    </style>
</head>
<body>
    <div class="markdown-body">${rendered.innerHTML}</div>
</body>
</html>`;
}

function initMarkdownConverter(options) {
    const storage = createStorageAdapter(options.storageArea);

    document.addEventListener('DOMContentLoaded', () => {
        initializeLibraries();

        const state = {
            isDarkMode: false,
            mermaidRenderCount: 0
        };

        const dom = {
            markdownInput: document.getElementById('markdownInput'),
            previewContainer: document.getElementById('previewContainer'),
            tabButtons: Array.from(document.querySelectorAll('.tab-btn')),
            tabContents: Array.from(document.querySelectorAll('.tab-content')),
            clearBtn: document.getElementById('clearBtn'),
            copyBtn: document.getElementById('copyBtn'),
            exportPdfBtn: document.getElementById('exportPdfBtn'),
            exportHtmlBtn: document.getElementById('exportHtmlBtn'),
            screenshotBtn: document.getElementById('screenshotBtn'),
            darkModeBtn: document.getElementById('darkModeBtn'),
            notification: document.getElementById('notification')
        };

        function showNotification(message, type = 'info') {
            if (!dom.notification) {
                return;
            }

            dom.notification.textContent = message;
            dom.notification.className = `notification show ${type}`;

            setTimeout(() => {
                dom.notification.classList.remove('show');
            }, 3000);
        }

        function updateMermaidTheme() {
            if (typeof mermaid === 'undefined') {
                return;
            }

            mermaid.initialize({
                startOnLoad: false,
                theme: state.isDarkMode ? 'dark' : 'default',
                securityLevel: 'loose'
            });
        }

        storage.get(['isDarkMode', 'lastContent'], (items) => {
            if (items.isDarkMode) {
                state.isDarkMode = true;
                document.body.classList.add('dark-mode');
                updateMermaidTheme();
            }

            if (items.lastContent && dom.markdownInput) {
                dom.markdownInput.value = items.lastContent;
                updatePreview();
            }
        });

        function saveContent() {
            if (!dom.markdownInput) {
                return;
            }

            storage.set({ lastContent: dom.markdownInput.value });
        }

        function getRenderedContent() {
            const markdownBody = dom.previewContainer?.querySelector('.markdown-body');
            return markdownBody || null;
        }

        async function handleMermaidDiagrams() {
            if (!dom.previewContainer || typeof mermaid === 'undefined') {
                return;
            }

            const codeBlocks = dom.previewContainer.querySelectorAll('pre code.language-mermaid');

            for (const codeBlock of codeBlocks) {
                const host = document.createElement('div');
                host.className = 'mermaid';

                try {
                    const renderId = `mermaid-${options.mermaidIdPrefix}-${Date.now()}-${state.mermaidRenderCount++}`;
                    const renderResult = await mermaid.render(renderId, codeBlock.textContent);
                    host.innerHTML = renderResult.svg;

                    if (typeof renderResult.bindFunctions === 'function') {
                        renderResult.bindFunctions(host);
                    }
                } catch (error) {
                    host.classList.add('mermaid-error');
                    host.innerHTML = `<pre>${escapeHtml(codeBlock.textContent)}</pre>`;
                    console.warn('Mermaid render error:', error);
                }

                codeBlock.parentElement.replaceWith(host);
            }
        }

        function handleMathFormulas() {
            if (!dom.previewContainer || typeof renderMathInElement === 'undefined') {
                return;
            }

            try {
                renderMathInElement(dom.previewContainer, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '\\[', right: '\\]', display: true }
                    ],
                    throwOnError: false
                });

                renderInlineDollarMath(dom.previewContainer);
            } catch (error) {
                console.warn('KaTeX render error:', error);
            }
        }

        async function updatePreview() {
            if (!dom.previewContainer || !dom.markdownInput) {
                return;
            }

            if (typeof marked === 'undefined') {
                dom.previewContainer.innerHTML = '<div style="color: #ff9800; padding: 20px; text-align: center;">Loading libraries, please wait...</div>';
                return;
            }

            dom.previewContainer.innerHTML = `<div class="markdown-body">${renderMarkdownToHtml(dom.markdownInput.value)}</div>`;
            await handleMermaidDiagrams();
            handleMathFormulas();
        }

        function switchTab(tabName) {
            dom.tabButtons.forEach((button) => button.classList.remove('active'));
            dom.tabContents.forEach((content) => content.classList.remove('active'));

            const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
            const activeContent = document.getElementById(tabName);

            if (activeButton) {
                activeButton.classList.add('active');
            }

            if (activeContent) {
                activeContent.classList.add('active');
            }

            if (tabName === 'preview') {
                updatePreview();
            }
        }

        function clearContent() {
            if (!dom.markdownInput || !dom.previewContainer) {
                return;
            }

            if (confirm('Clear all content?')) {
                dom.markdownInput.value = '';
                dom.previewContainer.innerHTML = '';
                saveContent();
                showNotification('Content cleared', 'success');
            }
        }

        async function copyHtml() {
            try {
                await updatePreview();
                const rendered = getRenderedContent();
                if (!rendered) {
                    showNotification('Nothing to copy', 'error');
                    return;
                }

                await navigator.clipboard.writeText(rendered.innerHTML);

                showNotification('HTML copied to clipboard', 'success');
            } catch (error) {
                console.error('Copy error:', error);
                showNotification('Copy failed', 'error');
            }
        }

        async function exportToPdf() {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                showNotification('Please allow opening a new tab/window to export PDF', 'error');
                return;
            }

            printWindow.document.write('<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Preparing PDF</title></head><body>Preparing PDF export...</body></html>');
            printWindow.document.close();

            await updatePreview();
            await new Promise((resolve) => setTimeout(resolve, 150));

            const rendered = getRenderedContent();
            const fullHtml = await buildRenderedHtml(rendered, state.isDarkMode);
            if (!fullHtml) {
                printWindow.close();
                showNotification('Nothing to export', 'error');
                return;
            }

            const printHtml = fullHtml.replace('</head>', `
        <style>
            @media print {
                body { margin: 0; padding: 15mm; }
                @page { margin: 10mm; size: A4; }
                pre { white-space: pre-wrap; word-wrap: break-word; }
                img, svg { max-width: 100%; height: auto; }
                table { page-break-inside: avoid; }
                h1, h2, h3, h4 { page-break-after: avoid; }
            }
        </style>
    </head>`);

            printWindow.document.open();
            printWindow.document.write(printHtml);
            printWindow.document.close();
            printWindow.onafterprint = () => printWindow.close();

            const triggerPrint = () => {
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                }, 600);
            };

            if (printWindow.document.readyState === 'complete') {
                triggerPrint();
            } else {
                printWindow.onload = triggerPrint;
            }

            showNotification('Choose "Save as PDF" in the print dialog', 'info');
        }

        async function exportToHtml() {
            await updatePreview();
            const rendered = getRenderedContent();
            const fullHtml = await buildRenderedHtml(rendered, state.isDarkMode);

            if (!fullHtml) {
                showNotification('Nothing to export', 'error');
                return;
            }

            downloadFile(fullHtml, `markdown_${new Date().getTime()}.html`, 'text/html');
            showNotification('HTML exported successfully', 'success');
        }

        async function takeScreenshot() {
            try {
                if (typeof html2canvas === 'undefined') {
                    showNotification('Screenshot library is still loading. Please wait.', 'info');
                    return;
                }

                await updatePreview();
                await new Promise((resolve) => setTimeout(resolve, 500));

                const rendered = getRenderedContent();
                if (!rendered) {
                    showNotification('Nothing to capture', 'error');
                    return;
                }

                await captureMarkdownScreenshot({
                    previewContainer: dom.previewContainer,
                    renderedHtml: rendered.innerHTML,
                    isDarkMode: state.isDarkMode,
                    minimumWidth: options.screenshotMinimumWidth,
                    widthOffset: options.screenshotWidthOffset,
                    fileName: `screenshot_${new Date().getTime()}.png`
                });

                showNotification('Screenshot downloaded', 'success');
            } catch (error) {
                console.error('Screenshot error:', error);
                showNotification('Screenshot failed: ' + error.message, 'error');
            }
        }

        function toggleDarkMode() {
            state.isDarkMode = !state.isDarkMode;
            document.body.classList.toggle('dark-mode', state.isDarkMode);
            updateMermaidTheme();
            storage.set({ isDarkMode: state.isDarkMode });
            updatePreview();
            showNotification(state.isDarkMode ? 'Dark mode enabled' : 'Light mode enabled', 'info');
        }

        dom.tabButtons.forEach((button) => {
            button.addEventListener('click', (event) => {
                const tabName = event.currentTarget.dataset.tab;
                if (tabName) {
                    switchTab(tabName);
                }
            });
        });

        if (dom.markdownInput) {
            dom.markdownInput.addEventListener('input', () => {
                updatePreview();
                saveContent();
            });
        }

        if (options.allowClear && dom.clearBtn) {
            dom.clearBtn.addEventListener('click', clearContent);
        }

        if (dom.copyBtn) {
            dom.copyBtn.addEventListener('click', copyHtml);
        }

        if (dom.exportPdfBtn) {
            dom.exportPdfBtn.addEventListener('click', exportToPdf);
        }

        if (dom.exportHtmlBtn) {
            dom.exportHtmlBtn.addEventListener('click', exportToHtml);
        }

        if (dom.screenshotBtn) {
            dom.screenshotBtn.addEventListener('click', takeScreenshot);
        }

        if (dom.darkModeBtn) {
            dom.darkModeBtn.addEventListener('click', toggleDarkMode);
        }
    });
}