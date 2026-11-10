import test from 'node:test';
import assert from 'node:assert/strict';
import {
  colorRef,
  convertStyle,
  fingerprint,
  normalizedName,
  unsupportedStyle,
} from './filmora-title-support.mjs';

const text = {
  Layout: { CharSpace: 5, Angle: 0 },
  TextData: [
    {
      Basic: {
        Effect: 0,
        FontSize: 150,
        FontName: 'Arial Black',
        TextAlpha: 255,
        TextColor: [{ Color: 255 }],
      },
      Border: { Enable: 1, Size: 8, Color: 0, Alpha: 189 },
      Shadow: { Enable: 1, Distance: 0, Color: 8421504, Alpha: 255, BlurRadius: 6 },
    },
  ],
};
test('Windows COLORREF channel order is preserved', () => {
  assert.equal(colorRef(255), '#ff0000');
  assert.equal(colorRef(16711680), '#0000ff');
});
test('supported paint retains border opacity and centered shadow', () => {
  assert.equal(unsupportedStyle(text), null);
  const design = convertStyle(text);
  assert.equal(design.paint.strokeWidth, 8);
  assert.equal(design.paint.strokeOpacity, 189 / 255);
  assert.equal(design.paint.shadowBlur, 6);
  assert.equal(design.color, '#ff0000');
});
test('unsupported treatments are excluded rather than flattened', () => {
  const directional = structuredClone(text);
  directional.TextData[0].Shadow.Distance = 2;
  assert.match(unsupportedStyle(directional), /Directional/);
  const effect = structuredClone(text);
  effect.TextData[0].Basic.Effect = 26;
  assert.match(unsupportedStyle(effect), /Proprietary/);
});
test('duplicate keys ignore punctuation and design fingerprints remain stable', () => {
  assert.equal(normalizedName('Text_style 2'), normalizedName('Text style 2'));
  assert.equal(fingerprint(convertStyle(text)), fingerprint(convertStyle(structuredClone(text))));
});
