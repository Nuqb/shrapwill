import { Upload, Search, ChevronDown, Folder } from 'lucide-react';
import { ToolButton } from '../../ShortcutUI';
import { useEditor } from '../../app/EditorContext';
import { tabs } from '../../app/config';
import { MediaGrid, LibraryEmpty } from './MediaCards';
import { TitleCollection } from './TitleCollection';
import { TransitionPresets } from './TransitionPresets';
import { FilterPresets } from './FilterPresets';
import { VideoEffectPresets } from './VideoEffectPresets';
export function LibrarySearch() {
  const { search, setSearch, tab } = useEditor();
  return (
    <label className="search-box">
      <Search size={13} />
      <input
        aria-label={['Media', 'Audio'].includes(tab) ? 'Search media' : 'Search presets'}
        placeholder={['Media', 'Audio'].includes(tab) ? 'Search' : 'Search presets'}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </label>
  );
}
const sectionNames = {
  Media: 'Project media',
  Audio: 'Audio',
  Titles: 'Text & titles',
  Transitions: 'Transitions',
  Filters: 'Color filters',
  Effects: 'Video effects',
};
export function LibraryToolbar() {
  const { tab, runAction } = useEditor();
  return (
    <div className="library-toolbar">
      {['Media', 'Audio'].includes(tab) ? (
        <ToolButton
          action="import_media"
          className="primary import-button"
          onClick={() => runAction('import_media')}
        >
          <Upload size={12} /> Import
          <ChevronDown size={10} />
        </ToolButton>
      ) : (
        <span className="library-section-title">{sectionNames[tab]}</span>
      )}
      <LibrarySearch />
    </div>
  );
}
function LibraryItems() {
  const { tab, assets } = useEditor();
  switch (tab) {
    case 'Titles':
      return <TitleCollection />;
    case 'Transitions':
      return <TransitionPresets />;
    case 'Filters':
      return <FilterPresets />;
    case 'Effects':
      return <VideoEffectPresets />;
    default:
      return assets.length ? <MediaGrid /> : <LibraryEmpty />;
  }
}
export function LibraryContent() {
  return (
    <div className="library-content">
      <LibraryToolbar />
      <LibraryItems />
    </div>
  );
}
export function LibrarySidebar() {
  const { tab, assets } = useEditor();
  return (
    <div className="library-sidebar">
      <button className="active">
        <ChevronDown size={11} />
        {tab === 'Media' ? 'Project media' : tab === 'Audio' ? 'Your audio' : 'Built-in'}
      </button>
      <button className="folder-item">
        <span /> {tab === 'Media' ? 'All media' : tab === 'Audio' ? 'Imported' : 'Essentials'}
        <span className="folder-count">
          {['Media', 'Audio'].includes(tab) ? assets.length : ''}
        </span>
      </button>
      <div className="library-sidebar-note">
        <span className="status-dot" /> Local & private
      </div>
    </div>
  );
}
export function LibraryTabs() {
  const { tab, setTab, setSearch } = useEditor();
  return (
    <div className="library-tabs">
      {tabs.map(({ name, icon: Icon }) => (
        <button
          key={name}
          className={tab === name ? 'active' : ''}
          onClick={() => {
            setTab(name);
            setSearch('');
          }}
        >
          <Icon size={19} strokeWidth={1.6} />
          <span>{name}</span>
        </button>
      ))}
    </div>
  );
}
export function LibraryFooter() {
  const { tab, assets } = useEditor();
  return (
    <div className="library-footer">
      <Folder size={12} />
      <span>
        {['Media', 'Audio'].includes(tab)
          ? `${assets.length} item${assets.length === 1 ? '' : 's'}`
          : 'Local preset library'}
      </span>
      <span className="library-footer-right">{tab === 'Media' ? 'Project media' : tab}</span>
    </div>
  );
}
export function LibraryBody() {
  const { tab } = useEditor();
  return (
    <div className={`library-body ${['Media', 'Audio'].includes(tab) ? '' : 'preset-library'}`}>
      <LibrarySidebar />
      <LibraryContent />
    </div>
  );
}
export function MediaLibrary() {
  return (
    <section className="library panel">
      <LibraryTabs />
      <LibraryBody />
      <LibraryFooter />
    </section>
  );
}
