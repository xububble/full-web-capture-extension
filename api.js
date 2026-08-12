// Screenshot compositor and capture-session coordinator for the popup page.
window.CaptureAPI = (function() {
    'use strict';

    var MAX_PRIMARY_DIMENSION = 15000 * 2;
    var MAX_SECONDARY_DIMENSION = 4000 * 2;
    var MAX_AREA = MAX_PRIMARY_DIMENSION * MAX_SECONDARY_DIMENSION;
    var STORAGE_FALLBACK_PREFIX = 'capture_fallback_';
    var matches = ['http://*/*', 'https://*/*', 'ftp://*/*', 'file://*/*'];
    var noMatches = [/^https?:\/\/chrome.google.com\/.*$/];

    function isValidUrl(url) {
        var i;
        for (i = noMatches.length - 1; i >= 0; i--) {
            if (noMatches[i].test(url)) {
                return false;
            }
        }
        for (i = matches.length - 1; i >= 0; i--) {
            if (new RegExp('^' + matches[i].replace(/\*/g, '.*') + '$').test(url)) {
                return true;
            }
        }
        return false;
    }

    function normalizeConfig(config) {
        if (!window.ExtensionCore) {
            throw new Error('capture core is unavailable');
        }
        return window.ExtensionCore.normalizeCaptureConfig(config);
    }

    function createCaptureId() {
        return 'capture_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    }

    function initScreenshots(totalWidth, totalHeight) {
        var badSize = totalHeight > MAX_PRIMARY_DIMENSION ||
            totalWidth > MAX_PRIMARY_DIMENSION ||
            totalHeight * totalWidth > MAX_AREA;
        var biggerWidth = totalWidth > totalHeight;
        var maxWidth = !badSize ? totalWidth :
            (biggerWidth ? MAX_PRIMARY_DIMENSION : MAX_SECONDARY_DIMENSION);
        var maxHeight = !badSize ? totalHeight :
            (biggerWidth ? MAX_SECONDARY_DIMENSION : MAX_PRIMARY_DIMENSION);
        var numCols = Math.ceil(totalWidth / maxWidth);
        var numRows = Math.ceil(totalHeight / maxHeight);
        var result = [];
        var row;
        var col;
        var index = 0;

        for (row = 0; row < numRows; row++) {
            for (col = 0; col < numCols; col++) {
                var canvas = document.createElement('canvas');
                canvas.width = col === numCols - 1 ? totalWidth % maxWidth || maxWidth : maxWidth;
                canvas.height = row === numRows - 1 ? totalHeight % maxHeight || maxHeight : maxHeight;
                result.push({
                    canvas: canvas,
                    ctx: canvas.getContext('2d'),
                    index: index++,
                    left: col * maxWidth,
                    top: row * maxHeight,
                    right: (col + 1) * maxWidth,
                    bottom: (row + 1) * maxHeight
                });
            }
        }

        return result;
    }

    function matchingScreenshots(left, top, width, height, screenshots) {
        var right = left + width;
        var bottom = top + height;
        return screenshots.filter(function(screenshot) {
            return left < screenshot.right && right > screenshot.left &&
                top < screenshot.bottom && bottom > screenshot.top;
        });
    }

    function respondFailure(sendResponse, error) {
        sendResponse({ ok: false, error: error });
    }

    function captureFrame(session, data, sendResponse, splitnotifier) {
        if (!data.totalWidth || !data.totalHeight || !data.windowWidth) {
            respondFailure(sendResponse, 'invalid frame dimensions');
            return;
        }

        var wait = Math.max(0, session.lastCaptureAt + session.config.captureDelay - Date.now());
        window.setTimeout(function() {
            if (session.finished) {
                respondFailure(sendResponse, 'capture session finished');
                return;
            }

            // captureVisibleTab captures the active tab, so abort instead of
            // compositing an unrelated tab if the user changed tabs mid-capture.
            chrome.tabs.get(session.tab.id, function(liveTab) {
                var tabError = chrome.runtime.lastError;
                if (tabError || !liveTab || !liveTab.active) {
                    respondFailure(sendResponse, tabError ? tabError.message : 'target tab is no longer active');
                    return;
                }

                session.lastCaptureAt = Date.now();
                if (session.config.debugMode) {
                    console.debug('[FullWebCapture] Capturing frame', {
                        captureId: session.id,
                        x: data.x,
                        y: data.y,
                        progress: data.complete
                    });
                }
                chrome.tabs.captureVisibleTab(session.tab.windowId, { format: 'png' }, function(dataURI) {
                    var captureError = chrome.runtime.lastError;
                    if (captureError || !dataURI) {
                        if (session.config.debugMode) {
                            console.debug('[FullWebCapture] Frame capture failed', captureError);
                        }
                        respondFailure(sendResponse, captureError ? captureError.message : 'captureVisibleTab returned no image');
                        return;
                    }

                    var image = new Image();
                    image.onload = function() {
                        var scale = image.width / data.windowWidth;
                        var frame = {
                            x: data.x * scale,
                            y: data.y * scale,
                            totalWidth: Math.ceil(data.totalWidth * scale),
                            totalHeight: Math.ceil(data.totalHeight * scale)
                        };

                        if (!session.screenshots.length) {
                            session.screenshots = initScreenshots(frame.totalWidth, frame.totalHeight);
                            if (!session.screenshots.length) {
                                respondFailure(sendResponse, 'could not initialize screenshot canvas');
                                return;
                            }
                            if (session.screenshots.length > 1 && splitnotifier) {
                                splitnotifier(session.screenshots.length);
                            }
                        }

                        matchingScreenshots(frame.x, frame.y, image.width, image.height, session.screenshots)
                            .forEach(function(screenshot) {
                                screenshot.ctx.drawImage(
                                    image,
                                    frame.x - screenshot.left,
                                    frame.y - screenshot.top
                                );
                            });

                        sendResponse({ ok: true });
                    };
                    image.onerror = function() {
                        respondFailure(sendResponse, 'captured image could not be decoded');
                    };
                    image.src = dataURI;
                });
            });
        }, wait);
    }

    function canvasesToBlobs(screenshots, config, callback, errback) {
        if (!screenshots.length) {
            errback('no frames were captured');
            return;
        }

        var mimeType = config.format === 'jpeg' ? 'image/jpeg' : 'image/png';
        var quality = config.quality / 100;
        var remaining = screenshots.length;
        var blobs = new Array(screenshots.length);
        var failed = false;

        screenshots.forEach(function(screenshot, index) {
            function onBlob(blob) {
                if (failed) {
                    return;
                }
                if (!blob) {
                    failed = true;
                    errback('could not encode screenshot');
                    return;
                }
                blobs[index] = blob;
                remaining -= 1;
                if (!remaining) {
                    callback(blobs);
                }
            }

            if (screenshot.canvas.toBlob) {
                screenshot.canvas.toBlob(onBlob, mimeType, quality);
            } else {
                try {
                    var dataURI = screenshot.canvas.toDataURL(mimeType, quality);
                    var bytes = atob(dataURI.split(',')[1]);
                    var values = new Uint8Array(bytes.length);
                    for (var i = 0; i < bytes.length; i++) {
                        values[i] = bytes.charCodeAt(i);
                    }
                    onBlob(new Blob([values], { type: mimeType }));
                } catch (error) {
                    failed = true;
                    errback(error.message || 'could not encode screenshot');
                }
            }
        });
    }

    function addFilenameSuffix(filename, index) {
        if (!index) {
            return filename;
        }
        var parts = filename.split('.');
        var extension = parts.length > 1 ? parts.pop() : 'png';
        return parts.join('.') + '-' + (index + 1) + '.' + extension;
    }

    function saveBlob(blob, filename, index, captureId, callback, errback) {
        filename = addFilenameSuffix(filename, index);
        var reqFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

        if (!reqFileSystem) {
            var reader = new FileReader();
            var storageKey = STORAGE_FALLBACK_PREFIX + captureId + '_' + index;
            reader.onload = function() {
                var item = {};
                item[storageKey] = reader.result;
                chrome.storage.local.set(item, function() {
                    var storageError = chrome.runtime.lastError;
                    if (storageError) {
                        errback(storageError.message);
                        return;
                    }
                    callback('storage:' + storageKey);
                });
            };
            reader.onerror = function() { errback('storage fallback failed'); };
            reader.readAsDataURL(blob);
            return;
        }

        reqFileSystem(window.TEMPORARY, blob.size + 512, function(fs) {
            fs.root.getFile(filename, { create: true }, function(fileEntry) {
                fileEntry.createWriter(function(fileWriter) {
                    fileWriter.onwriteend = function() {
                        callback('filesystem:chrome-extension://' +
                            chrome.i18n.getMessage('@@extension_id') + '/temporary/' + filename);
                    };
                    fileWriter.onerror = function() { errback('temporary file write failed'); };
                    fileWriter.write(blob);
                }, errback);
            }, errback);
        }, errback);
    }

    function captureToBlobs(tab, config, callback, errback, progress, splitnotifier) {
        try {
            config = normalizeConfig(config);
        } catch (error) {
            (errback || function() {})(error.message);
            return;
        }
        callback = callback || function() {};
        errback = errback || function() {};
        progress = progress || function() {};

        if (!isValidUrl(tab.url)) {
            errback('invalid url');
            return;
        }

        var session = {
            id: createCaptureId(),
            tab: tab,
            config: config,
            screenshots: [],
            lastCaptureAt: 0,
            finished: false,
            listener: null,
            timeoutId: null
        };

        function cleanUp() {
            if (session.timeoutId) {
                window.clearTimeout(session.timeoutId);
            }
            if (session.listener) {
                chrome.runtime.onMessage.removeListener(session.listener);
            }
        }

        function fail(reason) {
            if (session.finished) {
                return;
            }
            session.finished = true;
            if (session.config.debugMode) {
                console.debug('[FullWebCapture] Capture failed', { captureId: session.id, reason: reason });
            }
            cleanUp();
            chrome.tabs.sendMessage(tab.id, {
                msg: 'cancelCapture', captureId: session.id, reason: reason
            }, function() {});
            errback(reason);
        }

        function finish() {
            if (session.finished) {
                return;
            }
            session.finished = true;
            cleanUp();
            canvasesToBlobs(session.screenshots, config, callback, errback);
        }

        session.listener = function(request, sender, sendResponse) {
            if (!sender.tab || sender.tab.id !== tab.id || request.captureId !== session.id) {
                return false;
            }

            if (request.msg === 'capture:progress') {
                progress(request.complete);
                return false;
            }

            if (request.msg === 'capture:frame') {
                captureFrame(session, request, sendResponse, splitnotifier);
                return true;
            }

            return false;
        };

        chrome.runtime.onMessage.addListener(session.listener);
        session.timeoutId = window.setTimeout(function() {
            fail('capture timeout');
        }, config.timeout + 1000);

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['extension-core.js', 'page.js']
        }, function() {
            var scriptError = chrome.runtime.lastError;
            if (scriptError) {
                fail('script injection failed: ' + scriptError.message);
                return;
            }

            progress(0);
            chrome.tabs.sendMessage(tab.id, {
                msg: 'scrollPage', captureId: session.id, config: config
            }, function(result) {
                var messageError = chrome.runtime.lastError;
                if (session.finished) {
                    return;
                }
                if (messageError) {
                    fail(messageError.message);
                } else if (result && result.ok) {
                    finish();
                } else {
                    fail((result && result.error) || 'capture did not complete');
                }
            });
        });
    }

    function captureToFiles(tab, filename, config, callback, errback, progress, splitnotifier) {
        captureToBlobs(tab, config, function(blobs) {
            var files = [];
            var index = 0;
            var captureId = createCaptureId();

            function saveNext() {
                if (index >= blobs.length) {
                    callback(files);
                    return;
                }
                saveBlob(blobs[index], filename, index, captureId, function(file) {
                    files.push(file);
                    index += 1;
                    saveNext();
                }, errback);
            }

            saveNext();
        }, errback, progress, splitnotifier);
    }

    return {
        captureToBlobs: captureToBlobs,
        captureToFiles: captureToFiles
    };
})();
