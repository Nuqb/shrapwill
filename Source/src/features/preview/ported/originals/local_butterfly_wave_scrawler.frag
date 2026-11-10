#ifdef GL_ES
precision highp float;
#endif

float compute(vec2 p, float progress, vec2 center) {
	float PI = 3.14159265358979323846264;
	float amplitude = 1.0;
	float waves = 30.0;
	vec2 o = p*sin(progress * amplitude)-center;
	// horizontal vector
	vec2 h = vec2(1., 0.);
	// butterfly polar function (don't ask me why this one :))
	float theta = acos(dot(o, h)) * waves;
	float temp = sin((2.*theta - PI) / 24.);
	temp = temp*temp*temp*temp*temp; 
	return (exp(cos(theta)) - 2.*cos(4.*theta) + temp ) / 10.;
}

vec4 FUNCNAME(vec2 tc) {
	float progress = PREFIX(global_time)/PREFIX(total_time);
	float colorSeparation = 0.3;
	vec4 fragOutColor;
	vec2 p = tc;
	float inv = 1. - progress;
	vec2 dir = p - vec2(.5);
	float dist = length(dir);
	float disp = compute(p, progress, vec2(0.5, 0.5)) ;
	vec4 texTo = INPUT2(p + inv*disp);
	vec4 texFrom = vec4(
	INPUT1(p + progress*disp*(1.0 - colorSeparation)).r,
	INPUT1(p + progress*disp).g,
                    INPUT1(p + progress*disp*(1.0 + colorSeparation)).b,
                    INPUT1(p + progress*disp*(1.0 - colorSeparation)).a);
	return texTo*progress + texFrom*inv;
}
