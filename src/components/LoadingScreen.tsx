import React, { useEffect, useState } from 'react';
import { Github, Code, GitBranch, Star, Users } from 'lucide-react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  onComplete?: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const loadingSteps = [
    { text: "Initializing GitHub Analyzer...", icon: Github },
    { text: "Loading repository tools...", icon: Code },
    { text: "Setting up analysis engine...", icon: GitBranch },
    { text: "Preparing AI assistant...", icon: Star },
    { text: "Ready to explore! 🚀", icon: Users }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => {
              onComplete?.();
            }, 500);
          }, 1000);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= loadingSteps.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    return () => clearInterval(stepInterval);
  }, []);

  if (!isVisible) return null;

  const CurrentIcon = loadingSteps[currentStep]?.icon || Github;

  return (
    <div className="loading-screen fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-500">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-md mx-auto px-6">
        {/* GitHub Logo Animation */}
        <div className="mb-8">
          <div className="github-logo">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl animate-pulse">
              <Github className="w-10 h-10 text-slate-900" />
            </div>
            {/* Glow Effect */}
            <div className="absolute inset-0 w-20 h-20 bg-white rounded-full opacity-30 animate-ping"></div>
          </div>
        </div>

        {/* App Title */}
        <h1 className="text-3xl font-bold text-white mb-2 animate-fade-in">
          GitHub Repository Analyzer
        </h1>
        <p className="text-slate-300 text-lg mb-8 animate-fade-in-delay">
          Explore, analyze, and understand any GitHub repository
        </p>

        {/* Loading Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <CurrentIcon className="w-6 h-6 text-green-400 animate-spin" />
            <span className="text-white font-medium">
              {loadingSteps[currentStep]?.text}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
            <div 
              className="progress-bar h-full rounded-full transition-all duration-300 ease-out relative"
              style={{ width: `${progress}%` }}
            >
            </div>
          </div>
          
          {/* Progress Percentage */}
          <div className="mt-2 text-sm text-slate-400">
            {progress}%
          </div>
        </div>

        {/* Feature Icons */}
        <div className="feature-icons">
          <div className="feature-icon">
            <div className="feature-icon-bg">
              <Code className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-xs text-slate-400">Code Analysis</span>
          </div>
          <div className="feature-icon">
            <div className="feature-icon-bg">
              <GitBranch className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs text-slate-400">Repository Tree</span>
          </div>
          <div className="feature-icon">
            <div className="feature-icon-bg">
              <Star className="w-4 h-4 text-yellow-400" />
            </div>
            <span className="text-xs text-slate-400">AI Assistant</span>
          </div>
        </div>

        {/* Loading Dots */}
        <div className="loading-dots mt-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="loading-dot"
            />
          ))}
        </div>
      </div>

      {/* Corner Decorations */}
      <div className="corner-decoration"></div>
      <div className="corner-decoration"></div>
      <div className="corner-decoration"></div>
      <div className="corner-decoration"></div>
    </div>
  );
};

export default LoadingScreen;
