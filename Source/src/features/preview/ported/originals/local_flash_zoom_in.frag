vec2 scale(vec2 uv, float scaleIns, vec2 center){
    mat2 scaleMatrix = mat2(1.0/(scaleIns + 0.000001), 0.0, 0.0, 1.0/(scaleIns + 0.000001));
    vec2 uv1=uv;
    uv1 -= center;
    uv1=uv1*scaleMatrix;
    uv1 += center;
    return uv1;
}

mat2 rotMatrix(float angle)
{
    return mat2(-0.73735, 0.67539,
                    -0.67539, -0.73735);
}

vec4 haloBlur(vec2 tc)
{
    float blurSize = PREFIX(blurSize);
    int haloSize = int(PREFIX(haloSize));
    float lastR = PREFIX(haloLastR);
	vec3 res=vec3(0.0);
    float ratio = iResolution.x/iResolution.y;
    mat2 rot = rotMatrix(2.39996323);
    vec3 accumulator = vec3(0.0);
    vec3 divisor = vec3(0.0);
    float r = 1.0;
    float myRatio=max(iResolution.x,iResolution.y)/min(iResolution.x,iResolution.y);
    vec2 angle = vec2(0.0, 0.35*blurSize*myRatio)/ iResolution.xy;
    float amount = 40.0;
    amount += 0.9987*500.0;
    for (int i = 0; i <= haloSize; i++)
    {
        angle.x*=ratio;
        angle = rot * angle;
        angle.x/=ratio;
        vec3 col = INPUT1(vec2(tc + (r - 1.0)*mix(1.5,1.0,r/lastR) * angle)).rgb;
        vec3 bokeh = pow(col,vec3(9.0)) * amount+.4;;
        float d=r/lastR;
        bokeh=bokeh*smoothstep(1.0,0.9,d);
        accumulator +=  col*bokeh;
        divisor += 1.0*bokeh;
        r += 1.0 / r;
    }
    res=(accumulator / divisor);
    return vec4(res,INPUT1(tc).a);
}

vec4 exposure(vec4 col){
    float intensity = PREFIX(glowValue);
    col.rgb = pow(col.rgb, vec3(2.2));
    col.rgb *= pow(2.0, intensity);
    vec3 s = sign(col.rgb);
    col.rgb = pow(abs(col.rgb), vec3(1.0)) * s;
    s = sign(col.rgb);
    col.rgb = pow(abs(col.rgb), vec3(0.454545454545)) * s;
    return col;
}

vec4 FUNCNAME(vec2 tc) {
    int stepType = PREFIX(stepType);
    if(stepType == 0){
        float mixImgIns = PREFIX(mixImgIns);
        vec4 col1 = INPUT1(tc);
        vec4 col2 = INPUT2(tc);
        vec4 retCol = mix(col2, col1, mixImgIns);
        return retCol;
    }else if(stepType == 1){
        float scaleIns = PREFIX(scaleIns);
        float alpha = PREFIX(alphaValue);
        float aIns = PREFIX(aIns);
        vec2 uv = scale(tc, scaleIns, vec2(0.5));
        vec4 res = haloBlur(uv);
        res = exposure(res);
        res = vec4(mix(res.rgb,vec3(0),alpha * aIns), res.a);
        res =mix(res, vec4(0.0, 0.0, 0.0, res.a), alpha*0.07);
        return res;
    }else if(stepType == 2){
        return INPUT1(tc);
    }
}


