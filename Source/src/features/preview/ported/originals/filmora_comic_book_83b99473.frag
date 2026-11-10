#define edgeMax 0.888
#define edgeMin 0.288

float S;

vec4 rgb2cmyk(vec3 color)
{
	float maxVal = max(max(color.r, color.g), color.b);
	return min(vec4(color.rgb / maxVal, maxVal), 1.0);
}

vec3 cmyk2rgb(vec4 color)
{
	return color.rgb * color.a;
}

vec2 makeGrid(vec2 tc)
{
	return tc - mod(tc,S);
}

vec4 sm(vec4 co)
{
	return smoothstep(edgeMax - edgeMin, edgeMax + edgeMin, co);
}

vec4 tone2(vec2 fc, mat2 m)
{
	vec2 smp = (makeGrid(m*fc) + 0.5*S) * m;
	float s = min(length(fc-smp) / (1.48*0.5*S), 1.0);
    vec3 texc = INPUT((smp + 0.5 * iResolution.xy) / iResolution.xy).rgb;
    texc = pow(texc, vec3(2.2));
	vec4 color = rgb2cmyk(texc);
	return color + s;
}

mat2 rt(float r)
{
	float cr = cos(r);
	float sr = sin(r);
	return mat2(
		cr,-sr,
		sr,cr
	);
}

vec4 tone(vec2 fragCoord, float iGlobalTime, float speed, float size)
{
    vec4 fragColor = vec4(1.0);
    float theta = speed*0.333*iGlobalTime;
    S = size;
	
	vec2 center = fragCoord.xy - 0.5 * iResolution.xy;
	
	mat2 mc = rt(theta + radians(15.0));
	mat2 mm = rt(theta + radians(75.0));
	mat2 my = rt(theta);
	mat2 mk = rt(theta + radians(45.0));
	
	vec3 color = cmyk2rgb(sm(vec4(
		tone2(center, mc).r,
		tone2(center, mm).g,
		tone2(center, my).b,
		tone2(center, mk).a
	)));
    
    color = pow(color, vec3(1.0/2.2));
	fragColor = vec4(color, 1.0);
    return fragColor;
}

float normpdf(float x, float sigma) {
	return 0.39894 * exp(-0.5 * x * x/ (sigma * sigma)) / sigma;
}

float normpdf3(vec3 v, float sigma) {
	return 0.39894 * exp(-0.5 * dot(v,v) / (sigma * sigma)) / sigma;
}

vec4 bilateral(vec2 fragCoord) {
	vec4 fragColor = vec4(1.0);
    vec3 inputCol = INPUT(fragCoord.xy / iResolution.xy).rgb;
    const int size = 7;
    vec3 retColor = vec3(0.0);
    float sum = 0.0;
    float kernel[15];
	
	for (int j = 0; j <= size; ++j) {
		kernel[size+j] = kernel[size-j] = normpdf(float(j), 10.0);
	}
    float nf = 1.0 / normpdf(0.0, 0.1);
  
    for (int i=-size; i <= size; ++i) {
        for (int j=-size; j <= size; ++j) {
            vec3 temp = INPUT((fragCoord.xy+vec2(float(i),float(j))) / iResolution.xy).rgb;
            float factor = normpdf3(temp-inputCol, 0.1) * nf * kernel[size+j] * kernel[size+i];
            sum += factor;
            retColor += factor * temp;
        }
    }
    
    fragColor = vec4(retColor / sum, 1.0);
    
    return fragColor;
}

const mat3 YCoCrMat = mat3(
	1./4., 1./2., 1./4.,
    -1./4., 1./2., -1./4.,
    1./2., 0.0, -1./2.
);

vec3 YCoCr(vec2 uv) {
	return YCoCrMat * (INPUT(uv).xyz);
}

const mat3 dx = mat3( 
    1.0, 2.0, 1.0, 
    0.0, 0.0, 0.0, 
   -1.0, -2.0, -1.0 
);

const mat3 dy = mat3( 
    1.0, 0.0, -1.0, 
    2.0, 0.0, -2.0, 
    1.0, 0.0, -1.0 
);

float calcSobel(mat3 M) {
	float gx = dot(dx[0], M[0]) + dot(dx[1], M[1]) + dot(dx[2], M[2]); 
	float gy = dot(dy[0], M[0]) + dot(dy[1], M[1]) + dot(dy[2], M[2]);

	return sqrt(gx * gx + gy * gy);
}

vec3 sobel(vec2 uv, float scale_x, float scale_y) {
    mat3 Y;
    mat3 Co;
    mat3 Cr;
    
    vec3 temp; 
    for (int i=0; i<3; i++) {
        for (int j=0; j<3; j++) {
        	vec2 pos = uv + vec2(float(i-1) / iResolution.x * scale_x, float(j-1) / iResolution.y * scale_y);
            temp = YCoCr(pos);
            Y[i][j] = temp.x;
            Co[i][j] = temp.y;
            Cr[i][j] = temp.z;
	    }
	}
    
	return vec3(calcSobel(Y), calcSobel(Co), calcSobel(Cr));
}

vec4 FUNCNAME(vec2 tc) 
{
	vec4 orig = INPUT(tc);
	
	vec2 fragCoord = tc.xy * iResolution.xy;
	
	vec4 bilColor = bilateral(fragCoord);
	float iGlobalTime = PREFIX(global_time);
	float speed = float(PREFIX(speed))*0.1;
	float size = float(PREFIX(size));
	float scale_x = iResolution.x / 640.0;
	float scale_y = iResolution.y / 433.0;
	size *= scale_x;
    vec4 toneColor = tone(fragCoord, iGlobalTime, speed, size);
    
    vec3 edgeColor = sobel(tc, scale_x, scale_y);
    vec4 fragColor = vec4(vec3(clamp((edgeColor.x + edgeColor.y + edgeColor.z)/3., 0.0, 1.0)), 1.0);
    if (fragColor.z < 0.05) {
        fragColor = vec4(0.0);
    } 
	
    vec3 retColor = fragColor.xyz;
    fragColor.xyz = (toneColor.xyz + bilColor.xyz) / 2.0;
    fragColor.xyz -= retColor;
	fragColor.xyz = clamp(fragColor.xyz, 0.0, 1.0);
	fragColor.w = orig.w;
	
    return mix(orig,fragColor,float(PREFIX(alpha))/100.0);
}