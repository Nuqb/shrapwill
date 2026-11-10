import { createHash } from 'node:crypto';

export const fingerprint = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const normalizedName = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
// Filmora's Windows COLORREF values store red in the low byte.
export function colorRef(value) {
  return (
    '#' +
    [value & 255, (value >>> 8) & 255, (value >>> 16) & 255]
      .map((channel) => channel.toString(16).padStart(2, '0'))
      .join('')
  );
}

export function unsupportedStyle(text) {
  const data = text.TextData;
  if (data?.length !== 1) return 'Multiple text runs need a run-layout adapter';
  const { Basic: basic, Border: border, Shadow: shadow } = data[0];
  if (basic.Effect) return `Proprietary text effect ${basic.Effect}`;
  if (text.Gradient?.Enable || border.Gradient?.Enable)
    return 'Gradient direction adapter required';
  if (text.Texture?.Enable || border.Texture?.Enable) return 'Text texture adapter required';
  if (basic.TextBlurRadius || border.BlurRadius)
    return 'Separate face/border blur adapter required';
  if (shadow.Enable && shadow.Distance) return 'Directional shadow adapter required';
  if (text.Layout.Angle || basic.FontItalic) return 'Rotated/italic layout adapter required';
  return null;
}

export function convertStyle(text) {
  const { Basic: basic, Border: border, Shadow: shadow } = text.TextData[0];
  return {
    base: 'plain',
    fontSize: basic.FontSize,
    color: colorRef(basic.TextColor[0].Color),
    accent: colorRef(border.Color),
    position: 0.48,
    spacing: text.Layout.CharSpace,
    weight: basic.FontBold ? 700 : 400,
    family: basic.FontName,
    paint: {
      opacity: basic.TextAlpha / 255,
      stroke: colorRef(border.Color),
      strokeWidth: border.Enable ? border.Size : 0,
      strokeOpacity: border.Alpha / 255,
      shadow: colorRef(shadow.Color),
      shadowOpacity: shadow.Enable ? shadow.Alpha / 255 : 0,
      shadowBlur: shadow.BlurRadius,
    },
  };
}
