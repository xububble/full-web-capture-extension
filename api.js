// 截图核心 API：负责滚动截屏、画布拼接与文件保存
window.CaptureAPI = (function() {

    // 单块画布的最大尺寸限制（超出则拆分为多块画布）
    var MAX_PRIMARY_DIMENSION = 15000 * 2,
        MAX_SECONDARY_DIMENSION = 4000 * 2,
        MAX_AREA = MAX_PRIMARY_DIMENSION * MAX_SECONDARY_DIMENSION;

    // 缓存已截取的 blob，供后续下载使用
    var capturedBlobs = [];

    // FileSystem 兜底模式的存储键名前缀（截图 dataURL 存入 chrome.storage.local）
    var STORAGE_FALLBACK_PREFIX = 'capture_fallback_';

    // 允许注入脚本的 URL 协议白名单
    var matches = ['http://*/*', 'https://*/*', 'ftp://*/*', 'file://*/*'],
        // Chrome 应用商店页面禁止注入
        noMatches = [/^https?:\/\/chrome.google.com\/.*$/];

    // 校验目标 URL 是否允许注入脚本
    function isValidUrl(url) {
        var r, i;
        for (i = noMatches.length - 1; i >= 0; i--) {
            if (noMatches[i].test(url)) {
                return false;
            }
        }
        for (i = matches.length - 1; i >= 0; i--) {
            r = new RegExp('^' + matches[i].replace(/\*/g, '.*') + '$');
            if (r.test(url)) {
                return true;
            }
        }
        return false;
    }


    // 通知页面脚本开始滚动截屏，完成后回调
    function initiateCapture(tab, callback) {
        chrome.tabs.sendMessage(tab.id, {msg: 'scrollPage'}, function() {
            callback();
        });
    }


    // 截取当前可视区域并绘制到对应的拼接画布上
    function capture(data, screenshots, sendResponse, splitnotifier) {
        chrome.tabs.captureVisibleTab(
            null, {format: 'png'}, function(dataURI) {
                if (dataURI) {
                    var image = new Image();
                    image.onload = function() {
                        data.image = {width: image.width, height: image.height};

                        // 设备模拟或缩放会导致实际截图尺寸与预期不符，按比例修正坐标
                        if (data.windowWidth !== image.width) {
                            var scale = image.width / data.windowWidth;
                            data.x *= scale;
                            data.y *= scale;
                            data.totalWidth *= scale;
                            data.totalHeight *= scale;
                        }

                        // 首次截图时按页面总尺寸初始化画布（可能拆分为多块）
                        if (!screenshots.length) {
                            Array.prototype.push.apply(
                                screenshots,
                                _initScreenshots(data.totalWidth, data.totalHeight)
                            );
                            if (screenshots.length > 1) {
                                if (splitnotifier) {
                                    splitnotifier();
                                }
                                $('screenshot-count').innerText = screenshots.length;
                            }
                        }

                        // 将该帧绘制到所有与其区域相交的画布上
                        _filterScreenshots(
                            data.x, data.y, image.width, image.height, screenshots
                        ).forEach(function(screenshot) {
                            screenshot.ctx.drawImage(
                                image,
                                data.x - screenshot.left,
                                data.y - screenshot.top
                            );
                        });

                        // 返回调试信息（truthy 值同时表示本帧截取成功）
                        sendResponse(JSON.stringify(data, null, 4) || true);
                    };
                    image.src = dataURI;
                }
            });
    }

    // popup.js 用的简写工具
    function $(id) { return document.getElementById(id); }

    // 按页面总尺寸创建画布数组；超过浏览器单图尺寸限制时自动拆分成网格
    function _initScreenshots(totalWidth, totalHeight) {
        var badSize = (totalHeight > MAX_PRIMARY_DIMENSION ||
                       totalWidth > MAX_PRIMARY_DIMENSION ||
                       totalHeight * totalWidth > MAX_AREA),
            biggerWidth = totalWidth > totalHeight,
            maxWidth = (!badSize ? totalWidth :
                        (biggerWidth ? MAX_PRIMARY_DIMENSION : MAX_SECONDARY_DIMENSION)),
            maxHeight = (!badSize ? totalHeight :
                         (biggerWidth ? MAX_SECONDARY_DIMENSION : MAX_PRIMARY_DIMENSION)),
            numCols = Math.ceil(totalWidth / maxWidth),
            numRows = Math.ceil(totalHeight / maxHeight),
            row, col, canvas, left, top;

        var canvasIndex = 0;
        var result = [];

        for (row = 0; row < numRows; row++) {
            for (col = 0; col < numCols; col++) {
                canvas = document.createElement('canvas');
                canvas.width = (col == numCols - 1 ? totalWidth % maxWidth || maxWidth :
                                maxWidth);
                canvas.height = (row == numRows - 1 ? totalHeight % maxHeight || maxHeight :
                                 maxHeight);

                left = col * maxWidth;
                top = row * maxHeight;

                result.push({
                    canvas: canvas,
                    ctx: canvas.getContext('2d'),
                    index: canvasIndex,
                    left: left,
                    right: left + canvas.width,
                    top: top,
                    bottom: top + canvas.height
                });

                canvasIndex++;
            }
        }

        return result;
    }


    // 筛选出与给定截图区域相交的画布
    function _filterScreenshots(imgLeft, imgTop, imgWidth, imgHeight, screenshots) {
        var imgRight = imgLeft + imgWidth,
            imgBottom = imgTop + imgHeight;
        return screenshots.filter(function(screenshot) {
            return (imgLeft < screenshot.right &&
                    imgRight > screenshot.left &&
                    imgTop < screenshot.bottom &&
                    imgBottom > screenshot.top);
        });
    }


    // 将所有画布导出为 PNG blob 数组
    function getBlobs(screenshots) {
        var blobs = screenshots.map(function(screenshot) {
            var dataURI = screenshot.canvas.toDataURL();

            // base64 解码为二进制字符串（不支持 URLEncoded 形式的 DataURI）
            var byteString = atob(dataURI.split(',')[1]);

            // 取出 MIME 类型
            var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

            // 写入 ArrayBuffer
            var ab = new ArrayBuffer(byteString.length);
            var ia = new Uint8Array(ab);
            for (var i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }

            var blob = new Blob([ab], {type: mimeString});
            return blob;
        });

        // 缓存 blob 供后续使用
        capturedBlobs = blobs;

        return blobs;
    }


    // 将 blob 写入扩展临时文件系统，成功后回调文件 URL
    function saveBlob(blob, filename, index, callback, errback) {
        filename = _addFilenameSuffix(filename, index);

        var reqFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

        // FileSystem API 在新版 Chrome 已废弃：兜底转 dataURL 存入 chrome.storage，
        // 结果页通过 storage: 前缀标记读取
        if (!reqFileSystem) {
            var reader = new FileReader();
            reader.onload = function() {
                var item = {};
                item[STORAGE_FALLBACK_PREFIX + index] = reader.result;
                chrome.storage.local.set(item, function() {
                    callback('storage:' + STORAGE_FALLBACK_PREFIX + index);
                });
            };
            reader.onerror = function() { errback('storage fallback failed'); };
            reader.readAsDataURL(blob);
            return;
        }

        function onwriteend() {
            var urlName = ('filesystem:chrome-extension://' +
                           chrome.i18n.getMessage('@@extension_id') +
                           '/temporary/' + filename);

            callback(urlName);
        }

        // 预留少量缓冲空间
        var size = blob.size + (1024 / 2);

        reqFileSystem(window.TEMPORARY, size, function(fs){
            fs.root.getFile(filename, {create: true}, function(fileEntry) {
                fileEntry.createWriter(function(fileWriter) {
                    fileWriter.onwriteend = onwriteend;
                    fileWriter.write(blob);
                }, errback); // TODO：统一错误回调格式
            }, errback);
        }, errback);
    }


    // 拆分多张图时给文件名加序号后缀
    function _addFilenameSuffix(filename, index) {
        if (!index) {
            return filename;
        }
        var sp = filename.split('.');
        var ext = sp.pop();
        return sp.join('.') + '-' + (index + 1) + '.' + ext;
    }


    // 截取整页并返回 blob 数组（主入口）
    function captureToBlobs(tab, callback, errback, progress, splitnotifier) {
        var loaded = false,
            screenshots = [],
            timeout = 10000, // 长页面超时放宽到 10 秒
            timedOut = false,
            noop = function() {};

        callback = callback || noop;
        errback = errback || noop;
        progress = progress || noop;

        if (!isValidUrl(tab.url)) {
            errback('invalid url'); // TODO：细化错误类型
        }

        // 监听页面脚本回传的截屏坐标消息
        // TODO：重复执行时监听器可能叠加（实际会被页面销毁清理？）
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            if (request.msg === 'capture') {
                // 上报进度
                if (typeof request.complete === 'number') {
                    progress(request.complete);
                }

                capture(request, screenshots, sendResponse, splitnotifier);

                // 返回 true 表示异步响应
                return true;
            } else {
                console.error('Unknown message received from content script: ' + request.msg);
                errback('internal error');
                return false;
            }
        });

        // 向目标页面注入滚动截屏脚本（MV3 使用 chrome.scripting API）
        chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['page.js']}, function() {
            if (chrome.runtime.lastError) {
                console.error('Script injection failed:', chrome.runtime.lastError);
                errback('script injection failed');
                return;
            }

            if (timedOut) {
                console.error('Timed out too early while waiting for script execution');
                errback('execute timeout');
            } else {
                loaded = true;
                progress(0);

                initiateCapture(tab, function() {
                    progress(1.0);
                    callback(getBlobs(screenshots));
                });
            }
        });

        window.setTimeout(function() {
            if (!loaded) {
                timedOut = true;
                errback('execute timeout');
            }
        }, timeout);
    }


    // 截取整页并逐个写入临时文件，回调文件 URL 数组
    function captureToFiles(tab, filename, callback, errback, progress, splitnotifier) {
        captureToBlobs(tab, function(blobs) {
            var i = 0,
                len = blobs.length,
                filenames = [];

            (function doNext() {
                saveBlob(blobs[i], filename, i, function(filename) {
                    i++;
                    filenames.push(filename);
                    i >= len ? callback(filenames) : doNext();
                }, errback);
            })();
        }, errback, progress, splitnotifier);
    }

    // 对外提供已截取的 blob 缓存
    function getCapturedBlobs() {
        return capturedBlobs;
    }


    return {
        captureToBlobs: captureToBlobs,
        captureToFiles: captureToFiles,
        getCapturedBlobs: getCapturedBlobs
    };

})();
