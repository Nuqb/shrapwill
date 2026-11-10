// author: RuanShengQiang 
// date: 2017/6/21
#define vec2 float2
#define vec3 float3
#define vec4 float4
#define rgb xyz
#define rgba xyzw
#define PI 3.141592653589f

const sampler_t sampler = CLK_NORMALIZED_COORDS_TRUE | CLK_ADDRESS_CLAMP_TO_EDGE | CLK_FILTER_LINEAR;

vec4 INPUT(image2d_t src_data, __global FilterParam* param, vec2 tc)
{
	tc = (vec2)(tc.x, tc.y)*(vec2)(param->origROI[2], param->origROI[3]) + (vec2)(param->origROI[0], param->origROI[1]);
	return read_imagef(src_data, sampler, (vec2)(tc.x, 1.0f - tc.y));
}

__kernel void MAIN(__read_only image2d_t input1, __read_only image2d_t input2, __write_only image2d_t dstImg,__global FilterParam* param)
{
	float progress = param->cur_time / param->total_time;	int W = get_global_size(0);	int H = get_global_size(1);
	int textH = param->height[2];	int w = get_global_id(0);
	int h = get_global_id(1);
	float2 resolution = (float2)(W,H);
	int2 gl_FragCoord = (int2)(get_global_id(0), get_global_id(1));
	vec2 fragCoord = (vec2)(get_global_id0( param), get_global_id1( param));
	vec2 uv = ((vec2)(fragCoord.x, fragCoord.y) + (vec2)(0.5f)) /resolution.xy;
	float iPro = (3.0f* progress * progress - 2.0f * progress * progress * progress); 	
	float zoomDis = 0.5f*iPro;
	float matt = step(zoomDis, uv.x)*step(uv.x, 1.0f-zoomDis)*step(zoomDis, uv.y)*step(uv.y, 1.0f-zoomDis);
	float4 outputCol = mix( INPUT(input2, param,uv), INPUT(input1, param, uv),matt);
	write_imagef(dstImg, (int2)(w, textH - h -1), outputCol);
}