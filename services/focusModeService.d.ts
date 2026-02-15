declare class FocusModeService {
  static instance: FocusModeService | null;
  
  constructor();
  
  setFocusMode(screenType: string, contentType?: string | null): void;
  clearFocusMode(): void;
  isInFocusMode(): boolean;
  getCurrentScreen(): string | null;
  getCurrentContentType(): string | null;
  subscribe(callback: (state: {
    isFocused: boolean;
    currentScreen: string | null;
    currentContentType: string | null;
  }) => void): () => void;
  
  static getInstance(): FocusModeService | null;
}

export default FocusModeService;
