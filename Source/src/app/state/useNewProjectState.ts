import { useState } from 'react';
export function useNewProjectState() {
  const [newOpen, setNewOpen] = useState(false);
  const [projectName, setProjectName] = useState('Untitled project');
  const [aspect, setAspect] = useState('landscape');
  const [fps, setFps] = useState('30/1');
  return { newOpen, setNewOpen, projectName, setProjectName, aspect, setAspect, fps, setFps };
}
