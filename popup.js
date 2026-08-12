// 本项目基于 Peter Coles (http://mrcoles.com/) 的开源作品修改，遵循 MIT 协议（见 LICENSE）

//
// 全局状态
//

var currentTab, // 当前活动标签页信息
    resultWindowId; // 结果页所在窗口 ID


//
// 工具方法
//

function $(id) { return document.getElementById(id); }
function show(id) { $(id).style.display = 'block'; }
function hide(id) { $(id).style.display = 'none'; }


// 根据页面 URL 生成截图文件名
function getFilename(contentURL) {
    var name = contentURL.split('?')[0].split('#')[0];
    if (name) {
        name = name
            .replace(/^https?:\/\//, '')
            .replace(/[^A-z0-9]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^[_\-]+/, '')
            .replace(/[_\-]+$/, '');
        name = '-' + name;
    } else {
        name = '';
    }
    return 'screencapture' + name + '-' + Date.now() + '.png';
}


//
// 截屏结果处理
//


function displayCaptures(filenames) {
    if (!filenames || !filenames.length) {
        show('uh-oh');
        return;
    }

    // 先展示 100% 完成状态，再打开结果页
    var percentElement = $('progress-percent');
    var progressText = $('progress-text');
    var bar = $('bar');

    if (percentElement && progressText && bar) {
        percentElement.textContent = '100%';

        // 使用多语言系统显示完成文案
        if (typeof Languages !== 'undefined') {
            progressText.textContent = Languages.getText('captureCompleted');
        } else {
            progressText.textContent = 'Capture completed!';
        }

        bar.style.width = '100%';

        // 真正完成后隐藏长页面加载动画
        hide('long-page');

        // 短暂停留展示完成状态
        setTimeout(function() {
            openResultPage(filenames);
        }, 500);
    } else {
        openResultPage(filenames);
    }
}

function openResultPage(filenames) {
    // 截图数据写入 localStorage，供结果页读取
    const captureData = {
        images: filenames,
        url: currentTab.url,
        timestamp: Date.now()
    };
    localStorage.setItem('captureData', JSON.stringify(captureData));

    // 在新标签页打开结果页
    const resultUrl = chrome.runtime.getURL('result.html');
    chrome.tabs.create({
        url: resultUrl,
        active: true,
        openerTabId: currentTab.id,
        index: currentTab.index + 1
    });

    // 打开结果页后关闭弹窗
    window.close();
}


// 逐个在新标签页打开截图文件（隐私模式下需新建普通窗口）
function _displayCapture(filenames, index) {
    index = index || 0;

    var filename = filenames[index];
    var last = index === filenames.length - 1;

    if (currentTab.incognito && index === 0) {
        // 隐私模式无法访问文件系统，需打开普通窗口，后续标签页都挂到该窗口
        // focused 会关闭弹窗，需小心处理
        chrome.windows.create({
            url: filename,
            incognito: false,
            focused: last
        }, function(win) {
            resultWindowId = win.id;
        });
    } else {
        chrome.tabs.create({
            url: filename,
            active: last,
            windowId: resultWindowId,
            openerTabId: currentTab.id,
            index: (currentTab.incognito ? 0 : currentTab.index) + 1 + index
        });
    }

    if (!last) {
        _displayCapture(filenames, index + 1);
    }
}


// 带进度的多语言文案更新
function updateProgressUI(percent, phase) {
    const progressText = $('progress-text');
    const progressPercent = $('progress-percent');
    const bar = $('bar');

    if (progressPercent) {
        progressPercent.textContent = Math.round(percent) + '%';
    }

    if (bar) {
        bar.style.width = percent + '%';
    }

    if (progressText) {
        // 优先使用多语言系统
        if (typeof Languages !== 'undefined') {
            Languages.updateProgress(phase);
        } else {
            // 无语言系统时回退英文
            let text = '';
            switch(phase) {
                case 'analyzing':
                    text = 'Analyzing page structure...';
                    break;
                case 'capturing':
                    text = 'Capturing page sections...';
                    break;
                case 'processing':
                    text = 'Processing screenshots...';
                    break;
                case 'finalizing':
                    text = 'Finalizing capture...';
                    break;
                case 'completed':
                    text = 'Capture completed!';
                    break;
                default:
                    text = 'Initializing capture...';
            }
            progressText.textContent = text;
        }
    }
}

// 统一错误处理：按错误类型展示对应提示，超时自动重试
function errorHandler(reason) {
    console.error('Capture error:', reason);

    switch(reason) {
        case 'execute timeout':
        console.log('Retrying with longer timeout...');
        setTimeout(function() {
            retryCapture();
        }, 2000);
            break;

        case 'invalid url':
        show('invalid');
            break;

        case 'max retries exceeded':
            // 重试次数耗尽：展示可能原因与重试按钮
            const errorDiv = $('uh-oh');
            if (errorDiv) {
                if (typeof Languages !== 'undefined') {
                    errorDiv.innerHTML = `
                        <h4>${Languages.getText('captureFailedTitle')}</h4>
                        <p>Maximum retry attempts exceeded. This might be due to:</p>
                        <ul>
                            <li>Very large page content</li>
                            <li>Page loading issues</li>
                            <li>Network connectivity problems</li>
                        </ul>
                        <button data-action="retry" style="margin-top: 10px; padding: 5px 10px;">${Languages.getText('tryAgainButton')}</button>
                    `;
                } else {
                    errorDiv.innerHTML = `
                        <h3>Capture Failed</h3>
                        <p>Maximum retry attempts exceeded. This might be due to:</p>
                        <ul>
                            <li>Very large page content</li>
                            <li>Page loading issues</li>
                            <li>Network connectivity problems</li>
                        </ul>
                        <button data-action="retry" style="margin-top: 10px; padding: 5px 10px;">Try Again</button>
                    `;
                }
                bindRetryButtons(errorDiv);
            }
            show('uh-oh');
            break;

        case 'script injection failed':
            const scriptErrorDiv = $('uh-oh');
            if (scriptErrorDiv) {
                if (typeof Languages !== 'undefined') {
                    scriptErrorDiv.innerHTML = `
                        <h4>${Languages.getText('captureFailedTitle')}</h4>
                        <p>Unable to inject capture script. This page might have:</p>
                        <ul>
                            <li>Content Security Policy restrictions</li>
                            <li>Special security settings</li>
                            <li>Protected content</li>
                        </ul>
                    `;
    } else {
                    scriptErrorDiv.innerHTML = `
                        <h3>Script Error</h3>
                        <p>Unable to inject capture script. This page might have:</p>
                        <ul>
                            <li>Content Security Policy restrictions</li>
                            <li>Special security settings</li>
                            <li>Protected content</li>
                        </ul>
                    `;
                }
            }
            show('uh-oh');
            break;

        default:
            // 通用错误：在原提示后追加重试按钮
            const genericErrorDiv = $('uh-oh');
            if (genericErrorDiv && !genericErrorDiv.innerHTML.includes('Try Again')) {
                const originalContent = genericErrorDiv.innerHTML;
                const tryAgainText = typeof Languages !== 'undefined' ?
                    Languages.getText('tryAgainButton') : 'Try Again';
                genericErrorDiv.innerHTML = originalContent +
                    `<button data-action="retry" style="margin-top: 10px; padding: 5px 10px;">${tryAgainText}</button>`;
                bindRetryButtons(genericErrorDiv);
            }
        show('uh-oh');
            break;
    }
}

// 为动态注入的重试按钮绑定事件（MV3 禁止内联 onclick）
function bindRetryButtons(container) {
    var btns = container.querySelectorAll('button[data-action="retry"]');
    for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', retryCapture);
    }
}

// 手动重试截屏
function retryCapture() {
    if (!currentTab) return;

    console.log('Retrying capture for:', currentTab.url);
    var filename = getFilename(currentTab.url);

    // 重置界面状态
    hide('uh-oh');
    hide('invalid');
    show('loading');

    // 重置进度条
    updateProgressUI(0, 'initializing');

    // 重新发起截屏
    chrome.tabs.sendMessage(currentTab.id, {
        msg: 'scrollPage',
        config: ScreenshotConfig ? ScreenshotConfig.getConfig() : {}
    }, function(response) {
        console.log('Retry response:', response);
    });
}


// 进度回调：更新进度条、阶段文案与长页面加载动画
function progress(complete) {
    if (complete === 0) {
        // 截屏刚开始
        show('loading');
        hide('long-page');

        var percentElement = $('progress-percent');
        if (percentElement) {
            percentElement.textContent = '0%';
        }
        $('bar').style.width = '0%';
    }
    else {
        var percent = Math.floor(complete * 100);

        // 未真正完成前封顶 99%
        if (percent < 0) percent = 0;
        if (percent > 99) percent = 99;

        $('bar').style.width = percent + '%';

        var percentElement = $('progress-percent');
        if (percentElement) {
            percentElement.textContent = percent + '%';
        }

        // 按进度区间划分阶段文案
        var progressText = $('progress-text');
        if (progressText) {
            var phase = '';
            if (percent < 15) {
                phase = 'analyzing';
            } else if (percent < 40) {
                phase = 'capturing';
            } else if (percent < 80) {
                phase = 'processing';
            } else {
                phase = 'finalizing';
            }

            if (typeof Languages !== 'undefined') {
                Languages.updateProgress(phase);
            } else {
                // 无语言系统时回退英文
                var text = '';
                switch(phase) {
                    case 'analyzing':
                        text = 'Analyzing page structure...';
                        break;
                    case 'capturing':
                        text = 'Capturing page sections...';
                        break;
                    case 'processing':
                        text = 'Processing screenshots...';
                        break;
                    case 'finalizing':
                        text = 'Finalizing capture...';
                        break;
                    default:
                        text = 'Processing...';
                }
                progressText.textContent = text;
            }
        }

        // 长页面耗时较久时展示加载动画
        if (complete > 0 && complete < 0.2) {
            setTimeout(function() {
                var currentProgress = parseInt($('bar').style.width);
                if (currentProgress < 30) {
                    show('long-page');

                    // 超时自动隐藏
                    setTimeout(function() {
                        hide('long-page');
                    }, 25000);
                }
            }, 2000);
        }

        // 接近完成时隐藏加载动画
        if (complete >= 0.95) {
            hide('long-page');
        }
    }
}


function splitnotifier() {
    show('split-image');
}


//
// 弹窗打开后立即开始截屏（含错误处理）
//

// 启动时加载配置
if (typeof ScreenshotConfig !== 'undefined') {
    ScreenshotConfig.loadConfig(function(config) {
        if (config.debugMode) {
            console.log('Debug mode enabled - detailed logging active');
        }
    });
}

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var tab = tabs[0];
    currentTab = tab; // 供后续重试等流程使用

    // 优先使用配置模块生成文件名
    var filename;
    if (typeof ScreenshotConfig !== 'undefined') {
        filename = ScreenshotConfig.getSuccessFilename({ url: tab.url });
    } else {
        filename = getFilename(tab.url);
    }

    CaptureAPI.captureToFiles(tab, filename, displayCaptures,
                              errorHandler, progress, splitnotifier);
});
