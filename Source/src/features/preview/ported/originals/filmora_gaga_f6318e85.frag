/*{
	"GUID":"6895A7C7-928E-48e2-8CA3-DC0485646A5B"
}*/

vec4 FUNCNAME(vec2 tc)
{
	vec2 uv = tc;
    vec4 outputFragCol;
	vec4 textureColor = INPUT(uv);
	float intensity = float(PREFIX(alpha))/100.0;
	if(uv.x < 0.5)
    {
        uv.x *= 2.0;
    }
    else
    {
        uv.x = 1.0 - uv.x;
        uv.x *= 2.0;
    }
    if(uv.y < 0.5)
    {
        uv.y *= 2.0;
    }
    else
    {
        uv.y = 1.0 - uv.y;
        uv.y *= 2.0;
    }
	
	vec4 col = INPUT(uv);

	outputFragCol = mix(textureColor, col, intensity);
	return outputFragCol;
}

