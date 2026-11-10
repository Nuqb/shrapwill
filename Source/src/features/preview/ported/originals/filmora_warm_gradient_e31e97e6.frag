/*{
	"GUID":"98FC8446-14D8-4f0d-9FF3-0B44AC7CE992",
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

vec3 OverlayColor(vec2 uv)
{
	const vec3 to = vec3(105./255., 135./255.,255./255.);
	const vec3 from = vec3(1.0);
	return from + (to - from) * uv.y;
}

vec4 FUNCNAME(vec2 tc) 
{
	float intensity = float(PREFIX(alpha))/100.0;
	vec2 uv = tc;
	vec4 color = INPUT(uv.xy);
	return mix(vec4(OverlayColor(uv) * color.rgb, color.a), color, 1.0-intensity);
}
