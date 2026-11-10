

vec4 FUNCNAME(vec2 tc)  {
	
	vec4 origCol = INPUT(tc);
    float percent = float(PREFIX(percent));
    float alpha = float(PREFIX(alpha));
    
    if(iResolution.x<=640.0)
        percent=(percent+10.0)/10.0;
    else
        percent=((iResolution.x/640.0)*percent+10.0)/10.0;
    
	vec2 uvMosaic=vec2(floor((tc.x * iResolution.x)/percent)*percent,floor((tc.y * iResolution.y)/percent)*percent);
	//float offset=0.5*(iResolutionOrig.x-iResolution.x);
	//uvMosaic.x-=offset;
    vec2 Mosaic=uvMosaic.xy/iResolution.xy;

    vec4 Col=INPUT(Mosaic);
    vec4 outcol=mix(Col,origCol,1.0 - alpha/100.0);

	return outcol;
}
