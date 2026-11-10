using System;
using System.Drawing;

internal sealed class ClickCadence
{
    private readonly int delayMilliseconds;
    private Point lastPoint = new Point(-999, -999);
    private DateTime lastClick;

    internal ClickCadence(int delayMilliseconds)
    {
        this.delayMilliseconds = delayMilliseconds;
    }

    internal DateTime RetryAt { get { return lastClick.AddMilliseconds(delayMilliseconds); } }

    internal bool CanClick(Point point, DateTime now)
    {
        bool nearby = Math.Abs(point.X - lastPoint.X) <= 8 && Math.Abs(point.Y - lastPoint.Y) <= 8;
        return !nearby || now >= RetryAt;
    }

    internal void Record(Point point, DateTime now)
    {
        lastPoint = point;
        lastClick = now;
    }
}
