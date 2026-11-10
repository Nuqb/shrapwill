/*{
	"GUID":"5C53F56E-2D45-44F7-8429-F4DF653227CC"
}*/

#define LINES_AND_FLICKER
#define BLOTCHES
#define GRAIN

#define FREQUENCY 15.0
#define LINE_HEIGHT 1.0

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

float rand(float c){
	return rand(vec2(c,1.0));
}

vec4 FUNCNAME(vec2 tc)
{
	vec2 uv = tc;
	float iGlobalTime = mod(PREFIX(global_time), 100.0);
	// Set frequency of global effect to 20 variations per second
	float t = float(int(iGlobalTime * FREQUENCY));
	float intensity = float(PREFIX(alpha))/100.0;
	vec4 outputFragCol;
	// Get the images
	vec4 textureColor = INPUT(uv);
	vec3 col = textureColor.rgb;
	
	vec3 noise;
	col.r = col.r * (1.0+(rand(uv+t*.01)-.2)*.15);
	col.g = col.g * (1.0+(rand(uv+t*.02)-.2)*.25);
	col.b = col.b * (1.0+(rand(uv+t*.03)-.2)*.35);
	
	outputFragCol = mix(textureColor, vec4(col.rgb, textureColor.a), intensity);
	outputFragCol.a = textureColor.a;
	
    return outputFragCol;
	
}

