#define PI 3.1415926

float inBound(vec2 uv, vec2 bl, vec2 tr) {
  return step(bl.x, uv.x) * step(uv.x, tr.x) * step(bl.y, uv.y) * step(uv.y, tr.y);
}

vec2 setScale(vec2 uv, vec2 c, vec2 s){
  uv -= c;
  uv /= s;
  uv += c;
  return uv;
}

vec4 directBlur(vec2 uv, float blurRadius, vec2 dir, int iteration, float scaleOff){
  float cosVal = dir.x * blurRadius * 0.05 / float(iteration);
  float sinVal = dir.y * blurRadius * 0.05 / float(iteration);
  vec2 direction = vec2(cosVal, sinVal);
  vec2 c = vec2(0.5);
  vec2 s = vec2(1.0 + scaleOff, 1.0);
  vec2 temp = setScale(uv, c, s);
  vec4 color = INPUT(temp) * inBound(temp, vec2(0.0), vec2(1.0));
  for (int k = 1; k < iteration; k++){
    vec2 curUV = uv - direction * float(k);
    vec2 curUV2 = uv + direction * float(k);
    curUV = setScale(curUV, c, s);
    curUV2 = setScale(curUV2, c, s);
    color += INPUT(curUV) * inBound(curUV, vec2(0.0), vec2(1.0));
    color += INPUT(curUV2) * inBound(curUV2, vec2(0.0), vec2(1.0));
  }
  vec4 finalColor = color / ((float(iteration) - 1.0) * 2.0);
  return finalColor;
}

float sat(float x){
  return clamp(x, 0.0, 1.0);
}

vec4 FUNCNAME(vec2 tc) {
  float global_time = PREFIX(global_time);
  float start_time = PREFIX(PageStartTime);
  float anim_time = PREFIX(AnimationTime);
  
  float iPro = min(max(global_time-start_time, 0.0) / anim_time, 1.0);
  iPro = 3.0 * iPro * iPro - 2.0 * iPro * iPro * iPro;
  float blurPro = 1.0 - iPro;
  float Squeeze = float(PREFIX(Squeeze)) / 100.0;
  float maxScaleOff = mix(0.0, 0.25, Squeeze);
  float MotionBlur = float(PREFIX(MotionBlur)) / 100.0;
  float scaleOff = 0.0;
  vec4 p = vec4(.16,.56,.56,.92);
  if(iPro < 0.66){
    float curPro = sat(iPro / 0.66);
    scaleOff = mix(-maxScaleOff, maxScaleOff, curPro);
  }else{
    float curPro = 1.0 - sat((iPro - 0.66) / (1.0 - 0.66));
    scaleOff = mix(0.0, maxScaleOff, curPro);
  }
  float blurTime = mix(0.0, 0.4, MotionBlur) * blurPro;
  vec2 dir = vec2(1.0, 0.0);
  int iteration = 12;

  return directBlur(tc, blurTime, dir, iteration, scaleOff);
}
