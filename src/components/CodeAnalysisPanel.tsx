import React, { useState, useEffect, useRef } from "react";
import { X, Brain, Copy, Check, FileText, Maximize2, Download } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { useFullscreen } from "../contexts/FullscreenContext";
import axios from "axios";
import { useJsonContent } from "../hooks/useJsonContent";
import { API_BASE_URL } from "../utils/api";

interface AnalysisData {
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
}

interface CodeAnalysisPanelProps {
  file: {
    content: string;
    name: string;
    path: string;
    download_url?: string;
    isBinary?: boolean;
  };
  onClose: () => void;
  analysisData?: AnalysisData | null;
  setAnalysisData?: (data: AnalysisData | null) => void;
  analysisLoading?: boolean;
  setAnalysisLoading?: (loading: boolean) => void;
  analysisError?: string;
  setAnalysisError?: (error: string) => void;
}

const CodeAnalysisPanel: React.FC<CodeAnalysisPanelProps> = ({
  file,
  onClose,
  analysisData: externalAnalysisData,
  setAnalysisData: externalSetAnalysisData,
  analysisLoading: externalAnalysisLoading,
  setAnalysisLoading: externalSetAnalysisLoading,
  analysisError: externalAnalysisError,
  setAnalysisError: externalSetAnalysisError,
}) => {
  const { toggleFullscreen } = useFullscreen();
  
  // Use external state if provided, otherwise use internal state
  const analysis = externalAnalysisData !== undefined ? externalAnalysisData : useState<AnalysisData | null>(null)[0];
  const setAnalysis = externalSetAnalysisData || useState<AnalysisData | null>(null)[1];
  const loading = externalAnalysisLoading !== undefined ? externalAnalysisLoading : useState(false)[0];
  const setLoading = externalSetAnalysisLoading || useState(false)[1];
  const error = externalAnalysisError !== undefined ? externalAnalysisError : useState("")[0];
  const setError = externalSetAnalysisError || useState("")[1];
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "analysis">("editor");
  const [isImageFile, setIsImageFile] = useState(false);
  const [fileChanged, setFileChanged] = useState(false);
  const { success, error: showError } = useToast();
  const hasShownImageError = useRef(false);

  // Function to detect programming language from file extension
  const detectLanguage = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    const languageMap: { [key: string]: string } = {
      // Web Technologies
      'js': 'JavaScript',
      'jsx': 'JavaScript (React)',
      'ts': 'TypeScript',
      'tsx': 'TypeScript (React)',
      'html': 'HTML',
      'htm': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'sass': 'Sass',
      'less': 'Less',
      'vue': 'Vue.js',
      'svelte': 'Svelte',
      
      // Backend Languages
      'py': 'Python',
      'java': 'Java',
      'kt': 'Kotlin',
      'scala': 'Scala',
      'go': 'Go',
      'rs': 'Rust',
      'php': 'PHP',
      'rb': 'Ruby',
      'pl': 'Perl',
      'r': 'R',
      'swift': 'Swift',
      'dart': 'Dart',
      
      // C Family
      'c': 'C',
      'cpp': 'C++',
      'cc': 'C++',
      'cxx': 'C++',
      'c++': 'C++',
      'cs': 'C#',
      'h': 'C/C++ Header',
      'hpp': 'C++ Header',
      
      // System & Scripting
      'sh': 'Shell Script',
      'bash': 'Bash',
      'zsh': 'Zsh',
      'fish': 'Fish',
      'ps1': 'PowerShell',
      'bat': 'Batch',
      'cmd': 'Batch',
      
      // Configuration & Data
      'json': 'JSON',
      'xml': 'XML',
      'yaml': 'YAML',
      'yml': 'YAML',
      'toml': 'TOML',
      'ini': 'INI',
      'cfg': 'Configuration',
      'conf': 'Configuration',
      'sql': 'SQL',
      'graphql': 'GraphQL',
      
      // Markup & Documentation
      'md': 'Markdown',
      'markdown': 'Markdown',
      'rst': 'reStructuredText',
      'tex': 'LaTeX',
      
      // Other
      'dockerfile': 'Dockerfile',
      'makefile': 'Makefile',
      'cmake': 'CMake',
      'gradle': 'Gradle',
      'maven': 'Maven',
      'pom': 'Maven POM',
      'lock': 'Lock File',
      'log': 'Log File',
    };
    
    return languageMap[extension] || extension.toUpperCase();
  };

  // Reset analysis state when file changes (only for internal state)
  useEffect(() => {
    // Only reset if we're using internal state (no external state provided)
    if (externalAnalysisData === undefined) {
      setAnalysis(null);
      setError("");
      setLoading(false);
    }
    
    setActiveTab("editor"); // Reset to editor tab for new file
    hasShownImageError.current = false; // Reset image error flag for new file
    setFileChanged(true); // Show file changed indicator
    
    // Clear the file changed indicator after a short delay
    const timer = setTimeout(() => setFileChanged(false), 2000);
    
    // Check if file is an image
    const imageExtensions = [".jpg", ".jpeg", ".png", ".svg"];
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
    const isImage = imageExtensions.includes(`.${fileExtension}`);
    setIsImageFile(isImage);

    if (isImage && !hasShownImageError.current) {
      showError(
        "Unsupported File Type",
        "Image files cannot be opened in the editor"
      );
      hasShownImageError.current = true;
      setActiveTab("analysis"); // Switch to analysis tab which will show the message
    }
    
    return () => clearTimeout(timer); // Cleanup timer
  }, [file.name, file.path]); // Reset when file name or path changes

  // Optimize JSON content rendering to prevent re-renders
  const formattedContent = useJsonContent({
    content: file.content,
    fileName: file.name,
  });

  const analyzeCode = async () => {
    if (isImageFile) {
      showError("Unsupported File Type", "Cannot analyze image files");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/ai/analyze-code`, {
        fileContent: formattedContent,
        fileName: file.name,
      });

      // Add detected language to the analysis data
      const analysisWithLanguage = {
        ...response.data.analysis,
        language: detectLanguage(file.name)
      };
      
      setAnalysis(analysisWithLanguage);
      setActiveTab("analysis");
      success("Analysis Complete!", "AI has analyzed your code successfully");
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "Failed to analyze code";
      setError(errorMessage);
      showError("Analysis Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formattedContent);
      setCopied(true);
      success("Copied!", "Code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showError("Copy Failed", "Could not copy code to clipboard");
    }
  };


  const getLanguage = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      css: "css",
      html: "html",
      json: "json",
      md: "markdown",
      yaml: "yaml",
      yml: "yaml",
    };
    return languageMap[ext || ""] || "text";
  };

  const getLanguageIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    const iconMap: { [key: string]: string } = {
      js: "⚡",
      jsx: "⚛️",
      ts: "📘",
      tsx: "📘",
      py: "🐍",
      java: "☕",
      cpp: "⚙️",
      c: "⚙️",
      css: "🎨",
      html: "🌐",
      json: "📄",
      md: "📝",
      yaml: "⚙️",
      yml: "⚙️",
    };
    return iconMap[ext || ""] || "📄";
  };

  const renderLineNumbers = (content: string) => {
    const lines = content.split("\n");
    return (
      <div className="space-y-0">
        {lines.map((line, index) => (
          <div key={index} className="group/line flex hover:bg-gray-800/20 transition-all duration-200 rounded px-2 py-0.5">
            <div className="w-16 text-right pr-4 text-gray-500/70 text-xs select-none font-mono leading-6 group-hover/line:text-gray-400 transition-colors duration-200">
              {String(index + 1).padStart(3, ' ')}
        </div>
            <div className="flex-1 text-gray-200 text-sm font-mono leading-6 group-hover/line:text-gray-100 transition-colors duration-200">
          {line || "\u00A0"}
        </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAnalysis = (analysis: AnalysisData) => {
    return (
      <div className="space-y-6 animate-in slide-in-from-top-2">
        {/* Summary Section */}
        <div className="group bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg hover:shadow-xl hover:border-blue-500/30 transition-all duration-300">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center group-hover:text-blue-300 transition-colors duration-300">
            <div className="p-2 bg-blue-500/20 rounded-lg mr-3 group-hover:bg-blue-500/30 transition-colors duration-300">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            Summary
          </h3>
          <p className="text-gray-300 leading-relaxed text-base group-hover:text-gray-200 transition-colors duration-300">{analysis.summary}</p>
        </div>

        {/* Key Functions Section */}
        {analysis.keyFunctions.length > 0 && (
          <div className="group bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg hover:shadow-xl hover:border-green-500/30 transition-all duration-300">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center group-hover:text-green-300 transition-colors duration-300">
              <div className="p-2 bg-green-500/20 rounded-lg mr-3 group-hover:bg-green-500/30 transition-colors duration-300">
                <Brain className="w-5 h-5 text-green-400" />
              </div>
              Key Functions & Classes
            </h3>
            <div className="space-y-4">
              {analysis.keyFunctions.map((func, index) => (
                <div key={index} className="group/item bg-gradient-to-r from-gray-700/40 to-gray-800/40 backdrop-blur-sm rounded-lg p-4 border border-gray-600/30 hover:border-blue-500/50 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                  <div className="font-mono text-blue-300 font-bold mb-2 text-lg group-hover/item:text-blue-200 transition-colors duration-300">
                    {func.name}
                  </div>
                  <div className="text-gray-300 text-sm leading-relaxed group-hover/item:text-gray-200 transition-colors duration-300">{func.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Code Quality Section */}
        {analysis.cleanCode !== null && (
          <div className="group bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg hover:shadow-xl hover:border-purple-500/30 transition-all duration-300">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center group-hover:text-purple-300 transition-colors duration-300">
              <div className={`p-2 rounded-lg mr-3 transition-colors duration-300 ${
                analysis.cleanCode ? 'bg-green-500/20 group-hover:bg-green-500/30' : 'bg-red-500/20 group-hover:bg-red-500/30'
              }`}>
                <div className={`w-5 h-5 rounded-full ${
                  analysis.cleanCode ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
              </div>
              Code Quality
            </h3>
            <div className={`inline-flex items-center px-6 py-3 rounded-full text-base font-bold shadow-lg transition-all duration-300 hover:scale-105 ${
              analysis.cleanCode 
                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-2 border-green-500/40 hover:border-green-400/60 hover:shadow-green-500/20' 
                : 'bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-300 border-2 border-red-500/40 hover:border-red-400/60 hover:shadow-red-500/20'
            }`}>
              <div className={`w-3 h-3 rounded-full mr-2 ${
                analysis.cleanCode ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              {analysis.cleanCode ? '✨ Clean & Maintainable' : '⚠️ Needs Improvement'}
            </div>
          </div>
        )}

        {/* Issues Section */}
        {analysis.issues.length > 0 && (
          <div className="group bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg hover:shadow-xl hover:border-red-500/30 transition-all duration-300">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center group-hover:text-red-300 transition-colors duration-300">
              <div className="p-2 bg-red-500/20 rounded-lg mr-3 group-hover:bg-red-500/30 transition-colors duration-300">
                <div className="w-5 h-5 bg-red-400 rounded-full"></div>
              </div>
              Issues & Problems
            </h3>
            <ul className="space-y-3">
              {analysis.issues.map((issue, index) => (
                <li key={index} className="group/item flex items-start bg-gradient-to-r from-red-500/10 to-rose-500/10 backdrop-blur-sm rounded-lg p-3 border border-red-500/20 hover:border-red-400/40 hover:shadow-md transition-all duration-300 hover:scale-[1.01]">
                  <div className="w-3 h-3 bg-red-400 rounded-full mt-1 mr-3 flex-shrink-0 group-hover/item:bg-red-300 transition-colors duration-300"></div>
                  <span className="text-gray-300 text-sm leading-relaxed group-hover/item:text-gray-200 transition-colors duration-300">{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements Section */}
        {analysis.improvements.length > 0 && (
          <div className="group bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg hover:shadow-xl hover:border-yellow-500/30 transition-all duration-300">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center group-hover:text-yellow-300 transition-colors duration-300">
              <div className="p-2 bg-yellow-500/20 rounded-lg mr-3 group-hover:bg-yellow-500/30 transition-colors duration-300">
                <div className="w-5 h-5 bg-yellow-400 rounded-full"></div>
              </div>
              Suggested Improvements
            </h3>
            <ul className="space-y-3">
              {analysis.improvements.map((improvement, index) => (
                <li key={index} className="group/item flex items-start bg-gradient-to-r from-yellow-500/10 to-amber-500/10 backdrop-blur-sm rounded-lg p-3 border border-yellow-500/20 hover:border-yellow-400/40 hover:shadow-md transition-all duration-300 hover:scale-[1.01]">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full mt-1 mr-3 flex-shrink-0 group-hover/item:bg-yellow-300 transition-colors duration-300"></div>
                  <span className="text-gray-300 text-sm leading-relaxed group-hover/item:text-gray-200 transition-colors duration-300">{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Language & Libraries Section */}
        {(analysis.language || analysis.libraries.length > 0) && (
          <div className="group bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg hover:shadow-xl hover:border-purple-500/30 transition-all duration-300">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center group-hover:text-purple-300 transition-colors duration-300">
              <div className="p-2 bg-purple-500/20 rounded-lg mr-3 group-hover:bg-purple-500/30 transition-colors duration-300">
                <div className="w-5 h-5 bg-purple-400 rounded-full"></div>
              </div>
              Language & Libraries
            </h3>
            <div className="flex flex-wrap gap-3">
              {/* Programming Language */}
              {analysis.language && (
                <span 
                  className="group/tag px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 rounded-full text-sm font-medium border border-blue-500/30 hover:border-blue-400/50 hover:bg-gradient-to-r hover:from-blue-500/30 hover:to-cyan-500/30 hover:text-blue-200 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
                >
                  <span className="group-hover/tag:animate-pulse">💻</span>
                  <span className="ml-1">{analysis.language}</span>
                </span>
              )}
              
              {/* Libraries & Frameworks */}
              {analysis.libraries.map((lib, index) => (
                <span 
                  key={index} 
                  className="group/tag px-4 py-2 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 rounded-full text-sm font-medium border border-purple-500/30 hover:border-purple-400/50 hover:bg-gradient-to-r hover:from-purple-500/30 hover:to-indigo-500/30 hover:text-purple-200 hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20"
                >
                  <span className="group-hover/tag:animate-pulse">📦</span>
                  <span className="ml-1">{lib}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-slate-900/95 border-t xl:border-t-0 xl:border-l border-green-500/20 flex flex-col min-h-0">
      {/* VS Code-like Header */}
      <div className="bg-slate-800/50 border-b border-green-500/20 flex-shrink-0">
         {/* Enhanced Tab Bar */}
         <div className="flex items-center bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-b border-green-500/20 backdrop-blur-sm">
           <div className="flex items-center space-x-1 px-3 py-2">
            <button
              onClick={() => !isImageFile && setActiveTab("editor")}
               className={`group relative px-4 py-3 text-sm font-medium rounded-t-lg transition-all duration-300 flex items-center space-x-2 ${
                activeTab === "editor"
                   ? "bg-gradient-to-b from-slate-900/95 to-slate-800/95 text-white border-b-2 border-green-400 shadow-lg"
                   : "github-text-secondary hover:text-white hover:bg-gradient-to-b hover:from-slate-700/50 hover:to-slate-600/50 hover:shadow-md"
              } ${isImageFile ? "cursor-not-allowed opacity-50" : ""}`}
              disabled={isImageFile}
            >
               <span className="text-lg group-hover:scale-110 transition-transform duration-200">{getLanguageIcon(file.name)}</span>
               <span className="group-hover:font-semibold transition-all duration-200">{file.name}</span>
               {activeTab === "editor" && (
                 <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-t-lg"></div>
               )}
            </button>
            <button
              onClick={() => setActiveTab("analysis")}
               className={`group relative px-4 py-3 text-sm font-medium rounded-t-lg transition-all duration-300 flex items-center space-x-2 ${
                activeTab === "analysis"
                   ? "bg-gradient-to-b from-slate-900/95 to-slate-800/95 text-white border-b-2 border-green-400 shadow-lg"
                   : "github-text-secondary hover:text-white hover:bg-gradient-to-b hover:from-slate-700/50 hover:to-slate-600/50 hover:shadow-md"
               }`}
             >
               <Brain className="w-4 h-4 group-hover:animate-pulse transition-all duration-200" />
               <span className="group-hover:font-semibold transition-all duration-200">AI Analysis</span>
               {activeTab === "analysis" && (
                 <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-t-lg"></div>
               )}
            </button>
          </div>
        </div>

        {/* Enhanced Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-slate-700/50 to-slate-800/50 border-b border-green-500/20">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-1 bg-slate-700/50 rounded-full border border-green-500/20">
                <span className="text-xs github-text-primary font-medium">
                {getLanguage(file.name)}
              </span>
              <span className="text-xs github-text-secondary">•</span>
                <span className="text-xs github-text-secondary font-mono">{file.path}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => toggleFullscreen('analysis')}
              className="group p-2 rounded-lg github-text-secondary hover:text-white hover:bg-green-500/20 hover:border-green-500/30 border border-transparent transition-all duration-300 hover:scale-105"
              title="Toggle fullscreen"
            >
              <Maximize2 className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
            </button>
            <button
              onClick={copyToClipboard}
              className="group p-2 rounded-lg github-text-secondary hover:text-white hover:bg-green-500/20 hover:border-green-500/30 border border-transparent transition-all duration-300 hover:scale-105"
              title="Copy code"
              disabled={isImageFile}
            >
              {copied ? (
                <Check className="w-4 h-4 group-hover:text-green-400 transition-colors duration-200" />
              ) : (
                <Copy className="w-4 h-4 group-hover:text-green-400 transition-colors duration-200" />
              )}
            </button>
            {file.download_url && (
              <button
                onClick={() => window.open(file.download_url, '_blank')}
                className="group p-2 rounded-lg github-text-secondary hover:text-green-400 hover:bg-green-500/20 hover:border-green-500/30 border border-transparent transition-all duration-300 hover:scale-105"
                title="Download file"
              >
                <Download className="w-4 h-4 group-hover:scale-110 transition-all duration-200" />
              </button>
            )}
            <button
              onClick={onClose}
              className="group p-2 rounded-lg github-text-secondary hover:text-red-400 hover:bg-red-500/20 hover:border-red-500/30 border border-transparent transition-all duration-300 hover:scale-105"
              title="Close"
            >
              <X className="w-4 h-4 group-hover:rotate-90 transition-all duration-200" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === "editor" ? (
            /* Enhanced Code Editor */
            <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-900/95 to-slate-800/95">
              <div className="p-6">
                <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 rounded-xl border border-green-500/20 overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500">
                  <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 px-6 py-4 border-b border-green-500/20 flex items-center justify-between backdrop-blur-sm">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <FileText className="w-5 h-5 text-green-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-base github-text-primary font-semibold">
                      {file.name}
                    </span>
                        <span className="text-xs github-text-secondary">
                          {getLanguage(file.name)} • {file.path}
                        </span>
                      </div>
                  </div>
                    <div className="flex items-center space-x-3">
                    <button
                      onClick={analyzeCode}
                      disabled={loading || isImageFile}
                        className="github-btn-primary group relative flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-bold rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/30 active:scale-95 overflow-hidden github-animate-glow"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                      {loading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Brain className="w-5 h-5 group-hover:animate-pulse" />
                        )}
                        <span className="group-hover:font-extrabold transition-all duration-300 relative z-10">
                          {loading ? "Analyzing..." : "Analyze with AI"}
                        </span>
                        {!loading && (
                          <span className="text-sm opacity-80 group-hover:opacity-100 transition-opacity duration-300 relative z-10">✨</span>
                        )}
                    </button>
                  </div>
                </div>
                  <div className="relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20"></div>
                    <div className="p-6 font-mono text-sm leading-relaxed bg-gradient-to-br from-slate-900/95 to-slate-800/95">
                  {isImageFile ? (
                        <div className="text-center py-16">
                          <div className="relative">
                            <div className="p-6 bg-gradient-to-br from-slate-500/20 to-slate-600/20 backdrop-blur-sm rounded-full mx-auto mb-6 w-fit border border-green-500/20">
                              <FileText className="w-12 h-12 text-green-400" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">🚫</span>
                            </div>
                      </div>
                          <div className="space-y-3">
                            <p className="github-text-primary text-lg font-medium">
                              Unsupported File Type
                            </p>
                            <p className="github-text-secondary text-sm max-w-md mx-auto">
                              Image files cannot be displayed in the code editor
                      </p>
                      <p className="text-gray-600 text-xs">
                              This file appears to be an image (.jpg, .jpeg, .png, .svg)
                      </p>
                          </div>
                    </div>
                  ) : (
                        <div className="relative">
                          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-500/30 via-emerald-500/30 to-green-500/30 rounded-full"></div>
                          <div className="ml-4">
                            {renderLineNumbers(formattedContent)}
                          </div>
                        </div>
                      )}
                    </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Analysis Panel */
          <div className="flex-1 overflow-auto bg-slate-900/95">
            <div className="p-4">
              <div className="bg-slate-900/95 rounded border border-green-500/20 overflow-hidden">
                <div className="bg-slate-800/50 px-4 py-2 border-b border-green-500/20 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Brain className="w-4 h-4 text-green-400" />
                    <span className="text-sm github-text-primary font-medium">
                      AI Code Analysis
                    </span>
                    {fileChanged && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-400">New file loaded</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => !isImageFile && setActiveTab("editor")}
                      className="px-2 py-1 text-xs github-text-secondary hover:text-white hover:bg-slate-700/50 rounded transition-colors duration-200"
                      disabled={isImageFile}
                    >
                      Back to Editor
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  {isImageFile ? (
                    <div className="mb-4 p-3 rounded bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span className="font-medium">
                          Unsupported File Type
                        </span>
                      </div>
                      Image files (.jpg, .jpeg, .png) cannot be analyzed or
                      displayed in the editor.
                    </div>
                  ) : null}

                  {error && (
                    <div className="mb-4 p-3 rounded bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <span className="font-medium">Error</span>
                      </div>
                      {error}
                    </div>
                  )}

                  {analysis ? (
                    <div className="text-sm leading-relaxed">
                      {renderAnalysis(analysis)}
                    </div>
                  ) : !loading && !error && !isImageFile ? (
                    <div className="text-center py-16">
                      <div className="relative">
                        <div className="p-6 bg-gradient-to-br from-gray-500/20 to-gray-600/20 backdrop-blur-sm rounded-full mx-auto mb-6 w-fit border border-gray-500/30">
                          <Brain className="w-12 h-12 text-gray-400" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✨</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-gray-300 text-lg font-medium">
                          Ready for AI Analysis
                        </p>
                        <p className="text-gray-500 text-sm max-w-md mx-auto">
                          Switch to the editor tab and click "Analyze" to get detailed insights about your code
                        </p>
                      </div>
                      <div className="mt-6 flex justify-center space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      </div>
                    </div>
                  ) : null}

                  {loading && (
                    <div className="text-center py-16">
                      <div className="relative">
                        <div className="p-6 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-full mx-auto mb-6 w-fit border border-blue-500/30">
                          <div className="w-12 h-12 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 border-2 border-indigo-400/50 border-t-indigo-400 rounded-full animate-spin animate-reverse"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-gray-300 text-lg font-medium">
                          🤖 AI is analyzing your code...
                        </p>
                        <p className="text-gray-500 text-sm">
                          This may take a few moments
                        </p>
                      </div>
                      <div className="mt-6 flex justify-center space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-green-600 text-white text-xs px-4 py-1 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span>{isImageFile ? "Unsupported File Type" : "Ready"}</span>
          <span>•</span>
          <span>{getLanguage(file.name)}</span>
          <span>•</span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>Ln {formattedContent.split("\n").length}</span>
          <span>•</span>
          <span>Col 1</span>
        </div>
      </div>
    </div>
  );
};

export default CodeAnalysisPanel;
