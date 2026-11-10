import { useRef } from 'react';
export function usePreviewResourcesState() {
  const previewPending = useRef(new Set<string>());
  const previewJobs = useRef(new Map<string, string[]>());
  return { previewPending, previewJobs };
}
