using System;
using System.Collections.Generic;

internal sealed class RowHistory
{
    private readonly Dictionary<int, long> rows = new Dictionary<int, long>();

    internal bool WasClicked(int y, long identity)
    {
        foreach (var row in rows)
            if (Math.Abs(row.Key - y) < 5 && row.Value == identity) return true;
        return false;
    }

    internal void Remember(int y, long identity) { rows[y] = identity; }
    internal void Clear() { rows.Clear(); }
}
