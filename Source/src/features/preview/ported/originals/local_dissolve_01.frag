/*vec4 camera(int frameID,vec4 blend1,vec4 blend2,vec4 blend3,vec4 blend4,vec4 blend5,vec4 blend6,vec4 blend7,vec4 blend8,vec4 blend9,vec4 blend10,vec4 blend11,vec4 blend12,vec4 blend13)
{
	vec4 m = vec4(0.0);
	if(frameID%26 == 0)
		m = m;
	if(frameID%26 == 1)
		m = m;
	if(frameID%26 == 2)
		m = m;
	if(frameID%26 == 3)
		m = m;
	if(frameID%26 == 4)
		m = blend1;
	if(frameID%26 == 5)
		m = blend2;
	if(frameID%26 == 6)
		m = blend3;
	if (frameID%26 == 7)
		m = blend4;
	if (frameID%26 == 8)
		m = blend5;
	if (frameID%26 == 9)
		m = blend6;
	if (frameID%26 == 10)
		m = blend7;
	if (frameID%26 == 11)
		m = blend8;
	if (frameID%26 == 12)
		m = blend9;
	if (frameID%26 == 13 )
		m = blend10;
	if (frameID%26 == 14)
		m = blend11;
	if (frameID%26 == 15)
		m = blend12;
	if (frameID%26 == 16)
		m = blend13;
	if (frameID%26 == 17)
		m = blend12;
	if (frameID%26 == 18)
		m = blend11;
	if (frameID%26 == 19)
		m = blend10;
	if (frameID%26 == 20)
		m = blend9;
	if (frameID%26 == 21)
		m = blend8;
	if (frameID%26 == 22)
		m = blend7;
	if (frameID%26 == 23)
		m = blend6;
	if (frameID%26 == 24)
		m = blend5;
	if (frameID%26 == 25)
		m = blend4;
	return m;
}

float blendLinearDodge(float base, float blend) {
    return min(base+blend,1.0);
}

float blendLinearBurn(float base, float blend) {
    return max(base+blend-1.0,0.0);
}

float bb(float base, float blend) {
    return blend<0.5?blendLinearBurn(base,(2.0*blend)):blendLinearDodge(base,(2.0*(blend-0.5)));
}

vec4 blendLinearLight(vec4 base, vec4 blend) {
    return vec4(bb(base.r,blend.r),bb(base.g,blend.g),bb(base.b,blend.b),bb(base.a,blend.a));
}

vec4 FUNCNAME(vec2 tc) 
{
	float iGlobalTime = PREFIX(global_time);
	float totalTime = PREFIX(total_time);
	
	float process = min(iGlobalTime / totalTime, 1.0);
	float iPro = (3.0 * process * process - 2.0 * process * process * process* process);
	
	vec2 baseTexureSize = iResolution.xy;//vec2(365,480);
    float baseAspectRatio = baseTexureSize.x/baseTexureSize.y;
    vec2 uv1 = vec2(tc.x - 0.5, tc.y - 0.5);
	vec2 fullBlendTexSize = vec2(365,480);
    if(baseAspectRatio < 1.0){
        uv1.x *= (fullBlendTexSize.y/fullBlendTexSize.x) * baseAspectRatio;
        // uv1.y *= (fullBlendTexSize.x/fullBlendTexSize.y) * (1./baseAspectRatio);
        uv1 = vec2(uv1.x + 0.5, uv1.y + 0.5);
    }else if(baseAspectRatio == 1.0){
        uv1.y *= (fullBlendTexSize.x/fullBlendTexSize.y) * (1./baseAspectRatio);
        uv1 = vec2(uv1.x + 0.5, uv1.y + 0.5);
    }else{
        uv1.y *= (fullBlendTexSize.y/fullBlendTexSize.x) * (1./baseAspectRatio);
        uv1 *= mat2(0, 1, -1, 0);
        //uv1.x *= (fullBlendTexSize.x/fullBlendTexSize.y) * baseAspectRatio;

        uv1 = vec2(uv1.x + 0.5, uv1.y + 0.5);
    }
	
	vec4 blend1 = INPUT3(uv1);
	vec4 blend2 = INPUT4(uv1);
	vec4 blend3 = INPUT5(uv1);
	vec4 blend4 = INPUT6(uv1);
	vec4 blend5 = INPUT7(uv1);
	vec4 blend6 = INPUT8(uv1);
	vec4 blend7 = INPUT9(uv1);
	vec4 blend8 = INPUT10(uv1);
	vec4 blend9 = INPUT11(uv1);
	vec4 blend10 = INPUT12(uv1);
	vec4 blend11 = INPUT13(uv1);
	vec4 blend12 = INPUT14(uv1);
	vec4 blend13 = INPUT15(uv1);
	//
	int frameID = int(iPro*26.0);
	vec4 base = camera(frameID,blend1,blend2,blend3,blend4,blend5,blend6,blend7,blend8,blend9,blend10,blend11,blend12,blend13);
	vec4 retCol = vec4(1.0);
	vec4 orig = vec4(1.0);
	//if (blendMode == 14)
	float opacity = 1.0;
		//return (blendLinearLight(orig, base) * opacity + base * (1.0 - opacity));
	if(iPro<0.6){
		orig = INPUT1(tc);
		retCol = mix(orig,base,base.a);//blendLinearLight(orig, base) * opacity + base * (1.0 - opacity);//mix(orig,base,base.a);
	}
	else{
		orig = INPUT2(tc);
		retCol = mix(orig,base,base.a);
	}
	//
	vec4 y1 = INPUT1(tc);
	vec4 y2 = INPUT2(tc);
	if(iPro<0.5)
	{
		orig = mix(y1,base,0.0);//INPUT1(tc);
		retCol = mix(y2,orig,iPro);
	}
	else
	{
		orig = INPUT2(tc);
		retCol = orig;
	}
	//retCol = mix(orig,base,base.a);
	retCol.rgb *= orig.a;
	return retCol;
}*/

vec3 unpremultiply (vec3 color, float alpha) {
    return color / (alpha + 0.0001);
}

vec3 lutover (vec4 lut, vec3 src,float iPro) {
    src *= 63.0;
    float b = src.b;

	vec3 c0 = vec3(1.0);
	vec3 c1 = vec3(1.0);
	
    vec2 i01 = vec2(floor(b), ceil(b));
    vec2 r01 = floor(i01 * 0.125);
    vec2 c01 = i01 - r01 * 8.0;

    vec4 uv0 = vec4(c01, r01).xzyw * 0.125;
    vec2 uv1 = (src.rg + 0.5) * 0.001953125;
    uv0 += vec4(uv1, uv1);
	c0 = INPUT3(uv0.xy).rgb;//texture2D(lut, uv0.xy).rgb;
	c1 = INPUT3(uv0.zw).rgb;
    return mix(c0, c1, b - i01.x);
}

vec4 mapping (vec4 color, vec4 lut, float intensity,float iPro) {
    vec3 dst = unpremultiply(color.rgb, color.a);
    vec3 src = lutover(lut, dst,iPro);
    dst = mix(dst, src, intensity);
    return vec4(dst, 1.0) * color.a;
}

vec4 FUNCNAME(vec2 tc) 
{
	float iGlobalTime = PREFIX(global_time);
	float totalTime = PREFIX(total_time);
	
	float process = min(iGlobalTime / totalTime, 1.0);
	float iPro = (3.0 * process * process - 2.0 * process * process * process* process);
	
	vec4 y1 = INPUT1(tc);
	vec4 y2 = INPUT2(tc);
	vec4 lut = INPUT3(tc);
	
    float i = smoothstep(0.0, 1.0, 1.0 - abs(process + process - 1.0));

    y1 = mapping(y1, lut, i,iPro);
    y2 = mapping(y2, lut, i,iPro);

    vec4 ret = mix(y1, y2, process);
	
	return ret;
}