import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useFullscreen } from "../contexts/FullscreenContext";
import RepoInput from "./RepoInput";
import FileTreeVisualization from "./FileTreeVisualization";
import CodeAnalysisPanel from "./CodeAnalysisPanel";
import { FullscreenContainer } from "./FullscreenContainer";
import AIAssistant from "./AIAssistant";
import ChatHistoryView from "./ChatHistoryView";
import { LogOut, Github, User, Trash2, MessageCircle, FolderTree, X } from "lucide-react";
import axios from "axios";
import { API_BASE_URL, api } from "../utils/api";

interface FileNode {
  name: string;
  type: "file" | "folder";
  path?: string;
  download_url?: string;
  children?: FileNode[];
  size?: number;
}

interface Repository {
  id: number;
  repo_url: string;
  repo_data: FileNode;
  repo_stats?: {
    analyzedFiles: number;
    analyzedFolders: number;
    totalFiles: number;
    totalFolders: number;
    analyzedDepth: number;
    totalDepth: number;
    totalSize: number;
    isPrivate: boolean;
    language: string;
    description: string;
    stars: number;
    forks: number;
    lastAnalyzed: string;
  };
  created_at: string;
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { error: showError, success } = useToast();
  const { fullscreenMode, switchToAnalysis } = useFullscreen();
  const [currentRepo, setCurrentRepo] = useState<FileNode | null>(null);
  const [currentRepoUrl, setCurrentRepoUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{
    content: string;
    name: string;
    path: string;
    download_url?: string;
    isBinary?: boolean;
  } | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [repositoriesLoading, setRepositoriesLoading] = useState(false);
  const [deletingRepo, setDeletingRepo] = useState<number | null>(null);
  const [showAllRepositories, setShowAllRepositories] = useState(false);
  const [counts, setCounts] = useState<{ analyzedFiles: number, analyzedFolders: number, totalFiles: number, totalFolders: number, analyzedDepth: number, totalDepth: number } | null>(null);
  const [analysisData, setAnalysisData] = useState<{
    summary: string;
    keyFunctions: Array<{
      name: string;
      description: string;
    }>;
    cleanCode: boolean | null;
    issues: string[];
    improvements: string[];
    libraries: string[];
    language: string;
  } | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [aiContext, setAiContext] = useState<{
    readme?: string;
    packageJson?: any;
    repoInfo?: any;
  } | null>(null);
  const [activeView, setActiveView] = useState<'filetree' | 'chathistory'>('filetree');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate which repositories to show
  const displayedRepositories = showAllRepositories
    ? repositories
    : repositories.slice(0, 5);
  const hasMoreRepositories = repositories.length > 5;

  useEffect(() => {
    // Add a small delay to ensure login process completes
    const timer = setTimeout(() => {
      fetchRepositories();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const fetchRepositories = async () => {
    setRepositoriesLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/github/repositories`);
      setRepositories(response.data.repositories || []);
      // Reset view to show first 5 when repositories change
      setShowAllRepositories(false);
    } catch (error: any) {
      // Handle different error cases appropriately
      if (error.response?.status === 500) {
        // Server error - show toast
        showError(
          "Server Error",
          "Could not fetch your repositories due to server error"
        );
      } else if (error.response?.status === 401) {
        // Unauthorized - might be expected for new users, don't show toast
        console.log("User not authorized to fetch repositories yet");
      } else if (error.response?.status === 404) {
        // Not found - might be expected for new users, don't show toast
        console.log("No repositories endpoint found");
      } else if (
        error.code === "NETWORK_ERROR" ||
        error.code === "ERR_NETWORK"
      ) {
        // Network error - show toast
        showError(
          "Network Error",
          "Could not connect to server. Please check your connection."
        );
      } else {
        // Other errors - log but don't show toast to avoid spam
        console.log(
          "Repository fetch error:",
          error.response?.status || error.message
        );
      }
      // Always set empty array to prevent undefined errors
      setRepositories([]);
    } finally {
      setRepositoriesLoading(false);
    }
  };

  const handleRepoAnalyzed = (fileTree: FileNode, counts?: { analyzedFiles: number, analyzedFolders: number, totalFiles: number, totalFolders: number, analyzedDepth: number, totalDepth: number }, repoUrl?: string, aiContext?: any) => {
    setCurrentRepo(fileTree);
    setCurrentRepoUrl(repoUrl || null);
    setAiContext(aiContext || null);
    setCounts(counts || null);
    setActiveView('filetree'); // Reset to file tree view
    setShowAIAssistant(true); // Show AI assistant after analysis is complete
    
    // Clear any previously selected file and analysis data when new repository is analyzed
    setSelectedFile(null);
    setAnalysisData(null);
    setAnalysisError("");
    setAnalysisLoading(false);
    
    fetchRepositories(); // Refresh the list
  };

  const handleQuickLoadRepository = (repository: Repository) => {
    setCurrentRepo(repository.repo_data);
    setCurrentRepoUrl(repository.repo_url);
    setActiveView('filetree'); // Reset to file tree view
    setShowAIAssistant(false); // Hide AI assistant when loading from recent history
    
    // Clear any previously selected file and analysis data when loading repository from history
    setSelectedFile(null);
    setAnalysisData(null);
    setAnalysisError("");
    setAnalysisLoading(false);
    
    if (repository.repo_stats) {
      setCounts({
        analyzedFiles: repository.repo_stats.analyzedFiles,
        analyzedFolders: repository.repo_stats.analyzedFolders,
        totalFiles: repository.repo_stats.totalFiles,
        totalFolders: repository.repo_stats.totalFolders,
        analyzedDepth: repository.repo_stats.analyzedDepth,
        totalDepth: repository.repo_stats.totalDepth
      });
    }
    success("Repository Loaded", `Quickly loaded ${repository.repo_url}`);
  };

  const handleAnalysisStart = () => {
    setShowAIAssistant(false); // Hide AI assistant during analysis
    
    // Clear any previously selected file and analysis data when starting new analysis
    setSelectedFile(null);
    setAnalysisData(null);
    setAnalysisError("");
    setAnalysisLoading(false);
  };

  const handleFileSelect = async (file: FileNode) => {
    if (file.type !== "file" || !file.download_url) return;
    
    // Clear previous analysis data when selecting a new file
    setAnalysisData(null);
    setAnalysisError("");
    
    await loadFileContent(file);
    
    // If tree is in fullscreen mode, switch to analysis fullscreen
    if (fullscreenMode === 'tree') {
      switchToAnalysis();
    }
  };

  // Function to detect if a file is binary/unsupported
  const isBinaryFile = (filename: string): boolean => {
    const binaryExtensions = [
      // Archives
      '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz',
      // Images
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico', '.webp', '.tiff', '.tif',
      // Videos
      '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv',
      // Audio
      '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a',
      // Documents
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      // Executables
      '.exe', '.dll', '.so', '.dylib', '.bin',
      // Other binary files
      '.db', '.sqlite', '.sqlite3', '.mdb', '.accdb',
      '.psd', '.ai', '.eps', '.sketch',
      '.woff', '.woff2', '.ttf', '.eot', '.otf',
      '.apk', '.ipa', '.deb', '.rpm'
    ];
    
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return binaryExtensions.includes(extension);
  };

  const loadFileContent = async (file: FileNode) => {
    // Check if file is binary/unsupported
    if (isBinaryFile(file.name)) {
      setSelectedFile({
        content: `This file format (${file.name.split('.').pop()?.toUpperCase()}) is not supported for text viewing.\n\nFile: ${file.name}\nSize: ${file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown'}\n\nYou can download this file directly from GitHub using the download URL.`,
        name: file.name,
        path: file.path || file.name,
        download_url: file.download_url,
        isBinary: true,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/github/file-content`, {
        params: { url: file.download_url },
        timeout: 30000, // 30 second timeout for large files
      });

      // Display all file content regardless of size
      const content = response.data.content;
      setSelectedFile({
        content: content,
        name: file.name,
        path: file.path || file.name,
        download_url: file.download_url,
        isBinary: false,
      });
    } catch (error: any) {
      console.error("File load error:", error);

      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        showError(
          "File Load Timeout",
          "The file is too large or the server is taking too long to respond. Try a smaller file."
        );
      } else if (error.response?.status === 413) {
        showError(
          "File Too Large",
          "This file is too large to load. Try a smaller file."
        );
      } else {
        showError(
          "File Load Error",
          "Could not load file content. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };



  const handleDeleteRepository = async (
    repoId: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // Prevent loading the repository

    if (
      !confirm(
        "Are you sure you want to delete this repository? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeletingRepo(repoId);

    try {
      await axios.delete(`${API_BASE_URL}/github/repositories/${repoId}`);

      // Remove from local state
      setRepositories((prev) => prev.filter((repo) => repo.id !== repoId));

      // If the deleted repo was currently loaded, clear it
      if (
        currentRepo &&
        repositories.find((repo) => repo.id === repoId)?.repo_data ===
          currentRepo
      ) {
        setCurrentRepo(null);
        setSelectedFile(null);
      }

      success("Repository Deleted", "Repository has been successfully deleted");
    } catch (error: any) {
      console.error("Delete repository error:", error);
      showError(
        "Delete Failed",
        "Failed to delete repository. Please try again."
      );
    } finally {
      setDeletingRepo(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('🗑️ Starting account deletion...');
      const result = await api.deleteAccount(token);
      console.log('✅ Account deletion result:', result);
      
      // Clear all localStorage data including AI chat logs
      localStorage.clear();
      console.log('🧹 Cleared localStorage data');
      
      // Logout user
      logout();
      console.log('👋 User logged out');
      
      // Show success message with detailed information
      let successMessage = `Account deleted successfully. ${result.deletedRepositories} repositories removed.`;
      if (result.failedDeletions && result.failedDeletions.length > 0) {
        successMessage += ` Note: ${result.failedDeletions.length} repositories could not be deleted.`;
      }
      
      success('Account Deleted', successMessage);
      setIsDeleteConfirmOpen(false);
    } catch (error) {
      console.error('❌ Delete account error:', error);
      
      // Enhanced error handling
      let errorMessage = 'Failed to delete account';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      showError('Delete Failed', errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900 text-white">
      {/* Header */}
      <header className="github-navbar bg-gradient-to-r from-slate-900 via-gray-800 to-slate-900 border-b border-green-500/20 px-4 sm:px-6 py-4 sticky top-0 z-40 backdrop-blur-sm shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center min-w-0">
            <div className="p-2 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg mr-3 flex-shrink-0 github-animate-glow">
              <Github className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold truncate github-text-primary github-gradient-text">
                GitHub Repo Analyzer
              </h1>
             
            </div>
           
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="hidden md:flex items-center github-text-secondary">
              <User className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="text-sm truncate max-w-32 lg:max-w-none">
                {user?.username ? user.username : user?.email}
              </span>
            </div>
            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="flex items-center px-2 sm:px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 backdrop-blur-md transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-red-500/20"
            >
              <Trash2 className="w-4 h-4 sm:mr-2 text-red-400" />
              <span className="hidden sm:inline text-red-300">Delete Account</span>
            </button>
            <button
              onClick={() => {
                logout();
                success("Logged Out", "You have been successfully logged out");
              }}
              className="flex items-center px-2 sm:px-3 py-2 rounded-lg bg-slate-500/20 hover:bg-slate-500/30 border border-slate-400/30 hover:border-slate-400/50 backdrop-blur-md transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-slate-500/20"
            >
              <LogOut className="w-4 h-4 sm:mr-2 text-slate-300" />
              <span className="hidden sm:inline text-slate-200">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] ">
        {/* Left Sidebar */}
        <div className="w-full lg:w-80 xl:w-96 bg-slate-800/50 border-b lg:border-b-0 lg:border-r border-green-500/20 p-4 sm:p-6 overflow-y-auto max-h-96 lg:max-h-none lg:min-h-0 scrollbar-thin">
        
          <RepoInput onRepoAnalyzed={handleRepoAnalyzed} onAnalysisStart={handleAnalysisStart} />

          {repositoriesLoading ? (
            <div className="mt-6 lg:mt-8">
              <h3 className="text-base lg:text-lg font-semibold github-text-primary mb-4">
                Recent Repositories
              </h3>
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin mr-3" />
                <span className="text-sm github-text-secondary">
                  Loading repositories...
                </span>
              </div>
            </div>
          ) : repositories.length > 0 ? (
            <div className="mt-6 lg:mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base lg:text-lg font-semibold github-text-primary">
                  Recent Repositories
                </h3>
                <span className="text-xs github-text-secondary bg-slate-700/50 px-2 py-1 rounded-full border border-green-500/20">
                  {displayedRepositories.length} of {repositories.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3 transition-all duration-300">
                {displayedRepositories.map((repo) => (
                  <div key={repo.id} className="relative group">
                    <button
                      onClick={() => handleQuickLoadRepository(repo)}
                      className="w-full text-left p-3 sm:p-4 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-all duration-300 transform hover:scale-105 border border-green-500/20 hover:border-green-500/30 focus-ring pr-12"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium github-text-primary truncate mb-1">
                        {repo.repo_url.split("/").slice(-2).join("/")}
                          </div>
                          {repo.repo_stats?.description && (
                            <div className="text-xs github-text-secondary truncate mb-2">
                              {repo.repo_stats.description}
                            </div>
                          )}
                        </div>
                        {repo.repo_stats?.isPrivate && (
                          <div className="ml-2 px-2 py-1 bg-yellow-600/20 text-yellow-300 text-xs rounded-full border border-yellow-500/30">
                            Private
                          </div>
                        )}
                      </div>

                      {/* Repository Meta Info */}
                      <div className="flex items-center justify-between text-xs github-text-secondary">
                        <div className="flex items-center space-x-3">
                          {repo.repo_stats?.language && (
                            <span className="px-2 py-1 bg-green-600/20 text-green-300 rounded border border-green-500/30">
                              {repo.repo_stats.language.toString().replace(/[^a-zA-Z\+#]/g, '')}
                            </span>
                          )}
                        </div>
                        <div>
                        {new Date(repo.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={(e) => handleDeleteRepository(repo.id, e)}
                      disabled={deletingRepo === repo.id}
                      className="absolute right-2 top-2 p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 backdrop-blur-md text-red-300 hover:text-red-200 opacity-0 group-hover:opacity-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus-ring shadow-lg hover:shadow-red-500/20"
                      title="Delete repository"
                    >
                      {deletingRepo === repo.id ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {/* View More/Less Button */}
              {hasMoreRepositories && (
                <div className="mt-4 pt-3 border-t border-green-500/20">
                  <button
                    onClick={() => setShowAllRepositories(!showAllRepositories)}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/30 backdrop-blur-md rounded-lg transition-all duration-300 group shadow-lg hover:shadow-green-500/20"
                  >
                    <span className="mr-2">
                      {showAllRepositories
                        ? "Show Less"
                        : `View ${repositories.length - 5} More`}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${
                        showAllRepositories ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              )}

              {/* Show message when all repositories are displayed */}
              {!hasMoreRepositories && repositories.length > 0 && (
                <div className="mt-4 pt-3 border-t border-green-500/20">
                  <div className="text-center text-xs github-text-secondary">
                    All {repositories.length} repositories shown
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 lg:mt-8">
              <h3 className="text-base lg:text-lg font-semibold github-text-primary mb-4">
                Recent Repositories
              </h3>
              <div className="text-center py-4">
                <p className="text-sm github-text-secondary">
                  No repositories analyzed yet. Start by analyzing a repository
                  above!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Main Content - Flexible Layout */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* File Tree and AI Panel Container */}
          <div className="flex-1 flex flex-col xl:flex-row min-h-0">
            {/* File Tree Visualization - Flexible Width */}
            <div
              className={`flex-1 p-4 sm:p-6 min-h-96 xl:min-h-0 overflow-hidden transition-all duration-300 ${
                selectedFile ? "xl:w-[90px]" : "xl:w-full"
              }`}
            >
              {currentRepo ? (
                <div className="h-full flex flex-col">
                  {/* View Toggle */}
                  <div className="flex-shrink-0 p-4 border-b border-green-500/20">
                    <div className="flex items-center space-x-1 bg-slate-800/50 rounded-lg p-1 border border-green-500/20">
                      <button
                        onClick={() => setActiveView('filetree')}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          activeView === 'filetree'
                            ? 'bg-green-600 text-white'
                            : 'github-text-secondary hover:text-white hover:bg-slate-700/50'
                        }`}
                      >
                        <FolderTree className="w-4 h-4" />
                        <span>File Tree</span>
                      </button>
                      <button
                        onClick={() => setActiveView('chathistory')}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          activeView === 'chathistory'
                            ? 'bg-green-600 text-white'
                            : 'github-text-secondary hover:text-white hover:bg-slate-700/50'
                        }`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Chat History</span>
                      </button>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 min-h-0">
                    {activeView === 'filetree' ? (
                      <FileTreeVisualization
                        data={currentRepo}
                        onFileSelect={handleFileSelect}
                        counts={counts}
                      />
                    ) : (
                      currentRepoUrl && (
                        <ChatHistoryView repositoryUrl={currentRepoUrl} />
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-96">
                  <div className="text-center github-text-secondary px-4">
                    <div className="p-4 bg-slate-800/50 rounded-full mx-auto mb-4 w-fit border border-green-500/20">
                      <Github className="w-12 h-12 sm:w-16 sm:h-16 text-green-400 opacity-50" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-2 github-text-primary">
                      No Repository Selected
                    </h3>
                    <p className="text-sm sm:text-base max-w-md mx-auto text-overflow-safe">
                      Enter a GitHub repository URL to get started
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Code Analysis Panel - Flexible Width */}
            {selectedFile && (
              <div className="xl:w-1/2 border-t xl:border-t-0 xl:border-l border-green-500/20">
                <CodeAnalysisPanel
                  file={selectedFile}
                  onClose={() => setSelectedFile(null)}
                  analysisData={analysisData}
                  setAnalysisData={setAnalysisData}
                  analysisLoading={analysisLoading}
                  setAnalysisLoading={setAnalysisLoading}
                  analysisError={analysisError}
                  setAnalysisError={setAnalysisError}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/95 rounded-lg p-4 sm:p-6 flex items-center max-w-sm w-full mx-4 border border-green-500/20">
            <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-sm sm:text-base github-text-primary">
              Loading file content...
            </span>
          </div>
        </div>
      )}

      {/* Fullscreen Tree View */}
      {fullscreenMode === 'tree' && currentRepo && (
        <FullscreenContainer
          title="Repository Tree"
          icon={<Github className="w-5 h-5 text-green-400" />}
        >
          <div className="h-full w-full">
            <FileTreeVisualization
              data={currentRepo}
              onFileSelect={handleFileSelect}
              counts={counts}
            />
          </div>
        </FullscreenContainer>
      )}

      {/* Fullscreen Analysis View */}
      {fullscreenMode === 'analysis' && selectedFile && (
        <FullscreenContainer
          title="AI Code Analysis"
          icon={<Github className="w-5 h-5 text-green-400" />}
          onClose={() => setSelectedFile(null)}
        >
          <div className="h-full">
            <CodeAnalysisPanel
              file={selectedFile}
              onClose={() => setSelectedFile(null)}
              analysisData={analysisData}
              setAnalysisData={setAnalysisData}
              analysisLoading={analysisLoading}
              setAnalysisLoading={setAnalysisLoading}
              analysisError={analysisError}
              setAnalysisError={setAnalysisError}
            />
          </div>
        </FullscreenContainer>
      )}

      {/* AI Assistant */}
      <AIAssistant
        repositoryUrl={currentRepoUrl}
        repositoryData={aiContext ? {
          readme: aiContext.readme,
          packageJson: aiContext.packageJson,
          fileTree: currentRepo,
          repoInfo: aiContext.repoInfo
        } : null}
        isVisible={!!currentRepo && !!currentRepoUrl && showAIAssistant}
      />

      {/* Delete Account Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900/95 border border-red-500/30 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold github-text-primary flex items-center space-x-2">
                  <Trash2 className="w-6 h-6 text-red-400" />
                  <span>Delete Account</span>
                </h2>
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="github-text-secondary hover:text-white transition-colors duration-200"
                  disabled={isDeleting}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="github-text-secondary">
                  Are you sure you want to delete your account? This action cannot be undone.
                </p>
                
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <h3 className="text-red-400 font-medium mb-2">This will permanently delete:</h3>
                  <ul className="github-text-secondary text-sm space-y-1">
                    <li>• Your user profile and account</li>
                    <li>• All your repository analysis history</li>
                    <li>• All your AI chat conversations</li>
                    <li>• All associated data and preferences</li>
                  </ul>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    className="flex-1 px-4 py-2 bg-slate-500/20 hover:bg-slate-500/30 border border-slate-400/30 hover:border-slate-400/50 backdrop-blur-md text-slate-300 hover:text-slate-200 rounded-lg transition-all duration-300 shadow-lg hover:shadow-slate-500/20"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 backdrop-blur-md text-red-300 hover:text-red-200 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-red-500/20"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Account</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
