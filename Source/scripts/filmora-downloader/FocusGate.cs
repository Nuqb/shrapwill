using System;

internal sealed class FocusGate
{
    private DateTime readyAfter;
    internal bool Waiting { get; private set; }

    internal bool Observe(bool focused, DateTime now)
    {
        if (!focused)
        {
            Waiting = true;
            readyAfter = now.AddMilliseconds(600);
            return false;
        }
        if (Waiting && now < readyAfter) return false;
        Waiting = false;
        return true;
    }
}
