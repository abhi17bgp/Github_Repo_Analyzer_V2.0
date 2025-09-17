import React, { useState, useRef } from "react";
import { Search, Github, X, Download } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { useAnalysisProgress } from "../contexts/AnalysisProgressContext";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";

interface FileNode {
  name: string;
  type: "file" | "folder";
  path?: string;
  download_url?: string;
  children?: FileNode[];
}

interface RepoInputProps {
  onRepoAnalyzed: (fileTree: FileNode, counts?: { analyzedFiles: number, analyzedFolders: number, totalFiles: number, totalFolders: number, analyzedDepth: number, totalDepth: number }, repoUrl?: string, aiContext?: any) => void;
  onAnalysisStart?: () => void;
}

const RepoInput: React.FC<RepoInputProps> = ({ onRepoAnalyzed, onAnalysisStart }) => {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDownloadError, setIsDownloadError] = useState(false);
  const [maxDepth, setMaxDepth] = useState(15);
  const [depthChanged, setDepthChanged] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [lastAnalyzedUrl, setLastAnalyzedUrl] = useState(""); // Store the last analyzed URL
  const { success, error: showError } = useToast();
  const { progress, startAnalysis, completeAnalysis, resetProgress, updateProgressFromServer } = useAnalysisProgress();
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setLoading(true);
    setError("");
    setIsDownloadError(false);
    setIsAnalyzed(false);
    
    // Notify parent that analysis is starting
    onAnalysisStart?.();
    
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    
    // Start analysis with shared progress context
    const analysisId = `analysis-${Date.now()}`;
    startAnalysis(analysisId, maxDepth);

    // Start progress polling
    progressIntervalRef.current = setInterval(async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/github/analyze/progress`
        );
        updateProgressFromServer(response.data);
      } catch (error) {
        console.error("Failed to get progress:", error);
      }
    }, 1000);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/github/analyze`,
        {
          repoUrl: repoUrl.trim(),
          maxDepth: maxDepth,
        },
        {
          signal: abortControllerRef.current.signal,
        }
      );

      onRepoAnalyzed(response.data.fileTree, response.data.analysisConfig ? {
        analyzedFiles: response.data.analysisConfig.analyzedFiles,
        analyzedFolders: response.data.analysisConfig.analyzedFolders,
        totalFiles: response.data.analysisConfig.totalFiles,
        totalFolders: response.data.analysisConfig.totalFolders,
        analyzedDepth: response.data.analysisConfig.actualDepth,
        totalDepth: response.data.analysisConfig.realRepositoryDepth
      } : undefined, repoUrl, response.data.aiContext);
      
      setIsAnalyzed(true);
      completeAnalysis();
      
      success(
        "Repository Analyzed!",
        "Successfully loaded repository structure"
      );
      setLastAnalyzedUrl(repoUrl); // Store the analyzed URL for download
      setRepoUrl(""); // Clear input field
    } catch (err: any) {
      resetProgress();
      if (err.name === "AbortError" || err.code === "ERR_CANCELED" || err.response?.status === 499) {
        // Cancellation is a normal user action, not an error
        setError(""); // Clear any error message
        return;
      }

      let errorMessage = "Failed to analyze repository";
      
      // Provide more specific error messages based on the error type
      if (err.response?.status === 400) {
        if (err.response?.data?.message?.includes("Invalid GitHub URL")) {
          errorMessage = "Please enter a valid GitHub repository URL (e.g., https://github.com/username/repo)";
        } else if (err.response?.data?.message?.includes("Repository URL is required")) {
          errorMessage = "Please enter a GitHub repository URL";
        } else {
          errorMessage = err.response?.data?.message || "Invalid request. Please check your URL format.";
        }
      } else if (err.response?.status === 404) {
        // Use the specific error message from the server
        errorMessage = err.response?.data?.message || "Repository not found. Please check if the URL is correct and the repository exists.";
      } else if (err.response?.status === 403) {
        // Check if it's a rate limit error
        if (err.response?.data?.message?.includes('rate limit')) {
          errorMessage = "GitHub API rate limit exceeded. Please try again later.";
        } else {
          errorMessage = "Access denied. The repository might be private or you may not have permission to access it.";
        }
      } else if (err.response?.status === 429) {
        errorMessage = "GitHub API rate limit exceeded. Please try again later.";
      } else if (err.response?.status === 503) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (err.response?.status === 422) {
        errorMessage = "Repository is empty or has no accessible content.";
      } else if (err.response?.data?.message?.includes('empty') || err.response?.data?.message?.includes('no content')) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status >= 500) {
        errorMessage = "Server error occurred. Please try again later.";
      } else if (err.code === "NETWORK_ERROR" || err.code === "ERR_NETWORK") {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      showError("Analysis Failed", errorMessage);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;

      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  };

  const handleStopAnalysis = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    try {
      // Also notify the server to cancel the analysis
      await axios.post(`${API_BASE_URL}/github/analyze/cancel`, {
        analysisId: Date.now().toString(),
      });
    } catch (error) {
      console.error("Failed to notify server of cancellation:", error);
    }

    setLoading(false);
    resetProgress();
    setError(""); // Clear error message - cancellation is normal user action

    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base lg:text-lg font-semibold github-text-primary mb-3">
          Analyze Repository
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => {
                setRepoUrl(e.target.value);
                // Clear error message when user starts typing new URL (but not download errors)
                if (error && !isDownloadError) {
                  setError("");
                }
                // Reset analysis state when URL changes
                if (isAnalyzed) {
                  setIsAnalyzed(false);
                }
              }}
              onFocus={() => {
                // Clear error message when user focuses on input (but not download errors)
                if (error && !isDownloadError) {
                  setError("");
                }
              }}
              placeholder="https://github.com/username/repository"
              className="w-full pl-9 sm:pl-10 pr-4 py-3 rounded-lg bg-slate-800/50 border border-green-500/20 github-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 hover:bg-slate-700/50 text-sm sm:text-base focus-ring"
              required
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium github-text-secondary">
              Analysis Depth: <span className={`font-semibold transition-colors duration-300 ${
                progress.isAnalyzing ? 'text-orange-400' : isAnalyzed ? 'text-yellow-400' : 'text-green-400'
              }`}>{maxDepth}</span> levels
              {progress.isAnalyzing && <span className="ml-2 text-xs text-orange-400 animate-pulse">(Disabled during analysis)</span>}
              {isAnalyzed && !progress.isAnalyzing && <span className="ml-2 text-xs text-yellow-400">(Locked after analysis)</span>}
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="5"
                max="20"
                value={maxDepth}
                disabled={progress.isAnalyzing || isAnalyzed}
                onChange={(e) => {
                  if (!progress.isAnalyzing && !isAnalyzed) {
                    setMaxDepth(parseInt(e.target.value));
                    setDepthChanged(true);
                    // Reset the changed state after a short delay
                    setTimeout(() => setDepthChanged(false), 1000);
                  }
                }}
                className={`flex-1 h-3 rounded-lg appearance-none slider transition-all duration-300 ${
                  progress.isAnalyzing 
                    ? 'cursor-not-allowed opacity-40 bg-slate-800/50' 
                    : isAnalyzed
                    ? 'cursor-not-allowed opacity-60 bg-slate-700/50'
                    : 'cursor-pointer bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500'
                }`}
                style={{
                  background: progress.isAnalyzing 
                    ? 'linear-gradient(to right, #1e293b 0%, #1e293b 100%)'
                    : isAnalyzed
                    ? 'linear-gradient(to right, #334155 0%, #334155 100%)'
                    : undefined
                }}
              />
              <div className={`flex items-center justify-center min-w-[4rem] h-8 rounded-lg border transition-all duration-300 ${
                progress.isAnalyzing
                  ? 'bg-gradient-to-r from-orange-600/20 to-red-600/20 border-orange-500/30 opacity-60'
                  : isAnalyzed
                  ? 'bg-gradient-to-r from-yellow-600/20 to-amber-600/20 border-yellow-500/30 opacity-80'
                  : depthChanged 
                    ? 'bg-gradient-to-r from-green-600/30 to-emerald-600/30 border-green-500/50 scale-105' 
                    : 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/30'
              }`}>
                <span className={`text-sm font-semibold transition-colors duration-300 ${
                  progress.isAnalyzing 
                    ? 'text-orange-300' 
                    : isAnalyzed
                    ? 'text-yellow-300'
                    : depthChanged 
                      ? 'text-green-300' 
                      : 'text-green-300'
                }`}>
                  {maxDepth}
                </span>
              </div>
            </div>
            <div className={`flex justify-between text-xs transition-colors duration-300 ${
              progress.isAnalyzing ? 'text-gray-600' : isAnalyzed ? 'text-gray-500' : 'text-gray-500'
            }`}>
              <span className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-1 transition-colors duration-300 ${
                  progress.isAnalyzing ? 'bg-orange-400' : isAnalyzed ? 'bg-yellow-400' : 'bg-green-400'
                }`}></div>
                Shallow (5)
              </span>
              <span className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-1 transition-colors duration-300 ${
                  progress.isAnalyzing ? 'bg-orange-400' : isAnalyzed ? 'bg-yellow-400' : 'bg-green-400'
                }`}></div>
                Deep (20)
              </span>
            </div>
          </div>

          {progress.isAnalyzing ? (
            <div className="space-y-3">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleStopAnalysis}
                  className="flex-1 flex items-center justify-center px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 transform hover:scale-105 active:scale-95 text-sm sm:text-base focus-ring"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Stop Analysis
                </button>
                <div className="flex items-center justify-center px-4 py-3 rounded-lg bg-slate-700/50 text-white font-medium text-sm sm:text-base">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Analyzing...
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-3">
                <div className="flex justify-between text-xs text-gray-400">
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                    Progress: {progress.progress}%
                  </span>
                  {/* Depth indicator hidden during analysis */}
                </div>
                <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500 ease-out shadow-lg"
                    style={{ width: `${progress.progress}%` }}
                  ></div>
                </div>
                {progress.currentPath && (
                  <div className="text-xs text-gray-500 truncate bg-slate-800/50 rounded px-2 py-1">
                    <span className="text-green-400">Current:</span> {progress.currentPath}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={!repoUrl.trim()}
                className="github-btn-primary flex-1 flex items-center justify-center px-4 py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white font-medium hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 text-sm sm:text-base focus-ring github-animate-glow"
              >
                <Search className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Analyze Repository
              </button>
              <button
                type="button"
                onClick={async () => {
                  const urlToUse = repoUrl.trim() || lastAnalyzedUrl;
                  if (!urlToUse || downloadLoading) return;
                  
                  setDownloadLoading(true);
                  setError(""); // Clear any previous errors
                  setIsDownloadError(false);
                  
                  try {
                    // Validate GitHub URL format first
                    if (!urlToUse.includes('github.com')) {
                      throw new Error("Please enter a valid GitHub repository URL (e.g., https://github.com/username/repo)");
                    }
                    
                    // Parse repository owner and name
                    const parts = urlToUse.split('/');
                    if (parts.length < 5 || !parts[3] || !parts[4]) {
                      throw new Error("Invalid GitHub URL format. Please use: https://github.com/username/repository");
                    }
                    
                    const owner = parts[3];
                    const repo = parts[4].replace('.git', '');
                    
                    if (!owner || !repo) {
                      throw new Error("Could not extract repository information from URL. Please check the repository name.");
                    }
                    
                    // Use the backend API to validate repository and get default branch
                    let defaultBranch = 'main'; // Default fallback
                    let validationSuccessful = false;
                    const userToken = localStorage.getItem('token');
                    
                    // Only try backend validation if user is authenticated
                    if (userToken) {
                      try {
                        const response = await axios.post(`${API_BASE_URL}/github/validate`, {
                          repoUrl: urlToUse
                        }, {
                          timeout: 15000,
                          headers: {
                            'Authorization': `Bearer ${userToken}`
                          }
                        });
                        
                        if (response.data.error) {
                          throw new Error(response.data.message || "Repository validation failed");
                        }
                        
                        const { defaultBranch: repoDefaultBranch, exists } = response.data;
                        
                        if (!exists) {
                          throw new Error("Repository not found. Please enter an existing repository name.");
                        }
                        
                        defaultBranch = repoDefaultBranch;
                        validationSuccessful = true;
                        
                      } catch (validationError: any) {
                        console.warn('Backend validation failed, trying fallback methods:', validationError.message);
                        
                        // Fallback: Try to detect default branch by checking common branch names
                        const commonBranches = ['main', 'master', 'develop', 'dev'];
                        let detectedBranch = null;
                        
                        for (const branch of commonBranches) {
                          try {
                            const testUrl = `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`;
                            const testResponse = await axios.get(testUrl, {
                              timeout: 5000,
                              validateStatus: (status) => status < 500
                            });
                            
                            if (testResponse.status === 200) {
                              detectedBranch = branch;
                              break;
                            }
                          } catch (e) {
                            // Continue to next branch
                            continue;
                          }
                        }
                        
                        if (detectedBranch) {
                          defaultBranch = detectedBranch;
                          validationSuccessful = true;
                          console.log(`Fallback validation successful: detected branch ${detectedBranch}`);
                        } else {
                          // If all else fails, throw the original validation error
                          if (validationError.response?.status === 404) {
                            throw new Error("Repository not found. Please enter an existing repository name.");
                          } else if (validationError.response?.status === 403) {
                            throw new Error("Access denied. The repository might be private or you may not have permission to access it.");
                          } else if (validationError.response?.status === 429) {
                            throw new Error("GitHub API rate limit exceeded. Please try again later.");
                          } else if (validationError.code === "NETWORK_ERROR" || validationError.code === "ERR_NETWORK") {
                            throw new Error("Network error. Please check your internet connection and try again.");
                          } else if (validationError.message) {
                            throw new Error(validationError.message);
                          } else {
                            throw new Error("Repository validation failed. Please check the URL and try again.");
                          }
                        }
                      }
                    } else {
                      // User not authenticated, try simple validation
                      console.log('User not authenticated, using simple validation');
                      
                      try {
                        // Simple validation: just check if the repository exists
                        const testResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
                          timeout: 10000,
                          validateStatus: (status) => status < 500
                        });
                        
                        if (testResponse.status === 404) {
                          throw new Error("Repository not found. Please enter an existing repository name.");
                        } else if (testResponse.status === 403) {
                          throw new Error("Access denied. The repository might be private or you may not have permission to access it.");
                        } else if (testResponse.status !== 200) {
                          throw new Error("Repository not found. Please enter an existing repository name.");
                        }
                        
                        // Try to get the default branch from the response
                        if (testResponse.data.default_branch) {
                          defaultBranch = testResponse.data.default_branch;
                        }
                        
                        validationSuccessful = true;
                        
                      } catch (simpleValidationError: any) {
                        if (simpleValidationError.response?.status === 404) {
                          throw new Error("Repository not found. Please enter an existing repository name.");
                        } else if (simpleValidationError.response?.status === 403) {
                          throw new Error("Access denied. The repository might be private or you may not have permission to access it.");
                        } else if (simpleValidationError.response?.status === 429) {
                          throw new Error("GitHub API rate limit exceeded. Please try again later.");
                        } else if (simpleValidationError.code === "NETWORK_ERROR" || simpleValidationError.code === "ERR_NETWORK") {
                          throw new Error("Network error. Please check your internet connection and try again.");
                        } else {
                          throw new Error("Repository validation failed. Please check the URL and try again.");
                        }
                      }
                    }
                    
                    // Convert GitHub URL to ZIP download URL using the detected/validated default branch
                    let zipUrl = urlToUse;
                    let fileName = `${owner}-${repo}.zip`;
                    
                    if (urlToUse.endsWith('.git')) {
                      zipUrl = urlToUse.replace('.git', `/archive/refs/heads/${defaultBranch}.zip`);
                    } else if (!urlToUse.includes('/archive/')) {
                      zipUrl = urlToUse + `/archive/refs/heads/${defaultBranch}.zip`;
                    }
                    
                    // Try to download using fetch first (prevents navigation)
                    try {
                      const response = await fetch(zipUrl, {
                        method: 'GET',
                        mode: 'cors'
                      });
                      
                      if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = fileName;
                        link.style.display = 'none';
                        document.body.appendChild(link);
                        
                        // Create a promise that resolves when download is complete
                        const downloadPromise = new Promise<void>((resolve) => {
                          let downloadCompleted = false;
                          
                          // Listen for the download to complete by monitoring the blob URL
                          const checkDownloadStatus = () => {
                            // Try to access the blob URL
                            fetch(url, { method: 'HEAD' })
                              .then(() => {
                                // URL is still accessible, download might still be in progress
                                if (!downloadCompleted) {
                                  setTimeout(checkDownloadStatus, 200);
                                }
                              })
                              .catch(() => {
                                // URL is no longer accessible, download likely completed
                                if (!downloadCompleted) {
                                  downloadCompleted = true;
                                  resolve();
                                }
                              });
                          };
                          
                          // Start checking after a short delay
                          setTimeout(checkDownloadStatus, 100);
                          
                          // Fallback: resolve after a reasonable time
                          setTimeout(() => {
                            if (!downloadCompleted) {
                              downloadCompleted = true;
                              resolve();
                            }
                          }, 8000); // 8 seconds max
                        });
                        
                        link.click();
                        document.body.removeChild(link);
                        
                        // Wait for download to complete, then show notification
                        await downloadPromise;
                        
                        // Clean up the object URL
                        window.URL.revokeObjectURL(url);
                        
                        // Show success notification after download is complete
                        const successMessage = validationSuccessful 
                          ? `Repository downloaded successfully: ${owner}/${repo} (${defaultBranch} branch)`
                          : `Repository downloaded successfully: ${owner}/${repo} (using ${defaultBranch} branch)`;
                        
                        success("Download Complete", successMessage);
                      } else {
                        throw new Error('Failed to fetch repository');
                      }
                    } catch (fetchError) {
                      console.warn('Fetch download failed, falling back to direct link:', fetchError);
                      
                      // Fallback: Create a temporary link element (this may cause brief navigation)
                      const link = document.createElement('a');
                      link.href = zipUrl;
                      link.download = fileName;
                      link.style.display = 'none';
                      link.style.position = 'absolute';
                      link.style.left = '-9999px';
                      link.style.top = '-9999px';
                      
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      
                      // For fallback method, we can't reliably detect completion
                      // So we'll show notification after a reasonable delay
                      setTimeout(() => {
                        const successMessage = validationSuccessful 
                          ? `Repository download started: ${owner}/${repo} (${defaultBranch} branch)`
                          : `Repository download started: ${owner}/${repo} (using ${defaultBranch} branch)`;
                        
                        success("Download Started", successMessage);
                      }, 1000);
                    }
                    
                  } catch (err: any) {
                    let errorMessage = "Failed to download repository";
                    
                    // Provide more specific error messages based on the error type
                    if (err.message && err.message.includes("valid GitHub URL")) {
                      errorMessage = err.message;
                    } else if (err.message && err.message.includes("Invalid GitHub URL format")) {
                      errorMessage = err.message;
                    } else if (err.message && err.message.includes("Could not extract")) {
                      errorMessage = err.message;
                    } else if (err.message && err.message.includes("Repository not found")) {
                      errorMessage = "Repository not found. Please enter an existing repository name.";
                    } else if (err.message && err.message.includes("Access denied")) {
                      errorMessage = err.message;
                    } else if (err.message && err.message.includes("Network error")) {
                      errorMessage = err.message;
                    } else if (err.message && err.message.includes("rate limit")) {
                      errorMessage = "GitHub API rate limit exceeded. Please try again later.";
                    } else if (err.message && err.message.includes("validation failed")) {
                      errorMessage = err.message;
                    } else if (err.name === "TypeError" && err.message.includes("network")) {
                      errorMessage = "Network error. Please check your internet connection and try again.";
                    } else if (err.message) {
                      errorMessage = err.message;
                    }
                    
                    setError(errorMessage);
                    setIsDownloadError(true);
                    showError("Download Failed", errorMessage);
                    
                    // Auto-dismiss error after 5 seconds
                    setTimeout(() => {
                      setError("");
                      setIsDownloadError(false);
                    }, 5000);
                  } finally {
                    setDownloadLoading(false);
                  }
                }}
                disabled={(!repoUrl.trim() && !lastAnalyzedUrl) || downloadLoading}
                className="px-4 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 text-sm sm:text-base focus-ring"
                title={lastAnalyzedUrl && !repoUrl.trim() 
                  ? `Download last analyzed repository as ZIP: ${lastAnalyzedUrl}` 
                  : "Download repository as ZIP"}
              >
                {downloadLoading ? (
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
          )}
        </form>

        {/* Show which repository will be downloaded when input is empty */}
        {lastAnalyzedUrl && !repoUrl.trim() && (
          <div className="mt-2 text-xs text-gray-400 text-center">
            Download will use: <span className="text-blue-400 font-mono">{lastAnalyzedUrl}</span>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm animate-fade-in">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0 w-4 h-4 mt-0.5">
                <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 text-overflow-safe">
                {error}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs github-text-secondary leading-relaxed bg-slate-800/50 rounded-lg p-3 border border-green-500/20">
        <p className="mb-2">
          <strong>Supported formats:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2 text-gray-500">
          <li>https://github.com/user/repo</li>
          <li>github.com/user/repo</li>
        </ul>
        <p className="mt-3 text-gray-500 text-xs">
          Only public repositories are supported. Private repos require
          authentication.
        </p>
      </div>
    </div>
  );
};

export default RepoInput;
