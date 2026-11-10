import type { CommandContext, CommandHandlers } from './types';
export const timelineHandlers = {
  tool_select: (ctx: CommandContext) => {
    const { setTool } = ctx;
    setTool('select');
  },
  tool_razor: (ctx: CommandContext) => {
    const { setTool } = ctx;
    setTool('razor');
  },
  snapping: (ctx: CommandContext) => {
    const { setSnapping } = ctx;
    setSnapping((v) => !v);
  },
  magnetic_timeline: (ctx: CommandContext) => {
    const { setPlaying, p, edit } = ctx;
    setPlaying(false);
    void edit({ type: 'set_magnetic_timeline', enabled: !p.magneticTimeline });
  },
  zoom_in: (ctx: CommandContext) => {
    const { timelineControls } = ctx;
    timelineControls.current?.zoomIn();
  },
  zoom_out: (ctx: CommandContext) => {
    const { timelineControls } = ctx;
    timelineControls.current?.zoomOut();
  },
  zoom_fit: (ctx: CommandContext) => {
    const { timelineControls } = ctx;
    timelineControls.current?.fit();
  },
  track_menu: (ctx: CommandContext) => {
    const { timelineControls } = ctx;
    timelineControls.current?.trackMenu();
  },
  add_video_track: (ctx: CommandContext) => {
    const { edit } = ctx;
    void edit({ type: 'add_track', kind: 'video' });
  },
  add_audio_track: (ctx: CommandContext) => {
    const { edit } = ctx;
    void edit({ type: 'add_track', kind: 'audio' });
  },
  add_title: (ctx: CommandContext) => {
    const { titlePreset, addTitle } = ctx;
    void addTitle(titlePreset);
  },
  mute_track: (ctx: CommandContext) => toggleSelectedTrack(ctx, 'muted'),
  lock_track: (ctx: CommandContext) => toggleSelectedTrack(ctx, 'locked'),
} satisfies CommandHandlers;

function toggleSelectedTrack(ctx: CommandContext, property: 'muted' | 'locked') {
  const { selectedTrack, edit, notify } = ctx;
  if (!selectedTrack) {
    notify('Select a clip on the track first.');
    return;
  }
  void edit({ type: 'set_track', id: selectedTrack.id, [property]: !selectedTrack[property] });
}
