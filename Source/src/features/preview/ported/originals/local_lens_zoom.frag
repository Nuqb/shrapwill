vec2 rotateFunc(vec2 uv, vec2 center, float theta)
{
	vec2 temp;
	temp.x = dot(vec2(cos(theta), -sin(theta)), uv - center);
	temp.y = dot(vec2(sin(theta), cos(theta)), uv - center);
	return temp + center;
}

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
 * @param mX1/mY1/mX2/mY2: 贝塞尔曲线四个值
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

float rnd(vec3 scale, float seed, vec3 uv) {
  return fract(sin(dot(uv + seed, scale)) * 43758.5453 + seed);
}

vec4 radial_blur(vec2 fc, vec2 radialCenter, float radialBlur, int iteration, int imgIndex){
  float fIteration = float(iteration);
  vec2 fcc = fc - radialCenter;
  vec4 destColor = vec4(0.0);
  float random = rnd(vec3(12.9898, 78.233, 151.7182), 0.0, vec3(fc, 0.0));
  float totalWeight = 0.0;
  float nFrag = 1.0 / fIteration;
  for (float i = 0.0; i <= fIteration; i+=1.0) {
    float percent = (i + random) * nFrag;
    float weight = percent - percent * percent;
    vec2 t = fc - fcc * percent * radialBlur * nFrag;
    if(imgIndex == 1)
      destColor += INPUT1(t) * weight;
    else
      destColor += INPUT2(t) * weight;
    totalWeight += weight;
  }
  return destColor / totalWeight;
}

vec4 FUNCNAME(vec2 tc)
{ 
	float iGlobalTime = PREFIX(global_time);
	float totalTime = PREFIX(total_time);
	float process = min(iGlobalTime / totalTime, 1.0);
  vec4 fragColor = vec4(0);
  vec2 radialCenter = vec2(0.5); 
  float maxRotateRad = radians(-20.0);
  float maxRadialRadius = 36.0;
  int iteration = 40; 
  vec4 p = vec4(.84,.2,.98,.6); 
  if(process <= 0.5){
    int imgIndex = 1;
    float curPro = process*2.0;   
    curPro = KeySpline(p, curPro);
    float curRotateRad = maxRotateRad*curPro;    
    float curRadialRadius = mix(0.0, maxRadialRadius, curPro);
    int curIteration = iteration;   
    vec2 curUV = tc;
    curUV = rotateFunc(curUV, radialCenter, curRotateRad);
    fragColor = radial_blur(curUV, radialCenter, curRadialRadius, curIteration, imgIndex);
    
  }else{
    int imgIndex = 2;
    float curPro = 1.0-(process-0.5)*2.0;
    curPro = KeySpline(p, curPro);
    float curRotateRad = -maxRotateRad*curPro;    
    float curRadialRadius = mix(0.0, maxRadialRadius, curPro);
    int curIteration = iteration;
    vec2 curUV = tc;
    curUV = rotateFunc(curUV, radialCenter, curRotateRad);
    fragColor = radial_blur(curUV, radialCenter, curRadialRadius, curIteration, imgIndex);
  }
	
	return fragColor;	
}
