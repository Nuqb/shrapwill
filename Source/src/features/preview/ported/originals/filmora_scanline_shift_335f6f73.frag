/*{
	"GUID":"5C53F56E-2D45-44F7-8329-F4DF653227CC"
}*/
#define LINES_AND_FLICKER
#define BLOTCHES
#define GRAIN

#define FREQUENCY 15.0
#define LINE_HEIGHT 0.0028

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

float rand(float c){
	return rand(vec2(c,1.0));
}

float overlay(float c1, float c2){
	return (c1 < 0.5) ? (2. * c1 * c2) : (1.0 - 2. * (1.0 - c1) * (1.0 - c2));
}


vec4 FUNCNAME(vec2 tc)
{
	float rgbOffsetOpt = 0.5;
	float iGlobalTime = PREFIX(global_time);
	float intensity = float(PREFIX(alpha))/100.0;
	vec4 outputFragCol;
	vec2 uv = tc;
	// Set frequency of global effect to 20 variations per second
	float t = iGlobalTime * FREQUENCY;
	
	// Get the images
	float red 	=   INPUT( vec2(uv.x+0.01*rgbOffsetOpt,uv.y)).r;
	float green = 	INPUT( vec2(uv.x,uv.y)).g;
	float blue 	=	INPUT( vec2(uv.x-0.01*rgbOffsetOpt,uv.y)).b;
	vec3 col = vec3( red, green, blue);

	vec2 pos = mod(uv,vec2(LINE_HEIGHT*2.0));
	if (pos.y > LINE_HEIGHT)
		col -= 0.1;

	#ifdef GRAIN
	col = col * (1.0+(rand(uv+t*.01)-.2)*.05);		
	#endif		
	
	vec4 textureColor = INPUT(tc);
	outputFragCol = mix(textureColor,vec4(col.xyz, textureColor.a), intensity);
	outputFragCol.a = textureColor.a;
	 
	return outputFragCol; 
}

