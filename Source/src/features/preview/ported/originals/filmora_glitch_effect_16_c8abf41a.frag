#define NOISE_SIMPLEX_1_DIV_289 0.00346020761245674740484429065744
#define PI 3.14159265359

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

vec2 mod289(vec2 x){
	return x - floor(x * NOISE_SIMPLEX_1_DIV_289) * 289.0;
}

vec3 mod289(vec3 x){
	return x - floor(x * NOISE_SIMPLEX_1_DIV_289) * 289.0;
}

vec3 permute(vec3 x){
	return mod289(x * x * 34.0 + x);
}

vec3 taylorInvSqrt(vec3 r){
	return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec2 v){
	const vec4 C = vec4(0.211324865405187,    // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,    // 0.5*(sqrt(3.0)-1.0)
                      -0.577350269189626,  // -1.0 + 2.0 * C.x
                      0.024390243902439);   // 1.0 / 41.0
	// First corner
	vec2 i = floor(v + dot(v, C.yy));
	vec2 x0 = v - i + dot(i, C.xx);
	
	// Other corners
	vec2 i1;
	i1.x = step(x0.y, x0.x);
	i1.y = 1.0 - i1.x;
	
	vec2 x1 = x0 + C.xx - i1;
	vec2 x2 = x0 + C.zz;
	
	// Permutations
	i = mod289(i); // Avoid truncation effects in permutation
	vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
	
	vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2)), 0.0);
	m = m * m;
	m = m * m;
	
	// Gradients: 41 points uniformly over a line, mapped onto a diamond.
	// The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)
	vec3 x = 2.0 * fract(p * C.www) - 1.0;
	vec3 h = abs(x) - 0.5;
	vec3 ox = floor(x + 0.5);
	vec3 a0 = x - ox;
	
	// Normalise gradients implicitly by scaling m
	m *= taylorInvSqrt(a0 * a0 + h * h);
	
	// Compute final noise value at P
	vec3 g;
	g.x = a0.x * x0.x + h.x * x0.y;
	g.y = a0.y * x1.x + h.y * x1.y;
	g.z = a0.z * x2.x + h.z * x2.y;
	return 130.0 * dot(m, g);
}

float randomNoise(vec2 c){
    return fract(sin(dot(c.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

float my_trunc(float x, float num_levels){
    return floor(x * num_levels) / num_levels;
}

vec2 trunc_vec2(vec2 x, vec2 num_levels){
    return floor(x * num_levels) / num_levels;
}

vec2 xy_direction_offset(vec2 uv, float t){
  vec4 p = vec4(.58,.11,.85,.45);
  vec2 floorNum = vec2(9, 16);
  if(iResolution.y>iResolution.x){
    floorNum.xy = floorNum.yx;
  }
  float uv_trunc_x = randomNoise(trunc_vec2(uv.yy, vec2(floorNum.x)))*step(1.0/floorNum.x*4.0, uv.y);
  float uv_trunc_y = randomNoise(trunc_vec2(uv.xx, vec2(floorNum.y)))*step(1.0/floorNum.y*5.0, uv.x)*step(uv.x, 1.0-1.0/floorNum.y*4.0);
  float process = t<0.5 ? 2.0*t : 1.0-(t-0.5)*2.0;
  process = KeySpline(p, process);
  uv_trunc_x *= process;
  uv_trunc_y *= process;
  return vec2(uv_trunc_x, uv_trunc_y);
}

vec4 Wave_Jitter_Glitch(vec2 i, float _Time){
  float _Frequency = PI;
  float _Strength = sin(_Time * _Frequency)*PREFIX(strength);

  vec2 _Resolution = iResolution;
  float _Speed = 0.25*PREFIX(speed);
  float _Amount = 1.5;
  // Prepare UV
  float uv_y = i.y * _Resolution.y;
  float noise_wave_1 = snoise(vec2(uv_y * 0.01, _Time * _Speed * 20.0)) * (_Strength * _Amount * 32.0);
  float noise_wave_2 = snoise(vec2(uv_y * 0.02, _Time * _Speed * 10.0)) * (_Strength * _Amount * 4.0);
  float noise_wave_x = noise_wave_1 * noise_wave_2 / _Resolution.x;
  float uv_x = i.x + noise_wave_x;

  float _RGBSplit = 20.0;
  float rgbSplit_uv_x   = (_RGBSplit * 50.0 + (20.0 * _Strength + 1.0)) * noise_wave_x / _Resolution.x;
  float rgbSplit_uv_x_2 = (_RGBSplit * 30.0 + (10.0 * _Strength + 5.0)) * noise_wave_x / _Resolution.x;

  // Sample RGB Color
  vec4 colorR = vec4(0.0);
  vec4 colorB = vec4(0.0);
  vec4 colorG = vec4(0.0);
  colorR = INPUT(vec2(uv_x, i.y));
  colorG = INPUT(vec2(uv_x + rgbSplit_uv_x_2, i.y));
  colorB = INPUT(vec2(uv_x + rgbSplit_uv_x, i.y));

  return vec4(colorR.r, colorG.g, colorB.b, colorR.a + colorG.a + colorB.a);
}

vec4 FUNCNAME(vec2 tc){ 
	float iGlobalTime = PREFIX(global_time);
	float totalTime = PREFIX(total_time);
	float process = fract(iGlobalTime*PREFIX(speed));
  
  vec4 fragColor = vec4(0.0);
  vec2 direction_offset = xy_direction_offset(tc, process);

  tc += direction_offset*vec2(0.2, 0.05);

  vec4 p = vec4(.58,.11,.85,.45);
  if(process < 0.5){
    float moveTime = process*2.0;
    moveTime = KeySpline(p, moveTime); 
    vec2 uv = vec2(tc.x-moveTime, tc.y);
    fragColor = Wave_Jitter_Glitch(uv, process);
  }else{
    float curProcess = (process-0.5)*2.0;
    curProcess = curProcess < 0.5 ? curProcess*2.0 : 1.0-(curProcess-0.5)*2.0;
    curProcess = KeySpline(p, curProcess);
    float moveTimeX = curProcess*0.3;
    float moveTimeY = curProcess*0.15;
    vec2 uv = vec2(tc.x+moveTimeX, tc.y-moveTimeY);
    fragColor = Wave_Jitter_Glitch(uv, process);
  }

	return fragColor;	
}
