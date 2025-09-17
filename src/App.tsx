// import React from 'react';
// import { AuthProvider, useAuth } from './contexts/AuthContext';
// import Login from './components/Login';
// import Dashboard from './components/Dashboard';

// const AppContent: React.FC = () => {
//   const { user, loading } = useAuth();

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-900 flex items-center justify-center">
//         <div className="flex items-center space-x-3 text-white">
//           <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
//           <span className="text-lg">Loading...</span>
//         </div>
//       </div>
//     );
//   }

//   return user ? <Dashboard /> : <Login />;
// };

// function App() {
//   return (
//     <AuthProvider>
//       <AppContent />
//     </AuthProvider>
//   );
// }

// export default App;
import React, { useState, useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { FullscreenProvider } from "./contexts/FullscreenContext";
import { AnalysisProgressProvider } from "./contexts/AnalysisProgressContext";
import { useAuth } from "./contexts/AuthContext";
import HomePage from "./components/HomePage";
import Dashboard from "./components/Dashboard";
import LoadingScreen from "./components/LoadingScreen";

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Show loading screen on initial app load
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoadingScreen(false);
      setIsInitialLoad(false);
    }, 3000); // Show loading screen for 3 seconds

    return () => clearTimeout(timer);
  }, []);

  // Show loading screen on initial load
  if (showLoadingScreen && isInitialLoad) {
    return <LoadingScreen onComplete={() => setShowLoadingScreen(false)} />;
  }

  // Show auth loading if still loading after initial screen
  if (loading && !isInitialLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-800 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center max-w-sm w-full">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-base sm:text-lg font-medium">Loading...</p>
          <p className="text-gray-400 text-sm mt-2">Preparing your workspace</p>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <HomePage />;
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <FullscreenProvider>
          <AnalysisProgressProvider>
            <AppContent />
          </AnalysisProgressProvider>
        </FullscreenProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
