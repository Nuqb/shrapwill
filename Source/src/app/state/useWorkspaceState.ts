import { useState } from 'react';
import { type Properties } from '../../types';
import { readLayout } from '../config';
export function useWorkspaceState() {
  const [menu, setMenu] = useState('');
  const [projectInfoOpen, setProjectInfoOpen] = useState(false);
  const [layout, setLayout] = useState(readLayout);
  const [draft, setDraft] = useState<Properties | null>(null);
  return { menu, setMenu, layout, setLayout, draft, setDraft, projectInfoOpen, setProjectInfoOpen };
}
