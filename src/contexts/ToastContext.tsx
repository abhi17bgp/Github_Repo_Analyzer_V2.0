import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast = { ...toast, id };

      setToasts((prev) => [...prev, newToast]);

      // Auto remove after duration
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 5000);
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "success", title, message });
    },
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "error", title, message });
    },
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "warning", title, message });
    },
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "info", title, message });
    },
    [addToast]
  );

  const value = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  const getIcon = (type: Toast["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />;
      case "error":
        return <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />;
      case "info":
        return <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />;
    }
  };

  const getStyles = (type: Toast["type"]) => {
    switch (type) {
      case "success":
        return "bg-green-900/90 border-green-500/50 text-green-100";
      case "error":
        return "bg-red-900/90 border-red-500/50 text-red-100";
      case "warning":
        return "bg-yellow-900/90 border-yellow-500/50 text-yellow-100";
      case "info":
        return "bg-blue-900/90 border-blue-500/50 text-blue-100";
    }
  };

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 z-[60] space-y-2 max-w-sm sm:max-w-md w-full mx-auto sm:mx-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            ${getStyles(toast.type)}
            backdrop-blur-lg border rounded-lg p-3 sm:p-4 shadow-2xl
            transform transition-all duration-300 ease-in-out
            animate-in slide-in-from-right-full
          `}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-2 sm:mr-3">{getIcon(toast.type)}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-semibold mb-1">{toast.title}</h4>
              {toast.message && (
                <p className="text-xs sm:text-sm opacity-90">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-white/10 transition-colors duration-200"
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
