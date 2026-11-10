/*{
	"GUID":"6895A7C7-928E-48e2-8CA8-DC0485646A5B"
}*/
vec4 FUNCNAME(vec2 tc)
{
	float iGlobalTime = PREFIX(global_time);

	vec4 outputFragCol;
	float intensity = float(PREFIX(alpha))/100.0;
	vec2 uv = tc;
	
	// Get the images
	vec4 col = INPUT( vec2(uv.x, uv.y) );
	vec4 textureColor = col;
	
	// blur amount
	float blur = 0.0;	
	blur = (1.0 + sin(iGlobalTime*6.0)) * 0.5;
	blur *= 1.0 + sin(iGlobalTime*16.0) * 0.5;
	blur = pow(blur, 3.0);
	blur *= 0.05;
	
	col.rgb += col.rgb * blur * 8.;
	
	outputFragCol = mix(textureColor, vec4(col.rgb, textureColor.a), intensity);
	outputFragCol.a = textureColor.a;
	 
	return outputFragCol;
}

