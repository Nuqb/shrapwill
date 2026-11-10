import type { PlaybackIndex, RenderPlan } from '../../types';

function activeIndices(plan: RenderPlan, index: PlaybackIndex, frame: number): number[] {
  const result: number[] = [];
  const visit = (first: number, end: number) => {
    if (first >= end || result.length > 8) return;
    const mid = first + Math.floor((end - first) / 2);
    if (index.maxEnds[mid] <= frame) return;
    visit(first, mid);
    const clip = plan.clips[index.order[mid]].clip;
    if (clip.start <= frame && frame < clip.start + clip.duration) result.push(index.order[mid]);
    if (clip.start <= frame) visit(mid + 1, end);
  };
  visit(0, index.order.length);
  return result.sort((a, b) => a - b);
}
function upcomingIndices(
  plan: RenderPlan,
  index: PlaybackIndex,
  frame: number,
  options: { stop: number; limit: number },
): number[] {
  const { stop, limit } = options;
  if (limit <= 0) return [];
  let first = 0,
    end = index.order.length;
  while (first < end) {
    const mid = first + Math.floor((end - first) / 2);
    if (plan.clips[index.order[mid]].clip.start <= frame) first = mid + 1;
    else end = mid;
  }
  let earliest = Infinity,
    second = Infinity;
  for (let i = first; i < index.order.length && plan.clips[index.order[i]].clip.start < stop; i++) {
    const order = index.order[i];
    if (order < earliest) {
      second = earliest;
      earliest = order;
    } else if (order < second) second = order;
  }
  return [earliest, second].filter(Number.isFinite).slice(0, limit);
}
export function playbackCandidates(plan: RenderPlan, frame: number) {
  const stop = frame + (plan.fps.num / plan.fps.den) * 0.8;
  const index = plan.playbackIndex;
  if (!index) {
    const active = plan.clips.filter(
      (rc) => frame >= rc.clip.start && frame < rc.clip.start + rc.clip.duration,
    );
    const upcoming = plan.clips
      .filter((rc) => rc.clip.start > frame && rc.clip.start < stop)
      .slice(0, Math.max(0, Math.min(2, 8 - active.length)));
    return { active, upcoming };
  }
  const active = activeIndices(plan, index, frame);
  const upcoming = upcomingIndices(plan, index, frame, {
    stop,
    limit: Math.min(2, 8 - active.length),
  });
  return { active: active.map((i) => plan.clips[i]), upcoming: upcoming.map((i) => plan.clips[i]) };
}
