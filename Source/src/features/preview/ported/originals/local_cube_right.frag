vec2 project (vec2 p) {
  float floating = 3.0;
  return p * vec2(1.0, -1.2) + vec2(0.0, -floating/100.);
}

bool inBounds (vec2 p) {
  return all(lessThan(vec2(0.0), p)) && all(lessThan(p, vec2(1.0)));
}

vec4 bgColor (vec2 p, vec2 pfr, vec2 pto) {
  vec4 c = vec4(0.0, 0.0, 0.0, 1.0);
  float reflection = 0.4;
  pfr = project(pfr);
  if (inBounds(pfr)) {
    c += mix(vec4(0.0), INPUT1(pfr), reflection * mix(1.0, 0.0, pfr.y));
    if(pfr.y <= 0.01)
    {
      float a = smoothstep(0., 0.01, pfr.y);
	  c = mix(vec4(vec3(0.0), 1.0), c, a);
    }
  }
  pto = project(pto);
  if (inBounds(pto)) {
    c += mix(vec4(0.0), INPUT2(pto), reflection * mix(1.0, 0.0, pto.y));
	if(pto.y <= 0.01)
    {
      float a = smoothstep(0., 0.01, pto.y);
	  c = mix(vec4(vec3(0.0), 1.0), c, a);
    }
  }
  return c;
}

// p : the position
// persp : the perspective in [ 0, 1 ]
// center : the xcenter in [0, 1] \ 0.5 excluded
vec2 xskew (vec2 p, float persp, float center) {
  float x = mix(p.x, 1.0-p.x, center);
  return (
    (
      vec2( x, (p.y - 0.5*(1.0-persp) * x) / (1.0+(persp-1.0)*x) )
      - vec2(0.5-abs(center - 0.5), 0.0)
    )
    * vec2(0.5 / abs(center - 0.5) * (center<0.5 ? 1.0 : -1.0), 1.0)
    + vec2(center<0.5 ? 0.0 : 1.0, 0.0)
  );
}

vec4 FUNCNAME(vec2 tc) {
  float progress = PREFIX(global_time)/PREFIX(total_time);
  vec2 resolution = iResolution;
  float persp = 0.7;
  float unzoom = 0.3;
	
  vec4 fragOutColor; 
  vec2 op = tc;
  float uz = unzoom * 2.0*(0.5-abs(0.5 - progress));
  vec2 p = -uz*0.5+(1.0+uz) * op;
  vec2 fromP = xskew(
    (p - vec2(progress, 0.0)) / vec2(1.0-progress, 1.0),
    1.0-mix(progress, 0.0, persp),
    0.0
  );
  vec2 toP = xskew(
    p / vec2(progress, 1.0),
    mix(pow(progress, 2.0), 1.0, persp),
    1.0
  );
  
  float a = 1.0;
  if (inBounds(fromP)) {
    if (fromP.y >= 0.99)
    {
      a = 1.0 - smoothstep(0.99, 1.0, fromP.y);
    }
    else if(fromP.y <= 0.01)
    {
      a = smoothstep(0., 0.01, fromP.y);
    }
    fragOutColor = mix(vec4(vec3(0.0), 1.0), INPUT1(fromP), a);
  }
  else if (inBounds(toP)) {
    if (toP.y >= 0.99)
    {
      a = 1.0 - smoothstep(0.99, 1.0, toP.y);
    }
    else if(toP.y <= 0.01)
    {
      a = smoothstep(0., 0.01, toP.y);
    }
      fragOutColor = mix(vec4(vec3(0.0), 1.0), INPUT2(toP),  a);
  }
  else {
    fragOutColor = bgColor(op, fromP, toP);
  }
 
  return fragOutColor;
}
