import { useContext } from 'react';
import { VideoContext } from '../context/VideoContext';

export function useVideo() {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideo must be used within VideoProvider');
  }
  return context;
}
