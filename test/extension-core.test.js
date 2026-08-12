const test = require('node:test');
const assert = require('node:assert/strict');

const Core = require('../extension-core.js');

test('uses the active locale on the language switch button', () => {
    assert.equal(Core.getLanguageButtonLabel('zh'), '🇨🇳 中');
    assert.equal(Core.getLanguageButtonLabel('en'), '🇺🇸 EN');
    assert.equal(Core.getLanguageButtonLabel('unknown'), '🇺🇸 EN');
});

test('creates a gap-free scroll plan for a long document', () => {
    const positions = Core.buildScrollPositions(2_200, 1_000, 20);

    assert.deepEqual(positions, [1_200, 400, 0]);

    for (let y = 0; y < 2_200; y += 1) {
        assert.ok(
            positions.some((position) => y >= position && y < position + 1_000),
            `pixel row ${y} is covered`
        );
    }
});

test('normalizes capture settings to Chrome capture limits', () => {
    const config = Core.normalizeCaptureConfig({
        format: 'jpeg',
        quality: 70,
        timeout: 1_000,
        retryAttempts: 99,
        scrollOverlap: 60,
        captureDelay: 10
    });

    assert.deepEqual(config, {
        format: 'jpeg',
        quality: 70,
        timeout: 5_000,
        retryAttempts: 10,
        scrollOverlap: 50,
        captureDelay: 550,
        smoothScroll: false,
        waitForImages: true,
        debugMode: false
    });
});
