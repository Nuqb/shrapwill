float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float inOffsetRange(float pos, float bottom, float top){
    return step(bottom, pos) * step(pos, top);
}

vec4 FUNCNAME(vec2 tc) 
{
	float iGlobalTime = PREFIX(global_time);
	float iFrequency = PREFIX(frequency);
	float iAmount = PREFIX(amount);
	float iStrength = PREFIX(strength);
	int iDirection = PREFIX(direction);
	
	float seedTime = floor(iGlobalTime * 30.0 * iFrequency);
	float halfAmp = iStrength * 0.1;
	float sliceAmount = 8.0 * iAmount;
	
	float rgbSplit = 2.0 * random(vec2(iGlobalTime * 200.0)) - 1.0;
	rgbSplit *= 0.01;
	
	vec4 origCol = INPUT(tc);
	vec4 outCol = origCol;
	
	if(iDirection == 0)
	{
		rgbSplit *= iResolution.x / 960.0;
		for (float i = 0.0; i < sliceAmount; i += 1.0) {
			float offsetY = random(vec2(seedTime, 1000.0 + i));
			float offsetHeight = random(vec2(seedTime, 2000.0 + i)) * 0.15;
			if(inOffsetRange(tc.y, offsetY, min(offsetY + offsetHeight, 1.0)) > 0.5){
				float offset = -halfAmp + random(vec2(seedTime, 3000.0 + i)) * halfAmp;
				vec2 uv = tc;
				uv.x += offset;
				outCol.g = INPUT(uv).g;
				outCol.r = INPUT(vec2(uv.x + rgbSplit, uv.y)).r;
				outCol.b = INPUT(vec2(uv.x - rgbSplit, uv.y)).b;
				outCol.a = max(INPUT(vec2(uv.x - rgbSplit, uv.y)).a, INPUT(vec2(uv.x + rgbSplit, uv.y)).a);
				vec3 lineCol = vec3(random(vec2((uv.y + iGlobalTime + 10.0) * 100.0))); 
				outCol.rgb = mix(outCol.rgb, lineCol.rgb, random(vec2((iGlobalTime + 1000.0) * 8.0)) * 0.3);
			}
		}
	}else{
		rgbSplit *= iResolution.y / 960.0;
		for (float i = 0.0; i < sliceAmount; i += 1.0) {
			float offsetY = random(vec2(seedTime, 1000.0 + i));
			float offsetHeight = random(vec2(seedTime, 2000.0 + i)) * 0.15;
			if(inOffsetRange(tc.x, offsetY, min(offsetY + offsetHeight, 1.0)) > 0.5){
				float offset = -halfAmp + random(vec2(seedTime, 3000.0 + i)) * halfAmp;
				vec2 uv = tc;
				uv.y += offset;
				outCol.g = INPUT(uv).g;
				outCol.r = INPUT(vec2(uv.x, uv.y + rgbSplit)).r;
				outCol.b = INPUT(vec2(uv.x, uv.y - rgbSplit)).b;
				outCol.a = max(INPUT(vec2(uv.x, uv.y + rgbSplit)).a, INPUT(vec2(uv.x, uv.y - rgbSplit)).a);
				vec3 lineCol = vec3(random(vec2((uv.x + iGlobalTime + 10.0) * 100.0))); 
				outCol.rgb = mix(outCol.rgb, lineCol.rgb, random(vec2((iGlobalTime + 1000.0) * 8.0)) * 0.3);
			}
		}
	}
	
	outCol = vec4(mix(origCol.rgb, outCol.rgb, float(PREFIX(alpha))/100.0), outCol.a);
	outCol.rgb *= outCol.a;
	
    return outCol;
}