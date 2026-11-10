using System;
using System.Drawing;
using System.Windows.Forms;

internal sealed class Selection : Form
{
    private Point start;
    private Rectangle selected;
    private readonly string instruction;
    internal Rectangle Selected { get { return selected; } }

    internal Selection(Rectangle bounds, string instruction)
    {
        this.instruction = instruction;
        Bounds = bounds;
        FormBorderStyle = FormBorderStyle.None;
        StartPosition = FormStartPosition.Manual;
        TopMost = true;
        DoubleBuffered = true;
        Cursor = Cursors.Cross;
        KeyPreview = true;
        BackgroundImage = Desktop.Capture(bounds);
        MouseDown += delegate(object sender, MouseEventArgs e) { start = e.Location; Capture = true; };
        MouseMove += DragSelection;
        MouseUp += FinishSelection;
        KeyDown += delegate(object sender, KeyEventArgs e) { if (e.KeyCode == Keys.Escape) DialogResult = DialogResult.Cancel; };
    }

    private void DragSelection(object sender, MouseEventArgs e)
    {
        if (!Capture) return;
        selected = Rectangle.FromLTRB(Math.Min(start.X, e.X), Math.Min(start.Y, e.Y), Math.Max(start.X, e.X), Math.Max(start.Y, e.Y));
        Invalidate();
    }

    private void FinishSelection(object sender, MouseEventArgs e)
    {
        DragSelection(sender, e);
        Capture = false;
        if (selected.Width >= 5 && selected.Height >= 5) DialogResult = DialogResult.OK;
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        using (var shade = new SolidBrush(Color.FromArgb(60, Color.Black))) e.Graphics.FillRectangle(shade, ClientRectangle);
        using (var pen = new Pen(Color.Cyan, 2)) e.Graphics.DrawRectangle(pen, selected);
        e.Graphics.FillRectangle(Brushes.Black, 5, 5, Width - 10, 60);
        e.Graphics.DrawString(instruction + "  Esc cancels.", Font, Brushes.White, new RectangleF(14, 14, Width - 28, 45));
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing && BackgroundImage != null) BackgroundImage.Dispose();
        base.Dispose(disposing);
    }
}
