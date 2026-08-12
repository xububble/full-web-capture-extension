// result.js - 截屏结果页处理脚本

let capturedImages = [];
let originalUrls = [];
let currentPageUrl = '';

// 裁剪功能相关变量
let cropMode = false;
let cropData = {};
let currentCropImageIndex = 0;
let croppedImages = {}; // 存储各索引对应的已裁剪图片
let cropSelection = null; // 裁剪选区 DOM 元素

let currentTheme = 'light';

// 初始化多语言系统
function initLanguageSystem() {
    if (typeof Languages !== 'undefined') {
        // 绑定语言切换按钮事件
        const languageToggle = document.getElementById('language-toggle-result');
        if (languageToggle) {
            console.log('Result page language toggle found, adding event listener');
            languageToggle.addEventListener('click', function(e) {
                console.log('Result page language toggle clicked');
                e.preventDefault();
                e.stopPropagation();
                
                Languages.switchLanguage();
                
                languageToggle.innerHTML = Languages.getLanguageButtonLabel();
                
                updateThemeToggleText();
                // 重新渲染以应用新语言
                loadSavedDownloadPath();
                displayImages();
            });
        } else {
            console.log('Language toggle button not found');
        }
    }
}

// 初始化主题
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

// 设置主题并持久化
function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeToggleText();
}
    
// 更新主题切换按钮文案（支持多语言）
function updateThemeToggleText() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        if (typeof Languages !== 'undefined') {
            const isDark = currentTheme === 'dark';
            themeToggle.textContent = isDark ? Languages.getText('themeToggleLight') : Languages.getText('themeToggle');
        } else {
            themeToggle.textContent = currentTheme === 'dark' ? 'Light' : 'Dark';
        }
    }
}

function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// 从 URL 参数或 localStorage 加载截图数据
function loadCaptureData() {
    const urlParams = new URLSearchParams(window.location.search);
    const imageUrls = urlParams.get('images');
    const pageUrl = urlParams.get('url');

    if (imageUrls) {
        originalUrls = imageUrls.split(',');
        currentPageUrl = pageUrl || 'Unknown';
        resolveAndDisplay();
    } else {
        // URL 无参数时回退到 localStorage
        const storedData = localStorage.getItem('captureData');
        if (storedData) {
            const data = JSON.parse(storedData);
            originalUrls = data.images || [];
            currentPageUrl = data.url || 'Unknown';
            resolveAndDisplay();
        } else {
            showError();
        }
    }

    loadSavedDownloadPath();
}

// FileSystem 兜底模式：storage: 前缀的标记需从 chrome.storage 还原为 dataURL 再展示
function resolveAndDisplay() {
    if (!originalUrls.length || originalUrls[0].indexOf('storage:') !== 0) {
        displayImages();
        return;
    }
    var keys = originalUrls.map(function(u) { return u.replace('storage:', ''); });
    chrome.storage.local.get(keys, function(result) {
        originalUrls = keys.map(function(k) { return result[k]; });
        displayImages();
    });
}

// 恢复上次保存的下载位置设置
function loadSavedDownloadPath() {
    const saveAsMode = localStorage.getItem('saveAsMode') === 'true';
    const saveLocationInput = document.getElementById('save-location');
    const chooseLocationBtn = document.getElementById('choose-location-btn');
    
    if (saveAsMode) {
        if (typeof Languages !== 'undefined') {
            saveLocationInput.value = Languages.getText('willAskLocation');
            chooseLocationBtn.textContent = Languages.getText('autoSave');
            chooseLocationBtn.title = Languages.getText('autoSaveTooltip');
    } else {
            saveLocationInput.value = '下载时浏览器会询问每个文件的保存位置';
            chooseLocationBtn.textContent = '自动保存';
            chooseLocationBtn.title = '点击切换回自动保存到下载目录';
        }
    } else {
        if (typeof Languages !== 'undefined') {
            saveLocationInput.value = Languages.getText('locationPlaceholder');
            chooseLocationBtn.textContent = Languages.getText('chooseLocationButton');
            chooseLocationBtn.title = Languages.getText('chooseLocationTooltip');
        } else {
            saveLocationInput.value = '文件将保存到默认下载目录';
            chooseLocationBtn.textContent = '选择保存位置';
            chooseLocationBtn.title = '点击选择每次下载的保存位置';
        }
    }
}

// 渲染已截取的图片
function displayImages() {
    const container = document.getElementById('image-container');
    const downloadAllBtn = document.getElementById('download-all-btn');
    const filenameInput = document.getElementById('filename');
    
    const infoSection = document.getElementById('info-section');
    if (typeof Languages !== 'undefined') {
        if (originalUrls.length > 1) {
            const infoText = Languages.getText('infoMultipleText')
                .replace('{count}', originalUrls.length)
                .replace('{url}', currentPageUrl);
            infoSection.innerHTML = `<strong>${Languages.getText('infoLabel')}</strong> ${infoText}`;
        } else {
            infoSection.innerHTML = `<strong>${Languages.getText('infoLabel')}</strong> ${Languages.getText('infoText')}`;
        }
    } else {
        // 无语言包时回退到越南语
        infoSection.innerHTML = `<strong>信息：</strong>已从以下页面截取 ${originalUrls.length} 张图片：<em>${currentPageUrl}</em>`;
    }
    
    const defaultName = generateDefaultFilename();
    filenameInput.value = defaultName;
    
    if (originalUrls.length > 1) {
        // 多图：网格展示
        downloadAllBtn.style.display = 'inline-block';
        container.innerHTML = '<div class="multiple-images" id="images-grid"></div>';
        const grid = document.getElementById('images-grid');
        
        originalUrls.forEach((url, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            
            // 优先使用裁剪后的图片
            const displayUrl = croppedImages[index] || url;
            let cropStatus = '';
            if (croppedImages[index]) {
                cropStatus = typeof Languages !== 'undefined' ? 
                    Languages.getText('croppedStatus') : '（已裁剪）';
            }
            
            let imageInfo = '';
            if (typeof Languages !== 'undefined') {
                imageInfo = Languages.getText('imageInfo')
                    .replace('{index}', index + 1)
                    .replace('{total}', originalUrls.length);
            } else {
                imageInfo = `Hình ${index + 1} / ${originalUrls.length}`;
            }
            
            imageItem.innerHTML = `
                <img src="${displayUrl}" alt="Screenshot ${index + 1}" class="screenshot">
                <div class="image-info">${imageInfo}${cropStatus}</div>
            `;
            grid.appendChild(imageItem);
        });
    } else {
        // 单图：直接渲染
        const displayUrl = croppedImages[0] || originalUrls[0];
        let cropStatus = '';
        if (croppedImages[0]) {
            const statusText = typeof Languages !== 'undefined' ? 
                Languages.getText('croppedImageStatus') : '已裁剪';
            cropStatus = `<br><small style="color: #4CAF50;">${statusText}</small>`;
        }
        container.innerHTML = `
            <img src="${displayUrl}" alt="Screenshot" class="screenshot">
            ${cropStatus}
        `;
    }
}

// 生成带时间戳的默认文件名
function generateDefaultFilename() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `screenshot-${timestamp}`;
}

// 无数据时显示错误提示
function showError() {
    const container = document.getElementById('image-container');
    let title, message;
    
    if (typeof Languages !== 'undefined') {
        title = Languages.getText('noImageFoundTitle');
        message = Languages.getText('noImageFoundMessage');
    } else {
        title = '未找到图片';
        message = '未找到任何截图数据。';
    }
    
    container.innerHTML = `
        <div style="color: #f44336; text-align: center; padding: 40px;">
            <h3>${title}</h3>
            <p>${message}</p>
        </div>
    `;
}

// 切换“自动保存 / 每次询问”下载模式
function chooseDownloadLocation() {
    const currentSetting = localStorage.getItem('saveAsMode') === 'true';
    const newSetting = !currentSetting;
    
    localStorage.setItem('saveAsMode', newSetting.toString());
    
    const saveLocationInput = document.getElementById('save-location');
    const chooseLocationBtn = document.getElementById('choose-location-btn');
    
    if (newSetting) {
        if (typeof Languages !== 'undefined') {
            saveLocationInput.value = Languages.getText('willAskLocation');
            chooseLocationBtn.textContent = Languages.getText('autoSave');
            chooseLocationBtn.title = Languages.getText('autoSaveTooltip');
    } else {
            saveLocationInput.value = '下载时浏览器会询问每个文件的保存位置';
            chooseLocationBtn.textContent = '自动保存';
            chooseLocationBtn.title = '点击切换回自动保存到下载目录';
        }
    } else {
        if (typeof Languages !== 'undefined') {
            saveLocationInput.value = Languages.getText('locationPlaceholder');
            chooseLocationBtn.textContent = Languages.getText('chooseLocationButton');
            chooseLocationBtn.title = Languages.getText('chooseLocationTooltip');
        } else {
            saveLocationInput.value = '文件将保存到默认下载目录';
            chooseLocationBtn.textContent = '选择保存位置';
            chooseLocationBtn.title = '点击选择每次下载的保存位置';
        }
    }
}

// 使用 Chrome Downloads API 下载单张图片
async function downloadImageWithChrome(url, filename, index = null) {
    const fileFormat = document.getElementById('file-format').value;
    const finalFilename = index !== null ? 
        `${filename}-${index + 1}.${fileFormat}` : 
        `${filename}.${fileFormat}`;
    
    let downloadUrl = (index !== null && croppedImages[index]) ? croppedImages[index] : 
                     (index === null && croppedImages[0]) ? croppedImages[0] : url;
    
    // PDF 需先合成再下载
    if (fileFormat === 'pdf') {
        const imageUrls = [downloadUrl];
        const pdfUrl = await createPDFFromImages(imageUrls, filename);
        if (pdfUrl) {
            downloadUrl = pdfUrl;
        } else {
            const errorMsg = typeof Languages !== 'undefined' ? 
                Languages.getText('pdfCreationError') : '无法创建 PDF，请重试。';
            alert(errorMsg);
            return;
        }
    } else {
        // 非 PNG 时按需转换格式
        if (fileFormat !== 'png' && (downloadUrl.startsWith('data:image/png') || downloadUrl.startsWith('filesystem:'))) {
            downloadUrl = await convertImageFormat(downloadUrl, fileFormat);
        }
    }
    
    const saveAsMode = localStorage.getItem('saveAsMode') === 'true';
    
    const downloadOptions = {
        url: downloadUrl,
        filename: finalFilename,
        saveAs: saveAsMode // 用户开启时弹出保存对话框
    };
    
    chrome.downloads.download(downloadOptions, function(downloadId) {
        if (chrome.runtime.lastError) {
            console.error('Download error:', chrome.runtime.lastError);
            // 失败时回退到 a 标签下载
            downloadImageFallback(downloadUrl, finalFilename);
        } else {
            console.log('Download started with ID:', downloadId);
        }
    });
}

// 通过 canvas 转换图片格式
function convertImageFormat(imageUrl, format) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            
            // JPG 无透明通道，先铺白底
            if (format === 'jpg') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            ctx.drawImage(img, 0, 0);
            
            let mimeType = 'image/png';
            let quality = 1.0;
            
            switch(format) {
                case 'jpg':
                    mimeType = 'image/jpeg';
                    quality = 0.9;
                    break;
                case 'webp':
                    mimeType = 'image/webp';
                    quality = 0.9;
                    break;
                default:
                    mimeType = 'image/png';
            }
            
            const convertedUrl = canvas.toDataURL(mimeType, quality);
            resolve(convertedUrl);
        };
        
        img.src = imageUrl;
    });
}

// 用 jsPDF 将图片合成为 PDF
function createPDFFromImages(imageUrls, filename) {
    return new Promise((resolve, reject) => {
        console.log('Creating PDF from images:', imageUrls);
        
        if (!window.jspdf || !window.jspdf.jsPDF) {
            console.error('jsPDF library not loaded');
            const errorMsg = typeof Languages !== 'undefined' ? 
                Languages.getText('pdfLibraryError') : 'PDF 库尚未加载完成，请稍等几秒后重试。';
            alert(errorMsg);
            resolve(null);
            return;
        }
        
        const { jsPDF } = window.jspdf;
        
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const maxWidth = pageWidth - 2 * margin;
            const maxHeight = pageHeight - 2 * margin;
            
            let processedImages = 0;
            let hasError = false;
            
            if (imageUrls.length === 0) {
                console.error('No images to process');
                resolve(null);
                return;
            }
            
            imageUrls.forEach((imageUrl, index) => {
                const img = new Image();
                
                // 非 data URL 加跨域标记，避免污染 canvas
                if (!imageUrl.startsWith('data:')) {
                    img.crossOrigin = 'anonymous';
                }
                
                img.onload = function() {
                    try {
                        console.log(`Processing image ${index + 1}/${imageUrls.length}`);
                        
                        let imgWidth = img.width;
                        let imgHeight = img.height;
                        
                        // 像素转毫米（按 96 DPI）
                        imgWidth = imgWidth * 25.4 / 96;
                        imgHeight = imgHeight * 25.4 / 96;
                        
                        // 等比缩放到页面内
                        const scaleX = maxWidth / imgWidth;
                        const scaleY = maxHeight / imgHeight;
                        const scale = Math.min(scaleX, scaleY, 1); // 不放大超过原图
                        
                        const finalWidth = imgWidth * scale;
                        const finalHeight = imgHeight * scale;
                        
                        // 居中放置
                        const x = (pageWidth - finalWidth) / 2;
                        const y = (pageHeight - finalHeight) / 2;
                        
                        // 首张之后每图新起一页
                        if (index > 0) {
                            pdf.addPage();
                        }
                        
                        pdf.addImage(imageUrl, 'PNG', x, y, finalWidth, finalHeight);
                        
                        processedImages++;
                        
                        // 全部图片处理完毕后输出
                        if (processedImages === imageUrls.length) {
                            try {
                                console.log('Creating PDF blob...');
                                const pdfBlob = pdf.output('blob');
                                const pdfUrl = URL.createObjectURL(pdfBlob);
                                console.log('PDF created successfully:', pdfUrl);
                                resolve(pdfUrl);
                            } catch (error) {
                                console.error('Error creating PDF blob:', error);
                                resolve(null);
                            }
                        }
                    } catch (error) {
                        console.error('Error processing image:', error);
                        hasError = true;
                        processedImages++;
                        
                        if (processedImages === imageUrls.length) {
                            resolve(null);
                        }
                    }
                };
                
                img.onerror = function(error) {
                    console.error('Failed to load image for PDF:', imageUrl, error);
                    hasError = true;
                    processedImages++;
                    
                    if (processedImages === imageUrls.length) {
                        if (hasError) {
                            resolve(null);
                        } else {
                            try {
                                const pdfBlob = pdf.output('blob');
                                const pdfUrl = URL.createObjectURL(pdfBlob);
                                resolve(pdfUrl);
                            } catch (error) {
                                console.error('Error creating PDF blob after image error:', error);
                                resolve(null);
                            }
                        }
                    }
                };
                
                // 错开各图加载时机，避免卡死
                setTimeout(() => {
                    img.src = imageUrl;
                }, index * 100);
            });
            
        } catch (error) {
            console.error('Error initializing PDF:', error);
            resolve(null);
        }
    });
}

// 下载全部图片
async function downloadAllImages() {
    const filename = document.getElementById('filename').value.trim() || 'screenshot';
    const fileFormat = document.getElementById('file-format').value;
    
    // PDF 格式单独走合成流程
    if (fileFormat === 'pdf') {
        console.log('Starting PDF download process...');
        
        console.log('Checking local jsPDF for PDF download...');
        
        if (!window.jspdf || !window.jspdf.jsPDF) {
            console.log('jsPDF not immediately available, waiting...');
            const isLoaded = await ensureJsPDFLoaded();
            if (!isLoaded) {
                console.error('Local jsPDF library not available');
                alert('PDF 库出错，请刷新页面后重试。');
                return;
            }
        }
        
        console.log('jsPDF is ready, proceeding with PDF creation');
        
        const imageUrls = [];
        
        if (originalUrls.length === 1) {
            imageUrls.push(croppedImages[0] || originalUrls[0]);
        } else {
            for (let i = 0; i < originalUrls.length; i++) {
                imageUrls.push(croppedImages[i] || originalUrls[i]);
            }
        }
        
        console.log('Image URLs for PDF:', imageUrls);
        
        showSuccessMessage('正在生成 PDF 文件…请稍候。');
        
        try {
            const pdfUrl = await createPDFFromImages(imageUrls, filename);
            if (pdfUrl) {
                console.log('PDF created, starting download...');
                downloadSingleImage(pdfUrl, `${filename}.pdf`);
                showSuccessMessage('PDF 生成成功！正在下载…');
            } else {
                console.error('PDF creation failed');
                alert('无法创建 PDF，可能原因：\n1. 图片过大\n2. 网络错误\n3. PDF 库未就绪\n\n请重试。');
            }
        } catch (error) {
            console.error('Error in PDF creation process:', error);
            alert('创建 PDF 时出错：' + error.message);
        }
        return;
    }
    
    // 其他格式：逐张下载
    if (originalUrls.length === 1) {
        let downloadUrl = croppedImages[0] || originalUrls[0];
        
        if (fileFormat !== 'png' && (downloadUrl.startsWith('data:image/png') || downloadUrl.startsWith('filesystem:'))) {
            downloadUrl = await convertImageFormat(downloadUrl, fileFormat);
        }
        
        downloadSingleImage(downloadUrl, `${filename}.${fileFormat}`);
    } else {
        for (let i = 0; i < originalUrls.length; i++) {
            let downloadUrl = croppedImages[i] || originalUrls[i];
            
            if (fileFormat !== 'png' && (downloadUrl.startsWith('data:image/png') || downloadUrl.startsWith('filesystem:'))) {
                downloadUrl = await convertImageFormat(downloadUrl, fileFormat);
            }
            
            setTimeout(() => {
                downloadSingleImage(downloadUrl, `${filename}-${i + 1}.${fileFormat}`);
            }, i * 500); // 间隔下载，避免浏览器过载
        }
    }
}

// 下载单个文件
function downloadSingleImage(url, filename) {
    const saveAsMode = localStorage.getItem('saveAsMode') === 'true';
    
    if (filename.endsWith('.pdf')) {
        console.log('Downloading PDF file:', filename);
        
        // 优先使用 Chrome Downloads API
        if (chrome && chrome.downloads) {
            const downloadOptions = {
                url: url,
                filename: filename,
                saveAs: saveAsMode
            };
            
            chrome.downloads.download(downloadOptions, function(downloadId) {
                if (chrome.runtime.lastError) {
                    console.error('Chrome download error:', chrome.runtime.lastError);
                    downloadPDFFallback(url, filename);
                } else {
                    console.log('PDF download started with ID:', downloadId);
                }
            });
        } else {
            downloadPDFFallback(url, filename);
        }
        return;
    }
    
    const downloadOptions = {
        url: url,
        filename: filename,
        saveAs: saveAsMode
    };
    
    chrome.downloads.download(downloadOptions, function(downloadId) {
        if (chrome.runtime.lastError) {
            console.error('Download error:', chrome.runtime.lastError);
            downloadImageFallback(url, filename);
        } else {
            console.log('Download started with ID:', downloadId);
        }
    });
}

// PDF 备用下载方案
function downloadPDFFallback(url, filename) {
    console.log('Using PDF fallback download method');
    
    try {
        // 创建下载链接
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        // 插入 DOM 并触发点击
        document.body.appendChild(link);
        link.click();
        
        // 清理临时对象
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url); // 释放内存
        }, 100);
        
        console.log('PDF download initiated via fallback method');
    } catch (error) {
        console.error('PDF fallback download failed:', error);
        alert('无法下载 PDF，请重试。');
    }
}

// 备用下载方案（降级处理）
function downloadImageFallback(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 在新标签页查看原图
function viewOriginalImages() {
    originalUrls.forEach((url, index) => {
        setTimeout(() => {
            window.open(url, `_blank_${index}`);
        }, index * 200);
    });
}

// === 裁剪功能 ===

// 开启裁剪模式
function enableCropMode() {
    cropMode = true;
    document.body.classList.add('crop-active');
    
    // 显示裁剪工具栏
    document.getElementById('crop-enable').style.display = 'none';
    document.getElementById('crop-tools').style.display = 'block';
    
    // 在当前图片上创建裁剪选区
    createCropSelection();
    
    updateCropDimensions();
}

// 关闭裁剪模式
function disableCropMode() {
    cropMode = false;
    document.body.classList.remove('crop-active');
    
    // 隐藏裁剪工具栏
    document.getElementById('crop-enable').style.display = 'block';
    document.getElementById('crop-tools').style.display = 'none';
    
    // 移除裁剪选区
    removeCropSelection();
}

// 创建裁剪选区
function createCropSelection() {
    // 先移除已有选区
    removeCropSelection();
    
    const imageContainer = document.getElementById('image-container');
    const img = imageContainer.querySelector('img.screenshot');
    
    if (!img) return;
    
    // 若图片还没有包裹容器则创建
    let wrapper = img.parentElement;
    if (!wrapper.classList.contains('crop-wrapper')) {
        wrapper = document.createElement('div');
        wrapper.className = 'crop-wrapper';
        wrapper.style.cssText = `
            position: relative;
            display: inline-block;
            max-width: 100%;
        `;
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
    }
    
    // 创建裁剪选区
    cropSelection = document.createElement('div');
    cropSelection.className = 'crop-selection';
    cropSelection.innerHTML = `
        <div class="crop-handle crop-handle-nw" data-direction="nw"></div>
        <div class="crop-handle crop-handle-ne" data-direction="ne"></div>
        <div class="crop-handle crop-handle-sw" data-direction="sw"></div>
        <div class="crop-handle crop-handle-se" data-direction="se"></div>
        <div class="crop-handle crop-handle-n" data-direction="n"></div>
        <div class="crop-handle crop-handle-s" data-direction="s"></div>
        <div class="crop-handle crop-handle-w" data-direction="w"></div>
        <div class="crop-handle crop-handle-e" data-direction="e"></div>
        <div class="crop-move-handle"></div>
    `;
    
    wrapper.appendChild(cropSelection);
    
    // 为裁剪选区绑定事件
    setupCropSelectionEvents();
}

// 移除裁剪选区
function removeCropSelection() {
    if (cropSelection) {
        cropSelection.remove();
        cropSelection = null;
    }
}

// 为裁剪选区绑定事件
function setupCropSelectionEvents() {
    if (!cropSelection) return;
    
    const handles = cropSelection.querySelectorAll('.crop-handle');
    const moveHandle = cropSelection.querySelector('.crop-move-handle');
    const wrapper = cropSelection.parentElement;
    const img = wrapper.querySelector('img');
    
    let isDragging = false;
    let dragType = '';
    let startX, startY;
    let startRect = {};
    let wrapperRect = {};
    
    // 处理拖动手柄
    handles.forEach(handle => {
        handle.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            isDragging = true;
            dragType = 'resize';
            const direction = handle.getAttribute('data-direction');
            
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = cropSelection.getBoundingClientRect();
            const wRect = wrapper.getBoundingClientRect();
            
            startRect = {
                left: rect.left - wRect.left,
                top: rect.top - wRect.top,
                width: rect.width,
                height: rect.height
            };
            
            wrapperRect = {
                width: wRect.width,
                height: wRect.height
            };
            
            const mouseMoveHandler = function(e) {
                if (!isDragging) return;
                
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                let newLeft = startRect.left;
                let newTop = startRect.top;
                let newWidth = startRect.width;
                let newHeight = startRect.height;
                
                // 按方向处理缩放
                switch(direction) {
                    case 'nw':
                        newLeft = startRect.left + deltaX;
                        newTop = startRect.top + deltaY;
                        newWidth = startRect.width - deltaX;
                        newHeight = startRect.height - deltaY;
                        break;
                    case 'ne':
                        newTop = startRect.top + deltaY;
                        newWidth = startRect.width + deltaX;
                        newHeight = startRect.height - deltaY;
                        break;
                    case 'sw':
                        newLeft = startRect.left + deltaX;
                        newWidth = startRect.width - deltaX;
                        newHeight = startRect.height + deltaY;
                        break;
                    case 'se':
                        newWidth = startRect.width + deltaX;
                        newHeight = startRect.height + deltaY;
                        break;
                    case 'n':
                        newTop = startRect.top + deltaY;
                        newHeight = startRect.height - deltaY;
                        break;
                    case 's':
                        newHeight = startRect.height + deltaY;
                        break;
                    case 'w':
                        newLeft = startRect.left + deltaX;
                        newWidth = startRect.width - deltaX;
                        break;
                    case 'e':
                        newWidth = startRect.width + deltaX;
                        break;
                }
                
                // 限制在容器范围内
                newLeft = Math.max(0, Math.min(newLeft, wrapperRect.width - 50));
                newTop = Math.max(0, Math.min(newTop, wrapperRect.height - 50));
                newWidth = Math.max(50, Math.min(newWidth, wrapperRect.width - newLeft));
                newHeight = Math.max(50, Math.min(newHeight, wrapperRect.height - newTop));
                
                // 应用变更
                cropSelection.style.left = (newLeft / wrapperRect.width * 100) + '%';
                cropSelection.style.top = (newTop / wrapperRect.height * 100) + '%';
                cropSelection.style.width = (newWidth / wrapperRect.width * 100) + '%';
                cropSelection.style.height = (newHeight / wrapperRect.height * 100) + '%';
                
                updateCropDimensions();
            };
            
            const mouseUpHandler = function() {
                isDragging = false;
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            };
            
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });
    });
    
    // 处理选区移动
    moveHandle.addEventListener('mousedown', function(e) {
        e.preventDefault();
        
        isDragging = true;
        dragType = 'move';
        
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = cropSelection.getBoundingClientRect();
        const wRect = wrapper.getBoundingClientRect();
        
        startRect = {
            left: rect.left - wRect.left,
            top: rect.top - wRect.top,
            width: rect.width,
            height: rect.height
        };
        
        wrapperRect = {
            width: wRect.width,
            height: wRect.height
        };
        
        const mouseMoveHandler = function(e) {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            let newLeft = startRect.left + deltaX;
            let newTop = startRect.top + deltaY;
            
            // 限制在容器范围内
            newLeft = Math.max(0, Math.min(newLeft, wrapperRect.width - startRect.width));
            newTop = Math.max(0, Math.min(newTop, wrapperRect.height - startRect.height));
            
            cropSelection.style.left = (newLeft / wrapperRect.width * 100) + '%';
            cropSelection.style.top = (newTop / wrapperRect.height * 100) + '%';
            
            updateCropDimensions();
        };
        
        const mouseUpHandler = function() {
            isDragging = false;
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
        };
        
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    });
}

// 更新裁剪尺寸信息
function updateCropDimensions() {
    if (!cropSelection) return;
    
    const wrapper = cropSelection.parentElement;
    const img = wrapper.querySelector('img');
    const dimensionsDiv = document.getElementById('crop-dimensions-sidebar');
    
    if (!img || !dimensionsDiv) return;
    
    const selectionRect = cropSelection.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    
    // 计算实际尺寸
    const scaleX = img.naturalWidth / wrapperRect.width;
    const scaleY = img.naturalHeight / wrapperRect.height;
    
    const realWidth = Math.round(selectionRect.width * scaleX);
    const realHeight = Math.round(selectionRect.height * scaleY);
    
    dimensionsDiv.innerHTML = `📏 原图：${img.naturalWidth} × ${img.naturalHeight}<br>🎯 <span style="color: #FF5722; font-weight: bold;">选区：${realWidth} × ${realHeight} 像素</span>`;
}

// 重置裁剪选区
function resetCropSelection() {
    if (!cropSelection) return;
    
    cropSelection.style.left = '20%';
    cropSelection.style.top = '20%';
    cropSelection.style.width = '60%';
    cropSelection.style.height = '60%';
    
    updateCropDimensions();
}

// 从侧边栏应用裁剪
function applyCropFromSidebar() {
    if (!cropSelection) {
        alert('请先开启裁剪模式！');
        return;
    }
    
    const wrapper = cropSelection.parentElement;
    const img = wrapper.querySelector('img');
    const fileFormat = document.getElementById('file-format').value;
    
    if (!img) {
        alert('找不到图片！');
        return;
    }
    
    // 获取选区信息
    const selectionRect = cropSelection.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    
    // 计算缩放比例
    const scaleX = img.naturalWidth / wrapperRect.width;
    const scaleY = img.naturalHeight / wrapperRect.height;
    
    // 计算实际裁剪区域
    const cropX = (selectionRect.left - wrapperRect.left) * scaleX;
    const cropY = (selectionRect.top - wrapperRect.top) * scaleY;
    const cropWidth = selectionRect.width * scaleX;
    const cropHeight = selectionRect.height * scaleY;
    
    // 校验尺寸是否合法
    if (cropWidth < 10 || cropHeight < 10) {
        const errorMsg = typeof Languages !== 'undefined' ? 
            Languages.getText('cropTooSmallError') : '裁剪区域太小！请选择更大的区域。';
        alert(errorMsg);
        return;
    }
    
    // 创建 canvas 用于裁剪图片
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    
    // JPG 无透明通道，先铺白底
    if (fileFormat === 'jpg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, cropWidth, cropHeight);
    }
    
    // 绘制裁剪后的图片
    ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
    );
    
    // 转换为目标格式
    let mimeType = 'image/png';
    let quality = 1.0;
    
    switch(fileFormat) {
        case 'jpg':
            mimeType = 'image/jpeg';
            quality = 0.9;
            break;
        case 'webp':
            mimeType = 'image/webp';
            quality = 0.9;
            break;
        case 'pdf':
            // PDF 在下载时单独处理，裁剪结果保留 PNG
            mimeType = 'image/png';
            break;
        default:
            mimeType = 'image/png';
    }
    
    // 保存裁剪后的图片
    croppedImages[0] = canvas.toDataURL(mimeType, quality);
    
    // 更新图片显示
    img.src = croppedImages[0];
    
    // 关闭裁剪模式
    disableCropMode();
    
    // 显示成功提示
    let successMsg = '';
    if (typeof Languages !== 'undefined') {
        successMsg = Languages.getText('cropSuccessMessage').replace('{format}', fileFormat.toUpperCase());
    } else {
        successMsg = `裁剪应用成功！（${fileFormat.toUpperCase()}）`;
    }
    showSuccessMessage(successMsg);
}

// 显示成功提示
function showSuccessMessage(message) {
    // 创建提示元素
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        font-weight: bold;
        animation: slideIn 0.3s ease-out;
    `;
    notification.innerHTML = `${message}`;
    
    // 添加 CSS 动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // 3 秒后自动隐藏
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 检查本地内置的 jsPDF 库
function ensureJsPDFLoaded() {
    return new Promise((resolve) => {
        console.log('Checking local jsPDF availability...');
        
        // 检查库是否已加载
        if (window.jspdf && window.jspdf.jsPDF) {
            console.log('jsPDF is available');
            resolve(true);
            return;
        }
        
        // 尚未加载则稍候重试（脚本可能仍在加载中）
        console.log('jsPDF not immediately available, waiting...');
        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            if (window.jspdf && window.jspdf.jsPDF) {
                console.log('jsPDF loaded successfully after waiting');
                clearInterval(checkInterval);
                resolve(true);
            } else if (attempts > 30) { // 3 秒
                console.error('Timeout waiting for local jsPDF');
                clearInterval(checkInterval);
                resolve(false);
            }
        }, 100);
    });
}

// 复制图片到剪贴板
async function copyImagesToClipboard() {
    const copyBtn = document.getElementById('copy-btn');
    const originalText = copyBtn.innerHTML;
    
    try {
        // 检查剪贴板 API 支持
        if (!navigator.clipboard || !navigator.clipboard.write) {
            throw new Error('Clipboard API not supported');
        }
        
        // 更新按钮为处理中状态
        copyBtn.innerHTML = 'Copying...';
        copyBtn.disabled = true;
        
        // 获取当前图片（可能是裁剪结果或原图）
        let imageUrl;
        if (originalUrls.length === 1) {
            // 单图：检查是否有裁剪结果
            imageUrl = croppedImages[0] || originalUrls[0];
        } else {
            // 多图：复制第一张
            imageUrl = croppedImages[0] || originalUrls[0];
        }
        
        console.log('Copying image from URL:', imageUrl);
        
        let blob;
        
        // data URL 与 blob URL 分别处理
        if (imageUrl.startsWith('data:')) {
            // data URL 直接转换
            const response = await fetch(imageUrl);
            blob = await response.blob();
        } else {
            // blob/HTTP URL 先 fetch 再转换
            try {
                const response = await fetch(imageUrl);
                if (!response.ok) {
                    throw new Error('Failed to fetch image');
                }
                blob = await response.blob();
            } catch (fetchError) {
                console.error('Fetch failed, trying canvas method:', fetchError);
                // 降级方案：用 canvas 转换
                blob = await convertImageToBlob(imageUrl);
            }
        }
        
        // 确保 blob 的 MIME 类型正确
        if (!blob.type.startsWith('image/')) {
            blob = new Blob([blob], { type: 'image/png' });
        }
        
        console.log('Blob created:', blob.type, blob.size);
        
        // 创建 ClipboardItem
        const clipboardItem = new ClipboardItem({
            [blob.type]: blob
        });
        
        // 写入剪贴板
        await navigator.clipboard.write([clipboardItem]);
        
        // 显示成功提示
        copyBtn.innerHTML = 'Copied!';
        copyBtn.style.backgroundColor = '#4CAF50';
        
        let successMsg = '';
        if (typeof Languages !== 'undefined') {
            successMsg = Languages.getText('copySuccessMessage') || 'Image copied to clipboard successfully!';
        } else {
            successMsg = '图片已复制到剪贴板！';
        }
        showSuccessMessage(successMsg);
        
        // 2 秒后恢复按钮
        setTimeout(() => {
            if (typeof Languages !== 'undefined') {
                copyBtn.innerHTML = Languages.getText('copyButton');
            } else {
                copyBtn.innerHTML = 'Copy';
            }
            copyBtn.style.backgroundColor = '';
            copyBtn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('Error copying image:', error);
        
        copyBtn.innerHTML = 'Failed';
        copyBtn.style.backgroundColor = '#f44336';
        
        let errorMsg = '';
        if (typeof Languages !== 'undefined') {
            errorMsg = Languages.getText('copyErrorMessage') || 'Failed to copy image. Your browser may not support this feature.';
        } else {
            errorMsg = '无法复制图片，您的浏览器可能不支持此功能。';
        }
        
        // 在控制台输出详细错误
        console.error('Copy error details:', {
            error: error.message,
            clipboardSupport: !!navigator.clipboard,
            writeSupport: !!(navigator.clipboard && navigator.clipboard.write)
        });
        
        alert(errorMsg);
        
        // 2 秒后恢复按钮
        setTimeout(() => {
            if (typeof Languages !== 'undefined') {
                copyBtn.innerHTML = Languages.getText('copyButton');
            } else {
                copyBtn.innerHTML = 'Copy';
            }
            copyBtn.style.backgroundColor = '';
            copyBtn.disabled = false;
        }, 2000);
    }
}

// 工具函数：用 canvas 将图片转为 blob
async function convertImageToBlob(imageUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to convert image to blob'));
                }
            }, 'image/png');
        };
        
        img.onerror = () => {
            reject(new Error('Failed to load image'));
        };
        
        img.src = imageUrl;
    });
}

// 初始化事件绑定
document.addEventListener('DOMContentLoaded', function() {
    // 先初始化多语言系统
    initLanguageSystem();
    
    // 初始化主题
    initTheme();
    
    loadCaptureData();
    
    // 检查本地 jsPDF
    console.log('Checking local jsPDF on page load...');
    
    setTimeout(() => {
        if (window.jspdf && window.jspdf.jsPDF) {
            console.log('✅ Local jsPDF is ready');
        } else {
            console.warn('⚠️ Local jsPDF not loaded yet');
        }
    }, 500);
    
    // 主题切换事件
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // 选择保存位置事件
    document.getElementById('choose-location-btn').addEventListener('click', chooseDownloadLocation);
    
    // 侧边栏裁剪事件
    document.getElementById('crop-enable').addEventListener('click', enableCropMode);
    document.getElementById('crop-disable').addEventListener('click', disableCropMode);
    document.getElementById('crop-reset-sidebar').addEventListener('click', resetCropSelection);
    document.getElementById('crop-apply-sidebar').addEventListener('click', applyCropFromSidebar);
    
    // 下载按钮事件
    document.getElementById('download-btn').addEventListener('click', downloadAllImages);
    document.getElementById('download-all-btn').addEventListener('click', downloadAllImages);
    
    // 复制按钮事件
    document.getElementById('copy-btn').addEventListener('click', copyImagesToClipboard);
    
    // 文件名输入框回车事件
    document.getElementById('filename').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            downloadAllImages();
        }
    });
    
    // 保存已选择的文件格式
    document.getElementById('file-format').addEventListener('change', function() {
        localStorage.setItem('preferredFormat', this.value);
    });
    
    // 恢复已选择的文件格式
    const savedFormat = localStorage.getItem('preferredFormat');
    if (savedFormat) {
        document.getElementById('file-format').value = savedFormat;
    }
});
