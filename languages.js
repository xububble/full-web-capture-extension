// Full Web Capture 扩展的语言切换模块，支持中文/英文

const Languages = {
    // 多语言资源表：en 为英文，zh 为中文（字符串为 UI 资源，勿改动）
    data: {
        en: {
            // 主界面按钮
            configToggle: "⚙️ Config",
            languageToggle: "🌐 Language",
            
            // 下拉菜单中的语言选项
            languageEnglish: "English",
            languageChinese: "中文",
            
            // 加载状态提示
            initializingCapture: "Initializing capture...",
            analyzingPage: "Analyzing page structure...",
            capturingPage: "Capturing page sections...",
            processingScreenshots: "Processing screenshots...",
            finalizingCapture: "Finalizing capture...",
            captureCompleted: "Capture completed!",
            processingLargePage: "Processing large page...",
            pleaseWaitCapture: "Please wait while we capture all content",
            
            // 配置面板
            configTitle: "📸 Screenshot Configuration",
            formatLabel: "Format:",
            formatPngOption: "PNG (Lossless, larger size)",
            formatJpegOption: "JPEG (Compressed, smaller size)",
            qualityLabel: "JPEG Quality:",
            timeoutLabel: "Timeout (seconds):",
            retryLabel: "Retry Attempts:",
            errorScreenshotLabel: "Capture error screenshots",
            debugModeLabel: "Debug mode (detailed logs)",
            saveButton: "💾 Save",
            resetButton: "🔄 Reset",
            closeButton: "✕ Close",
            configSaved: "✅ Configuration saved! Changes will apply to next capture.",
            
            // 成功页
            captureSuccessTitle: "✅ Capture Success!",
            customFilenameLabel: "File name:",
            filenamePlaceholder: "Enter custom file name",
            successNote: "Image has been opened in a new tab. You can also download with custom name.",
            downloadButton: "📥 Download",
            
            // 警告与错误
            splitImageWarning: "Note: your page is too large for the Chrome browser to capture as one image. It will be split into",
            multipleImages: "multiple",
            images: "images.",
            
            // 无效 URL 错误
            invalidUrlTitle: "🚫 Invalid URL",
            invalidUrlMessage: "Full Page Screen Capture cannot run on this URL due to Chrome Web Store policies.",
            invalidUrlTips: [
                "Try another web page",
                "This restriction applies to chrome:// and extension pages",
                "Most regular websites work fine"
            ],
            
            // 截图失败错误
            captureFailedTitle: "⚠️ Capture Failed",
            captureFailedMessage: "Something went wrong! Our enhanced error handling is working on it:",
            captureFailedTips: [
                "✅ Error screenshot automatically saved for debugging",
                "🔄 Auto-retry with smart delay enabled",
                "📊 Check console for detailed error information"
            ],
            tryAgainButton: "🔄 Try Again",
            advancedTroubleshooting: "🔧 Advanced Troubleshooting",
            longPageTips: [
                "For very long pages (>50,000px):",
                "• Scroll to specific section before capturing",
                "• Enable debug mode in settings",
                "• Check error screenshots in downloads"
            ],
            persistentProblemTips: [
                "If problem persists:",
                "• Report in Chrome webstore",
                "• Include URL and Chrome version",
                "• Attach error screenshot if available"
            ],

            // 结果页
            pageTitle: "Screenshot Results",
            themeToggle: "Dark",
            themeToggleLight: "Light",
            infoLabel: "Information:",
            infoText: "Image has been successfully captured from the current webpage.",
            infoMultipleText: "Captured {count} images from: {url}",
            filenameLabel: "File name:",
            filenamePlaceholder: "Enter new filename",
            formatLabel: "File format:",
            formatPng: "PNG (High quality, transparent)",
            formatJpg: "JPG (Smaller size)",
            formatWebp: "WebP (Web optimized)",
            formatPdf: "PDF (Portable document)",
            locationLabel: "Save location:",
            locationPlaceholder: "Files will be saved to your default Downloads folder",
            chooseLocationButton: "Choose location",
            cropTitle: "Crop image",
            cropEnable: "Enable crop mode",
            cropDimensions: "Select area to crop on image",
            cropReset: "Reset",
            cropApply: "Apply",
            cropDisable: "Disable crop",
            dragToMove: "Drag to move",
            copyButton: "Copy",
            downloadButton: "Download",
            downloadAllButton: "Download all",
            imageInfo: "Image {index} / {total}",
            croppedStatus: " (Cropped)",
            croppedImageStatus: "Image cropped",
            noImageFoundTitle: "No image found",
            noImageFoundMessage: "No screenshot data appears to have been found.",
            willAskLocation: "Browser will ask where to save each file when downloading",
            autoSave: "Auto save",
            autoSaveTooltip: "Click to switch back to automatic saving in Downloads folder",
            chooseLocationTooltip: "Click to choose where files will be saved for each download",
            pdfCreationError: "Unable to create PDF. Please try again.",
            pdfLibraryError: "PDF library not loaded yet. Please try again in a few seconds.",
            cropTooSmallError: "Crop area too small! Please select a larger area.",
            cropSuccessMessage: "Crop applied successfully! ({format})",
            copySuccessMessage: "Image copied to clipboard successfully!",
            copyErrorMessage: "Failed to copy image. Your browser may not support this feature."
        },
        
        // 中文资源（键结构与英文一致）
        zh: {
            configToggle: "⚙️ 配置",
            languageToggle: "🌐 语言",

            languageEnglish: "English",
            languageChinese: "中文",

            initializingCapture: "正在初始化截图…",
            analyzingPage: "正在分析页面结构…",
            capturingPage: "正在截取页面分区…",
            processingScreenshots: "正在处理截图…",
            finalizingCapture: "正在完成截图…",
            captureCompleted: "截图完成！",
            processingLargePage: "正在处理超长页面…",
            pleaseWaitCapture: "正在截取全部内容，请稍候",

            configTitle: "📸 截图配置",
            formatLabel: "格式：",
            formatPngOption: "PNG（无损，体积较大）",
            formatJpegOption: "JPEG（压缩，体积较小）",
            qualityLabel: "JPEG 质量：",
            timeoutLabel: "超时时间（秒）：",
            retryLabel: "重试次数：",
            errorScreenshotLabel: "出错时保存截图",
            debugModeLabel: "调试模式（详细日志）",
            saveButton: "💾 保存",
            resetButton: "🔄 重置",
            closeButton: "✕ 关闭",
            configSaved: "✅ 配置已保存！将在下次截图时生效。",

            captureSuccessTitle: "✅ 截图成功！",
            customFilenameLabel: "文件名：",
            filenamePlaceholder: "输入自定义文件名",
            successNote: "图片已在新标签页打开，也可以使用自定义文件名下载。",
            copyButton: "复制",
            downloadButton: "📥 下载",

            splitImageWarning: "注意：页面过大，Chrome 无法截取为单张图片，将拆分为",
            multipleImages: "多",
            images: "张图片。",

            invalidUrlTitle: "🚫 无效 URL",
            invalidUrlMessage: "受 Chrome 应用商店政策限制，整页截图无法在此 URL 上运行。",
            invalidUrlTips: [
                "请尝试其他网页",
                "此限制适用于 chrome:// 和扩展程序页面",
                "大多数普通网站均可正常使用"
            ],

            captureFailedTitle: "⚠️ 截图失败",
            captureFailedMessage: "出现了问题！增强错误处理机制正在处理：",
            captureFailedTips: [
                "✅ 错误截图已自动保存，便于调试",
                "🔄 已启用智能延迟自动重试",
                "📊 查看控制台获取详细错误信息"
            ],
            tryAgainButton: "🔄 重试",
            advancedTroubleshooting: "🔧 高级故障排查",
            longPageTips: [
                "对于超长页面（>50,000px）：",
                "• 截图前先滚动到指定区域",
                "• 在设置中开启调试模式",
                "• 在下载目录中查看错误截图"
            ],
            persistentProblemTips: [
                "如果问题仍然存在：",
                "• 反馈时请附上页面 URL 和 Chrome 版本",
                "• 如有错误截图请一并附上"
            ],

            pageTitle: "截图结果",
            themeToggle: "深色",
            themeToggleLight: "浅色",
            infoLabel: "信息：",
            infoText: "已成功截取当前网页的图片。",
            infoMultipleText: "已从以下页面截取 {count} 张图片：{url}",
            filenameLabel: "文件名：",
            filenamePlaceholder: "输入新文件名",
            formatLabel: "文件格式：",
            formatPng: "PNG（高质量，透明）",
            formatJpg: "JPG（体积较小）",
            formatWebp: "WebP（Web 优化）",
            formatPdf: "PDF（便携文档）",
            locationLabel: "保存位置：",
            locationPlaceholder: "文件将保存到默认下载目录",
            chooseLocationButton: "选择位置",
            cropTitle: "裁剪图片",
            cropEnable: "开启裁剪模式",
            cropDimensions: "在图片上选择要裁剪的区域",
            cropReset: "重置",
            cropApply: "应用",
            cropDisable: "关闭裁剪",
            dragToMove: "拖动移动",
            downloadButton: "下载",
            downloadAllButton: "全部下载",
            imageInfo: "图片 {index} / {total}",
            croppedStatus: "（已裁剪）",
            croppedImageStatus: "图片已裁剪",
            noImageFoundTitle: "未找到图片",
            noImageFoundMessage: "未找到任何截图数据。",
            willAskLocation: "下载时浏览器会询问每个文件的保存位置",
            autoSave: "自动保存",
            autoSaveTooltip: "点击切换回自动保存到下载目录",
            chooseLocationTooltip: "点击选择每次下载的保存位置",
            pdfCreationError: "无法创建 PDF，请稍后重试",
            pdfLibraryError: "PDF 库尚未加载完成，请稍等几秒后重试",
            cropTooSmallError: "裁剪区域太小！请选择更大的区域",
            cropSuccessMessage: "裁剪应用成功！（{format}）",
            copySuccessMessage: "图片已复制到剪贴板！",
            copyErrorMessage: "无法复制图片，您的浏览器可能不支持此功能。"
        }
    },
    
    // 当前语言
    currentLang: 'en',
    
    // 初始化语言系统：读取已保存的语言偏好并刷新 UI
    init() {
        console.log('Languages.init() called');
        
        // 读取已保存的语言偏好
        chrome.storage.local.get(['language'], (result) => {
            console.log('Language preference loaded:', result);
            
            if (result.language) {
                this.currentLang = result.language;
                console.log('Setting language to:', this.currentLang);
            } else {
                console.log('No saved language, using default:', this.currentLang);
            }
            
            // 先刷新 UI，再添加语言切换按钮
            this.updateUI();
            
            // 稍作延迟以确保 DOM 就绪
            setTimeout(() => {
                this.addLanguageToggle();
            }, 100);
        });
    },
    
    // 切换语言并保存偏好
    switchLanguage() {
        this.currentLang = this.currentLang === 'en' ? 'zh' : 'en';
        
        // 保存语言偏好
        chrome.storage.local.set({language: this.currentLang});
        
        // 刷新界面文案
        this.updateUI();
    },
    
    // 按 key 获取当前语言文案，缺失时回退英文
    getText(key) {
        return this.data[this.currentLang][key] || this.data.en[key] || key;
    },
    
    // 将语言偏好写入 chrome.storage
    saveLanguage() {
        chrome.storage.local.set({language: this.currentLang}, () => {
            console.log('Language saved:', this.currentLang);
        });
    },
    
    // 添加带国旗的语言切换按钮（弹窗页与结果页分别处理）
    addLanguageToggle() {
        console.log('addLanguageToggle called');
        
        // 判断是否在弹窗页
        const wrap = document.getElementById('wrap');
        // 判断是否在结果页
        const resultHeader = document.querySelector('.header');
        
        if (wrap) {
            // 弹窗页逻辑
            console.log('Adding language toggle for popup page');
            
            // 移除已存在的切换按钮
            const existingToggle = document.getElementById('language-toggle');
            if (existingToggle) {
                console.log('Removing existing language toggle');
                existingToggle.remove();
            }
            
            // 创建语言切换按钮
            const languageButton = document.createElement('button');
            languageButton.id = 'language-toggle';
            languageButton.type = 'button';
            languageButton.style.cssText = `
                position: absolute;
                bottom: 5px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                border: 2px solid #1976d2;
                border-radius: 8px;
                padding: 6px 12px;
                font-size: 11px;
                font-weight: bold;
                cursor: pointer;
                color: #1976d2;
                z-index: 1000;
                box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2);
                transition: all 0.3s ease;
                min-width: 70px;
                text-align: center;
            `;
            
            // 根据当前语言设置按钮文字
            languageButton.innerHTML = this.currentLang === 'vi' ? '🇨🇳 中' : '🇺🇸 EN';
            
            // 点击时切换语言
            languageButton.addEventListener('click', (e) => {
                console.log('Language button clicked, current lang:', this.currentLang);
                e.preventDefault();
                e.stopPropagation();
                
                // 切换语言
                this.currentLang = this.currentLang === 'en' ? 'zh' : 'en';
                console.log('Switching to:', this.currentLang);
                
                // 保存并刷新 UI
                this.saveLanguage();
                this.updateUI();
                
                // 更新按钮文字
                languageButton.innerHTML = this.currentLang === 'vi' ? '🇨🇳 中' : '🇺🇸 EN';
            });
            
            // 悬停效果
            languageButton.addEventListener('mouseenter', () => {
                languageButton.style.background = 'linear-gradient(135deg, #bbdefb 0%, #90caf9 100%)';
                languageButton.style.transform = 'translateX(-50%) scale(1.05)';
                languageButton.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.3)';
            });
            
            languageButton.addEventListener('mouseleave', () => {
                languageButton.style.background = 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)';
                languageButton.style.transform = 'translateX(-50%) scale(1)';
                languageButton.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.2)';
            });
            
            // 插入 DOM：优先放入长页面容器
            const longPageContainer = document.getElementById('long-page');
            if (longPageContainer && longPageContainer.style.display !== 'none') {
                // 长页面容器可见时放入其中
                longPageContainer.appendChild(languageButton);
                console.log('Language button added to long-page container');
            } else {
                // 否则放入 wrap 容器
                wrap.appendChild(languageButton);
                console.log('Language button added to wrap container');
            }
            
            // 监听长页面容器的可见性变化
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const longPage = document.getElementById('long-page');
                        const button = document.getElementById('language-toggle');
                        
                        if (longPage && button) {
                            if (longPage.style.display !== 'none' && longPage.offsetParent !== null) {
                                // 移动按钮到长页面容器
                                if (button.parentNode !== longPage) {
                                    longPage.appendChild(button);
                                }
                            } else {
                                // 移动按钮回 wrap 容器
                                if (button.parentNode !== wrap) {
                                    wrap.appendChild(button);
                                }
                            }
                        }
                    }
                });
            });
            
            // 监听长页面容器的 style 变化
            if (longPageContainer) {
                observer.observe(longPageContainer, { attributes: true, attributeFilter: ['style'] });
            }
            
            console.log('Simple language toggle added successfully');
            
        } else if (resultHeader) {
            // 结果页逻辑：由 result.js 处理
            console.log('Result page detected - language toggle will be handled by result.js');
            
            // 仅更新按钮文字
            const languageButton = document.getElementById('language-toggle-result');
            if (languageButton) {
                languageButton.innerHTML = this.currentLang === 'vi' ? '🇨🇳 中' : '🇺🇸 EN';
                console.log('Updated result page language button text');
            }
        }
    },
    
    // 更新语言按钮显示
    updateLanguageDropdown() {
        // 更新弹窗页语言按钮
        const languageButton = document.getElementById('language-toggle');
        if (languageButton && languageButton.tagName === 'BUTTON') {
            languageButton.innerHTML = this.currentLang === 'vi' ? '🇨🇳 中' : '🇺🇸 EN';
            console.log('Popup language button updated to:', this.currentLang);
        }
        
        // 更新结果页语言按钮
        const resultButton = document.getElementById('language-toggle-result');
        if (resultButton) {
            resultButton.innerHTML = this.currentLang === 'vi' ? '🇨🇳 中' : '🇺🇸 EN';
            console.log('Result page language button updated to:', this.currentLang);
        }
    },
    
    // 刷新所有 UI 文本元素
    updateUI() {
        // 更新已有元素
        this.updateElement('.config-toggle', 'configToggle');
        this.updateElement('#progress-text', 'initializingCapture');
        this.updateElement('#config-panel h4', 'configTitle');
        
        // 配置面板
        this.updateElement('label[for="config-format"]', 'formatLabel');
        this.updateElement('#config-format option[value="png"]', 'formatPngOption');
        this.updateElement('#config-format option[value="jpeg"]', 'formatJpegOption');
        this.updateElement('label[for="config-timeout"]', 'timeoutLabel');
        this.updateElement('label[for="config-retries"]', 'retryLabel');
        
        // 按钮（MV3 移除内联 onclick 后改用 id 选择器）
        this.updateElement('#save-config-btn', 'saveButton');
        this.updateElement('#reset-config-btn', 'resetButton');
        this.updateElement('#close-config-btn', 'closeButton');
        
        // 成功页
        this.updateElement('#success h3', 'captureSuccessTitle');
        this.updateElement('label[for="custom-filename"]', 'customFilenameLabel');
        this.updateElement('#custom-filename', 'filenamePlaceholder', 'placeholder');
        this.updateElement('#success .note', 'successNote');
        this.updateElement('#download-btn', 'downloadButton');
        
        // 错误与警告
        this.updateElement('#invalid h4', 'invalidUrlTitle');
        this.updateElement('#invalid p', 'invalidUrlMessage');
        this.updateElement('#uh-oh h4', 'captureFailedTitle');
        this.updateElement('.retry-btn', 'tryAgainButton');
        
        // 结果页元素
        this.updateElement('#page-title', 'pageTitle');
        this.updateElement('#info-label', 'infoLabel');
        this.updateElement('#info-text', 'infoText');
        this.updateElement('#info-multiple-text', 'infoMultipleText');
        this.updateElement('#filename-label', 'filenameLabel');
        this.updateElement('#filename', 'filenamePlaceholder', 'placeholder');
        this.updateElement('#format-label', 'formatLabel');
        this.updateElement('#format-png', 'formatPng');
        this.updateElement('#format-jpg', 'formatJpg');
        this.updateElement('#format-webp', 'formatWebp');
        this.updateElement('#format-pdf', 'formatPdf');
        this.updateElement('#location-label', 'locationLabel');
        this.updateElement('#save-location', 'locationPlaceholder', 'placeholder');
        this.updateElement('#choose-location-btn', 'chooseLocationButton');
        this.updateElement('#crop-title', 'cropTitle');
        this.updateElement('#crop-enable', 'cropEnable');
        this.updateElement('#crop-dimensions-sidebar', 'cropDimensions');
        this.updateElement('#crop-reset-sidebar', 'cropReset');
        this.updateElement('#crop-apply-sidebar', 'cropApply');
        this.updateElement('#crop-disable', 'cropDisable');
        this.updateElement('#download-btn', 'downloadButton');
        this.updateElement('#download-all-btn', 'downloadAllButton');
        this.updateElement('#image-info', 'imageInfo');
        this.updateElement('#cropped-status', 'croppedStatus');
        this.updateElement('#cropped-image-status', 'croppedImageStatus');
        this.updateElement('#no-image-found-title', 'noImageFoundTitle');
        this.updateElement('#no-image-found-message', 'noImageFoundMessage');
        this.updateElement('#will-ask-location', 'willAskLocation');
        this.updateElement('#auto-save', 'autoSave');
        this.updateElement('#auto-save-tooltip', 'autoSaveTooltip');
        this.updateElement('#choose-location-tooltip', 'chooseLocationTooltip');
        this.updateElement('#pdf-creation-error', 'pdfCreationError');
        this.updateElement('#pdf-library-error', 'pdfLibraryError');
        this.updateElement('#crop-too-small-error', 'cropTooSmallError');
        this.updateElement('#crop-success-message', 'cropSuccessMessage');
        
        // 更新主题切换按钮
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            themeToggle.textContent = isDark ? this.getText('themeToggleLight') : this.getText('themeToggle');
        }
        
        // 更新语言按钮显示
        this.updateLanguageDropdown();
        
        // 更新复合元素
        this.updateComplexElements();
    },
    
    // 辅助函数：更新单个元素的文本或占位符
    updateElement(selector, textKey, attribute = 'textContent') {
        const element = document.querySelector(selector);
        if (element) {
            if (attribute === 'placeholder') {
                element.placeholder = this.getText(textKey);
            } else {
                element[attribute] = this.getText(textKey);
            }
        }
    },
    
    // 更新由多段文本拼接而成的复合元素
    updateComplexElements() {
        // 更新分图警告
        const splitImage = document.getElementById('split-image');
        if (splitImage) {
            splitImage.innerHTML = `
                ${this.getText('splitImageWarning')} 
                <span id="screenshot-count">${this.getText('multipleImages')}</span> 
                ${this.getText('images')}
            `;
        }
        
        // 更新无效 URL 错误提示
        const invalid = document.getElementById('invalid');
        if (invalid) {
            const tips = this.getText('invalidUrlTips');
            invalid.innerHTML = `
                <h4>${this.getText('invalidUrlTitle')}</h4>
                <p>${this.getText('invalidUrlMessage')}</p>
                <ul>
                    ${tips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
            `;
        }
        
        // 更新截图失败错误提示
        const uhOh = document.getElementById('uh-oh');
        if (uhOh) {
            const failedTips = this.getText('captureFailedTips');
            const longPageTips = this.getText('longPageTips');
            const persistentTips = this.getText('persistentProblemTips');
            
            uhOh.innerHTML = `
                <h4>${this.getText('captureFailedTitle')}</h4>
                <p>${this.getText('captureFailedMessage')}</p>
                <ul>
                    ${failedTips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
                <button class="retry-btn" data-action="retry">${this.getText('tryAgainButton')}</button>
                <br><br>
                <details style="margin-top: 10px;">
                    <summary style="cursor: pointer; color: #007bff;">${this.getText('advancedTroubleshooting')}</summary>
                    <div style="margin-top: 8px; font-size: 10px; color: #666;">
                        <strong>${longPageTips[0]}</strong><br>
                        ${longPageTips.slice(1).join('<br>')}<br><br>
                        
                        <strong>${persistentTips[0]}</strong><br>
                        ${persistentTips.slice(1).join('<br>')}
                    </div>
                </details>
            `;

            // 为重试按钮绑定事件（innerHTML 重建后原事件已失效，MV3 禁止内联 onclick）
            const retryBtn = uhOh.querySelector('button[data-action="retry"]');
            if (retryBtn && typeof retryCapture === 'function') {
                retryBtn.addEventListener('click', retryCapture);
            }
        }
        
        // 更新长页面处理提示
        const longPage = document.getElementById('long-page');
        if (longPage) {
            const textElement = longPage.querySelector('.loading-gif-text');
            const subtextElement = longPage.querySelector('.loading-gif-subtext');
            if (textElement) textElement.textContent = this.getText('processingLargePage');
            if (subtextElement) subtextElement.textContent = this.getText('pleaseWaitCapture');
        }
        
        // 更新复选框标签
        const errorScreenshotLabel = document.querySelector('label[for="config-error-screenshot"]');
        if (errorScreenshotLabel) {
            const checkbox = errorScreenshotLabel.querySelector('input');
            errorScreenshotLabel.innerHTML = '';
            errorScreenshotLabel.appendChild(checkbox);
            errorScreenshotLabel.appendChild(document.createTextNode(' ' + this.getText('errorScreenshotLabel')));
        }
        
        const debugModeLabel = document.querySelector('label[for="config-debug"]');
        if (debugModeLabel) {
            const checkbox = debugModeLabel.querySelector('input');
            debugModeLabel.innerHTML = '';
            debugModeLabel.appendChild(checkbox);
            debugModeLabel.appendChild(document.createTextNode(' ' + this.getText('debugModeLabel')));
        }
        
        // 更新 JPEG 质量标签
        const qualityLabel = document.querySelector('label[for="config-quality"]');
        if (qualityLabel) {
            const qualityValue = qualityLabel.querySelector('#quality-value');
            if (qualityValue) {
                qualityLabel.innerHTML = `${this.getText('qualityLabel')} <span id="quality-value">${qualityValue.textContent}</span>%`;
            }
        }
    },
    
    // 截图过程中更新进度文案
    updateProgress(phase) {
        const progressText = document.getElementById('progress-text');
        if (progressText) {
            let text = '';
            switch(phase) {
                case 'analyzing':
                    text = this.getText('analyzingPage');
                    break;
                case 'capturing':
                    text = this.getText('capturingPage');
                    break;
                case 'processing':
                    text = this.getText('processingScreenshots');
                    break;
                case 'finalizing':
                    text = this.getText('finalizingCapture');
                    break;
                case 'completed':
                    text = this.getText('captureCompleted');
                    break;
                default:
                    text = this.getText('initializingCapture');
            }
            progressText.textContent = text;
        }
    }
};

// 导出供其他文件使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Languages;
}

// DOM 就绪后自动初始化
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM loaded, initializing Languages...');
            Languages.init();
        });
    } else {
        // DOM 已就绪
        console.log('DOM already ready, initializing Languages immediately...');
        setTimeout(() => Languages.init(), 50);
    }
} 