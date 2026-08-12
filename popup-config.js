// 弹窗配置面板逻辑（从 popup.html 抽离，MV3 安全策略禁止内联脚本）

// 切换配置面板显示/隐藏
function toggleConfig() {
    const panel = document.getElementById('config-panel');
    const loading = document.getElementById('loading');

    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        loading.style.display = 'none';
    } else {
        panel.style.display = 'none';
        loading.style.display = 'block';
    }
}

// 测试多语言系统
function testLanguageSystem() {
    console.log('Testing language system...');
    if (typeof Languages !== 'undefined') {
        console.log('Languages object available:', Languages);
        console.log('Current language:', Languages.currentLang);
        const testText = Languages.getText('configToggle');
        console.log('Test translation:', testText);
    } else {
        console.error('Languages object not available!');
    }
}

// 保存配置
function saveConfig() {
    if (typeof ScreenshotConfig !== 'undefined') {
        const newConfig = {
            format: document.getElementById('config-format').value,
            quality: parseInt(document.getElementById('config-quality').value),
            timeout: parseInt(document.getElementById('config-timeout').value) * 1000,
            retryAttempts: parseInt(document.getElementById('config-retries').value),
            debugMode: document.getElementById('config-debug').checked,
            smoothScroll: document.getElementById('config-smooth-scroll').checked,
            waitForImages: document.getElementById('config-wait-images').checked,
            scrollOverlap: parseInt(document.getElementById('config-scroll-overlap').value)
        };

        ScreenshotConfig.updateConfig(newConfig);

        // 提示文案优先使用多语言系统
        if (typeof Languages !== 'undefined') {
            alert(Languages.getText('configSaved'));
        } else {
            alert('✅ Configuration saved! Changes will apply to next capture.');
        }
    }
}

// 重置配置
function resetConfig() {
    if (typeof ScreenshotConfig !== 'undefined') {
        ScreenshotConfig.resetConfig();
        location.reload();
    }
}

// 加载已保存的配置并初始化多语言系统
document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup DOM loaded');

    // languages.js 在 DOMContentLoaded 时负责唯一一次语言初始化。
    setTimeout(testLanguageSystem, 200);

    if (typeof ScreenshotConfig !== 'undefined') {
        ScreenshotConfig.loadConfig(function(config) {
            document.getElementById('config-format').value = config.format;
            document.getElementById('config-quality').value = config.quality;
            document.getElementById('config-timeout').value = config.timeout / 1000;
            document.getElementById('config-retries').value = config.retryAttempts;
            document.getElementById('config-debug').checked = config.debugMode;
            document.getElementById('config-smooth-scroll').checked = config.smoothScroll;
            document.getElementById('config-wait-images').checked = config.waitImages;
            document.getElementById('config-scroll-overlap').value = config.scrollOverlap;

            // 显示/隐藏质量设置组
            const qualityGroup = document.getElementById('quality-group');
            qualityGroup.style.display = config.format === 'jpeg' ? 'block' : 'none';
        });
    }

    // 格式切换处理
    document.getElementById('config-format').addEventListener('change', function() {
        const qualityGroup = document.getElementById('quality-group');
        qualityGroup.style.display = this.value === 'jpeg' ? 'block' : 'none';
    });

    // 质量滑块处理
    document.getElementById('config-quality').addEventListener('input', function() {
        document.getElementById('quality-value').textContent = this.value;
    });

    // 滚动重叠度滑块处理
    document.getElementById('config-scroll-overlap').addEventListener('input', function() {
        document.getElementById('overlap-value').textContent = this.value;
    });

    // 按钮事件绑定（MV3 禁止内联 onclick，统一在此绑定；元素可能不存在，逐个判空）
    function bindClick(id, handler) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', handler);
        }
    }
    bindClick('config-toggle', toggleConfig);
    bindClick('save-config-btn', saveConfig);
    bindClick('reset-config-btn', resetConfig);
    bindClick('close-config-btn', toggleConfig);
    bindClick('retry-btn', function() {
        // retryCapture 定义在 popup.js
        if (typeof retryCapture === 'function') {
            retryCapture();
        }
    });

    // 加载动画图片加载失败时降级为纯文字提示
    var gifImg = document.getElementById('loading-gif-img');
    if (gifImg) {
        gifImg.addEventListener('error', function() {
            this.style.display = 'none';
            if (this.nextElementSibling) {
                this.nextElementSibling.style.display = 'block';
            }
        });
    }
});
