
#ifdef GL_ES
precision mediump float;
#endif
 #define barScale 0.03
 #define PI 3.141592653589

 vec2 scale(vec2 uv, vec2 center, vec2 amp)
{

	return (uv + center)*(amp);

}

 float bar(vec2 uv, float offset, float width)
{
	return  step(offset, uv.x) - step(offset + width, uv.x) ;
}
 float bars(vec2 uv, float process)
{
	
	//double blindFactor[] = {0.9, 0.8, 0.7, 0.6, 0.6, 0.7, 0.8, 0.9};
	 //return 0.6f*bar(uv, process + 0.3f*barScale, 0.6f*barScale ) + 0.7f* bar(uv, process + 1.2f*barScale,  0.7f*barScale )\
	 //+ 0.8f* bar(uv,process + 2.05f*barScale, 0.8f*barScale ) + 0.9f *bar(uv,process + 2.925f*barScale, 0.9f*barScale );
	float right =  0.6*bar(uv, process + 0.3*barScale, 0.6*barScale ) + 0.7* bar(uv, process + 1.3*barScale,  0.7*barScale )+ 0.8* bar(uv,process + 2.25*barScale, 0.8*barScale ) + 0.9*bar(uv,process + 3.22*barScale, 0.9*barScale ) + bar(uv,process + 4.12*barScale, 1000.0*barScale );
	float left = 0.6*bar(uv, process - 0.9*barScale, 0.6*barScale )+ 0.7* bar(uv, process - 2.0*barScale,  0.7*barScale )+ 0.8* bar(uv,process - 3.05*barScale, 0.8*barScale ) + 0.9*bar(uv,process - 4.12*barScale, 0.9*barScale ) + bar(uv,process -1000.0*barScale, 995.88*barScale );
	return left + right;
}

 float GetParabolaMap(float t, float T)	
{
	return (3.0 * T * t * t - 2.0 * t * t * t) / (T * T);
}

 float GetSinusoidalMap(float t, float T)	
{
	return t - T * sin(2.0 * PI * t / T) / (2.0 * PI);
}

vec4 FUNCNAME(vec2 tc)
{
	float progress = PREFIX(global_time)/PREFIX(total_time);
	vec2 uv=vec2(tc.x,1.0-tc.y);
	vec2 resolution = iResolution.xy; 
	
	int W = int(resolution.x);
	int H = int(resolution.y);
	
	float iPro = GetSinusoidalMap(progress, 1.0); 	
	iPro = GetParabolaMap(iPro, 1.0) ;
	
	iPro = iPro *1.2472- 0.1236;
	vec4 outputCol;
	vec4 y1;
	
	if(uv.x > iPro)
	{
		y1  = INPUT1(tc) ; 
	}else
	{
		y1  = INPUT2(tc);
	}

	outputCol=bars(uv, iPro)*y1;
	
	return outputCol;
	//write_imagef(dstImg, (int2)(w, textH - h -1), (vec4)(bars(uv, iPro))*y1);
}
