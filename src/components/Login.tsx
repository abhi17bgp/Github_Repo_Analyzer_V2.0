// export default Login;
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { LogIn, UserPlus, Github } from "lucide-react";
import { API_BASE_URL } from "../utils/api";

const Login = ({ signupMode }: { signupMode: boolean }) => {
  const [isLogin, setIsLogin] = useState(signupMode===true?false:true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean;
    message: string;
  }>({ checking: false, available: true, message: "" });

  const { login, register } = useAuth();
  const { success, error: showError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        await login(email, password);
        success("Welcome Back!", "Successfully logged in to your account");
      } else {
        await register(email, password, username);
        success(
          "Account Created!",
          "Your account has been created successfully"
        );
      }
    } catch (err: any) {
      const errorMessage = err.message || "Authentication failed";
      setError(errorMessage);
      showError("Authentication Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = () => {
    setIsLogin(!isLogin);
    setError("");
    setEmail("");
    setUsername("");
    setPassword("");
    setUsernameStatus({ checking: false, available: true, message: "" });
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus({ checking: false, available: true, message: "" });
      return;
    }

    setUsernameStatus({ checking: true, available: true, message: "" });

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/check-username/${username}`
      );
      const data = await response.json();

      setUsernameStatus({
        checking: false,
        available: data.available,
        message: data.message,
      });
    } catch (error) {
      setUsernameStatus({
        checking: false,
        available: true,
        message: "Could not check username availability",
      });
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);

    // Debounce username check
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  return (
    <div className="github-modal bg-gradient-to-br from-slate-900/95 via-gray-800/95 to-slate-900/95 backdrop-blur-lg rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm sm:max-w-md border border-green-500/30 transform transition-all duration-300 hover:scale-105">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-full github-animate-glow">
            <Github className="w-8 h-8 sm:w-10 sm:h-10 text-green-400" />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold github-text-primary github-gradient-text mb-2">
          GitHub Repo Analyzer
        </h1>
        <p className="text-sm sm:text-base github-text-secondary leading-relaxed">
          Visualize and analyze GitHub repositories with AI
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex bg-slate-800/50 rounded-lg p-1 mb-6 border border-green-500/20">
        <button
          onClick={() => !isLogin && handleModeSwitch()}
          className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md transition-all duration-300 ${
            isLogin
              ? "bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 backdrop-blur-md transform scale-105 shadow-lg hover:shadow-green-500/20"
              : "bg-slate-700/30 hover:bg-slate-600/40 border border-slate-600/30 hover:border-slate-500/50 backdrop-blur-md transform hover:scale-105 shadow-lg hover:shadow-slate-500/10"
          }`}
        >
          <LogIn className={`w-4 h-4 mr-2 ${isLogin ? "text-green-300" : "text-slate-400"}`} />
          <span className={isLogin ? "text-green-200" : "text-slate-300"}>Sign In</span>
        </button>
        <button
          onClick={() => isLogin && handleModeSwitch()}
          className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md transition-all duration-300 ${
            !isLogin
              ? "bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 backdrop-blur-md transform scale-105 shadow-lg hover:shadow-green-500/20"
              : "bg-slate-700/30 hover:bg-slate-600/40 border border-slate-600/30 hover:border-slate-500/50 backdrop-blur-md transform hover:scale-105 shadow-lg hover:shadow-slate-500/10"
          }`}
        >
          <UserPlus className={`w-4 h-4 mr-2 ${!isLogin ? "text-green-300" : "text-slate-400"}`} />
          <span className={!isLogin ? "text-green-200" : "text-slate-300"}>Sign Up</span>
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 transition-all duration-300"
      >
        {/* Username field - only show for signup */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            !isLogin
              ? "opacity-100 max-h-20 transform translate-y-0"
              : "opacity-0 max-h-0 transform -translate-y-4 pointer-events-none"
          }`}
        >
          <label
            htmlFor="username"
            className="block text-sm font-medium github-text-secondary mb-2 transition-colors"
          >
            Username
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={handleUsernameChange}
            className={`w-full px-4 py-3 rounded-lg bg-slate-800/50 border transition-all duration-200 hover:bg-slate-700/50 focus-ring ${
              usernameStatus.checking
                ? "border-yellow-500/50"
                : usernameStatus.available && username.length >= 3
                ? "border-green-500/50"
                : !usernameStatus.available && username.length >= 3
                ? "border-red-500/50"
                : "border-green-500/20"
            } github-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
            placeholder="Enter your username"
            required={!isLogin}
          />
          {username.length >= 3 && (
            <div
              className={`text-xs mt-1 ${
                usernameStatus.checking
                  ? "text-yellow-400"
                  : usernameStatus.available
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {usernameStatus.checking ? (
                <span>Checking availability...</span>
              ) : (
                usernameStatus.message
              )}
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium github-text-secondary mb-2 transition-colors"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-green-500/20 github-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 hover:bg-slate-700/50 focus-ring"
            placeholder="Enter your email"
            required
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium github-text-secondary mb-2 transition-colors"
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-green-500/20 github-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 hover:bg-slate-700/50 focus-ring"
            placeholder="Enter your password"
            required
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm animate-pulse text-overflow-safe">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            loading ||
            (!isLogin && (!usernameStatus.available || usernameStatus.checking))
          }
          className="github-btn-primary w-full flex items-center justify-center px-4 py-3 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 backdrop-blur-md text-green-200 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 focus-ring shadow-lg hover:shadow-green-500/20"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              {isLogin ? (
                <LogIn className="w-5 h-5 mr-2" />
              ) : (
                <UserPlus className="w-5 h-5 mr-2" />
              )}
              {isLogin ? "Sign In" : "Sign Up"}
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default Login;
