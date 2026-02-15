declare class ScreenMemoryManager {
  static instance: ScreenMemoryManager | null;
  
  constructor();
  
  allocateMemory(screenType: string, sizeMB: number): void;
  clearScreenCache(screenType: string): void;
  
  static getInstance(): ScreenMemoryManager | null;
}

export default ScreenMemoryManager;
