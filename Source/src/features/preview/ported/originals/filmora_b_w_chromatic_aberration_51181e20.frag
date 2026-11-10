vec4 FUNCNAME(vec2 tc) 
{
    vec2 screenSize = iResolution;
	float slider_value = PREFIX(noise)*0.1;//1.0;
	float time = PREFIX(global_time);
	float vertIntensity = PREFIX(vertIntensity)*0.01;
    float horzIntensity = PREFIX(horzIntensity)*0.01;
    float filterIntensity = PREFIX(filter)*0.01;
    vec4 orig = INPUT(tc);
//=========================
	vec4 color = INPUT(tc);
    vec2 intensity = vec2(horzIntensity, vertIntensity);
	color.r = INPUT(tc).r;
    color.b = INPUT(tc-intensity).g;
    color.g = INPUT(tc + intensity).b;
	
	float ColorR = INPUT(tc).r;
    float ColorG = INPUT(tc-intensity).g;
    float ColorB = INPUT(tc+intensity).b;
	
    vec4 ret = vec4(ColorR, ColorG, ColorB,orig.a);
//=========================
	float strengthPower = 1.0*slider_value;
    float strength = 16.0 * strengthPower;
    float x = (tc.x + 4.0) * (tc.y + 4.0) * ((mod(time,100.0)+3.0)* 10.0);
    vec4 grain =vec4(mod((mod(x, 13.0) + 1.0) * (mod(x, 123.0) + 1.0), 0.01) - 0.005) *strength;
//==========================
    float gray = dot(vec3(0.299, 0.587, 0.114), ret.rgb);
    vec4 resultColor = vec4(vec3(gray),  ret.a);
    resultColor = mix(ret, resultColor, filterIntensity);
	resultColor = resultColor+grain;
//==========================
	resultColor.rgb *= orig.a;
    return resultColor;
} 