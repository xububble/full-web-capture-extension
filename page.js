// 注入目标页面的脚本：负责滚动页面并逐屏回传截屏坐标
var CAPTURE_DELAY = 50;    // 每帧截屏间隔（毫秒）
var MAX_RETRIES = 2;       // 单帧失败重试次数
var CLEANUP_TIMEOUT = 2000; // 清理超时
var SMOOTH_SCROLL = false; // 是否启用平滑滚动

function onMessage(data, sender, callback) {
    if (data.msg === 'scrollPage') {
        getPositions(callback);
        return true;
    } else if (data.msg == 'logMessage') {
        console.log('[POPUP LOG]', data.data);
    } else {
        console.error('Unknown message received from background: ' + data.msg);
    }
}

// 防止重复注入时重复注册监听
if (!window.hasScreenCapturePage) {
    window.hasScreenCapturePage = true;
    chrome.runtime.onMessage.addListener(onMessage);
}

function max(nums) {
    return Math.max.apply(Math, nums.filter(function(x) { return x; }));
}

function isPageLoading() {
    return document.readyState !== 'complete' ||
           window.performance.navigation.type === window.performance.navigation.TYPE_RELOAD;
}

// 等待页面加载完成，超时后强制继续
function waitForPageReady(callback, timeout) {
    timeout = timeout || 3000;
    var startTime = Date.now();

    function checkReady() {
        if (!isPageLoading() || (Date.now() - startTime) > timeout) {
            callback();
        } else {
            setTimeout(checkReady, 25);
        }
    }

    checkReady();
}

function getPositions(callback) {
    // 先上报一次初始进度
    chrome.runtime.sendMessage({
        msg: 'capture',
        x: 0,
        y: 0,
        complete: 0.05,
        windowWidth: window.innerWidth,
        totalWidth: 0,
        totalHeight: 0,
        devicePixelRatio: window.devicePixelRatio,
        initializing: true
    });

    waitForPageReady(function() {
        performCapture(callback);
    });
}

// 核心流程：计算整页尺寸 → 生成滚动坐标序列 → 逐屏滚动并通知 popup 截屏
function performCapture(callback) {
    var body = document.body,
        originalBodyOverflowYStyle = body ? body.style.overflowY : '',
        originalX = window.scrollX,
        originalY = window.scrollY,
        originalOverflowStyle = document.documentElement.style.overflow;

    if (body) {
        body.style.overflowY = 'visible';
    }

    // 取多种度量中的最大值作为页面真实宽高
    var widths = [
            document.documentElement.clientWidth,
            body ? body.scrollWidth : 0,
            document.documentElement.scrollWidth,
            body ? body.offsetWidth : 0,
            document.documentElement.offsetWidth
        ],
        heights = [
            document.documentElement.clientHeight,
            body ? body.scrollHeight : 0,
            document.documentElement.scrollHeight,
            body ? body.offsetHeight : 0,
            document.documentElement.offsetHeight
        ],
        fullWidth = max(widths),
        fullHeight = max(heights),
        windowWidth = window.innerWidth,
        windowHeight = window.innerHeight,
        arrangements = [],
        scrollPad = Math.min(300, windowHeight * 0.2),
        yDelta = windowHeight - (windowHeight > scrollPad ? scrollPad : 0),
        xDelta = windowWidth,
        yPos = fullHeight - windowHeight,
        xPos,
        numArrangements,
        startTime = Date.now();

    if (fullWidth <= xDelta + 1) {
        fullWidth = xDelta;
    }

    // 超大页面强制截断，防止内存溢出
    if (fullHeight > 50000 || fullWidth > 50000) {
        console.warn('Page size is very large:', fullWidth, 'x', fullHeight);
        fullHeight = Math.min(fullHeight, 50000);
        fullWidth = Math.min(fullWidth, 50000);
    }

    // 隐藏滚动条，避免出现在截图中
    document.documentElement.style.overflow = 'hidden';

    // 从页面底部向顶部生成滚动坐标序列
    while (yPos > -yDelta) {
        xPos = 0;
        while (xPos < fullWidth) {
            arrangements.push([xPos, yPos]);
            xPos += xDelta;
        }
        yPos -= yDelta;
    }

    console.log('fullHeight', fullHeight, 'fullWidth', fullWidth);
    console.log('windowWidth', windowWidth, 'windowHeight', windowHeight);
    console.log('xDelta', xDelta, 'yDelta', yDelta);
    console.log('Total arrangements:', arrangements.length);

    numArrangements = arrangements.length;

    // 恢复页面原始滚动状态
    function cleanUp() {
        try {
            document.documentElement.style.overflow = originalOverflowStyle;
            if (body) {
                body.style.overflowY = originalBodyOverflowYStyle;
            }
            window.scrollTo(originalX, originalY);
        } catch (e) {
            console.error('Error during cleanup:', e);
        }
    }

    var retryCount = 0;

    // 逐屏处理：滚动 → 通知截屏 → 成功/重试 → 下一屏
    (function processArrangements() {
        if (!arrangements.length) {
            cleanUp();
            if (callback) {
                callback();
            }
            return;
        }

        var next = arrangements.shift(),
            x = next[0], y = next[1];

        // 基础进度按已处理坐标数计算
        var baseProgress = (numArrangements - arrangements.length) / numArrangements;

        // 截取阶段进度封顶 95%
        var smoothProgress = Math.min(baseProgress * 0.95, 0.95);

        // 叠加少量时间维度进度，让进度条更平滑
        var timeElapsed = Date.now() - startTime;
        var timeProgress = Math.min(timeElapsed / (numArrangements * 100), 0.05);

        var finalProgress = Math.min(smoothProgress + timeProgress, 0.98);

        try {
            smoothScrollTo(x, y, function() {
                var actualX = window.scrollX;
                var actualY = window.scrollY;

                if (Math.abs(actualX - x) > 10 || Math.abs(actualY - y) > 10) {
                    console.warn('Scroll position mismatch. Expected:', x, y, 'Actual:', actualX, actualY);
                }

                var data = {
                    msg: 'capture',
                    x: actualX,
                    y: actualY,
                    complete: finalProgress,
                    windowWidth: windowWidth,
                    totalWidth: fullWidth,
                    totalHeight: fullHeight,
                    devicePixelRatio: window.devicePixelRatio
                };

                window.setTimeout(function() {
                    // 单帧响应超时则跳过，避免整个流程卡死
                    var cleanUpTimeout = window.setTimeout(function() {
                        console.error('Capture timeout, moving to next position...');
                        processArrangements();
                    }, 1500);

                    chrome.runtime.sendMessage(data, function(captured) {
                        window.clearTimeout(cleanUpTimeout);

                        if (captured) {
                            retryCount = 0;
                            processArrangements();
                        } else {
                            if (retryCount < MAX_RETRIES) {
                                retryCount++;
                                console.log('Retrying capture, attempt:', retryCount);
                                arrangements.unshift(next); // 失败坐标放回队列重试
                                processArrangements();
                            } else {
                                console.error('Max retries exceeded, skipping position');
                                retryCount = 0;
                                processArrangements();
                            }
                        }
                    });
                }, CAPTURE_DELAY);
            });

        } catch (e) {
            console.error('Error during scroll:', e);
            cleanUp();
        }
    })();
}

// 平滑滚动封装（默认关闭，直接跳转）
function smoothScrollTo(targetX, targetY, callback) {
    if (!SMOOTH_SCROLL) {
        window.scrollTo(targetX, targetY);
        callback();
        return;
    }

    var startX = window.scrollX;
    var startY = window.scrollY;
    var distanceX = targetX - startX;
    var distanceY = targetY - startY;
    var duration = 200; // 平滑滚动时长（毫秒）
    var startTime = Date.now();

    function animateScroll() {
        var elapsed = Date.now() - startTime;
        var progress = Math.min(elapsed / duration, 1);

        // ease-out 缓动
        var easeProgress = 1 - Math.pow(1 - progress, 3);

        var currentX = startX + (distanceX * easeProgress);
        var currentY = startY + (distanceY * easeProgress);

        window.scrollTo(currentX, currentY);

        if (progress < 1) {
            requestAnimationFrame(animateScroll);
        } else {
            callback();
        }
    }

    requestAnimationFrame(animateScroll);
}
