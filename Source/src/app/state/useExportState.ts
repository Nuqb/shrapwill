import type { Job } from '../../types';
import { useState } from 'react';
export function useExportState() {
  const [exportOpen, setExportOpen] = useState(false);
  const [exportRes, setExportRes] = useState(1080);
  const [exportQuality, setExportQuality] = useState('balanced');
  const [encoder, setEncoder] = useState('software');
  const [encoders, setEncoders] = useState(['software']);
  const [exportJob, setExportJob] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  return {
    jobs,
    setJobs,
    exportOpen,
    setExportOpen,
    exportRes,
    setExportRes,
    exportQuality,
    setExportQuality,
    encoder,
    setEncoder,
    encoders,
    setEncoders,
    exportJob,
    setExportJob,
  };
}
