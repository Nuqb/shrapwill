using System;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Web.Script.Serialization;

internal static partial class TransitionGpu
{
    static float frameRate=30f;
    static float activeDuration=1f;
    static TextureSet currentTextures;
    static string ShaderMain()
    {
        return "\nvoid main(){vec2 point=(floor(gl_FragCoord.xy)+vec2(.5))/iResolution;vec4 result=transition(point);portColor=host_strength>=1.?result:mix(texture(hostOriginal,portUV),clamp(result,0.,1.),host_strength);}";
    }
    static string ShaderHeader()
    {
        string header = "#define iResolutionOrig originalResolution\n#define FUNCNAME transition\n#define PREFIX(x) param_##x\n#define param_global_time u_global_time\n#define param_total_time u_total_time\n#define param_total_len u_total_time\n#define param_current_pos u_global_time\n#define u_total_len u_total_time\n#define u_current_pos u_global_time\n#define INPUT(p) INPUT1(p)\n#define texture2D texture\n";
        for (int i = 0; i < 8; i++)
            header += "#define INPUT" + (i + 1) + "(p) texture(input" + (char)('A' + i) + ",p)\nuniform sampler2D input" + (char)('A' + i) + ";\n";
        header += "#define param_frame_rate u_frame_rate\n";
        header += "uniform float host_curve1,host_curve2,host_curve3,host_curve4,host_curve5,host_curve6;\n";
        header += "uniform sampler2D hostOriginal;uniform float host_strength;\n";
        return header + "uniform float u_global_time;uniform float u_total_time;uniform float u_frame_rate;uniform vec2 host_eye;uniform vec2 iResolution;uniform vec2 originalResolution;in vec2 portUV;out vec4 portColor;\n";
    }
    public sealed class TextureGroup
    {
        public string[] files; public string format,timing; public int width, height, frameCount; public double fps;
    }
    public sealed class TextureRecipe
    {
        public int sceneInputs = 2; public TextureGroup[] textures = new TextureGroup[0];
        public RenderStage[] passes = new RenderStage[0];
        public string analysis;public bool switchInput;
        public AnimationCurves.Segment[][] curves;
        public double strength=1;
    }
    sealed class TextureSet : IDisposable
    {
        TextureRecipe recipe;
        uint[][] textures;
        VideoTexture[] videos;
        VisionModels models;
        public double[] eye=new double[]{.5,.5};
        public float[] values=new float[0];
        public float Strength {get{return (float)recipe.strength;}}
        public void Analyze(byte[] a,byte[] b,int width,int height,float progress) {
            values=AnimationCurves.Values(recipe.curves,progress);
            if(string.IsNullOrEmpty(recipe.analysis))return;
            if(models==null)models=new VisionModels(AppDomain.CurrentDomain.BaseDirectory);
            bool person=recipe.analysis=="incoming-person";
            var result=models.Analyze(person?"person":"face",person||progress>.5?b:a,width,height);
            eye=result.eye;
            if(person)for(int i=0;i<recipe.textures.Length;i++)if(recipe.textures[i].format=="person-mask")Upload(textures[i][0],result.pixels,192,192,15);
        }
        public ShaderGraph graph;
        public static bool Source(string shader)
        {
            return File.Exists(shader + ".json") && new JavaScriptSerializer().Deserialize<TextureRecipe>(File.ReadAllText(shader + ".json")).sceneInputs == 1;
        }
        public TextureSet(string shader)
        {
            string file = shader + ".json";
            recipe = File.Exists(file) ? new JavaScriptSerializer().Deserialize<TextureRecipe>(File.ReadAllText(file)) : new TextureRecipe();
            if (recipe.textures.Length + recipe.sceneInputs > 8)
                throw new Exception("Too many original texture inputs");
            textures = new uint[recipe.textures.Length][];
            videos = new VideoTexture[recipe.textures.Length];
            for (int i = 0; i < textures.Length; i++)
            {
                if(recipe.textures[i].format=="person-mask") {
                    textures[i]=new uint[1];glGenTextures(1,out textures[i][0]);continue;
                }
                textures[i] = new uint[recipe.textures[i].files.Length];
                for (int j = 0; j < textures[i].Length; j++) {
                    string asset=Path.Combine(Path.GetDirectoryName(shader), recipe.textures[i].files[j]);
                    if(recipe.textures[i].format=="video") {
                        glGenTextures(1,out textures[i][j]);
                        videos[i]=new VideoTexture(asset,recipe.textures[i],textures[i][j]);
                    } else textures[i][j] = LoadTexture(asset, recipe.textures[i]);
                }
            }
            if (recipe.passes != null && recipe.passes.Length > 0) {
                try{graph = new ShaderGraph(recipe.passes);}
                catch(Exception error){throw new Exception(Path.GetFileName(shader)+": "+error.Message);}
            }
        }
        public uint[] Inputs(uint[] scenes, float progress) {
            foreach(var video in videos) if(video!=null) video.Update(progress);
            uint[] result = new uint[9];
            result[0]=recipe.switchInput && progress>.5?scenes[1]:scenes[0]; result[1]=scenes[1];
            for (int i=0;i<textures.Length;i++) result[2+i]=textures[i][Frame(i,progress)];
            return result;
        }
        static unsafe uint LoadTexture(string file, TextureGroup group)
        {
            if (group.format != "rgba32f")
                return ImageTexture(file);
            byte[] bytes = File.ReadAllBytes(file);
            if (bytes.Length != group.width * group.height * 16)
                throw new Exception("Invalid original LUT texture");
            uint texture;
            glGenTextures(1, out texture);
            glBindTexture(0x0DE1, texture);
            glTexParameteri(0x0DE1, 0x2801, 0x2600);
            glTexParameteri(0x0DE1, 0x2800, 0x2600);
            glTexParameteri(0x0DE1, 0x2802, 0x812F);
            glTexParameteri(0x0DE1, 0x2803, 0x812F);
            fixed (byte* data = bytes)
                glTexImage2D(0x0DE1, 0, 0x8814, group.width, group.height, 0, 0x1908, 0x1406, (IntPtr)data);
            return texture;
        }
        static unsafe uint ImageTexture(string file)
        {
            using (var image = new Bitmap(file))
            {
                var locked = image.LockBits(new Rectangle(0, 0, image.Width, image.Height), ImageLockMode.ReadOnly, System.Drawing.Imaging.PixelFormat.Format32bppArgb);
                byte[] rgba = new byte[image.Width * image.Height * 4], row = new byte[image.Width * 4];
                try
                {
                    for (int y = 0; y < image.Height; y++)
                    {
                        Marshal.Copy(IntPtr.Add(locked.Scan0, y * locked.Stride), row, 0, row.Length);
                        for (int x = 0; x < image.Width; x++)
                        {
                            int index = ((image.Height - 1 - y) * image.Width + x) * 4;
                            rgba[index] = row[x * 4 + 2];
                            rgba[index + 1] = row[x * 4 + 1];
                            rgba[index + 2] = row[x * 4];
                            rgba[index + 3] = row[x * 4 + 3];
                        }
                    }
                }
                finally { image.UnlockBits(locked); }
                uint texture;
                glGenTextures(1, out texture);
                glBindTexture(0x0DE1, texture);
                glTexParameteri(0x0DE1, 0x2801, 0x2601);
                glTexParameteri(0x0DE1, 0x2800, 0x2601);
                glTexParameteri(0x0DE1, 0x2802, 0x812F);
                glTexParameteri(0x0DE1, 0x2803, 0x812F);
                fixed (byte* data = rgba)
                    glTexImage2D(0x0DE1, 0, 0x1908, image.Width, image.Height, 0, 0x1908, 0x1401, (IntPtr)data);
                return texture;
            }
        }
        public void Bind(float progress)
        {
            foreach(var video in videos) if(video!=null) video.Update(progress);
            for (int i = 0; i < textures.Length; i++)
            {
                int frame = Frame(i,progress);
                Load<ActiveTexture>("glActiveTexture")((uint)(0x84C0 + recipe.sceneInputs + i));
                glBindTexture(0x0DE1, textures[i][frame]);
            }
        }
        int Frame(int i,float progress) {
            if(recipe.textures[i].timing=="lightning") {
                double seconds=activeDuration,position=Math.Max(0,Math.Floor(progress*seconds*frameRate+.0001)-Math.Floor(.25*seconds*frameRate+.0001));
                if(seconds>3)position=Math.Floor(position*75/(seconds*frameRate));
                return (int)position%textures[i].Length;
            }
            return Math.Min(textures[i].Length-1,Math.Max(0,(int)Math.Floor(progress*textures[i].Length)));
        }
        public void Dispose()
        {
            foreach(var video in videos) if(video!=null) video.Dispose();
            if(models!=null)models.Dispose();
            if (graph != null) graph.Dispose();
            foreach (var group in textures)
                foreach (uint value in group)
                {
                    uint texture = value;
                    glDeleteTextures(1, ref texture);
                }
        }
    }
}
