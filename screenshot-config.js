// 截图配置模块：参考 Playwright 截图参数模式设计，支持持久化存储

window.ScreenshotConfig = (function() {
    'use strict';

    // 默认配置（参考 Playwright 参数模式）
    const DEFAULT_CONFIG = {
        // 基础选项
        format: 'png',              // 'png' 或 'jpeg'
        quality: 90,                // JPEG 质量 0-100

        // 截取选项
        fullPage: true,             // 始终整页截取，对应 Playwright 的 full_page=True
        omitBackground: false,      // 去除背景（用于透明 PNG）
        timeout: 15000,            // 超时时间（毫秒）

        // 错误处理（参考 Playwright 错误处理模式）
        retryAttempts: 2,          // 失败重试次数
        errorScreenshot: true,      // 出错时保存截图便于调试
        errorNaming: true,          // 错误截图使用系统化命名

        // 高级选项
        devicePixelRatio: null,     // null 使用设备默认值，也可自定义像素比
        clipRegion: null,           // 裁剪区域 {x, y, width, height}

        // 文件命名模式（参考 Playwright 的 sanitize_filename）
        filenamePattern: 'screenshot-{timestamp}',
        errorFilenamePattern: 'error_screenshot_{timestamp}',
        sanitizeFilenames: true,

        // 性能选项
        scrollDelay: 50,           // 滚动间隔（毫秒）
        captureDelay: 30,          // 截屏间隔（毫秒）
        maxPageSize: 50000,        // 页面尺寸上限，防止内存溢出

        // 调试选项
        debugMode: false,          // 开启详细日志
        savePageDump: false,        // 出错时保存 HTML 快照

        // 滚动配置
        smoothScroll: false,        // 平滑滚动
        scrollOverlap: 20,         // 相邻截图区域重叠百分比
        waitForImages: true,       // 等待图片加载完成
        waitForAnimations: false   // 等待动画结束
    };

    let currentConfig = Object.assign({}, DEFAULT_CONFIG);

    // 文件名清洗：去除非法字符（参考 Playwright 实现）
    function sanitizeFilename(filename) {
        return filename
            .replace(/[<>:"/\\|?*\s]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    // 按命名模式生成带时间戳的文件名
    function generateFilename(pattern, options = {}) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const url = options.url || 'unknown';
        const sanitizedUrl = sanitizeFilename(url.replace(/^https?:\/\//, '').substring(0, 50));

        return pattern
            .replace('{timestamp}', timestamp)
            .replace('{url}', sanitizedUrl)
            .replace('{date}', timestamp.split('T')[0])
            .replace('{time}', timestamp.split('T')[1]);
    }

    // 获取当前配置副本
    function getConfig() {
        return Object.assign({}, currentConfig);
    }

    // 更新配置并持久化到 chrome.storage
    function updateConfig(newConfig) {
        currentConfig = Object.assign(currentConfig, newConfig);

        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ screenshotConfig: currentConfig });
        }

        if (currentConfig.debugMode) {
            console.log('Screenshot config updated:', currentConfig);
        }
    }

    // 恢复默认配置
    function resetConfig() {
        currentConfig = Object.assign({}, DEFAULT_CONFIG);

        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.remove('screenshotConfig');
        }
    }

    // 从 chrome.storage 加载已保存的配置
    function loadConfig(callback) {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get('screenshotConfig', function(result) {
                if (result.screenshotConfig) {
                    currentConfig = Object.assign(currentConfig, result.screenshotConfig);
                }
                if (callback) callback(currentConfig);
            });
        } else {
            if (callback) callback(currentConfig);
        }
    }

    // 生成成功截图的文件名
    function getSuccessFilename(options = {}) {
        return generateFilename(currentConfig.filenamePattern, options);
    }

    // 生成错误截图的文件名（带错误类型后缀）
    function getErrorFilename(errorType = 'general', options = {}) {
        const pattern = currentConfig.errorFilenamePattern.replace('{timestamp}', '{timestamp}_' + errorType);
        return generateFilename(pattern, options);
    }

    // 校验裁剪区域是否在页面范围内
    function validateClipRegion(clip, pageWidth, pageHeight) {
        if (!clip) return true;

        return clip.x >= 0 && clip.y >= 0 &&
               clip.x + clip.width <= pageWidth &&
               clip.y + clip.height <= pageHeight &&
               clip.width > 0 && clip.height > 0;
    }

    // 转换为 chrome.tabs.captureVisibleTab 可用的选项
    function toChromeOptions() {
        const options = {
            format: currentConfig.format
        };

        if (currentConfig.format === 'jpeg' && currentConfig.quality) {
            options.quality = currentConfig.quality;
        }

        return options;
    }

    // 渲染配置面板 UI（可在弹窗或选项页中调用）
    function createConfigUI(container) {
        const html = `
            <div class="screenshot-config">
                <h3>📸 Screenshot Configuration</h3>

                <div class="config-group">
                    <label>Format:</label>
                    <select id="config-format">
                        <option value="png">PNG (Lossless)</option>
                        <option value="jpeg">JPEG (Smaller size)</option>
                    </select>
                </div>

                <div class="config-group" id="quality-group">
                    <label>JPEG Quality:</label>
                    <input type="range" id="config-quality" min="10" max="100" step="10" value="${currentConfig.quality}">
                    <span id="quality-value">${currentConfig.quality}</span>
                </div>

                <div class="config-group">
                    <label>Timeout (seconds):</label>
                    <input type="number" id="config-timeout" min="5" max="120" value="${currentConfig.timeout / 1000}">
                </div>

                <div class="config-group">
                    <label>Retry Attempts:</label>
                    <input type="number" id="config-retries" min="1" max="10" value="${currentConfig.retryAttempts}">
                </div>

                <div class="config-group">
                    <label>
                        <input type="checkbox" id="config-error-screenshot" ${currentConfig.errorScreenshot ? 'checked' : ''}>
                        Capture error screenshots
                    </label>
                </div>

                <div class="config-group">
                    <label>
                        <input type="checkbox" id="config-debug" ${currentConfig.debugMode ? 'checked' : ''}>
                        Debug mode
                    </label>
                </div>

                <div class="config-actions">
                    <button id="save-config">Save Configuration</button>
                    <button id="reset-config">Reset to Defaults</button>
                </div>
            </div>

            <style>
                .screenshot-config { padding: 15px; font-family: Arial, sans-serif; }
                .config-group { margin: 10px 0; }
                .config-group label { display: block; margin-bottom: 5px; font-weight: bold; }
                .config-group input, .config-group select { width: 100%; padding: 5px; }
                .config-actions { margin-top: 20px; }
                .config-actions button { margin-right: 10px; padding: 8px 15px; }
                #quality-group { display: ${currentConfig.format === 'jpeg' ? 'block' : 'none'}; }
            </style>
        `;

        container.innerHTML = html;

        // 绑定交互事件
        bindConfigEvents();
    }

    // 绑定配置面板事件
    function bindConfigEvents() {
        const formatSelect = document.getElementById('config-format');
        const qualityGroup = document.getElementById('quality-group');
        const qualityRange = document.getElementById('config-quality');
        const qualityValue = document.getElementById('quality-value');

        if (formatSelect) {
            formatSelect.value = currentConfig.format;
            formatSelect.addEventListener('change', function() {
                qualityGroup.style.display = this.value === 'jpeg' ? 'block' : 'none';
            });
        }

        if (qualityRange && qualityValue) {
            qualityRange.addEventListener('input', function() {
                qualityValue.textContent = this.value;
            });
        }

        const saveBtn = document.getElementById('save-config');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveConfigFromUI);
        }

        const resetBtn = document.getElementById('reset-config');
        if (resetBtn) {
            resetBtn.addEventListener('click', function() {
                resetConfig();
                location.reload(); // 刷新以显示默认值
            });
        }
    }

    // 从面板读取并保存配置
    function saveConfigFromUI() {
        const newConfig = {
            format: document.getElementById('config-format')?.value || currentConfig.format,
            quality: parseInt(document.getElementById('config-quality')?.value) || currentConfig.quality,
            timeout: (parseInt(document.getElementById('config-timeout')?.value) || 30) * 1000,
            retryAttempts: parseInt(document.getElementById('config-retries')?.value) || currentConfig.retryAttempts,
            errorScreenshot: document.getElementById('config-error-screenshot')?.checked || false,
            debugMode: document.getElementById('config-debug')?.checked || false
        };

        updateConfig(newConfig);
        alert('Configuration saved successfully!');
    }

    // 模块加载时初始化配置
    loadConfig();

    // 对外接口
    return {
        getConfig,
        updateConfig,
        resetConfig,
        loadConfig,
        sanitizeFilename,
        generateFilename,
        getSuccessFilename,
        getErrorFilename,
        validateClipRegion,
        toChromeOptions,
        createConfigUI,
        DEFAULT_CONFIG
    };

})();
