using System;

internal enum HeadingState { Ready, Waiting, Changed }

internal sealed class HeadingGuard
{
    private readonly long expected;
    private DateTime mismatchStarted;

    internal HeadingGuard(long expected) { this.expected = expected; }

    internal HeadingState Observe(long fingerprint, DateTime now)
    {
        if (fingerprint == expected)
        {
            mismatchStarted = default(DateTime);
            return HeadingState.Ready;
        }
        if (mismatchStarted == default(DateTime)) mismatchStarted = now;
        return (now - mismatchStarted).TotalMilliseconds >= 1500 ? HeadingState.Changed : HeadingState.Waiting;
    }
}
