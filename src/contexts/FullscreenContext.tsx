import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type FullscreenMode = 'none' | 'tree' | 'analysis';

interface FullscreenContextType {
  fullscreenMode: FullscreenMode;
  setFullscreenMode: (mode: FullscreenMode) => void;
  toggleFullscreen: (mode: 'tree' | 'analysis') => void;
  exitFullscreen: () => void;
  isFullscreen: boolean;
  switchToAnalysis: () => void;
}

const FullscreenContext = createContext<FullscreenContextType | undefined>(undefined);

export const useFullscreen = () => {
  const context = useContext(FullscreenContext);
  if (!context) {
    throw new Error('useFullscreen must be used within a FullscreenProvider');
  }
  return context;
};

interface FullscreenProviderProps {
  children: ReactNode;
}

export const FullscreenProvider: React.FC<FullscreenProviderProps> = ({ children }) => {
  const [fullscreenMode, setFullscreenMode] = useState<FullscreenMode>('none');

  const toggleFullscreen = useCallback((mode: 'tree' | 'analysis') => {
    setFullscreenMode(prev => {
      if (prev === mode) {
        return 'none';
      }
      return mode;
    });
  }, []);

  const exitFullscreen = useCallback(() => {
    setFullscreenMode('none');
  }, []);

  const switchToAnalysis = useCallback(() => {
    setFullscreenMode('analysis');
  }, []);

  const isFullscreen = fullscreenMode !== 'none';

  const value: FullscreenContextType = {
    fullscreenMode,
    setFullscreenMode,
    toggleFullscreen,
    exitFullscreen,
    isFullscreen,
    switchToAnalysis,
  };

  return (
    <FullscreenContext.Provider value={value}>
      {children}
    </FullscreenContext.Provider>
  );
};
