/*{
	"GUID":"8C8B963B-78C8-41ad-A12C-AD8A4F61E741",
	"PARAMS":[
		{
			"NAME":"alpha",
			"TYPE":"float",
			"DEFAULT":1.0,
			"MIN":0.0,
			"MAX":1.0
		}
	]
}*/



float single_channel_level_filter(float input_black, float input_gamma, 
                                  float input_white, float output_black, 
                                  float output_white,in float channel)
{
    float INPUT_BLACK = input_black;
    float INPUT_GAMMA = input_gamma;
    float INPUT_WHITE = input_white;
    float OUTPUT_BLACK = output_black;
    float OUTPUT_WHITE = output_white;
    
   return clamp(
				((((channel * 255.0) - INPUT_BLACK) / (INPUT_WHITE - INPUT_BLACK))
		  * (OUTPUT_WHITE - OUTPUT_BLACK) + OUTPUT_BLACK) / 255.0, 0.0, 1.0
		  );
}

vec4 FUNCNAME(vec2 tc) 
{
	float intensity = float(PREFIX(alpha))/100.0;
	vec2 uv = tc;
	vec4 color = INPUT(uv.xy);
	
	color.g = single_channel_level_filter(0.0,1.0, 255.0, 0.0, 246.0, color.g);
    color.r = single_channel_level_filter(0.0,1.0, 255.0, 54.0, 196.0, color.r);
	
	color.g = single_channel_level_filter(32.0,1.0, 255.0, 0.0, 255.0, color.g);
	color.r = single_channel_level_filter(32.0,1.0, 255.0, 0.0, 255.0, color.r);
	color.b = single_channel_level_filter(32.0,1.0, 255.0, 0.0, 255.0, color.b);
	return mix(color, INPUT(uv.xy), 1.0-intensity);
}
