#define PI 3.1415926

float A(float aA1, float aA2) {
  return 1.0 - 3.0 * aA2 + 3.0 * aA1;
}

float B(float aA1, float aA2) {
  return 3.0 * aA2 - 6.0 * aA1;
}

float C(float aA1) {
  return 3.0 * aA1;
}

float GetSlope(float aT, float aA1, float aA2) {
  return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1);
}

float CalcBezier(float aT, float aA1, float aA2) {
  return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT;
}

float GetTForX(float aX, float mX1, float mX2) {
  float aGuessT = aX;
  for (int i = 0; i < 6; ++i) {
    float currentSlope = GetSlope(aGuessT, mX1, mX2);
    if (currentSlope == 0.0)
      return aGuessT;
    float currentX = CalcBezier(aGuessT, mX1, mX2) - aX;
    aGuessT -= currentX / currentSlope;
  }
  return aGuessT;
}

/*
 * @param aX: 传入时间变量
 * @param p1/p2: 贝塞尔曲线两个控制点
 * 说明: 这个函数以上的其他函数都是本函数使用的辅助函数
 */
float KeySpline(vec4 p, float aX) {
  float mX1 = p.x;
  float mY1 = p.y;
  float mX2 = p.z;
  float mY2 = p.w;
  if (mX1 == mY1 && mX2 == mY2)
    return aX;  // linear
  return CalcBezier(GetTForX(aX, mX1, mX2), mY1, mY2);
}

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

float rnd(vec3 scale, float seed, vec3 uv) {
  return fract(sin(dot(uv + seed, scale)) * 43758.5453 + seed);
}

vec4 RadialBlur(vec2 fc, vec2 radialCenter, float radialBlur, int iteration, float scaleOff){
  float fIteration = float(iteration);
  vec2 fcc = fc - radialCenter;
  fcc.x = sign(fcc.x) * pow(abs(fcc.x), 0.8);
  vec4 destColor = vec4(0.0);
  float random = rnd(vec3(12.9898, 78.233, 151.7182), 0.0, vec3(fc, 0.0));
  float totalWeight = 0.0;
  float nFrag = 1.0 / fIteration;
  vec2 c = vec2(0.5);
  vec2 s = vec2(1.0 + scaleOff, 1.0);
  for (float i = 0.0; i <= fIteration; i+=1.0) {
    float percent = (i + random) * nFrag;
    float weight = percent - percent * percent;
    vec2 tc = fc - fcc * percent * radialBlur * nFrag * vec2(1.0, 0.0);
    tc = setScale(tc, c, s);
    destColor += INPUT(tc) * weight;
    totalWeight += weight;
  }
  return destColor / totalWeight;
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
  vec4 p = vec4(.14,.4,.61,.89);
  iPro = KeySpline(p, iPro);
  float blurPro = 1.0 - iPro;
  float Squeeze = float(PREFIX(Squeeze)) / 100.0;
  float maxScaleOff = mix(0.0, 0.25, Squeeze);
  float MotionBlur = float(PREFIX(MotionBlur)) / 100.0;
  float scaleOff = mix(-maxScaleOff, 0.0, iPro);

  vec2 radialCenter = vec2(0.5);
  float radialRadius = mix(0.0, 2.0, MotionBlur) * blurPro;
  int iteration = 12;
  return RadialBlur(tc, radialCenter, radialRadius, iteration, scaleOff);
}
