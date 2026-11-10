
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

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0;
}

vec4 motionBlur(vec2 _st, vec2 dir, float iterNum) {
  vec2 texCoord = _st.xy;
  vec3 color = vec3(0.0);
  float total = 0.0;
  float offset = rand(_st);
  vec4 inputCol = INPUT1(_st);

  if (inputCol.a > 0.0) {
    for (float t = 0.0; t <= iterNum; t += 1.0) {
      float percent = (t + offset) / iterNum;
      float weight = 4.0 * (percent - percent * percent);
      color += INPUT1(fract(texCoord - dir * percent)).rgb * weight;
      total += weight;
    }
    color /= total;
  }
  return vec4(color * inputCol.a, inputCol.a);
}

vec4 FUNCNAME(vec2 tc) {
  int uStep = PREFIX(uStep);
  if (uStep == 0) {
    vec2 uv = 1.0 - abs(2.0 * vUV - 1.0);
    float blur = smoothstep(0.0, 0.01, uv.x) * smoothstep(0.0, 0.01, uv.y);
    int texIndex = PREFIX(uTexIndex);
    if (texIndex == 0) {
      return INPUT2(vUV);
    } else if (texIndex == 1) {
      return INPUT1(vUV);
    }
  } else if (uStep == 1) {
    float iPro = PREFIX(iPro);
    float blurRadius = mix(0.0, 0.5, iPro);
    float rotateRad = radians(45.0);
    int iteration = 12;
    return DirectBlur(vUV, blurRadius, rotateRad, iteration);
  }
}
