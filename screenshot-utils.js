function getScreenshotFallbackWidth(previewContainer, minimumWidth, widthOffset) {
    const containerWidth = document.getElementById('container')?.clientWidth || 0;
    const bodyWidth = document.body?.clientWidth || 0;

    return Math.max(
        previewContainer?.clientWidth || 0,
        previewContainer?.offsetWidth || 0,
        containerWidth - widthOffset,
        bodyWidth - widthOffset,
        minimumWidth
    );
}

async function captureMarkdownScreenshot(options) {
    const {
        previewContainer,
        renderedHtml,
        isDarkMode,
        minimumWidth,
        widthOffset,
        fileName
    } = options;

    const fallbackWidth = getScreenshotFallbackWidth(previewContainer, minimumWidth, widthOffset);

    const offscreen = document.createElement('div');
    offscreen.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: ${fallbackWidth}px;
        box-sizing: border-box;
        background-color: ${isDarkMode ? '#0f172a' : '#ffffff'};
        padding: 16px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    `;
    offscreen.innerHTML = `<div class="markdown-body">${renderedHtml}</div>`;
    document.body.appendChild(offscreen);

    try {
        const captureWidth = Math.max(offscreen.scrollWidth, offscreen.offsetWidth, fallbackWidth);
        const captureHeight = Math.max(offscreen.scrollHeight, offscreen.offsetHeight);

        const canvas = await html2canvas(offscreen, {
            backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
            scale: 2,
            useCORS: true,
            logging: false,
            width: captureWidth,
            height: captureHeight,
            windowWidth: captureWidth,
            windowHeight: captureHeight
        });

        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((result) => {
                if (result) {
                    resolve(result);
                    return;
                }

                reject(new Error('Failed to create screenshot blob'));
            });
        });

        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
    } finally {
        document.body.removeChild(offscreen);
    }
}