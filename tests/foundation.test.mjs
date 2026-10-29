import assert from 'node:assert/strict';
import test from 'node:test';

import { Colors } from '../src/theme/palette.ts';
import { locale, tr } from '../src/localization/tr.ts';

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((value) => {
    const channel = parseInt(value, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('both themes keep normal text and action labels at WCAG AA contrast', () => {
  for (const colors of Object.values(Colors)) {
    for (const surface of ['background', 'backgroundElement', 'backgroundSelected']) {
      for (const text of ['text', 'textSecondary', 'danger']) {
        assert.ok(contrast(colors[text], colors[surface]) >= 4.5, `${text} on ${surface}`);
      }
    }
    assert.ok(contrast(colors.onPrimary, colors.primary) >= 4.5);
  }
});

test('the default locale is Turkish with distinct navigation labels', () => {
  assert.equal(locale, 'tr-TR');
  assert.notEqual(tr.navigation.home, tr.navigation.foundation);
});
