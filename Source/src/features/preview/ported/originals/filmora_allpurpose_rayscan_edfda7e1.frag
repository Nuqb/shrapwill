float overlayFunc(float s, float d) {
  return (d < 0.5) ? 2.0 * s * d : 1.0 - 2.0 * (1.0 - s) * (1.0 - d);
}

vec3 overlay1(vec3 s, vec3 d) {
  vec3 c;
  c.x = overlayFunc(s.x, d.x);
  c.y = overlayFunc(s.y, d.y);
  c.z = overlayFunc(s.z, d.z);
  return c;
}

vec3 overlay2(vec3 s, vec3 d) {
  vec3 c;
  c.x = s.x + d.x;
  c.y = s.y + d.y;
  c.z = s.z + d.z;
  return c;
}

float A(float aA1, float aA2) {
  return 1.0 - 3.0 * aA2 + 3.0 * aA1;
}

float B(float aA1, float aA2) {
  return 3.0 * aA2 - 6.0 * aA1;
}

float C(float aA1) {
  return 3.0 * aA1;
}

float GetSlope(float aT, float aA1, float aA2) {
  return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1);
}

float CalcBezier(float aT, float aA1, float aA2) {
  return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT;
}

float GetTForX(float aX, float mX1, float mX2) {
  float aGuessT = aX;
  for (int i = 0; i < 6; ++i) {
    float currentSlope = GetSlope(aGuessT, mX1, mX2);
    if (currentSlope == 0.0)
      return aGuessT;
    float currentX = CalcBezier(aGuessT, mX1, mX2) - aX;
    aGuessT -= currentX / currentSlope;
  }
  return aGuessT;
}

float KeySpline(vec4 p, float aX) {
  vec2 p1 = vec2(p.x, p.y);
  vec2 p2 = vec2(p.z, p.w);
  float mX1 = p1.x;
  float mY1 = p1.y;
  float mX2 = p2.x;
  float mY2 = p2.y;
  if (mX1 == mY1 && mX2 == mY2)
    return aX;

  return CalcBezier(GetTForX(aX, mX1, mX2), mY1, mY2);
}

mat2 rotate2D(float _angle)
{
	return mat2(cos(_angle),-sin(_angle),sin(_angle),cos(_angle));
}


float rand(vec2 p)
{
    float t = floor(PREFIX(global_time) * 20.) / 10.;
    return fract(sin(dot(p, vec2(t * 12.9898, t * 78.233))) * 43758.5453);
}

float noise(vec2 uv, float blockiness)
{   
    vec2 lv = fract(uv);
    vec2 id = floor(uv);
    
    float n1 = rand(id);
    float n2 = rand(id+vec2(1,0));
    float n3 = rand(id+vec2(0,1));
    float n4 = rand(id+vec2(1,1));
    
    vec2 u = smoothstep(0.0, 1.0 + blockiness, lv);

    return mix(mix(n1, n2, u.x), mix(n3, n4, u.x), u.y);
}

float fbm(vec2 uv, int count, float blockiness, float complexity)
{
    float val = 0.0;
    float amp = 0.5;
    
    while(count != 0)
    {
    	val += amp * noise(uv, blockiness);
        amp *= 0.5;
        uv *= complexity;    
        count--;
    }
    
    return val;
}

vec4 color_glitch2(vec2 uv, float offset, float color_alpha, float shift)
{
    vec2 uv_blue = vec2(1.0-(uv.x + offset) * (1.0 - shift), uv.y);
    vec2 uv_red = vec2(1.0-(uv.x - offset)* (1.0 - shift), uv.y);
    vec4 blue = INPUT2(uv_blue);
	blue.rgb = blue.rgb * blue.a * 1.5 * color_alpha;
    vec4 red = INPUT2(uv_red);
	red.rgb = red.rgb * red.a * 1.5 * color_alpha;
    vec4 color = INPUT2(vec2(uv.x * (1. - shift), uv.y));
	color.rgb = color.rgb * color.a * 1.5 * color_alpha;
    color.b = blue.b;
    color.r = red.r;
	return color;
}

vec4 color_glitch3(vec2 uv, float offset, float color_alpha, float shift)
{
    vec2 uv_blue = vec2(1.0-(uv.x + offset), uv.y) ;
    vec2 uv_red = vec2(1.0-(uv.x - offset), uv.y) ;
    vec4 blue = INPUT3(uv_blue);
	blue.rgb = blue.rgb * blue.a * 1.5 * color_alpha;
    vec4 red = INPUT3(uv_red);
	red.rgb = red.rgb * red.a * 1.5 * color_alpha;
    vec4 color = INPUT3(uv);
	color.rgb = color.rgb * color.a * 1.5 * color_alpha;
    color.b = blue.b;
    color.r = red.r;
	return color;
}


vec4 color_glitch4(vec2 uv, float offset, float color_alpha, float shift)
{
    vec2 uv_blue = vec2(1.0-(uv.x + offset), uv.y) ;
    vec2 uv_red = vec2(1.0-(uv.x - offset), uv.y) ;
    vec4 blue = INPUT4(uv_blue);
	blue.rgb = blue.rgb * blue.a * 1.5 * color_alpha;
    vec4 red = INPUT4(uv_red);
	red.rgb = red.rgb * red.a * 1.5 * color_alpha;
    vec4 color = INPUT4(uv);
	color.rgb = color.rgb * color.a * 1.5 * color_alpha;
    color.b = blue.b;
    color.r = red.r;
	return color;
}

vec4 color_glitch5(vec2 uv, float offset, float color_alpha, float shift)
{
    vec2 uv_blue = vec2(1.0-(uv.x + offset), uv.y) ;
    vec2 uv_red = vec2(1.0-(uv.x - offset), uv.y) ;
    vec4 blue = INPUT5(uv_blue);
	blue.rgb = blue.rgb * blue.a * 1.5 * color_alpha;
    vec4 red = INPUT5(uv_red);
	red.rgb = red.rgb * red.a * 1.5 * color_alpha;
    vec4 color = INPUT5(uv);
	color.rgb = color.rgb * color.a * 1.5 * color_alpha;
    color.b = blue.b;
    color.r = red.r;
	return color;
}

vec4 color_glitch6(vec2 uv, float offset, float color_alpha, float shift)
{
    vec2 uv_blue = vec2(1.0-(uv.x + offset), uv.y) ;
    vec2 uv_red = vec2(1.0-(uv.x - offset), uv.y) ;
    vec4 blue = INPUT6(uv_blue);
	blue.rgb = blue.rgb * blue.a * 1.5 * color_alpha;
    vec4 red = INPUT6(uv_red);
	red.rgb = red.rgb * red.a * 1.5 * color_alpha;
    vec4 color = INPUT6(uv);
	color.rgb = color.rgb * color.a * 1.5 * color_alpha;
    color.b = blue.b;
    color.r = red.r;
	return color;
}



// 写一个随机函数
float random(float x)
{
    float y = fract(sin(x)*100000.0);
    return y;
}

float color_random(float time, float color_alpha)
{
	return random(time) * color_alpha;
}


vec4 textureoffset(vec2 tc, vec2 uv, float distort, float theta, float offset, float color_alpha, int image, float glitch) 
{
	float glitchAmplitude = 0.2; // increase this
	float glitchNarrowness = 4.0;
	float glitchBlockiness = 2.0;
	float glitchMinimizer = 8.0; // decrease this
	float shift = glitchAmplitude * pow(fbm(uv, 4, glitchBlockiness, glitchNarrowness), glitchMinimizer);

	vec4 bgcolor = INPUT1(tc);
	vec2 uvOffset = bgcolor.rg * distort * (1.0 + abs(random(sin(PREFIX(global_time)))) * PREFIX(Glitch) * 2.0 / 100.0);
	vec2 uvDist = vec2(uv.x, uv.y) + uvOffset;

	vec4 mixcolor = vec4(0.0);
	if(image == 1)
	{
		mixcolor = color_glitch2(uvDist, offset, color_alpha, 10.0 * shift);
	}else if(image == 2)
	{
		mixcolor = color_glitch3(uvDist, offset, color_alpha, 10.0 * shift);
	}else if(image == 3)
	{
		mixcolor = color_glitch4(uvDist, offset, color_alpha, 10.0 * shift);
	}else if(image == 4)
	{
		mixcolor = color_glitch5(uvDist, offset, color_alpha, 10.0 * shift);
	}else if(image == 5)
	{
		mixcolor = color_glitch6(uvDist, offset, color_alpha, 10.0 * shift);
	}

	mixcolor.rgb = mixcolor.rgb * mixcolor.a * 1.5 * color_alpha;
	return mixcolor;
}

float color_flash(float color_alpha)
{
	return sin(100.0 * color_alpha);
}

float color_glow(float color_alpha)
{
	return sin(50.0 * color_alpha) * 2.5;
}

vec4 FUNCNAME(vec2 tc) {
	float speed = (PREFIX(Speed) + 50.0) * 2.0 / 100.0;
	float global_time = PREFIX(global_time);
	float total_time = PREFIX(total_time);
	float progress = min((global_time / total_time) * speed, 1.0);
	
	vec2 uv = tc;
	uv.y = 1.0 - uv.y;

	float position_x =  -1.0 * PREFIX(Position) * 0.4;
	// float scale = (PREFIX(Scale) + 10.0) / 10.0;
	float scale = (PREFIX(Scale)) * 2.0 / 100.0;
	float color_offset = 50.0 + 0.025 * PREFIX(RGB);
	// color_offset = (color_offset - 48.0) / 4.0;
	color_offset *= 20.0 / 1000.0;

	float color_alpha = PREFIX(Light) * 2.0 / 100.0;
	int glow = PREFIX(Glow);
	int darkness = PREFIX(Darkness) + 10;
	float opacity = PREFIX(Opacity) * 2.0 / 100.0;
	float distort = PREFIX(Distort) / 1000.0;
	float angle = PREFIX(Angle);
	float PI = 3.1415926;
	float glitch = PREFIX(Glitch) * 2.0 / 100.0;
	int flash = PREFIX(Flash);
	int color = PREFIX(Color);
	float color_r = float((color >> 16) & 0xff) / 255.0;
	float color_g = float((color >> 8) & 0xff) / 255.0;
	float color_b = float(color & 0xff) / 255.0;
	int random = PREFIX(Random);
	int image = PREFIX(Shape);
	int mode = PREFIX(Speed_mode);
	int pure = PREFIX(Pure);

	vec4 userColor = vec4(color_b, color_g, color_r, 1.0);
	vec4 origCol = INPUT1(tc);

	if (scale < 0.001){
	return origCol;
	}
	vec2 prop = vec2(1.0, iResolution.y / iResolution.x);
	if (iResolution.y > iResolution.x) {
	prop = vec2(iResolution.x / iResolution.y, 1.0);
	}
	vec2 pos = vec2(position_x, position_x) / 100.0;
	if (pos.x > 0.0) {
	pos.x *= 2.0;
	}
	if (pos.y > 0.0) {
	pos.y *= 2.0;
	}

	vec4 point = vec4(0.0);
	if(mode == 1)
	{
		point = vec4(1., 1., 0., 0.);
	}else if(mode == 2)
	{
		point = vec4(.09,.61,.87,.32);
	}else if(mode == 3)
	{
		point = vec4(.32,.03,.5,.95);
	}else if(mode == 4)
	{
		point = vec4(.09,.37,.6,.99);
	}else if(mode == 5)
	{
		point = vec4(.48,.03,.7,.65);
	}else if(mode == 6)
	{
		point = vec4(0.0, 1.0, 1.0, 0.0);
	}
	
	
	float tprogress = clamp(KeySpline(point, progress), 0.0, 1.0);
	float theta = angle * PI / 180.0;

	vec2 center = vec2(0.5);
	uv -= center;
	uv = (uv + pos) * prop / scale;
	uv = rotate2D(theta) * uv;
	vec2 offset = vec2(0.5) - tprogress;
	uv = uv + offset;
	uv += center;
	
	float matt = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);

	if(flash == 1)
	{
		color_alpha = color_flash(global_time * color_alpha);
	}

	if(glow == 1)
	{
		color_alpha = 1.5 * sin(global_time) * color_glow(color_alpha);
	}

	if(random == 1)
	{
		color_alpha = color_random(global_time, color_alpha);
	}

	vec4 overlayCol = textureoffset(tc, uv, distort, theta, color_offset, color_alpha, image, glitch) * matt;
	if(pure == 0)
	{
		overlayCol.rgb = overlayCol.rgb + overlayCol.rgb * userColor.rgb;
	}else
	{
		overlayCol.rgb = userColor.rgb;
	}
	
	vec4 retCol = origCol;
	float alpha = clamp(float(darkness) / (100.0), 0.0, 1.0);
	retCol.rgb = overlay2(overlayCol.rgb, origCol.rgb);
	retCol.rgb = mix(origCol.rgb * alpha, retCol.rgb, overlayCol.a);
	retCol.rgb = mix(origCol.rgb, retCol.rgb, origCol.a);
	retCol.rgb *= retCol.a * opacity;
	return retCol;
}