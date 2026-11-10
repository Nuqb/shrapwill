/*{
	"GUID":"6895A7C7-928E-48e2-8CA2-DC0485646A5B"
}*/


vec4 FUNCNAME(vec2 tc)
{
	vec4 outputFragCol;
	float intensity = float(PREFIX(alpha))/100.0;
	vec2 uv = tc;
	
	// Get the images
	vec4 col = INPUT( vec2(uv.x, uv.y) );
	vec4 textureColor = col; 
	
	col.rgb *= vec3(97.0 / 255.0, 73.0 / 255.0, 233.0 / 255.0);
	
	outputFragCol = mix(textureColor, vec4(col.rgb, textureColor.a), intensity);
	outputFragCol.a = textureColor.a;
	
    return outputFragCol;
}

