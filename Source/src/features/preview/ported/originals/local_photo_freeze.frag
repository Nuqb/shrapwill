 #define PI 3.14159265358979323846

vec2 rotateFunc(vec2 uv, vec2 center, float theta)
{
	vec2 temp;
	temp.x = dot(vec2(cos(theta), -sin(theta)), uv - center);
	temp.y = dot(vec2(sin(theta), cos(theta)), uv - center);
	return temp + center;
}

 int maxI(int a, int b){
   return a > b ? a : b;
}

float maxF(float a, float b){
   return a > b ? a : b;
}

vec2 maxVec2(vec2 a, vec2 b){
   return vec2((a.x > b.x ? a.x : b.x),
               (a.y > b.y ? a.y : b.y));
}

vec2 maxVec2F(vec2 a, float b){
   return vec2((a.x > b ? a.x : b),
               (a.y > b ? a.y : b));
}

int minI(int a, int b){
   return a < b ? a : b;
}

float minF(float a, float b){
   return a < b ? a : b;
}

vec2 minVec2(vec2 a, vec2 b){
   return vec2((a.x < b.x ? a.x : b.x),
               (a.y < b.y ? a.y : b.y));
}

vec2 minVec2F(vec2 a, float b){
   return vec2((a.x < b ? a.x : b),
               (a.y < b ? a.y : b));
}

float inBound(vec2 tc, vec4 range){   
   float matt = step(range.x, tc.x)*step(tc.x, range.y)*
                step(range.z, tc.y)*step(tc.y, range.w);
   return matt;
}

vec2 draw_roundBox_bevel(vec2 uv, vec2 p, vec2 size, float radius, float blur, float rad, float bevel){
	size *= radius;
	bevel *= size.y;
	radius *= bevel;
	uv = rotateFunc(uv, p, rad);
	uv = abs(uv-p)-size+radius;
	float d = length(maxVec2F(uv,0.0))+minF(maxF(uv.x, uv.y),0.0)-radius+blur;
   float f = smoothstep((radius+0.02)*0.01, (radius+0.02), d);
	return vec2(2.0-sign(d)-smoothstep(0.0, blur, abs(d)),mix(0.7, 0.0, f));    
}


vec4 mixFunc(vec4 back, vec4 overlap, float alp){
	
	float invAlp = 1.0 - alp;
	vec4 ret = back;
	
	if(alp > 0.0){
		ret.x = overlap.x + back.x * invAlp;
		ret.y = overlap.y + back.y * invAlp;
		ret.z = overlap.z + back.z * invAlp;
		ret.a = alp + back.a * invAlp;
	}
	
	return clamp(ret,0.0,1.0);	
}

vec4 GetPhotographFrame(vec2 tc, int imgIndex, float rad, float imgSize){
   float offset = 0.04*imgSize;
   imgSize += offset;
   vec2 uv = 2.0*tc-1.0; 
   vec2 res_radio = vec2(1.0, iResolution.y/iResolution.x);
   if(iResolution.x<iResolution.y){
      res_radio = vec2(iResolution.x/iResolution.y, 1.0);
   } 
   
   vec2 rect_uv = uv * res_radio;
   vec2 p = vec2(0.0);
   float size_x = imgSize;
   vec2 size = vec2(size_x, size_x+offset*(iResolution.x/iResolution.y-1.0))*vec2(1.0, iResolution.y/iResolution.x);
   if(iResolution.x<iResolution.y){
      size = vec2(size_x+offset*(iResolution.y/iResolution.x-1.0),size_x)*vec2(iResolution.x/iResolution.y,1.0);
   }
   float radius = 1.0;
   float blur = 0.01;
   float bevel = 0.05;
   
   vec2 d = draw_roundBox_bevel(rect_uv, p, size, radius, blur, rad, bevel);
	vec4 roundBoxCol = clamp(vec4(d.x)+vec4(vec3(0.2),0.5)*d.y,0.0,1.0);

   vec2 src_center = vec2(0.5);
   vec2 src_offset = vec2(0.0);
   float src_scale = size.x-offset;
   if(iResolution.x < iResolution.y){
      src_scale = size.y-offset;
   }
   vec2 src_uv = (tc-src_center)/src_scale+src_center;
   src_uv -= src_offset;
   src_uv = rotateFunc(src_uv * iResolution.xy, src_center * iResolution.xy, rad) / iResolution.xy;
   vec4 src = vec4(0.0);
   vec4 range = vec4(0.0, 1.0, 0.0, 1.0);
   float alp_y = 1.0;
   float alp_x = 1.0;
   float eclosionScale = 0.995;
   if(src_uv.y >= eclosionScale){
      alp_y = 1.0 - smoothstep(eclosionScale, 1.0, src_uv.y);
   }else if(src_uv.y < 1.0 - eclosionScale){
      alp_y = smoothstep(0.0, 1.0 - eclosionScale, src_uv.y);
   }
   if(src_uv.x >= eclosionScale){
      alp_x = 1.0 - smoothstep(eclosionScale, 1.0, src_uv.x);
   }else if(src_uv.x < 1.0 - eclosionScale){
      alp_x = smoothstep(0.0, 1.0 - eclosionScale, src_uv.x);
   }

   if(imgIndex == 1){
      src = mix(vec4(0.0), INPUT1(src_uv), alp_x*alp_y);
   }else if(imgIndex == 2){
      src = mix(vec4(0.0), INPUT2(src_uv), alp_x*alp_y);
   }
   return mixFunc(roundBoxCol, src, src.a);
}

float normpdf(float x) {
    return exp(-20.*pow(x-.5,2.));
}
vec4 GetPhotographClick(vec2 tc, float iGlobalTime, float photographClickTime){
   float process = min(iGlobalTime/photographClickTime, 1.0);
   vec4 transparent = vec4(0.0);
   vec4 opaque = vec4(1.0);
   float bellTime = normpdf(process);
   vec4 fgCol = mix(transparent, opaque, bellTime);
   return mix(INPUT1(tc), fgCol, fgCol.a);
}

vec4 FUNCNAME(vec2 tc)
{
   float iGlobalTime = PREFIX(global_time);
	float totalTime = PREFIX(total_time);
   float frame_rate = 25.0;
   vec4 retCol = vec4(0.0);
   vec4 bgCol = vec4(vec3(184.0), 255.0)/255.0;
   
   float clickTimeProp = totalTime / 2.0;
   float photographClickTime = 1.0/frame_rate*8.0*clickTimeProp;
   if(iGlobalTime <= photographClickTime){
     retCol = GetPhotographClick(tc, iGlobalTime, photographClickTime);
   }else{
     float curTime = iGlobalTime - photographClickTime;
	  float curTotalTime = totalTime - photographClickTime;
	  float process = min(curTime / curTotalTime, 1.0);
	  float iPro = (3.0 * process * process - 2.0 * process * process * process);
     float timeDuration = 1.0 / 3.0;
     float imgOneStartRad = radians(-1.0), imgOneMiddleRad = radians(-2.0), imgOneEndRad = radians(-30.0);
     float imgOneStartSize = 0.92, imgOneEndSize = 0.8;
     float imgTwoStartRad = radians(4.0), imgTwoEndRad = 0.0;
     float imgTwoStartSize = 0.5, imgTwoMiddleSize = 0.8, imgTwoEndSize = 1.0;
     if(iPro <= timeDuration){
        float curProcess = clamp(iPro/timeDuration, 0.0, 1.0);

        int imgIndex = 1;
        float rad = mix(imgOneStartRad, imgOneMiddleRad, curProcess);
        float imgSize = mix(imgOneStartSize, imgOneEndSize, curProcess);
        retCol = GetPhotographFrame(tc, imgIndex, rad, imgSize);
     }else if(iPro <= timeDuration*2.0){
        float curProcess = clamp((iPro - timeDuration)/timeDuration, 0.0, 1.0);

        int imgIndex = 1;       
        float rad_1 = mix(imgOneMiddleRad, imgOneEndRad, curProcess);
        float imgSize_1 = imgOneEndSize;
        vec2 frame_offset = mix(vec2(0.0), vec2(-0.8,0.8), curProcess);
        vec2 curUV_1 = tc - frame_offset;
        vec4 retCol_1 = clamp(GetPhotographFrame(curUV_1, imgIndex, rad_1, imgSize_1),0.0,1.0);

        imgIndex = 2;
        float rad_2 = imgTwoStartRad;
        float imgSize_2 = mix(imgTwoStartSize, imgTwoMiddleSize, curProcess);
        vec2 curUV_2 = tc;
        vec4 retCol_2 = clamp(GetPhotographFrame(curUV_2, imgIndex, rad_2, imgSize_2),0.0,1.0);
        retCol = mixFunc(retCol_2, retCol_1, retCol_1.a);

     }else{
        float curProcess = clamp((iPro - 2.0*timeDuration)/timeDuration, 0.0, 1.0);

        int imgIndex = 2;
        float rad_2 = mix(imgTwoStartRad, imgTwoEndRad, curProcess);
        float imgSize_2 = mix(imgTwoMiddleSize, imgTwoEndSize, curProcess); 
        vec2 curUV_2 = tc;
        retCol = GetPhotographFrame(curUV_2, imgIndex, rad_2, imgSize_2);
     }
   }
   
	return mixFunc(bgCol,retCol,retCol.a);
}
