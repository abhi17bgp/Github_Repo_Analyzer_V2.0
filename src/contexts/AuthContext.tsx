import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

interface User {
  id: number;
  email: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    username: string
  ) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

import { API_BASE_URL } from "../utils/api";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );
  const [loading, setLoading] = useState(true);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔍 AuthContext - Checking auth with token:', token ? 'exists' : 'null');
      if (token) {
        try {
          console.log('🔍 AuthContext - Making /auth/me request...');
          const response = await axios.get(`${API_BASE_URL}/auth/me`);
          console.log('🔍 AuthContext - /auth/me response:', response.data);
          setUser(response.data.user);
        } catch (error) {
          console.error("❌ AuthContext - Auth check failed:", error);
          localStorage.removeItem("token");
          setToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);
  console.log("JHBJHBV", API_BASE_URL);
  const login = async (email: string, password: string) => {
    try {
      console.log('🔍 AuthContext - Attempting login for:', email);
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      console.log('🔍 AuthContext - Login response:', response.data);
      const { token: newToken, user: userData } = response.data;

      localStorage.setItem("token", newToken);
      setToken(newToken);
      setUser(userData);
      console.log('✅ AuthContext - Login successful, user set:', userData);
    } catch (error: any) {
      console.error('❌ AuthContext - Login failed:', error);
      throw new Error(error.response?.data?.message || "Login failed");
    }
  };

  const register = async (
    email: string,
    password: string,
    username: string
  ) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        email,
        password,
        username,
      });

      const { token: newToken, user: userData } = response.data;

      localStorage.setItem("token", newToken);
      setToken(newToken);
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Registration failed");
    }
  };

  const logout = () => {
    console.log('🔍 AuthContext - Logging out user');
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    console.log('✅ AuthContext - Logout completed');
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
