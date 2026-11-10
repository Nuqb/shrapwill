/*{
	"GUID":"5C53F56E-2D45-44F7-8629-F4DF653227CC",
	"INPUTS":[
		{
			"TYPE":"image",
			"FILE":"tex11.png"
		}
	]
}*/


vec4 FUNCNAME(vec2 tc)
{
	float iGlobalTime = PREFIX(global_time);
	float intensity = float(PREFIX(alpha))/100.0;

	vec4 outputFragCol;
	vec2 uv = tc;
	//float size = iResolution.y / 10.0;
	vec2 block = floor(gl_FragCoord.xy / vec2(64));
    vec2 uv_noise = vec2(0.0);
	uv_noise = block / vec2(128);
	uv_noise += floor(vec2(iGlobalTime) * vec2(1234.0, 3543.0)) / vec2(128);
	
	float line_thresh = pow(fract(iGlobalTime * 2236.0453), 3.0) * 0.3;
	
	vec2 uv_r = uv, uv_g = uv, uv_b = uv;

	if (INPUT2(vec2(mod(uv_noise.y,1.0), 0.0)).g < line_thresh) {

		vec2 dist = (fract(uv_noise) - 0.5) * 0.3;
		uv_r += dist * 0.2;
		uv_g += dist * 0.2;
		uv_b += dist * 0.2;
	}
	vec4 textureColor = INPUT1(tc);

	vec4 color = INPUT1(uv);
	color.r = INPUT1(uv_r).r;
	color.g = INPUT1(uv_g).g;
	color.b = INPUT1(uv_b).b;
	
	outputFragCol = mix(textureColor, vec4(color.rgb, textureColor.a), intensity);
	outputFragCol.a = textureColor.a;
	
    return outputFragCol;
	
}

