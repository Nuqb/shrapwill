
customize_in vec2 vUV;

vec4 DirectBlur(vec2 uv, float blurRadius, float rotateRad, int iteration) {
  float sinVal = sin(rotateRad) * blurRadius * 0.05 / float(iteration);
  float cosVal = cos(rotateRad) * blurRadius * 0.05 / float(iteration);
  vec2 direction = vec2(cosVal, sinVal);
  vec4 color = vec4(0.0);
  color = INPUT1(uv);
  for (int k = 1; k < iteration; k++) {
    vec2 curUV = uv - direction * float(k);
    vec2 curUV2 = uv + direction * float(k);
    color += INPUT1(curUV);
    color += INPUT1(curUV2);
  }
  vec4 finalColor = color / max(float(iteration) * 2.0 - 1.0, 1.0);
  return finalColor;
}
vec4 FUNCNAME(vec2 tc) {
  int uStep = PREFIX(uStep);
  if (uStep == 0) {
    vec2 uv = 1.0 - abs(2.0 * vUV - 1.0);
    float blur = smoothstep(0.0, 0.01, uv.x) * smoothstep(0.0, 0.01, uv.y);
    int texIndex = PREFIX(uTexIndex);
    if(texIndex == 1){
      return INPUT1(vUV);
    }else{
      return INPUT2(vUV);
    }
  } else if (uStep == 1) {
    float iPro = PREFIX(iPro);
    float blurRadius = mix(0.0, 0.5, iPro);
    float rotateRad = radians(90.0);
    int iteration = 12;
    return DirectBlur(vUV, blurRadius, rotateRad, iteration);
  }
}
