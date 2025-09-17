import React, { useEffect, useRef } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { useFullscreen } from '../contexts/FullscreenContext';

interface FullscreenContainerProps {
  children: React.ReactNode;
  title: string;
  icon?: React.ReactNode;
  onClose?: () => void;
}

export const FullscreenContainer: React.FC<FullscreenContainerProps> = ({
  children,
  title,
  icon,
  onClose,
}) => {
  const { exitFullscreen, fullscreenMode } = useFullscreen();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitFullscreen();
      }
    };

    if (fullscreenMode !== 'none') {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [fullscreenMode, exitFullscreen]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
    exitFullscreen();
  };

  if (fullscreenMode === 'none') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm">
      {/* Fullscreen Overlay */}
      <div 
        ref={containerRef}
        className="w-full h-full flex flex-col bg-gradient-to-br from-[#0d1117] to-[#161b22] animate-in fade-in-0 zoom-in-95 duration-300"
      >
        {/* Fullscreen Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#161b22] to-[#21262d] border-b border-[#30363d] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                {icon || <Maximize2 className="w-5 h-5 text-blue-400" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#f0f6fc]">{title}</h2>
                <p className="text-sm text-[#8b949e]">
                  {fullscreenMode === 'tree' ? 'Repository Tree View' : 'AI Code Analysis'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={exitFullscreen}
                className="group p-2 rounded-lg text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-all duration-200 hover:scale-105"
                title="Exit fullscreen (Esc)"
              >
                <Minimize2 className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
              </button>
              {onClose && (
                <button
                  onClick={handleClose}
                  className="group p-2 rounded-lg text-[#8b949e] hover:text-[#f85149] hover:bg-[#21262d] transition-all duration-200 hover:scale-105"
                  title="Close"
                >
                  <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                </button>
              )}
            </div>
          </div>
        </div>


        {/* Fullscreen Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};
