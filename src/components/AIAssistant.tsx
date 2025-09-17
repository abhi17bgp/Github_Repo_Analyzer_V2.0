import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Copy, Trash2, Download, Bot, User } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sessionId?: string; // Track which session the message belongs to
}

interface AIAssistantProps {
  repositoryUrl: string | null;
  repositoryData: {
    readme?: string;
    packageJson?: any;
    fileTree?: any;
    repoInfo?: any;
  } | null;
  isVisible: boolean;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ 
  repositoryUrl, 
  repositoryData, 
  isVisible 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [allMessages, setAllMessages] = useState<Message[]>([]); // Store all messages
  const [currentSessionMessages, setCurrentSessionMessages] = useState<Message[]>([]); // Display only current session
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>(''); // Track current session
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { success, error: showError } = useToast();
  const { user } = useAuth();

  // Load messages from localStorage when repository changes
  useEffect(() => {
    if (repositoryUrl) {
      const savedMessages = localStorage.getItem(`ai-chat-${repositoryUrl}`);
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setAllMessages(parsedMessages);
        } catch (error) {
          console.error('Failed to parse saved messages:', error);
          setAllMessages([]);
        }
      } else {
        setAllMessages([]);
      }
      
      // Generate new session ID for this repository analysis
      const newSessionId = `${repositoryUrl}-${Date.now()}`;
      setCurrentSessionId(newSessionId);
      setCurrentSessionMessages([]); // Start with clean session
    }
  }, [repositoryUrl]);

  // Show welcome message when AI assistant becomes visible
  useEffect(() => {
    if (isVisible && repositoryUrl) {
      setShowWelcomeMessage(true);
      // Auto-hide welcome message after 4 seconds
      const timer = setTimeout(() => {
        setShowWelcomeMessage(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, repositoryUrl]);

  // Save all messages to localStorage whenever allMessages change
  useEffect(() => {
    if (repositoryUrl && allMessages.length > 0) {
      localStorage.setItem(`ai-chat-${repositoryUrl}`, JSON.stringify(allMessages));
    }
  }, [allMessages, repositoryUrl]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSessionMessages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
      sessionId: currentSessionId
    };

    // Add to both all messages and current session
    setAllMessages(prev => [...prev, userMessage]);
    setCurrentSessionMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Prepare repository context
      const context = {
        repositoryUrl,
        readme: repositoryData?.readme || '',
        packageJson: repositoryData?.packageJson || null,
        fileTree: repositoryData?.fileTree || null,
        repoInfo: repositoryData?.repoInfo || null,
        username: user?.username || 'there' // Include username for personalization
      };

      const response = await axios.post(`${API_BASE_URL}/ai/chat`, {
        message: userMessage.content,
        context: context,
        conversationHistory: allMessages.slice(-10), // Send last 10 messages from all history for context
        hasPreviousSessions: allMessages.length > currentSessionMessages.length // Tell AI if there are previous sessions
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
        sessionId: currentSessionId
      };

      // Add to both all messages and current session
      setAllMessages(prev => [...prev, assistantMessage]);
      setCurrentSessionMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
        sessionId: currentSessionId
      };
      setAllMessages(prev => [...prev, errorMessage]);
      setCurrentSessionMessages(prev => [...prev, errorMessage]);
      showError('AI Error', 'Failed to get response from AI assistant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    success('Copied!', 'Message copied to clipboard');
  };

  const deleteMessage = (messageId: string) => {
    setAllMessages(prev => prev.filter(msg => msg.id !== messageId));
    setCurrentSessionMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const exportChat = () => {
    if (!repositoryUrl) return;

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `ai-chat-${repositoryUrl.split('/').pop()}-${timestamp}`;

    const textContent = allMessages.map(msg => 
      `[${msg.timestamp.toLocaleString()}] ${msg.type === 'user' ? 'You' : 'AI'}: ${msg.content}`
    ).join('\n\n');
    
    const dataBlob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    success('Exported!', 'Chat exported as text file');
  };

  const clearChat = () => {
    setAllMessages([]);
    setCurrentSessionMessages([]);
    if (repositoryUrl) {
      localStorage.removeItem(`ai-chat-${repositoryUrl}`);
    }
    success('Cleared!', 'All chat history cleared');
  };

  if (!isVisible || !repositoryUrl) {
    return null;
  }

  return (
    <>
      {/* Floating AI Assistant Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative w-14 h-14 bg-gradient-to-r from-green-500 to-green-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center github-animate-glow"
        >
          <MessageCircle className="w-7 h-7 text-white group-hover:animate-pulse" />
          {currentSessionMessages.length > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">{currentSessionMessages.length}</span>
            </div>
          )}
        </button>
      </div>

      {/* Welcome Message */}
      {showWelcomeMessage && (
        <div className="fixed bottom-24 right-6 z-50 max-w-sm">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg p-4 shadow-xl border border-green-500/30">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-white" />
                <span className="text-white font-semibold text-sm">AI Assistant</span>
              </div>
              <button
                onClick={() => setShowWelcomeMessage(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-white/90 text-sm leading-relaxed">
              🎉 <strong>Welcome{user?.username ? `, ${user.username}` : ''}!</strong> I'm your friendly AI companion, and I'm absolutely delighted to help you explore this fascinating project! 
              Ask me anything about the codebase, tech stack, or any questions you have - I'm here to make your journey smooth and enjoyable! 😊
            </p>
            <div className="mt-3 flex items-center space-x-2">
              <button
                onClick={() => {
                  setShowWelcomeMessage(false);
                  setIsOpen(true);
                }}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs rounded-full transition-colors"
              >
                Start Chatting
              </button>
              <button
                onClick={() => setShowWelcomeMessage(false)}
                className="px-3 py-1 text-white/70 hover:text-white text-xs transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900/95 rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col border border-green-500/20">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-green-500/20">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center github-animate-glow">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold github-text-primary">AI Project Assistant</h3>
                  <p className="text-sm github-text-secondary">Ask questions about this repository</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={exportChat}
                  className="p-2 github-text-secondary hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors duration-300"
                  title="Export chat as text file"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={clearChat}
                  className="p-2 github-text-secondary hover:text-red-400 hover:bg-slate-800/50 rounded-lg transition-colors duration-300"
                  title="Clear chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 github-text-secondary hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors duration-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentSessionMessages.length === 0 ? (
                <div className="text-center github-text-secondary py-8">
                  <Bot className="w-12 h-12 mx-auto mb-4 text-green-400" />
                  <p className="text-lg font-medium mb-2 github-text-primary">Hey there{user?.username ? `, ${user.username}` : ''}! 👋</p>
                  <p className="text-sm mb-4">I'm your friendly AI companion for this project! I've carefully analyzed the repository and I'm absolutely thrilled to help you understand it better. Think of me as your knowledgeable buddy who's here to make your exploration journey smooth and enjoyable! 😊</p>
                  <div className="mt-4 text-xs github-text-secondary max-w-md mx-auto">
                    <p className="font-medium github-text-primary mb-2">Here's what I can help you with:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-left">
                      <li>🔍 Understanding the project structure and architecture</li>
                      <li>⚡ Explaining the tech stack and dependencies</li>
                      <li>📁 Describing what specific files and folders do</li>
                      <li>💡 Suggesting future enhancements and improvements</li>
                      <li>🤔 Answering any conceptual questions about the project</li>
                    </ul>
                    <p className="mt-3 text-gray-600 italic">Just ask me anything about this repository!</p>
                  </div>
                </div>
              ) : (
                currentSessionMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.type === 'user'
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-800/50 text-gray-100 border border-green-500/20'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.type === 'assistant' && (
                          <Bot className="w-4 h-4 mt-1 text-green-400 flex-shrink-0" />
                        )}
                        {message.type === 'user' && (
                          <User className="w-4 h-4 mt-1 text-green-200 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm prose prose-invert prose-sm max-w-none">
                            {message.type === 'assistant' ? (
                              <ReactMarkdown
                                components={{
                                  h1: ({children}) => <h1 className="text-lg font-bold text-white mb-2">{children}</h1>,
                                  h2: ({children}) => <h2 className="text-base font-bold text-white mb-2">{children}</h2>,
                                  h3: ({children}) => <h3 className="text-sm font-bold text-white mb-1">{children}</h3>,
                                  p: ({children}) => <p className="mb-2 text-gray-100">{children}</p>,
                                  ul: ({children}) => <ul className="list-disc list-inside mb-2 text-gray-100">{children}</ul>,
                                  ol: ({children}) => <ol className="list-decimal list-inside mb-2 text-gray-100">{children}</ol>,
                                  li: ({children}) => <li className="mb-1">{children}</li>,
                                  strong: ({children}) => <strong className="font-semibold text-white">{children}</strong>,
                                  em: ({children}) => <em className="italic text-gray-200">{children}</em>,
                                  code: ({children}) => <code className="bg-gray-700 px-1 py-0.5 rounded text-xs text-gray-200">{children}</code>,
                                  pre: ({children}) => <pre className="bg-gray-800 p-2 rounded text-xs text-gray-200 overflow-x-auto mb-2">{children}</pre>,
                                  blockquote: ({children}) => <blockquote className="border-l-4 border-gray-600 pl-3 italic text-gray-300 mb-2">{children}</blockquote>
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs opacity-70">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => copyMessage(message.content)}
                                className="p-1 hover:bg-white/10 rounded transition-colors"
                                title="Copy message"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteMessage(message.id)}
                                className="p-1 hover:bg-red-500/20 rounded transition-colors"
                                title="Delete message"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/50 text-gray-100 border border-green-500/20 rounded-lg p-3 max-w-[80%]">
                    <div className="flex items-center space-x-2">
                      <Bot className="w-4 h-4 text-green-400" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-green-500/20">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about this project..."
                  className="flex-1 bg-slate-800/50 border border-green-500/20 rounded-lg px-3 py-2 github-text-primary placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="github-btn-primary px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2 github-animate-glow"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
