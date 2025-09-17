import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AnalysisProgress {
  isAnalyzing: boolean;
  progress: number;
  currentDepth: number;
  currentPath: string;
  maxDepth: number;
  startTime: number | null;
  analysisId: string | null;
}

interface AnalysisProgressContextType {
  progress: AnalysisProgress;
  updateProgress: (updates: Partial<AnalysisProgress>) => void;
  resetProgress: () => void;
  startAnalysis: (analysisId: string, maxDepth: number) => void;
  completeAnalysis: () => void;
  updateProgressFromServer: (serverProgress: any) => void;
}

const AnalysisProgressContext = createContext<AnalysisProgressContextType | undefined>(undefined);

const initialProgress: AnalysisProgress = {
  isAnalyzing: false,
  progress: 0,
  currentDepth: 0,
  currentPath: '',
  maxDepth: 0,
  startTime: null,
  analysisId: null,
};

export const AnalysisProgressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [progress, setProgress] = useState<AnalysisProgress>(initialProgress);

  const updateProgress = (updates: Partial<AnalysisProgress>) => {
    setProgress(prev => ({ ...prev, ...updates }));
  };

  const resetProgress = () => {
    setProgress(initialProgress);
  };

  const startAnalysis = (analysisId: string, maxDepth: number) => {
    setProgress({
      isAnalyzing: true,
      progress: 0,
      currentDepth: 0,
      currentPath: 'Starting analysis...',
      maxDepth,
      startTime: Date.now(),
      analysisId,
    });
  };

  const completeAnalysis = () => {
    setProgress(prev => ({
      ...prev,
      isAnalyzing: false,
      progress: 100,
      currentPath: 'Analysis complete!',
    }));
  };

  const updateProgressFromServer = (serverProgress: any) => {
    if (serverProgress && serverProgress.active) {
      updateProgress({
        progress: serverProgress.progress || 0,
        currentDepth: serverProgress.currentDepth || 0,
        currentPath: serverProgress.currentPath || '',
      });
    }
  };

  return (
    <AnalysisProgressContext.Provider
      value={{
        progress,
        updateProgress,
        resetProgress,
        startAnalysis,
        completeAnalysis,
        updateProgressFromServer,
      }}
    >
      {children}
    </AnalysisProgressContext.Provider>
  );
};

export const useAnalysisProgress = (): AnalysisProgressContextType => {
  const context = useContext(AnalysisProgressContext);
  if (context === undefined) {
    throw new Error('useAnalysisProgress must be used within an AnalysisProgressProvider');
  }
  return context;
};
