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

vec3 colorDodge(vec3 s, vec3 d)
{
	float r = 1.0 - s.r;
	float g = 1.0 - s.g;
	float b = 1.0 - s.b;
	
	vec3 ret = s;
	if(r > 0.0){
		ret.r = d.r / r;
	}
	
	if(g > 0.0){
		ret.g = d.g / g;
	}
	
	if(b > 0.0){
		ret.b = d.b / b;
	}
	
	return ret;
}

vec3 digital(vec2 tc, float iGlobalTime, float block){
	vec3 retCol = vec3(0.0);
	vec2 uv = tc;
	uv.y = floor(uv.y * block);
	for(float i = 0.0; i < block; ++i){
		if(uv.y == i){
			float n = random(vec2(i)) * 5.0;
			for(float j = 0.0; j <= n; ++j){
				float w0 = random(vec2(i * 100.0 + j + 10.0 + iGlobalTime));
				float w1 = random(vec2(i * 100.0 + j + 20.0 + iGlobalTime));
				float w2 = random(vec2(i * 100.0 + j + 30.0 + iGlobalTime));
				float w3 = random(vec2(i * 100.0 + j + 40.0 + iGlobalTime));
				float w4 = random(vec2(i * 100.0 + j + 50.0 + iGlobalTime));
				float pos = random(vec2(i * 100.0 + j + 5.0 + iGlobalTime));
				if(uv.x > pos && uv.x <= w0){
					float r = random(vec2(i * 100.0 + j + 60.0 + iGlobalTime));
					float g = random(vec2(i * 100.0 + j + 70.0 + iGlobalTime));
					float b = random(vec2(i * 100.0 + j + 80.0 + iGlobalTime));
					retCol.rgb = vec3(r, g, b);
				}else if(uv.x > w0 && uv.x <= w1){
					float r = random(vec2(i * 100.0 + j + 90.0 + iGlobalTime));
					float g = random(vec2(i * 100.0 + j + 100.0 + iGlobalTime));
					float b = random(vec2(i * 100.0 + j + 110.0 + iGlobalTime));
					retCol.rgb = vec3(r, g, b);
				}else if(uv.x > w1 && uv.x <= w2){
					float r = random(vec2(i * 100.0 + j + 120.0 + iGlobalTime));
					float g = random(vec2(i * 100.0 + j + 130.0 + iGlobalTime));
					float b = random(vec2(i * 100.0 + j + 140.0 + iGlobalTime));
					retCol.rgb = vec3(r, g, b);
				}else if(uv.x > w2 && uv.x <= w3){
					float r = random(vec2(i * 100.0 + j + 150.0 + iGlobalTime));
					float g = random(vec2(i * 100.0 + j + 160.0 + iGlobalTime));
					float b = random(vec2(i * 100.0 + j + 170.0 + iGlobalTime));
					retCol.rgb = vec3(r, g, b);
				}else if(uv.x > w3 && uv.x <= w4){
					float r = random(vec2(i * 100.0 + j + 180.0 + iGlobalTime));
					float g = random(vec2(i * 100.0 + j + 190.0 + iGlobalTime));
					float b = random(vec2(i * 100.0 + j + 200.0 + iGlobalTime));
					retCol.rgb = vec3(r, g, b);
				}else {
					float r = random(vec2(i * 100.0 + j + 210.0 + iGlobalTime));
					float g = random(vec2(i * 100.0 + j + 220.0 + iGlobalTime));
					float b = random(vec2(i * 100.0 + j + 230.0 + iGlobalTime));
					retCol.rgb = vec3(r, g, b);
				}
			}
		}
	}
	
	return retCol;
}

float randomNoise(vec2 st, float seed) {
    return fract(sin(dot(st.xy * floor(seed * 10.0), vec2(12.9898, 78.233))) * 43758.5453123);
}

vec4 blockGlitch(vec2 tc, float iGlobalTime){
	float blockNoise = random(vec2(iGlobalTime * 20.0));
	
	float rnd1 = randomNoise(floor(tc * 5.0 * blockNoise), iGlobalTime + 100.0);
	rnd1 = pow(rnd1, 3.0);
	
	float rnd2 = randomNoise(floor(tc * 7.0 * blockNoise), iGlobalTime + 200.0);
	rnd2 = pow(rnd2, 4.0);
	
	float rnd3 = randomNoise(floor(tc * 9.0 * blockNoise), iGlobalTime + 300.0);
	rnd3 = pow(rnd3, 5.0);
	
	float noise = random(vec2(iGlobalTime * 25.0 + 100.0));
	float rnd = rnd1 * rnd2 * rnd3 * 0.3;
	
	float block_thresh = pow(fract(iGlobalTime * 1000.0), 2.0);
	float line_thresh = pow(fract(iGlobalTime * 2230.0), 2.0);
	
	float rgbSplit = blockNoise * rnd * 0.01;
	
	vec4 retCol = INPUT1(tc);
	if (random(vec2(floor(tc * 16.0 * noise))) < block_thresh || random(vec2(floor(tc * 26.0 * noise))) < line_thresh) {		
		retCol.r = INPUT1(tc + vec2(rnd, 0.0)).r;
		retCol.g = INPUT1(tc + vec2(rnd + 0.005, 0.0)).g;
		retCol.b = INPUT1(tc + vec2(rnd, 0.0)).b;
	}
	
	return retCol;
}

vec4 GetGlitch_17(vec2 tc){
    float iGlobalTime = PREFIX(global_time);
	float totalTime = PREFIX(total_time);
	
	float cycle_time = mod(iGlobalTime, 1.2);
	float process = cycle_time / 0.6;
	process = clamp(process, 0.0, 1.0);
	
	float seed_time = float(int(iGlobalTime * 30.0) / 2);
	
	vec4 retCol = blockGlitch(tc, iGlobalTime);
	
	float num = random(vec2(seed_time + 10.0)) * 10.0 + 5.0;
	vec3 digitalCol = digital(tc, seed_time, num);
	num = random(vec2(seed_time + 20.0)) * 10.0 + 10.0;
	vec3 digitalCol2 = digital(tc, seed_time, num);
	
	float threshold = 0.5;
	float t1 = step(threshold, pow((digitalCol.x + digitalCol.y + digitalCol.z) / 3.0, 2.0));
	float t2 = step(threshold, pow((digitalCol2.x + digitalCol2.y + digitalCol2.z) / 3.0, 2.0));
	if(t1 * t2 > 0.0){
		if(t1 > 0.0){
			retCol.rgb = colorDodge(digitalCol, retCol.rgb);
		}else if(t2 > 0.0){
			retCol.rgb = colorDodge(digitalCol2, retCol.rgb);
		}
	}
	
	if(process > 0.45 && process < 0.5){
		vec3 red = vec3(123.0, 107.0, 245.0) / 255.0;
		retCol.rgb = colorDodge(red, retCol.rgb);
	}else if(process >= 0.5 && process < 0.55){
		retCol.rgb = vec3(1.0);
	}else if(process >= 0.55){
		retCol = blockGlitch(tc, iGlobalTime);
	}
	
	vec4 origCol = INPUT1(tc);
	retCol.a = origCol.a;
	retCol.rgb *= retCol.a;
	
	return retCol;		
}
vec3 clamps(vec3 img){
    img.r = clamp(img.r, 0.0, 1.0);
    img.g = clamp(img.g, 0.0, 1.0);
    img.b = clamp(img.b, 0.0, 1.0);
    return img;
}
vec4 FUNCNAME(vec2 tc) {
	vec2 uv = tc;
    float uGlow = PREFIX(uGlow);
    float uCamera = PREFIX(uCamera);
    float uGlitch = PREFIX(uGlitch);
    vec4 res = INPUT1(uv);
    vec4 res2 = vec4(vec3(uGlow), 1.0);
    res.r = clamp(res.r * res2.r, 0.0, 1.0);
    res.g = clamp(res.g * res2.g, 0.0, 1.0);
    res.b = clamp(res.b * res2.b, 0.0, 1.0);

    vec4 GlitchTexture = GetGlitch_17(uv);
    res = mix(res, GlitchTexture, uGlitch);

    vec4 CameraTexture = INPUT2(vec2(uv.x, 1.0 - uv.y));
    CameraTexture.rgb *= (CameraTexture.a);
    CameraTexture.rgb += res.rgb;
    CameraTexture.a = CameraTexture.r;
    CameraTexture.rgb = clamps(CameraTexture.rgb);
    res = mix(res, CameraTexture, uCamera);
    return res;
}
