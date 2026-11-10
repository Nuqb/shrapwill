using System;
using System.Diagnostics;

internal static partial class TransitionGpu
{
    static string mediaTool;
    sealed class VideoTexture : IDisposable
    {
        readonly string file;
        readonly TextureGroup group;
        readonly uint texture;
        readonly byte[] raw, flipped;
        Process decoder;
        int frame = -1;
        public VideoTexture(string file, TextureGroup group, uint texture)
        {
            if(group.width<1 || group.height<1 || group.width*group.height>3840*2160 || group.frameCount<1 || group.frameCount>600)
                throw new Exception("Invalid original video texture bounds");
            this.file=file;
            this.group=group;
            this.texture=texture;
            raw=new byte[group.width*group.height*4];
            flipped=new byte[raw.Length];
        }
        public void Update(float progress)
        {
            int wanted=Math.Min(group.frameCount-1,Math.Max(0,(int)Math.Floor(progress*group.frameCount)));
            if(group.timing=="integer-fps")wanted=Math.Min(group.frameCount-1,Math.Max(0,(int)Math.Floor(progress*activeDuration*Math.Floor(group.frameCount/activeDuration)+.0001)));
            if(wanted==frame) return;
            if(decoder==null || wanted<frame) {
                Dispose();
                if(String.IsNullOrEmpty(mediaTool)) throw new Exception("Missing bundled media decoder");
                decoder=Child(mediaTool,"-v error -threads 2 -i "+Quote(file)+" -an -pix_fmt rgba -f rawvideo pipe:1",false);
                frame=-1;
            }
            while(frame<wanted) {
                ReadFrame(decoder.StandardOutput.BaseStream,raw);
                frame++;
            }
            Flip(raw,flipped,group.width,group.height);
            Upload(texture,flipped,group.width,group.height,15);
        }
        public void Dispose()
        {
            if(decoder!=null) {
                if(!decoder.HasExited) decoder.Kill();
                decoder.Dispose();
                decoder=null;
            }
        }
    }
}
