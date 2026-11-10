#ifdef GL_ES
precision highp float;
#endif

#define PI 3.141592653589

vec4 FUNCNAME(vec2 tc)
{
	float progress = PREFIX(global_time)/PREFIX(total_time);
	vec4 fragOutColor;
	vec2 p = tc;

	vec2 q;
	float angle = - PI * 0.5;
	q.x =   cos(angle)*p.x + sin(angle)*p.y;
	q.y = - sin(angle)*p.x + cos(angle)*p.y;
	q = q - vec2(-1.0, 0.0);

	vec2 rp = (q*2. - 1.);
	float a = atan(rp.y, rp.x);
	float pa = ((1.0 - progress)*PI*2.5-PI*1.25);

	vec4 fromc = INPUT1(p);
	vec4 toc = INPUT2(p);

	if(a>pa) {
		fragOutColor = mix(fromc, toc, smoothstep(0., 1., (a-pa)));
	} else {
		fragOutColor = fromc;
	}
	return fragOutColor;
}
