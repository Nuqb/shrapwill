import { useRef, useState } from 'react';
export function useUnsavedState() {
  const [leavePrompt, setLeavePrompt] = useState<{
    closing: boolean;
    projectName: string;
  } | null>(null);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const leavePending = useRef<{
    promise: Promise<boolean>;
    resolve: (allow: boolean) => void;
  } | null>(null);
  const closePending = useRef(false);
  return {
    leavePrompt,
    setLeavePrompt,
    leaveBusy,
    setLeaveBusy,
    leaveError,
    setLeaveError,
    leavePending,
    closePending,
  };
}
