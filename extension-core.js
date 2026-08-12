/*
 * Shared, browser-independent rules for the extension.
 * Keeping these rules free of Chrome APIs makes the user-visible capture
 * contract testable without a running browser.
 */
(function(root, factory) {
    var api = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    root.ExtensionCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    'use strict';

    // 550ms leaves a small scheduling margin below Chrome's 2 calls/second cap.
    var MIN_CAPTURE_DELAY = 550;
    var MIN_TIMEOUT = 5000;
    var MAX_TIMEOUT = 120000;
    var MIN_OVERLAP = 0;
    var MAX_OVERLAP = 50;

    function clampInteger(value, fallback, min, max) {
        var parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed)) {
            parsed = fallback;
        }
        return Math.min(max, Math.max(min, parsed));
    }

    function normalizeLanguage(language) {
        return language === 'zh' ? 'zh' : 'en';
    }

    function getLanguageButtonLabel(language) {
        return normalizeLanguage(language) === 'zh' ? '🇨🇳 中' : '🇺🇸 EN';
    }

    function normalizeCaptureConfig(config) {
        config = config || {};

        return {
            format: config.format === 'jpeg' ? 'jpeg' : 'png',
            quality: clampInteger(config.quality, 90, 10, 100),
            timeout: clampInteger(config.timeout, 15000, MIN_TIMEOUT, MAX_TIMEOUT),
            retryAttempts: clampInteger(config.retryAttempts, 2, 0, 10),
            scrollOverlap: clampInteger(config.scrollOverlap, 20, MIN_OVERLAP, MAX_OVERLAP),
            // Chrome limits captureVisibleTab to two calls per second.
            captureDelay: Math.max(
                MIN_CAPTURE_DELAY,
                clampInteger(config.captureDelay, MIN_CAPTURE_DELAY, 0, 10000)
            ),
            smoothScroll: Boolean(config.smoothScroll),
            waitForImages: config.waitForImages !== false,
            debugMode: Boolean(config.debugMode)
        };
    }

    function buildScrollPositions(totalHeight, viewportHeight, overlapPercent) {
        totalHeight = Math.max(0, Number(totalHeight) || 0);
        viewportHeight = Math.max(1, Number(viewportHeight) || 1);
        overlapPercent = clampInteger(overlapPercent, 20, MIN_OVERLAP, MAX_OVERLAP);

        var step = Math.max(1, Math.floor(viewportHeight * (1 - overlapPercent / 100)));
        var position = Math.max(0, Math.ceil(totalHeight - viewportHeight));
        var positions = [position];

        while (position > 0) {
            position = Math.max(0, position - step);
            if (positions[positions.length - 1] !== position) {
                positions.push(position);
            }
        }

        return positions;
    }

    return {
        MIN_CAPTURE_DELAY: MIN_CAPTURE_DELAY,
        normalizeLanguage: normalizeLanguage,
        getLanguageButtonLabel: getLanguageButtonLabel,
        normalizeCaptureConfig: normalizeCaptureConfig,
        buildScrollPositions: buildScrollPositions
    };
});
