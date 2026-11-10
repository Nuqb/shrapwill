export interface LibraryItem {
  type: 'media' | 'title';
  id: string;
  name: string;
  kind: 'video' | 'audio';
  duration: number;
  hasAudio?: boolean;
}
export interface DropTarget {
  trackId: string;
  frame: number;
  ppf: number;
}
export interface LibraryDrag {
  item: LibraryItem;
  x: number;
  y: number;
  target: DropTarget | null;
}
