// Injected into the target page. It scrolls one frame at a time and never
// advances until the extension page confirms that the current frame was saved.
(function() {
    'use strict';

    if (window.FullWebCapturePage) {
        return;
    }

    var MAX_PAGE_DIMENSION = 50000;
    var SETTLE_DELAY = 75;
    var activeCapture = null;

    function normalizeConfig(config) {
        if (!window.ExtensionCore) {
            throw new Error('capture core was not injected');
        }
        return window.ExtensionCore.normalizeCaptureConfig(config);
    }

    function getScrollRoot() {
        return document.scrollingElement || document.documentElement || document.body;
    }

    function getScrollX() {
        var root = getScrollRoot();
        return window.scrollX || (root && root.scrollLeft) || 0;
    }

    function getScrollY() {
        var root = getScrollRoot();
        return window.scrollY || (root && root.scrollTop) || 0;
    }

    function scrollToPosition(x, y) {
        var root = getScrollRoot();
        window.scrollTo(x, y);

        // Some pages make body, rather than documentElement, the scroll root.
        if (root) {
            root.scrollLeft = x;
            root.scrollTop = y;
        }
    }

    function getPageSize() {
        var body = document.body || { scrollWidth: 0, scrollHeight: 0, offsetWidth: 0, offsetHeight: 0 };
        var html = document.documentElement;
        var root = getScrollRoot();

        return {
            width: Math.min(MAX_PAGE_DIMENSION, Math.max(
                window.innerWidth,
                body.scrollWidth, body.offsetWidth,
                html.scrollWidth, html.offsetWidth,
                root ? root.scrollWidth : 0
            )),
            height: Math.min(MAX_PAGE_DIMENSION, Math.max(
                window.innerHeight,
                body.scrollHeight, body.offsetHeight,
                html.scrollHeight, html.offsetHeight,
                root ? root.scrollHeight : 0
            ))
        };
    }

    function buildPositions(total, viewport, overlap) {
        if (!window.ExtensionCore) {
            throw new Error('capture core was not injected');
        }
        return window.ExtensionCore.buildScrollPositions(total, viewport, overlap);
    }

    function waitForAnimationFrames(count, callback) {
        if (count <= 0) {
            callback();
            return;
        }
        requestAnimationFrame(function() {
            waitForAnimationFrames(count - 1, callback);
        });
    }

    function waitForViewportToSettle(callback) {
        // Two animation frames give the renderer a chance to paint after a
        // programmatic scroll. The small delay helps pages with sticky headers.
        waitForAnimationFrames(2, function() {
            window.setTimeout(callback, SETTLE_DELAY);
        });
    }

    function waitForImageList(images, callback, timeoutMs) {
        if (!images.length) {
            callback();
            return;
        }

        var finished = false;
        var remaining = images.length;
        var timeout = window.setTimeout(finish, timeoutMs || 3000);

        function finish() {
            if (finished) {
                return;
            }
            finished = true;
            window.clearTimeout(timeout);
            callback();
        }

        images.forEach(function(image) {
            function onImageSettled() {
                image.removeEventListener('load', onImageSettled);
                image.removeEventListener('error', onImageSettled);
                remaining -= 1;
                if (!remaining) {
                    finish();
                }
            }
            image.addEventListener('load', onImageSettled);
            image.addEventListener('error', onImageSettled);
        });
    }

    function waitForImages(enabled, callback) {
        if (!enabled) {
            callback();
            return;
        }

        var pending = Array.prototype.filter.call(document.images || [], function(image) {
            // Native lazy images are expected to load as we scroll, not before
            // the first frame is captured.
            return !image.complete && image.loading !== 'lazy';
        });
        waitForImageList(pending, callback, 3000);
    }

    function waitForVisibleImages(enabled, callback) {
        if (!enabled) {
            callback();
            return;
        }

        var pending = Array.prototype.filter.call(document.images || [], function(image) {
            var rect = image.getBoundingClientRect();
            var deferredSource = image.dataset && image.dataset.src && !image.currentSrc;
            return (!image.complete || deferredSource) && rect.bottom > 0 && rect.top < window.innerHeight &&
                rect.right > 0 && rect.left < window.innerWidth;
        });
        waitForImageList(pending, callback, 1500);
    }

    function stabilizeDocument(config, callback) {
        var previousHeight = 0;
        var attempts = 0;

        function inspectBottom() {
            var size = getPageSize();
            scrollToPosition(0, size.height);
            waitForAnimationFrames(2, function() {
                waitForVisibleImages(config.waitForImages, function() {
                    waitForViewportToSettle(function() {
                        var updatedSize = getPageSize();
                        var grew = updatedSize.height > previousHeight;
                        previousHeight = updatedSize.height;
                        attempts += 1;
                        // A finite lazy-loaded page normally settles after one
                        // or two bottom passes. Do not chase endless feeds.
                        if (grew && attempts < 3) {
                            inspectBottom();
                        } else {
                            callback(updatedSize);
                        }
                    });
                });
            });
        }

        inspectBottom();
    }

    function smoothlyScrollTo(x, y, enabled, callback) {
        if (!enabled) {
            scrollToPosition(x, y);
            callback();
            return;
        }

        var startX = getScrollX();
        var startY = getScrollY();
        var duration = 200;
        var startedAt = Date.now();

        function step() {
            var progress = Math.min(1, (Date.now() - startedAt) / duration);
            var eased = 1 - Math.pow(1 - progress, 3);
            scrollToPosition(
                startX + (x - startX) * eased,
                startY + (y - startY) * eased
            );
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                callback();
            }
        }

        requestAnimationFrame(step);
    }

    function sendProgress(captureId, complete) {
        chrome.runtime.sendMessage({
            msg: 'capture:progress',
            captureId: captureId,
            complete: complete
        });
    }

    function startCapture(captureId, rawConfig, done) {
        if (activeCapture) {
            done({ ok: false, error: 'capture already in progress' });
            return;
        }

        var config;
        try {
            config = normalizeConfig(rawConfig);
        } catch (error) {
            done({ ok: false, error: error.message });
            return;
        }
        var originalX = getScrollX();
        var originalY = getScrollY();
        var startedAt = Date.now();
        var cancelled = false;
        var completed = false;

        activeCapture = {
            id: captureId,
            cancel: function(reason) {
                cancelled = reason || 'capture cancelled';
            }
        };

        function finish(result) {
            if (completed) {
                return;
            }
            completed = true;
            scrollToPosition(originalX, originalY);
            activeCapture = null;
            done(result);
        }

        function hasTimedOut() {
            return Date.now() - startedAt > config.timeout;
        }

        function abortIfNeeded() {
            if (cancelled) {
                finish({ ok: false, error: cancelled });
                return true;
            }
            if (hasTimedOut()) {
                finish({ ok: false, error: 'capture timeout' });
                return true;
            }
            return false;
        }

        waitForImages(config.waitForImages, function() {
            if (abortIfNeeded()) {
                return;
            }

            stabilizeDocument(config, function(pageSize) {
                if (abortIfNeeded()) {
                    return;
                }

                var viewportWidth = window.innerWidth;
                var viewportHeight = window.innerHeight;
                var yPositions = buildPositions(pageSize.height, viewportHeight, config.scrollOverlap);
                var xPositions = buildPositions(pageSize.width, viewportWidth, 0);
                var frames = [];

                yPositions.forEach(function(y) {
                    xPositions.forEach(function(x) {
                        frames.push({ x: x, y: y });
                    });
                });

                function captureFrame(index, retries) {
                    if (abortIfNeeded()) {
                        return;
                    }

                    if (index >= frames.length) {
                        finish({ ok: true });
                        return;
                    }

                    var target = frames[index];
                    smoothlyScrollTo(target.x, target.y, config.smoothScroll, function() {
                        waitForAnimationFrames(2, function() {
                            waitForVisibleImages(config.waitForImages, function() {
                                waitForViewportToSettle(function() {
                                    if (abortIfNeeded()) {
                                        return;
                                    }

                                    chrome.runtime.sendMessage({
                                        msg: 'capture:frame',
                                        captureId: captureId,
                                        x: getScrollX(),
                                        y: getScrollY(),
                                        complete: (index + 1) / frames.length,
                                        windowWidth: viewportWidth,
                                        totalWidth: pageSize.width,
                                        totalHeight: pageSize.height,
                                        devicePixelRatio: window.devicePixelRatio
                                    }, function(response) {
                                        var error = chrome.runtime.lastError;
                                        if (!error && response && response.ok) {
                                            sendProgress(captureId, (index + 1) / frames.length);
                                            captureFrame(index + 1, 0);
                                            return;
                                        }

                                        if (retries < config.retryAttempts && !hasTimedOut()) {
                                            window.setTimeout(function() {
                                                captureFrame(index, retries + 1);
                                            }, Math.min(1000, 250 * (retries + 1)));
                                            return;
                                        }

                                        finish({
                                            ok: false,
                                            error: (response && response.error) ||
                                                (error && error.message) ||
                                                'frame capture failed'
                                        });
                                    });
                                });
                            });
                        });
                    });
                }

                sendProgress(captureId, 0);
                captureFrame(0, 0);
            });
        });
    }

    chrome.runtime.onMessage.addListener(function(data, sender, sendResponse) {
        if (data.msg === 'scrollPage') {
            startCapture(data.captureId, data.config, sendResponse);
            return true;
        }

        if (data.msg === 'cancelCapture' && activeCapture && activeCapture.id === data.captureId) {
            activeCapture.cancel(data.reason);
            sendResponse({ ok: true });
            return false;
        }

        return false;
    });

    window.FullWebCapturePage = true;
})();
