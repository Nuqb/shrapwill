import { ChevronDown, Undo2, Redo2, Save, Download, Settings } from 'lucide-react';
import brandIcon from '../../assets/shrapwill-icon.png';
import { ToolButton } from '../../ShortcutUI';
import { useEditor } from '../EditorContext';
import { MenuDropdown } from './Menus';
import { WindowControls } from './WindowControls';
export function MainMenuItem({ item }: { item: string }) {
  const { menu, setMenu } = useEditor();
  return (
    <div className="menu-wrap" key={item}>
      <button
        id={`menu-${item.toLowerCase()}`}
        className={menu === item ? 'menu-open' : ''}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setMenu(menu === item ? '' : item)}
      >
        {item}
      </button>
      {menu === item && <MenuDropdown item={item} />}
    </div>
  );
}
export function MainMenu() {
  return (
    <nav className="main-menu">
      {['File', 'Edit', 'View'].map((item) => (
        <MainMenuItem key={item} item={item} />
      ))}
    </nav>
  );
}
export function HeaderProject() {
  const { snap, renameProject, p } = useEditor();
  return (
    <div className="header-project" data-tauri-drag-region>
      <span className={snap.dirty ? 'unsaved-dot' : 'saved-dot'} data-tauri-drag-region />
      <button title="Rename project" onClick={() => void renameProject()}>
        {p.name}
        <ChevronDown size={11} />
      </button>
      <span className="project-ratio" data-tauri-drag-region>
        {p.width === p.height ? '1:1' : p.width > p.height ? '16:9' : '9:16'}
      </span>
    </div>
  );
}
export function HeaderActions() {
  const { snap, runAction } = useEditor();
  return (
    <div className="header-actions">
      <ToolButton action="undo" disabled={!snap.canUndo} onClick={() => runAction('undo')}>
        <Undo2 size={16} />
      </ToolButton>
      <ToolButton action="redo" disabled={!snap.canRedo} onClick={() => runAction('redo')}>
        <Redo2 size={16} />
      </ToolButton>
      <ToolButton action="save" onClick={() => runAction('save')}>
        <Save size={16} />
      </ToolButton>
      <ToolButton action="settings" onClick={() => runAction('settings')}>
        <Settings size={16} />
      </ToolButton>
      <span className="divider-v" />
      <ToolButton
        action="export_video"
        className="primary export-button"
        onClick={() => runAction('export_video')}
      >
        <Download size={14} /> Export
      </ToolButton>
    </div>
  );
}
export function AppHeader() {
  const { setLauncher } = useEditor();
  return (
    <header className="app-header" data-tauri-drag-region>
      <button className="brand" onClick={() => setLauncher(true)} title="Shrapwill home">
        <img className="brand-icon" src={brandIcon} alt="" />
        <strong>shrapwill</strong>
        <span className="beta-tag">STUDIO</span>
      </button>
      <MainMenu />
      <HeaderProject />
      <HeaderActions />
      <WindowControls />
    </header>
  );
}
