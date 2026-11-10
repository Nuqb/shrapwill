using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Reflection;

internal static class CalibrationGuard
{
    internal static void Validate(Bitmap sample)
    {
        using (var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("DownloadReference"))
        using (var reference = new Bitmap(stream))
        {
            foreach (double scale in new[] { 1.0, 1.25, 1.5, 0.75, 2.0 })
            {
                int size = (int)Math.Round(reference.Width * scale);
                if (size > sample.Width || size > sample.Height) continue;
                using (var scaled = new Bitmap(size, size, PixelFormat.Format32bppArgb))
                {
                    using (Graphics graphics = Graphics.FromImage(scaled))
                    {
                        graphics.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
                        graphics.DrawImage(reference, 0, 0, size, size);
                    }
                    if (new IconMatcher(scaled).Find(sample).Count > 0) return;
                }
            }
        }
        throw new ArgumentException("This is not the verified download arrow. Do not select a + button. Include a little background around the full arrow.");
    }
}
