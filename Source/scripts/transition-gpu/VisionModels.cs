using System;
using System.IO;
using System.Linq;
using System.Web.Script.Serialization;

internal sealed class VisionResult
{
    public double[] eye=new double[]{.5,.5};
    public int width,height;
    public string mask;
    [ScriptIgnore] public byte[] pixels;
}

// Shared CPU preprocessing/inference for playback requests and native export.
// Inputs are bounded bottom-up RGBA, matching the scene textures in both hosts.
internal sealed class VisionModels : IDisposable
{
    readonly string directory;
    OrtSession human,face;
    public VisionModels(string directory) {this.directory=directory;}
    static float Channel(byte[] rgba,int width,int height,double x,double y,int channel)
    {
        x=Math.Max(0,Math.Min(width-1,x));y=Math.Max(0,Math.Min(height-1,y));
        int x0=(int)x,y0=(int)y,x1=Math.Min(width-1,x0+1),y1=Math.Min(height-1,y0+1);
        double fx=x-x0,fy=y-y0;
        double a=rgba[((height-1-y0)*width+x0)*4+channel]*(1-fx)+rgba[((height-1-y0)*width+x1)*4+channel]*fx;
        double b=rgba[((height-1-y1)*width+x0)*4+channel]*(1-fx)+rgba[((height-1-y1)*width+x1)*4+channel]*fx;
        return (float)Math.Round(a*(1-fy)+b*fy);
    }
    static float[] HumanInput(byte[] rgba,int width,int height)
    {
        const int size=192;
        var tensor=new float[3*size*size];
        for(int channel=0;channel<3;channel++)
            for(int y=0;y<size;y++)
                for(int x=0;x<size;x++)
                    tensor[channel*size*size+y*size+x]=Channel(rgba,width,height,(x+.5)*width/size-.5,(y+.5)*height/size-.5,channel)/127.5f-1f;
        return tensor;
    }
    VisionResult Person(byte[] rgba,int width,int height)
    {
        if(human==null)human=new OrtSession(Path.Combine(directory,"human_segmentation_pphumanseg_2023mar.onnx"));
        var output=human.Run(HumanInput(rgba,width,height),new long[]{1,3,192,192}).Values.First();
        const int area=192*192;
        if(output.Length!=area*2)throw new Exception("Invalid person model output");
        var pixels=new byte[area*4];
        for(int y=0;y<192;y++)for(int x=0;x<192;x++) {
            int top=y*192+x,bottom=(191-y)*192+x;
            pixels[bottom*4]=pixels[bottom*4+1]=pixels[bottom*4+2]=255;
            pixels[bottom*4+3]=output[area+top]>output[top]?(byte)255:(byte)0;
        }
        return new VisionResult{width=192,height=192,pixels=pixels,mask=Convert.ToBase64String(pixels)};
    }
    static float[] FaceInput(byte[] rgba,int width,int height)
    {
        const int size=640;
        double ratio=Math.Min((double)size/width,(double)size/height);
        int resizedWidth=(int)Math.Round(width*ratio),resizedHeight=(int)Math.Round(height*ratio);
        var tensor=new float[3*size*size];
        for(int channel=0;channel<3;channel++)
            for(int y=0;y<resizedHeight;y++)
                for(int x=0;x<resizedWidth;x++)
                    tensor[channel*size*size+y*size+x]=Channel(rgba,width,height,(x+.5)/ratio-.5,(y+.5)/ratio-.5,2-channel);
        return tensor;
    }
    VisionResult Eye(byte[] rgba,int width,int height)
    {
        if(face==null)face=new OrtSession(Path.Combine(directory,"face_detection_yunet_2023mar.onnx"));
        var output=face.Run(FaceInput(rgba,width,height),new long[]{1,3,640,640});
        var result=new VisionResult();
        double best=.6,ratio=Math.Min(640.0/width,640.0/height);
        foreach(int stride in new int[]{8,16,32}) {
            var cls=output["cls_"+stride];var obj=output["obj_"+stride];var points=output["kps_"+stride];
            int columns=640/stride;
            for(int index=0;index<cls.Length;index++) {
                double score=Math.Sqrt(Math.Max(0,Math.Min(1,cls[index]))*Math.Max(0,Math.Min(1,obj[index])));
                if(score<=best)continue;
                double x=(points[index*10+2]+index%columns)*stride/ratio/width;
                double y=(points[index*10+3]+index/columns)*stride/ratio/height;
                if(x<0 || x>1 || y<0 || y>1)continue;
                best=score;result.eye=new double[]{x,1-y};
            }
        }
        return result;
    }
    public VisionResult Analyze(string mode,byte[] rgba,int width,int height)
    {
        if(width<1 || height<1 || width*height>7680*7680 || rgba.Length!=(long)width*height*4)
            throw new Exception("Invalid analysis frame bounds");
        if(mode=="person")return Person(rgba,width,height);
        if(mode=="face")return Eye(rgba,width,height);
        throw new Exception("Unknown local analysis mode");
    }
    public void Dispose() {if(human!=null)human.Dispose();if(face!=null)face.Dispose();}
}
