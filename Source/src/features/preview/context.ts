import { createContext, useContext } from 'react';
import type { usePreview as usePreviewController } from './usePreview';
export type PreviewState = ReturnType<typeof usePreviewController>;
export const PreviewContext = createContext<PreviewState | null>(null);
export function usePreview() {
  const value = useContext(PreviewContext);
  if (!value) throw Error('Preview requires its provider');
  return value;
}
