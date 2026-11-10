float Sample(vec2 uv, vec2 offset)
{
	float factor = iResolution.y / 433.0;
    vec4 color = INPUT(uv + (offset / iResolution.xy) * factor);
    return dot(color.rgb, vec3(0.114, 0.587, 0.299));
}

vec2 SobelFilter(vec2 uv)
{
    float tl = Sample(uv, vec2(-1.0, 1.0));
    float tc = Sample(uv, vec2(0.0, 1.0));
    float tr = Sample(uv, vec2(1.0, 1.0));
    
    float l = Sample(uv, vec2(-1.0, 0.0));
    float c = Sample(uv, vec2(0.0, 0.0));
    float r = Sample(uv, vec2(1.0, 0.0));
    
    float bl = Sample(uv, vec2(-1.0, -1.0));
    float bc = Sample(uv, vec2(0.0, -1.0));
    float br = Sample(uv, vec2(1.0, -1.0));
    
    float gx = tl - tr + 2.0 * l - 2.0 * r + bl - br;
    float gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
    
    return vec2(gx, gy);
}

vec4 FUNCNAME(vec2 tc)
{    
	vec4 orig = INPUT(tc);
	
	int color = PREFIX(color); 
	int red = (color >> 16) & 0xff;
	int green = (color >> 8) & 0xff;
	int blue = color & 0xff;

    vec2 sobelFilter = SobelFilter(tc);
    float gradient = sobelFilter.x * sobelFilter.x + sobelFilter.y * sobelFilter.y;
     
	vec3 inputColor = vec3(float(blue), float(green), float(red)) / 255.0;
	
	inputColor.rgb = step(0.0000001, inputColor.r + inputColor.g + inputColor.b) * (inputColor.rgb - vec3(-0.2)) + vec3(-0.2);
	
	vec4 retColor = vec4(0.0);
	retColor.rgb = orig.rgb + inputColor.rgb * gradient;
	retColor.rgb = clamp(retColor.rgb, 0.0, 1.0);
	retColor = mix(orig,retColor,float(PREFIX(alpha))/100.0);
	retColor.a = orig.a;
	
	return retColor;
}