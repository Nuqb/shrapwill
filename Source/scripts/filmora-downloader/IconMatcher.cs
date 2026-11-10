using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

internal sealed class IconMatcher
{
    private readonly int width;
    private readonly int height;
    private readonly double[] template;
    private readonly double energy;

    internal IconMatcher(Bitmap image)
    {
        width = image.Width;
        height = image.Height;
        byte[] pixels = Gray(image);
        double mean = 0;
        foreach (byte value in pixels) mean += value;
        mean /= pixels.Length;
        template = new double[pixels.Length];
        for (int i = 0; i < pixels.Length; i++)
        {
            template[i] = pixels[i] - mean;
            energy += template[i] * template[i];
        }
        if (Math.Sqrt(energy / pixels.Length) < 12)
            throw new ArgumentException("Select the small download arrow, including its outline.");
    }

    internal List<Point> Find(Bitmap image)
    {
        byte[] pixels = Gray(image);
        var found = new List<Point>();
        for (int y = 0; y <= image.Height - height; y++)
        {
            double best = 0.90;
            int bestX = -1;
            for (int x = 0; x <= image.Width - width; x++)
            {
                double score = Score(pixels, image.Width, x, y);
                if (score > best) { best = score; bestX = x; }
            }
            if (bestX < 0) continue;
            found.Add(new Point(bestX + width / 2, y + height / 2));
            y += height - 1;
        }
        found.Reverse(); // Work upwards: expanded recommendations appear below a selected row.
        return found;
    }

    private double Score(byte[] pixels, int stride, int left, int top)
    {
        double sum = 0, squared = 0, product = 0;
        int at = 0;
        for (int y = 0; y < height; y++)
            for (int x = 0; x < width; x++)
            {
                double value = pixels[(top + y) * stride + left + x];
                sum += value;
                squared += value * value;
                product += value * template[at++];
            }
        double variance = squared - sum * sum / template.Length;
        if (variance < 1) return 0;
        return product / Math.Sqrt(variance * energy);
    }

    internal static byte[] Gray(Bitmap image)
    {
        var area = new Rectangle(0, 0, image.Width, image.Height);
        BitmapData data = image.LockBits(area, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        try
        {
            byte[] row = new byte[image.Width * 4];
            byte[] result = new byte[image.Width * image.Height];
            for (int y = 0; y < image.Height; y++)
            {
                Marshal.Copy(IntPtr.Add(data.Scan0, y * data.Stride), row, 0, row.Length);
                for (int x = 0; x < image.Width; x++)
                    result[y * image.Width + x] = (byte)((row[x * 4] + row[x * 4 + 1] + row[x * 4 + 2]) / 3);
            }
            return result;
        }
        finally { image.UnlockBits(data); }
    }

    internal static long Fingerprint(Bitmap image)
    {
        byte[] pixels = Gray(image);
        long hash = 17;
        unchecked { foreach (byte pixel in pixels) hash = hash * 31 + pixel; }
        return hash;
    }

    internal static long RowFingerprint(Bitmap image, Point arrow)
    {
        int top = Math.Max(0, arrow.Y - 9);
        int bottom = Math.Min(image.Height, arrow.Y + 9);
        // Text remains bright when Filmora changes the selected-row background.
        // Exclude the favorite/download buttons, which change during a download.
        int right = Math.Max(1, arrow.X - 35);
        long hash = 17;
        unchecked
        {
            for (int y = top; y < bottom; y++)
                for (int x = 0; x < right; x++)
                {
                    Color pixel = image.GetPixel(x, y);
                    int brightness = (pixel.R + pixel.G + pixel.B) / 3;
                    hash = hash * 31 + (brightness >= 100 ? 1 : 0);
                }
        }
        return hash;
    }
}
