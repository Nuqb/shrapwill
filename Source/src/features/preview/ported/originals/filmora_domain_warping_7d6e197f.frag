float random( vec2 c )
{
	return fract( sin( dot( c.xy, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
}

float noise ( vec2 uv) {
    vec2 i = floor(uv);
    vec2 f = fract(uv);    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + 
            (c - a)* u.y * (1.0 - u.x) + 
            (d - b) * u.x * u.y;
}
float Warping ( vec2 uv,int Strength) {
    int numOctaves = Strength;
    
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);  
    mat2 rot = mat2(cos(0.5), sin(0.5), 
                    -sin(0.5), cos(0.50));    
    for(int i =0;i<numOctaves;i++){
        v += a * noise(uv);
        uv = rot * uv * 2.0 + shift;
        a *= 0.5;
    }   
    return v;
}

vec4 FUNCNAME(vec2 tc) 
{
	vec4 c = INPUT(tc);
    int Strength = PREFIX(Strength);
   
    int alpha = PREFIX(alpha);
    vec2 uv = tc;
    vec2 fragCoord = tc.xy * iResolution.xy;
      
    float time = PREFIX(global_time);    
  
	vec2 p = ( 2.0 * fragCoord - iResolution.xy ) / iResolution.x * 1000.0;
    vec4 inputColor = c;   
    
     vec2 st = fragCoord.xy/iResolution.xy*3.;
   
    vec3 color = vec3(0.0);

    vec2 q = vec2(0.);
    q.x = Warping( st + 0.00*time,Strength);
    q.y = Warping( st + vec2(1.0),Strength);

    vec2 r = vec2(0.);
    r.x = Warping( st + 1.0*q + vec2(1.7,9.2)+ 0.15*time ,Strength);
    r.y = Warping( st + 1.0*q + vec2(8.3,2.8)+ 0.126*time,Strength);

    float f = Warping(st+r,Strength);

    color = mix(vec3(0.101961,0.619608,0.666667),
                vec3(0.666667,0.666667,0.498039),
                clamp((f*f)*4.0,0.0,1.0));

    color = mix(color,
                vec3(0,0,0.164706),
                clamp(length(q),0.0,1.0));

    color = mix(color,
                vec3(0.666667,1,1),
                clamp(length(r.x),0.0,1.0));

    vec4 fragColor = vec4((f*f*f+.6*f*f+.5*f)*color,1.0);
    fragColor.xyz = fragColor.zyx;
	
    fragColor.xyz = 1.0 - (1.0 - inputColor.xyz)*(1.0-fragColor.xyz);
    fragColor = mix( fragColor, inputColor, 1.0 - float(100.0)/100.0 );

    return mix( fragColor, c, 1.0 - float(alpha)/100.0 ); 
}