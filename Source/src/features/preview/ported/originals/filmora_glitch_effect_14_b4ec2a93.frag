#define PI 3.14159265358979323846
#define N 10

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

float randomNoise(vec2 st, float _TimeX) {
  return fract(sin(dot(st.xy*floor(_TimeX*30.0), vec2(12.9898, 78.233))) * 43758.5453123);
}

float randomNoise(float seed, float _TimeX){
  return randomNoise(vec2(seed, 1.0), _TimeX);
}

vec4 GlitchImageBlock(vec2 uv, float time){
  float _BlockLayer1_U = 8.0;
  float _BlockLayer1_V = 5.0;

  vec2 _BlockSize = vec2(_BlockLayer1_U, _BlockLayer1_V);
  float block = randomNoise(floor(uv * _BlockSize), time);
  float displaceNoise = pow(block, 8.0) * pow(block, 3.0);

  float _BlockLayer2_U = 4.9;
  float _BlockLayer2_V = 9.89;
  vec2 blockLayer1 = floor(uv*vec2(_BlockLayer1_U, _BlockLayer1_V));
  vec2 blockLayer2 = floor(uv*vec2(_BlockLayer2_U, _BlockLayer2_V));

  float _BlockLayer1_Indensity = 8.0;
  float _BlockLayer2_Indensity = 8.0;
  float _Offset = 23.0;

  float lineNoise1 = pow(randomNoise(blockLayer1, time), _BlockLayer1_Indensity);
  float lineNoise2 = pow(randomNoise(blockLayer2, time), _BlockLayer2_Indensity);
  float lineNoise = lineNoise1 * lineNoise2 * _Offset;

  vec4 colorR = INPUT(uv);
  vec2 tempUV = uv + vec2(lineNoise * 0.05 * randomNoise(7.0, time), 0.0);
  vec4 colorG = INPUT(tempUV);
  tempUV = uv - vec2(lineNoise * 0.05 * randomNoise(23.0, time), 0.0);
  vec4 colorB = INPUT(tempUV);
  
  vec4 result = vec4(vec3(colorR.x, colorG.y, colorB.z), colorR.a + colorG.a + colorB.a);
  float _Fade = 1.0;
  result = mix(colorR, result, _Fade);
  
  return result;
}

vec2 screenMoveGlitch(vec2 uv, float t){
  t = fract(t);
  float move_x = 0.0;
  if     (t <= 0.2)     move_x = 0.144;
  else if(t <= 0.6)     move_x = 0.160;
  else if(t <= 0.84)    move_x = 0.141;
  else                  move_x = 0.0;
  
  float move_y = 0.0;
  if     (t <= 0.52)    move_y = 0.0;
  else if(t <= 0.60)    move_y = 0.187;
  else if(t <= 0.84)    move_y = 0.244;
  else if(t <= 0.9)     move_y = 0.176;
  else                  move_y = 0.0;
  return fract(uv+vec2(move_x, move_y));
}

vec4 FUNCNAME(vec2 tc)
{ 
	float iGlobalTime = PREFIX(global_time);
	float totalTime   = PREFIX(total_time);
	float process = fract(iGlobalTime*PREFIX(speed));

  vec4 fragColor = vec4(0.0);
  vec2 uv = screenMoveGlitch(tc, process);

  vec4  p = vec4(.52,.26,.78,.65);
  float iPro = KeySpline(p, process);
	  
  fragColor = GlitchImageBlock(uv, process);   
	return fragColor;	
}
