import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageCircle, Copy, Trash2, Download, Bot, User, Clock } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatHistoryViewProps {
  repositoryUrl: string;
}

const ChatHistoryView: React.FC<ChatHistoryViewProps> = ({ repositoryUrl }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (repositoryUrl) {
      const savedMessages = localStorage.getItem(`ai-chat-${repositoryUrl}`);
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(parsedMessages);
        } catch (error) {
          console.error('Failed to parse saved messages:', error);
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
      setIsLoading(false);
    }
  }, [repositoryUrl]);

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleString();
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const deleteMessage = (messageId: string) => {
    const updatedMessages = messages.filter(msg => msg.id !== messageId);
    setMessages(updatedMessages);
    localStorage.setItem(`ai-chat-${repositoryUrl}`, JSON.stringify(updatedMessages));
  };

  const exportChat = () => {
    const chatContent = messages.map(msg => {
      const timestamp = formatTime(msg.timestamp);
      const sender = msg.type === 'user' ? 'You' : 'AI Assistant';
      return `[${timestamp}] ${sender}:\n${msg.content}\n`;
    }).join('\n---\n\n');

    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${repositoryUrl.split('/').slice(-2).join('-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear all chat history for this repository?')) {
      setMessages([]);
      localStorage.removeItem(`ai-chat-${repositoryUrl}`);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading chat history...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-400 px-4">
          <div className="p-4 bg-gray-800 rounded-full mx-auto mb-4 w-fit">
            <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 opacity-50" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Chat History</h3>
          <p className="text-sm mb-4">
            Start a conversation with the AI assistant to see your chat history here.
          </p>
          <p className="text-xs text-gray-500">
            Repository: {repositoryUrl.split("/").slice(-2).join("/")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">AI Chat History</h2>
              <p className="text-sm text-gray-400">
                {repositoryUrl.split("/").slice(-2).join("/")} • {messages.length} messages
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportChat}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Export chat"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={clearChat}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              {message.type === 'user' ? (
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              ) : (
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium text-gray-200">
                  {message.type === 'user' ? 'You' : 'AI Assistant'}
                </span>
                <span className="text-xs text-gray-500 flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(message.timestamp)}</span>
                </span>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                {message.type === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="text-lg font-bold text-white mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-bold text-white mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-bold text-white mb-1">{children}</h3>,
                        p: ({ children }) => <p className="text-gray-300 mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside text-gray-300 mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside text-gray-300 mb-2 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="text-gray-300">{children}</li>,
                        code: ({ children }) => <code className="bg-gray-700 text-gray-200 px-1 py-0.5 rounded text-xs">{children}</code>,
                        pre: ({ children }) => <pre className="bg-gray-700 text-gray-200 p-3 rounded-lg overflow-x-auto text-xs mb-2">{children}</pre>,
                        blockquote: ({ children }) => <blockquote className="border-l-4 border-purple-500 pl-3 text-gray-300 italic mb-2">{children}</blockquote>,
                        strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="text-gray-200 italic">{children}</em>
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-gray-300 whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <button
                  onClick={() => copyMessage(message.content)}
                  className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                  title="Copy message"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  onClick={() => deleteMessage(message.id)}
                  className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                  title="Delete message"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatHistoryView;
