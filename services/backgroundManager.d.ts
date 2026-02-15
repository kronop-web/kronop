declare class BackgroundManager {
  static instance: BackgroundManager | null;
  
  constructor();
  
  pauseAllProcesses(): void;
  resumeAllProcesses(): void;
  
  static getInstance(): BackgroundManager | null;
}

export default BackgroundManager;
