vec2 rotate(vec2 p, float a ) 
{
	vec2 t = cos(a) * p + sin(a) * vec2( p.y, -p.x);
    return t;
}

float circle( vec2 p, float r )
{
    return ( length( p / r ) - 1.0 ) * r;
}

float random( vec2 c )
{
	return fract( sin( dot( c.xy, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
}

vec3 Bokeh( vec3 color, vec2 p, vec3 c )   
{
    float wrap = 450.0;    
    if ( mod( floor( p.y / wrap + 0.5 ), 2.0 ) == 0.0 )
    {
        p.x += wrap * 0.5;
    }    
    
    vec2 p2 = mod( p + 0.5 * wrap, wrap ) - 0.5 * wrap;
    vec2 cell = floor( p / wrap + 0.5 );
    float cellR = random( cell );
        
    c *= fract( cellR * 3.33 + 3.33 );    
    float radius = mix( 30.0, 70.0, fract( cellR * 7.77 + 7.77 ) );
    p2.x *= mix( 0.9, 1.1, fract( cellR * 11.13 + 11.13 ) );
    p2.y *= mix( 0.9, 1.1, fract( cellR * 17.17 + 17.17 ) );
    
    float cir = circle( p2, radius );
    float circle = 1.0 - smoothstep( 0.0, 1.0, cir );
    float glow	 = exp( -cir * 0.025 ) * 0.3 * ( 1.0 - circle );
    vec3 tmpColor = color + c * ( circle + glow );
    return tmpColor;
}


vec4 FUNCNAME(vec2 tc) 
{
	vec4 inputColor = INPUT(tc);
   
    int alpha = PREFIX(alpha);
    vec2 uv = tc;
    vec2 fragCoord = tc.xy * iResolution.xy;
      
    float time = PREFIX(global_time);    
  
	vec2 p = ( 2.0 * fragCoord - iResolution.xy ) / iResolution.x * 1000.0; 
    
	vec3 color = mix( vec3( 0.3, 0.1, 0.3 ), vec3( 0.1, 0.4, 0.5 ), dot( uv, vec2( 0.2, 0.7 ) ) );      
    vec2 rp = rotate( p, 0.2 + time * 0.03 );
    vec3 tColor = Bokeh( color, rp + vec2( -50.0 * time +  0.0, 0.0  ), 3.0 * vec3( 0.4, 0.1, 0.2 ) );
	rp = rotate( rp, 0.3 - time * 0.05 );
    tColor = Bokeh( tColor, rp + vec2( -70.0 * time + 33.0, -33.0 ), 3.5 * vec3( 0.6, 0.4, 0.2 ) );
	rp = rotate( rp, 0.5 + time * 0.07 );
    tColor = Bokeh( tColor, rp + vec2( -60.0 * time + 55.0, 55.0 ), 3.0 * vec3( 0.4, 0.3, 0.2 ) );
    rp = rotate( rp, 0.9 - time * 0.03 );
    tColor = Bokeh( tColor, rp + vec2( -25.0 * time + 77.0, 77.0 ), 3.0 * vec3( 0.4, 0.2, 0.1 ) );    
    rp = rotate( rp, 0.0 + time * 0.05 );
    tColor = Bokeh( tColor, rp + vec2( -15.0 * time + 99.0, 99.0 ), 3.0 * vec3( 0.2, 0.0, 0.4 ) );     

	vec4 fragColor = vec4( tColor, inputColor.w);
    fragColor.xyz = 1.0 - (1.0 - inputColor.xyz)*(1.0-fragColor.xyz);
    fragColor = mix( fragColor, inputColor, 1.0 - float(100.0)/100.0 );
    return mix( fragColor, inputColor, 1.0 - float(alpha)/100.0 ); 
}