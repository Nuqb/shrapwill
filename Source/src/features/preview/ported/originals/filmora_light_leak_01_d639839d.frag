vec3 darken(vec3 s, vec3 d) {
  return min(s, d);
}

vec3 multiply(vec3 s, vec3 d) {
  return s * d;
}

vec3 colorBurn(vec3 s, vec3 d) {
  return 1.0 - (1.0 - d) / s;
}

vec3 linearBurn(vec3 s, vec3 d) {
  return s + d - 1.0;
}

vec3 darkerColor(vec3 s, vec3 d) {
  return (s.x + s.y + s.z < d.x + d.y + d.z) ? s : d;
}

vec3 lighten(vec3 s, vec3 d) {
  return max(s, d);
}

vec3 screen(vec3 s, vec3 d) {
  return s + d - s * d;
}

vec3 colorDodge(vec3 s, vec3 d) {
  return d / (1.0 - s);
}

vec3 linearDodge(vec3 s, vec3 d) {
  return s + d;
}

vec3 lighterColor(vec3 s, vec3 d) {
  return (s.x + s.y + s.z > d.x + d.y + d.z) ? s : d;
}

float overlay(float s, float d) {
  return (d < 0.5) ? 2.0 * s * d : 1.0 - 2.0 * (1.0 - s) * (1.0 - d);
}

vec3 overlay(vec3 s, vec3 d) {
  vec3 c;
  c.x = overlay(s.x, d.x);
  c.y = overlay(s.y, d.y);
  c.z = overlay(s.z, d.z);
  return c;
}

float softLight(float s, float d) {
  return (s < 0.5) ? d - (1.0 - 2.0 * s) * d * (1.0 - d)
                   : (d < 0.25) ? d + (2.0 * s - 1.0) * d * ((16.0 * d - 12.0) * d + 3.0)
                                : d + (2.0 * s - 1.0) * (sqrt(d) - d);
}

vec3 softLight(vec3 s, vec3 d) {
  vec3 c;
  c.x = softLight(s.x, d.x);
  c.y = softLight(s.y, d.y);
  c.z = softLight(s.z, d.z);
  return c;
}

float hardLight(float s, float d) {
  return (s < 0.5) ? 2.0 * s * d : 1.0 - 2.0 * (1.0 - s) * (1.0 - d);
}

vec3 hardLight(vec3 s, vec3 d) {
  vec3 c;
  c.x = hardLight(s.x, d.x);
  c.y = hardLight(s.y, d.y);
  c.z = hardLight(s.z, d.z);
  return c;
}

float vividLight(float s, float d) {
  return (s < 0.5) ? 1.0 - (1.0 - d) / (2.0 * s) : d / (2.0 * (1.0 - s));
}

vec3 vividLight(vec3 s, vec3 d) {
  vec3 c;
  c.x = vividLight(s.x, d.x);
  c.y = vividLight(s.y, d.y);
  c.z = vividLight(s.z, d.z);
  return c;
}

vec3 linearLight(vec3 s, vec3 d) {
  return 2.0 * s + d - 1.0;
}

float pinLight(float s, float d) {
  return (2.0 * s - 1.0 > d) ? 2.0 * s - 1.0 : (s < 0.5 * d) ? 2.0 * s : d;
}

vec3 pinLight(vec3 s, vec3 d) {
  vec3 c;
  c.x = pinLight(s.x, d.x);
  c.y = pinLight(s.y, d.y);
  c.z = pinLight(s.z, d.z);
  return c;
}

vec3 hardMix(vec3 s, vec3 d) {
  return floor(s + d);
}

vec3 difference(vec3 s, vec3 d) {
  return abs(d - s);
}

vec3 exclusion(vec3 s, vec3 d) {
  return s + d - 2.0 * s * d;
}

vec3 subtract(vec3 s, vec3 d) {
  return s - d;
}

vec3 divide(vec3 s, vec3 d) {
  return s / d;
}

vec3 Blend(vec3 s, vec3 d, int id) {
       if (id == 0) return darken(s, d);
  else if (id == 1) return multiply(s, d);
  else if (id == 2) return colorBurn(s, d);
  else if (id == 3) return linearBurn(s, d);
  else if (id == 4) return lighten(s, d);
  else if (id == 5) return screen(s, d);
  else if (id == 6) return colorDodge(s, d);
  else if (id == 7) return linearDodge(s, d);
  else if (id == 8) return overlay(s, d);
  else if (id == 9) return softLight(s, d);
  else if (id == 10) return hardLight(s, d);
  else if (id == 11) return vividLight(s, d);
  else if (id == 12) return linearLight(s, d);
  else if (id == 13) return pinLight(s, d);
  else if (id == 14) return hardMix(s, d);
  else if (id == 15) return difference(s, d);
  else if (id == 16) return exclusion(s, d);
  
  return d;
}

vec2 tranTC(vec2 uv){
  return vec2(uv.x, 1.0 - uv.y);
}

vec3 gammaCorrect(vec3 color, float gamma) {
  return clamp(pow(color, vec3(gamma)), 0.0, 1.0);
}

vec3 inverseGammaCorrect(vec3 color, float gamma) {
  return clamp(pow(color, vec3(1.0/gamma)), 0.0, 1.0);
}

vec4 FUNCNAME(vec2 tc) {
  vec4 inColor1 = INPUT1(tc);
  vec4 inColor2 = INPUT2(tranTC(tc));
  vec4 inColor3 = INPUT3(tranTC(tc));
  float opacity = PREFIX(Opacity) / 100.0;
  inColor2.rgb = gammaCorrect(inColor2.rgb, 2.2);
  inColor3.rgb = gammaCorrect(inColor3.rgb, 2.2);
  // inColor1.rgb = gammaCorrect(inColor1.rgb, 2.2);
  inColor2 *= inColor3.g * opacity;

  vec4 retColor = vec4(Blend(inColor2.rgb, inColor1.rgb, PREFIX(BlendMode)), inColor1.a);
  // retColor.rgb = inverseGammaCorrect(retColor.rgb, 2.2);
  return retColor;
}
