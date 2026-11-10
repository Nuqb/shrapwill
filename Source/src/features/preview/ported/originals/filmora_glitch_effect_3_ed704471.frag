#define NOISE_SIMPLEX_1_DIV_289 0.00346020761245674740484429065744
#define PI 3.141592653

#define nCos(x)		(cos(x)+1.0)*0.5
#define bell(x)		(1.0/((1.0+abs(x))*(1.0+abs(x))))
#define rayGen(x) 	((abs((fract(x)-0.5)*2.0)-0.5)*2.0)

float hash(float n)
{
	return fract(sin(n)*54671.57391);
}

float noise(vec2 p)
{
	return hash(p.x + p.y * 57.1235);
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

float KeySpline(vec4 p, float aX) {
	vec2 p1 = vec2(p.x, p.y);
	vec2 p2 = vec2(p.z, p.w);
    float mX1 = p1.x;
    float mY1 = p1.y;
    float mX2 = p2.x; 
    float mY2 = p2.y;
  if (mX1 == mY1 && mX2 == mY2)
    return aX;  // linear
  return CalcBezier(GetTForX(aX, mX1, mX2), mY1, mY2);
}

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float randFunc(int x) {
    return fract(sin(0.123456 + 9.87654*float(x))*10000.0);
}

vec2 mod289(vec2 x)
{
	return x - floor(x * NOISE_SIMPLEX_1_DIV_289) * 289.0;
}

vec3 mod289(vec3 x)
{
	return x - floor(x * NOISE_SIMPLEX_1_DIV_289) * 289.0;
}

vec3 permute(vec3 x)
{
	return mod289(x * x * 34.0 + x);
}

vec3 taylorInvSqrt(vec3 r)
{
	return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec2 v)
{
	vec4 C = vec4(0.211324865405187, // (3.0-sqrt(3.0))/6.0
	0.366025403784439, // 0.5*(sqrt(3.0)-1.0)
	- 0.577350269189626, // -1.0 + 2.0 * C.x
	0.024390243902439); // 1.0 / 41.0
	// First corner
	vec2 i = floor(v + dot(v, C.yy));
	vec2 x0 = v - i + dot(i, C.xx);
	
	// Other corners
	vec2 i1;
	i1.x = step(x0.y, x0.x);
	i1.y = 1.0 - i1.x;
	
	// x1 = x0 - i1  + 1.0 * C.xx;
	// x2 = x0 - 1.0 + 2.0 * C.xx;
	vec2 x1 = x0 + C.xx - i1;
	vec2 x2 = x0 + C.zz;
	
	// Permutations
	i = mod289(i); // Avoid truncation effects in permutation
	vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
	+ i.x + vec3(0.0, i1.x, 1.0));
	
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

float sinWave(vec2 tc, float iGlobalTime, float strength){
	float _Speed = 1.0;
	float _Amount = 1.0;
		
	float uv_y = tc.y * iResolution.y;
	float noise_wave_1 = snoise(vec2(uv_y * 0.01, iGlobalTime * _Speed * 20.0)) * (strength * _Amount * 5.0);
	float noise_wave_2 = snoise(vec2(uv_y * 0.015, iGlobalTime * _Speed * 10.0)) * (strength * _Amount * 10.0);
	float noise_wave_3 = snoise(vec2(uv_y * 0.02, iGlobalTime * _Speed * 15.0)) * (strength * _Amount * 15.0);
	float noise_wave = noise_wave_1 * noise_wave_2 * noise_wave_3 / iResolution.x;
	
	return noise_wave;
}

vec4 FUNCNAME(vec2 tc)
{ 
	float iGlobalTime = PREFIX(global_time);
	float totalTime = PREFIX(total_time);
	float process = fract(iGlobalTime*PREFIX(speed));
  float strength = PREFIX(strength);
  float waveStrenth = sinWave(tc, iGlobalTime, 0.5*strength);

  vec4 fragColor = vec4(0.0);
  vec2 uv_split = vec2(tc.x-0.5, tc.y);
  vec2 uv = tc;
  float split_strength = 0.4*strength;
  float offset_strength = 0.03*strength;
  float offset = 0.0;
  vec4 blue = vec4(0.0);
  vec4 red = vec4(0.0);
  vec4 col = vec4(0.0);
  if(process < 0.5){
    vec4 p = vec4(.7,.2,.9,.45);
    float normPro = process*2.0;
    float curPro = KeySpline(p, normPro);
    uv += vec2(waveStrenth*curPro, 0.0);
    uv.x -= uv_split.x*curPro*split_strength;
    offset = offset_strength*curPro;
    vec2 uv_blue = vec2(uv.x+offset,uv.y);
    vec2 uv_red = vec2(uv.x-offset,uv.y);
    blue = INPUT(uv_blue);
    red = INPUT(uv_red);
    col = INPUT(uv);
  }else{
    vec4 p = vec4(.7,.2,.9,.45);
    float normPro = 1.0-(process-0.5)*2.0;
    float curPro = KeySpline(p, normPro);
    uv += vec2(waveStrenth*curPro, 0.0);
    uv.x -= uv_split.x*curPro*split_strength;
    offset = offset_strength*curPro;
    vec2 uv_blue = vec2(uv.x+offset,uv.y);
    vec2 uv_red = vec2(uv.x-offset,uv.y);
    blue = INPUT(uv_blue);
    red = INPUT(uv_red);
    col = INPUT(uv);    
  }  
  fragColor = vec4(red.r, col.g, blue.b, col.a);
    
	return fragColor;	
}
