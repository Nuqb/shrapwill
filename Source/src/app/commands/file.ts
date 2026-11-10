import type { CommandContext, CommandHandlers } from './types';
export const fileHandlers = {
  new_project: (ctx: CommandContext) => {
    const { setPlaying, setNewOpen } = ctx;
    setPlaying(false);
    setNewOpen(true);
  },
  open_project: (ctx: CommandContext) => {
    const { open } = ctx;
    void open();
  },
  save: (ctx: CommandContext) => {
    const { save } = ctx;
    void save();
  },
  save_as: (ctx: CommandContext) => {
    const { save } = ctx;
    void save(true);
  },
  import_media: (ctx: CommandContext) => {
    const { importFiles } = ctx;
    void importFiles();
  },
  export_video: (ctx: CommandContext) => {
    const { setPlaying, setExportOpen, setExportJob } = ctx;
    setPlaying(false);
    setExportJob(null);
    setExportOpen(true);
  },
  settings: (ctx: CommandContext) => {
    const { setPlaying, setSettingsOpen } = ctx;
    setPlaying(false);
    setSettingsOpen(true);
  },
} satisfies CommandHandlers;
