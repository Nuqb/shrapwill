float my_tan(float x) {
    float x2 = x * x;
    float x3 = x * x2;
    float x5 = x3 * x2;
    float x7 = x5 * x2;
    return x + (1.0/3.0) * x3 + (2.0/15.0) * x5 + (17.0/315.0) * x7;
}
vec4 FUNCNAME(vec2 tc)
{
    float iTime = PREFIX(global_time);
    float Strength = PREFIX(Strength)/100.0;
    float Speed = PREFIX(Speed)/80.;
    float PositionX = float(PREFIX(PositionX))/100.0;
    float PositionY = float(PREFIX(PositionY))/100.0;

    vec2 prop = vec2(1.0, iResolution.y / iResolution.x);
    if(iResolution.y > iResolution.x){ 
        prop = vec2(iResolution.x / iResolution.y, 1.0);
    }

    vec4 resColor;
    vec2 uv = tc;
    vec2 offset = vec2(PositionX, PositionY);
    vec2 ndcPos = uv - offset;
    float aspect = prop.x/ prop.y;

    float u_angle =  ((Speed)*(iTime));
   
    u_angle = clamp(u_angle,0.01,Strength-0.37);
    u_angle = max(u_angle,0.01);
    float eye_angle = abs(u_angle);
    float half_angle = eye_angle*2.0;
    float half_dist = my_tan(half_angle);
    vec2  vp_scale = vec2(aspect, 1.0);

    vec2  P = ndcPos * vp_scale; 
    float vp_dia   = length(vp_scale);
    float rel_dist = length(P) / vp_dia;  
    vec2  rel_P = normalize(P) / normalize(vp_scale);
    vec2 pos_prj = ndcPos;

    float beta = rel_dist * half_angle;
    pos_prj = rel_P * my_tan(beta*1.5) / half_dist*2.0;  
    vec2 uv_prj = pos_prj/3.0 + offset;
    float dist_to_center = length(ndcPos * vp_scale);
    float effect_radius = vp_dia * 0.99;
    float fade = 1.0 - smoothstep(effect_radius * 0.01, effect_radius, dist_to_center);
    
    vec2 final_uv = mix(uv, uv_prj, fade);

    resColor = INPUT(final_uv.st);

	return resColor;
}   
