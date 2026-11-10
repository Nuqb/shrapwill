vec4 camera(int frameID,vec4 blend1,vec4 blend2,vec4 blend3,vec4 blend4,vec4 blend5,vec4 blend6,vec4 blend7,vec4 blend8,vec4 blend9,vec4 blend10,vec4 blend11,vec4 blend12,vec4 blend13)
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

vec4 FUNCNAME(vec2 tc) 
{
	float iGlobalTime = PREFIX(global_time);
	float totalTime = PREFIX(total_time);
	
	float process = min(iGlobalTime / totalTime, 1.0);
	float iPro = (3.0 * process * process - 2.0 * process * process * process* process);
	
	//vec4 y1 = INPUT1(tc);
	//vec4 y2 = INPUT2(tc);
	//float picration = iResolution.x/iResolution.y;
	//float picration2 = iResolution.y/iResolution.x;
	//float ratio1 = 480.0/365.0;
	//float ratio2 = 588.0/590.0;
	//vec2 uv = tc;
    //uv.y = 1.0 - uv.y;
	
	//
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
	//vec4 test = mix(y1,y2,1.0);
	if(iPro<0.6){
		orig = INPUT1(tc);
		retCol = mix(orig,base,base.a);
	}
	else{
		orig = INPUT2(tc);
		retCol = mix(orig,base,base.a);
	}
	retCol.rgb *= orig.a;
	return retCol;
}


/*vec4 camera(int frameID,vec4 blend2,vec4 blend3,vec4 blend4,vec4 blend5,vec4 blend6,vec4 blend7,vec4 blend8)
{
	vec4 m = vec4(0.0);
	if(frameID%14 == 0)
		m = m;
	if(frameID%14 == 1)
		m = m;
	if(frameID%14 == 2)
		m = blend3;
	if(frameID%14 == 3)
		m = blend4;
	if(frameID%14 == 4)
		m = blend5;
	if(frameID%14 == 5)
		m = blend6;
	if(frameID%14 == 6)
		m = blend7;
	if (frameID%14 == 7)
		m = blend8;
	if (frameID%14 == 8)
		m = blend7;
	if (frameID%14 == 9)
		m = blend6;
	if (frameID%14 == 10)
		m = blend5;
	if (frameID%14 == 11)
		m = blend4;
	if (frameID%14 == 12)
		m = blend3;
	if (frameID%14 == 13)
		m = blend2;
	return m;
}

vec4 FUNCNAME(vec2 tc) 
{
	float iGlobalTime = PREFIX(global_time);
	float totalTime = PREFIX(total_time);
	
	float process = min(iGlobalTime / totalTime, 1.0);
	float iPro = (3.0 * process * process - 2.0 * process * process * process* process);
	
	vec4 y1 = INPUT1(tc);
	vec4 y2 = INPUT2(tc);
	float picration = iResolution.x/iResolution.y;
	//float picration2 = iResolution.y/iResolution.x;
	float ratio1 = 480.0/365.0;
	float ratio2 = 588.0/590.0;
	vec2 uv = tc;
    uv.y = 1.0 - uv.y;
	
	//
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
	
	vec4 blend2 = INPUT3(uv1);
	vec4 blend3 = INPUT4(uv1);
	vec4 blend4 = INPUT5(uv1);
	vec4 blend5 = INPUT6(uv1);
	vec4 blend6 = INPUT7(uv1);
	vec4 blend7 = INPUT8(uv1);
	vec4 blend8 = INPUT9(uv1);
	
	//
	int frameID = int(iPro*14.0);
	vec4 base = camera(frameID,blend2,blend3,blend4,blend5,blend6,blend7,blend8);
	vec4 retCol;
	//vec4 test = mix(y1,y2,1.0);
	if(iPro<=0.5)
		retCol = mix(y1,base,base.a);
	else
		retCol = mix(y2,base,base.a);
	retCol.rgb *= retCol.a;
	return retCol;
}*/