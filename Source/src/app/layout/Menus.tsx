import { overlayMotion } from '../../features/overlays/motion';
import { durationOf } from '../../types';
import { ShortcutHint } from '../../ShortcutUI';
import { useEditor } from '../EditorContext';
import { defaultLayout } from '../config';
export function EditMenu() {
  const { snap, history, runAction, selected, p, split, remove, selectedTracks } = useEditor();
  return (
    <>
      <button disabled={!snap.canUndo} onClick={() => void history('undo')}>
        Undo <ShortcutHint action="undo" />
      </button>
      <button disabled={!snap.canRedo} onClick={() => void history('redo')}>
        Redo <ShortcutHint action="redo" />
      </button>
      <hr />
      <button onClick={() => runAction('copy')} disabled={!selected.length}>
        Copy clips <ShortcutHint action="copy" />
      </button>
      <button onClick={() => runAction('cut')} disabled={!selected.length}>
        Cut clips <ShortcutHint action="cut" />
      </button>
      <button onClick={() => runAction('paste')} disabled={!snap.canPaste}>
        Paste clips <ShortcutHint action="paste" />
      </button>
      <button onClick={() => runAction('duplicate')} disabled={!selected.length}>
        Duplicate clips <ShortcutHint action="duplicate" />
      </button>
      <button onClick={() => runAction('select_all')}>
        Select all <ShortcutHint action="select_all" />
      </button>
      <hr />
      <button disabled={!durationOf(p)} onClick={split}>
        Split at playhead <ShortcutHint action="split" />
      </button>
      <button disabled={!selected.length} onClick={() => remove(false)}>
        Delete <ShortcutHint action="delete" />
      </button>
      <button disabled={!selected.length} onClick={() => remove(true)}>
        Ripple delete <ShortcutHint action="ripple_delete" />
      </button>
      <button disabled={!selectedTracks.length} onClick={() => remove(false)}>
        Delete selected tracks <ShortcutHint action="delete" />
      </button>
    </>
  );
}
export function ViewMenu() {
  const { setLayout, setMenu, changeQuality, quality, p, runAction, setProjectInfoOpen } =
    useEditor();
  return (
    <>
      <button
        onClick={() => {
          setLayout(defaultLayout);
          setMenu('');
        }}
      >
        Reset layout
      </button>
      <button
        onClick={() => {
          setMenu('');
          void changeQuality(quality);
        }}
      >
        Rebuild preview media
      </button>
      <button
        onClick={() => {
          setMenu('');
          setProjectInfoOpen(true);
        }}
      >
        Project info…
      </button>
      <hr />
      <button aria-pressed={p.magneticTimeline} onClick={() => runAction('magnetic_timeline')}>
        Magnetic timeline: {p.magneticTimeline ? 'On' : 'Off'}{' '}
        <ShortcutHint action="magnetic_timeline" />
      </button>
      <hr />
      <button onClick={() => runAction('settings')}>
        Settings… <ShortcutHint action="settings" />
      </button>
    </>
  );
}
export function FileMenu() {
  const { setMenu, setNewOpen, open, save } = useEditor();
  return (
    <>
      <button
        onClick={() => {
          setMenu('');
          setNewOpen(true);
        }}
      >
        New project <ShortcutHint action="new_project" />
      </button>
      <button
        onClick={() => {
          setMenu('');
          void open();
        }}
      >
        Open project <ShortcutHint action="open_project" />
      </button>
      <hr />
      <button
        onClick={() => {
          setMenu('');
          void save();
        }}
      >
        Save <ShortcutHint action="save" />
      </button>
      <button
        onClick={() => {
          setMenu('');
          void save(true);
        }}
      >
        Save as… <ShortcutHint action="save_as" />
      </button>
    </>
  );
}
export function MenuDropdown({ item }: { item: string }) {
  return (
    <div ref={overlayMotion} className="dropdown-menu" onPointerDown={(e) => e.stopPropagation()}>
      {item === 'File' ? <FileMenu /> : item === 'Edit' ? <EditMenu /> : <ViewMenu />}
    </div>
  );
}
