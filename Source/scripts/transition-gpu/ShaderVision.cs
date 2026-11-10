using System;
using System.IO;
using System.Web.Script.Serialization;

internal static partial class TransitionGpu
{
    static void AnalyzeFrame(string[] args)
    {
        int width=int.Parse(args[2]),height=int.Parse(args[3]);
        if(width<1 || height<1 || width>512 || height>512)throw new Exception("Invalid analysis dimensions");
        using(var models=new VisionModels(AppDomain.CurrentDomain.BaseDirectory)) {
            var result=models.Analyze(args[1],File.ReadAllBytes(args[4]),width,height);
            File.WriteAllText(args[5],new JavaScriptSerializer().Serialize(result));
        }
    }
}
