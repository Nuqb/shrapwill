import { defaultLayout } from '../config';
import type { CommandContext, CommandHandlers } from './types';
export const workspaceHandlers = {
  show_media: (ctx: CommandContext) => {
    const { setTab } = ctx;
    setTab('Media');
  },
  show_audio: (ctx: CommandContext) => {
    const { setTab } = ctx;
    setTab('Audio');
  },
  show_titles: (ctx: CommandContext) => {
    const { setTab } = ctx;
    setTab('Titles');
  },
  show_transitions: (ctx: CommandContext) => {
    const { setTab } = ctx;
    setTab('Transitions');
  },
  show_effects: (ctx: CommandContext) => {
    const { setTab } = ctx;
    setTab('Effects');
  },
  show_filters: (ctx: CommandContext) => ctx.setTab('Filters'),
  reset_layout: (ctx: CommandContext) => {
    const { setLayout } = ctx;
    setLayout(defaultLayout);
  },
} satisfies CommandHandlers;
