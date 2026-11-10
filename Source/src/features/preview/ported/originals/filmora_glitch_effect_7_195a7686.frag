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

vec4 screen(vec4 src, vec4 blend){
  return 1.0-(1.0-src)*(1.0-blend);
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

float Wave_Jitter_Glitch(vec2 i, float _Time){
  float _Frequency = PI;
  float _Strength = sin(_Time * _Frequency);

  vec2 _Resolution = iResolution;
  float _Speed = 0.5;
  float _Amount = 1.0;
  // Prepare UV
  float uv_y = i.y * _Resolution.y;
  float noise_wave_1 = snoise(vec2(uv_y * 0.01, _Time * _Speed * 20.0)) * (_Strength * _Amount * 32.0);
  float noise_wave_2 = snoise(vec2(uv_y * 0.02, _Time * _Speed * 10.0)) * (_Strength * _Amount * 4.0);
  float noise_wave_x = noise_wave_1 * noise_wave_2 / _Resolution.x;
  return noise_wave_x;
}

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float showBound(vec2 tc){
  return max(max(step(tc.y,0.1), step(0.35, tc.y)*step(tc.y, 0.65)),step(0.9, tc.y));
}

float showScanLine(vec2 tc){
  return max(step(0.4, tc.y)*step(tc.y, 0.65), step(tc.y, 0.1));
}

float scanLineJitterGlitchX(vec2 tc, float t, float strength){
  float iAmount = 1.0;
	float iStrength = strength;
	float iFrequency = 1.0;
  float iGlobalTime = t;

  vec4 retCol = vec4(0.0);
	float curve = 0.5;
  float offset = random(vec2(tc.y * 100.0, iGlobalTime * 100.0)) * 2.0 - 1.0;
  offset *= step(1.0 - iAmount, abs(offset));
  offset *= pow(random(vec2(0.04 * 200.0)), 10.0 - 8.0 * iFrequency) * iStrength * curve;
  offset *= iStrength * curve;
  return offset*showBound(tc);
}

vec4 color_glitch(float t){
  vec4 green = vec4(213,252,191,255)/255.0;
  vec4 pink = vec4(244,185,229,255)/255.0;
  if(t < 0.34){
    return mix(vec4(1.0), pink, t/0.34);
  }else if(t < 0.66){
    return green;
  }else{
    return mix(pink, vec4(1.0), (t-0.66)/(1.0-0.66));
  }
}

float ramp(float y, float start, float end){
	float inside = step(start,y) - step(end,y);
	float fact = (y-start)/(end-start)*inside;
	return (1.-fact) * inside;	
}

float stripes(vec2 uv, float iTime){	
	float noi = random(uv*vec2(0.5,1.) + vec2(1.,3.));
  float inx = floor(uv.y*100.0);
  float yOff = random(vec2(inx,0.0))*0.1*random(vec2(0.0, iTime));
	return ramp(mod(uv.y*100.0 + iTime/2.+sin(iTime + sin(iTime*0.63)),1.0),0.0,1.0)*noi
         * clamp((abs(sin((uv.x-yOff)*400.0))-0.1)*1.2,-1.0,1.0)*step(0.4,yOff*10.0)*showScanLine(uv);
}

vec3 texSample(int x, int y, vec2 fragCoord)
{
	vec2 uv = fragCoord.xy;
	uv = (uv + vec2(x, y)) / iResolution.xy;
	return INPUT(uv).xyz;  
}          
                               
vec3 sharpenFilter(vec2 fragCoord, float strength)
{
	vec3 f =
	texSample(-1,-1, fragCoord) *  -1. +                     
	texSample( 0,-1, fragCoord) *  -1. +                    
	texSample( 1,-1, fragCoord) *  -1. +                      
	texSample(-1, 0, fragCoord) *  -1. +                    
	texSample( 0, 0, fragCoord) *   9. +                     
	texSample( 1, 0, fragCoord) *  -1. +                      
	texSample(-1, 1, fragCoord) *  -1. +                     
	texSample( 0, 1, fragCoord) *  -1. +                     
	texSample( 1, 1, fragCoord) *  -1.
	;                                              
	return mix(texSample(0, 0, fragCoord), f , strength);    
}

float exposure(float t){
  if(t<0.4){
    return 1.0;
  }else if(t<0.55){
    return 1.5;
  }else{
    return 1.0;
  }
}

vec4 FUNCNAME(vec2 tc)
{
	float iGlobalTime = PREFIX(global_time);
	float totalTime = PREFIX(total_time);
	float process = fract(iGlobalTime*PREFIX(speed));
  
  vec4 fragColor = vec4(0.0);
  float strengthVal = 0.7;
  
  if(process < 0.5){
    vec4 p = vec4(.7,.2,.9,.45);
    float normPro = process*2.0;
    float curPro = KeySpline(p, normPro);
    float strength = strengthVal*random(vec2(curPro,0.0));
    float offset = scanLineJitterGlitchX(tc, process, strength)+Wave_Jitter_Glitch(tc,process)*curPro;
    vec2 uv = vec2(tc.x-offset, tc.y)*iResolution;
    float alpha = INPUT(tc).w;
    fragColor = vec4(sharpenFilter(uv, 1.0), alpha)*color_glitch(process)+stripes(tc, process)*alpha;
  }else{
    vec4 p = vec4(.7,.2,.9,.45);  
    float normPro = 1.0-(process-0.5)*2.0;
    float curPro = KeySpline(p, normPro);
    float strength = strengthVal*random(vec2(curPro,0.0));
    float offset = (scanLineJitterGlitchX(tc, process, strength)+Wave_Jitter_Glitch(tc,process)*curPro);
    vec2 uv = vec2(tc.x-offset, tc.y)*iResolution;
    float alpha = INPUT(tc).w;
    fragColor = vec4(sharpenFilter(uv, 1.0), alpha)*color_glitch(process)+stripes(tc, process)*alpha;
  }

  float strength = 32.0;
  float x = (tc.x + 5.0 ) * (tc.y + 5.0 ) * (iGlobalTime * 20.0 + 10.0);
  float grain = (mod((mod(x, 13.0) + 1.0) * (mod(x, 123.0) + 1.0), 0.01) - 0.005) * strength;

  fragColor.rgb *= 1.0 - grain;
  fragColor = clamp(fragColor*exposure(process), 0.0, 1.0);
    
	return fragColor;	
}
