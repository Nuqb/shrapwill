#ifdef GL_ES
precision mediump float;
#endif
 
bool inBounds (vec2 p) {
	vec2 boundMin = vec2(0.0, 0.0);
	vec2 boundMax = vec2(1.0, 1.0);
	return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));
}
 
vec2 project (vec2 p) {
	return p * vec2(1.0, -1.2) + vec2(0.0, -0.02);
}
 
vec4 bgColor (vec2 p, vec2 pfr, vec2 pto) {
	vec4 black = vec4(0.0, 0.0, 0.0, 1.0);
	float reflection = 0.4;
	vec4 c = black;
	pfr = project(pfr);
	if (inBounds(pfr)) {
		c += mix(black, INPUT1(pfr), reflection * mix(1.0, 0.0, pfr.y));
		if(pfr.y <= 0.01)
		{
			float a = smoothstep(0., 0.01, pfr.y);
			c = mix(vec4(vec3(0.0), 1.0), c, a);
		}
	}
	pto = project(pto);
	if (inBounds(pto)) {
		c += mix(black, INPUT2(pto), reflection * mix(1.0, 0.0, pto.y));
		if(pto.y <= 0.01)
		{
			float a = smoothstep(0., 0.01, pto.y);
			c = mix(vec4(vec3(0.0), 1.0), c, a);
		}
	}
	return c;
}
 
vec4 FUNCNAME(vec2 tc) {
	float progress = PREFIX(global_time)/PREFIX(total_time);
	float perspective = 0.2;
	float depth = 3.0;	vec4 fragOutColor;
	vec2 p = tc;

	vec2 pfr, pto = vec2(-1.);

	float size = mix(1.0, depth, progress);
	float persp = perspective * progress;
	pfr = (p + vec2(-0.0, -0.5)) * vec2(size/(1.0-perspective*progress), size/(1.0-size*persp*p.x)) + vec2(0.0, 0.5);

	size = mix(1.0, depth, 1.-progress);
	persp = perspective * (1.-progress);
	pto = (p + vec2(-1.0, -0.5)) * vec2(size/(1.0-perspective*(1.0-progress)), size/(1.0-size*persp*(0.5-p.x))) + vec2(1.0, 0.5);

	bool fromOver = progress < 0.5;
 
	float a = 1.0;
	if (fromOver) {
		if (inBounds(pfr)) {
		  if (pfr.y >= 0.99)
		  {
			a = 1.0 - smoothstep(0.99, 1.0, pfr.y);
		  }
		  else if(pfr.y <= 0.01)
		  {
			a = smoothstep(0., 0.01, pfr.y);
		  }
		  fragOutColor = mix(vec4(vec3(0.0), 1.0), INPUT1(pfr), a);
		}
		else if (inBounds(pto)) {
		  if (pto.y >= 0.99)
		  {
			a = 1.0 - smoothstep(0.99, 1.0, pto.y);
		  }
		  else if(pto.y <= 0.01)
		  {
			a = smoothstep(0., 0.01, pto.y);
		  }
		  fragOutColor = mix(vec4(vec3(0.0), 1.0), INPUT2(pto), a);
		}
		else {
		  fragOutColor = bgColor(p, pfr, pto);
		}
	}
	else {
		if (inBounds(pto)) {
		  if (pto.y >= 0.99)
		  {
			a = 1.0 - smoothstep(0.99, 1.0, pto.y);
		  }
		  else if(pto.y <= 0.01)
		  {
			a = smoothstep(0., 0.01, pto.y);
		  }
		  fragOutColor = mix(vec4(vec3(0.0), 1.0), INPUT2(pto), a);
		}
		else if (inBounds(pfr)) {
		  if (pfr.y >= 0.99)
		  {
			a = 1.0 - smoothstep(0.99, 1.0, pfr.y);
		  }
		  else if(pfr.y <= 0.01)
		  {
			a = smoothstep(0., 0.01, pfr.y);
		  }
		  fragOutColor = mix(vec4(vec3(0.0), 1.0), INPUT1(pfr), a);
		}
		else {
		  fragOutColor = bgColor(p, pfr, pto);
		}
	}
	return fragOutColor;
}
