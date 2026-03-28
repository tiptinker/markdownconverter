const extensionApi = typeof browser !== 'undefined' ? browser : chrome;

if (typeof chrome !== 'undefined' && chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

if (extensionApi) {
    const actionApi = extensionApi.action || extensionApi.browserAction;
    const sidebarActionApi = extensionApi.sidebarAction;

    if (actionApi && actionApi.onClicked && sidebarActionApi && typeof sidebarActionApi.open === 'function') {
        let isSidebarOpen = false;

        if (sidebarActionApi.onShown && sidebarActionApi.onShown.addListener) {
            sidebarActionApi.onShown.addListener(() => {
                isSidebarOpen = true;
            });
        }

        if (sidebarActionApi.onHidden && sidebarActionApi.onHidden.addListener) {
            sidebarActionApi.onHidden.addListener(() => {
                isSidebarOpen = false;
            });
        }

        actionApi.onClicked.addListener(() => {
            if (isSidebarOpen && typeof sidebarActionApi.close === 'function') {
                Promise.resolve(sidebarActionApi.close())
                    .then(() => {
                        isSidebarOpen = false;
                    })
                    .catch((error) => {
                        console.warn('Unable to close Firefox sidebar:', error);
                    });

                return;
            }

            Promise.resolve(sidebarActionApi.open())
                .then(() => {
                    isSidebarOpen = true;
                })
                    .catch((error) => {
                        console.warn('Unable to open Firefox sidebar:', error);
                    });
        });
    }
}

if (extensionApi && extensionApi.runtime) {
    extensionApi.runtime.onInstalled.addListener(() => {
        console.log('Markdown Converter extension installed');
    });

    extensionApi.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action !== 'getSettings') {
            return false;
        }

        const storageArea = extensionApi.storage && extensionApi.storage.local;
        if (!storageArea) {
            sendResponse({});
            return false;
        }

        try {
            const result = storageArea.get(['isDarkMode', 'lastContent'], (items) => {
                sendResponse(items || {});
            });

            if (result && typeof result.then === 'function') {
                result.then((items) => sendResponse(items || {})).catch((error) => {
                    console.warn('Settings lookup failed:', error);
                    sendResponse({});
                });
            }
        } catch (error) {
            console.warn('Settings lookup failed:', error);
            sendResponse({});
        }

        return true;
    });
}

console.log('background.js loaded');
