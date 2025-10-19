"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: string;
  fullName: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signUp: (fullName: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error parsing stored user:", error);
        localStorage.removeItem("currentUser");
      }
    }
    setIsLoading(false);
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        const userData: User = {
          id: data.user.id,
          fullName: data.user.fullName,
          email: data.user.email,
        };
        setUser(userData);
        localStorage.setItem("currentUser", JSON.stringify(userData));
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Sign in failed' };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const signUp = async (fullName: string, email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        const userData: User = {
          id: data.user.id,
          fullName: data.user.fullName,
          email: data.user.email,
        };
        setUser(userData);
        localStorage.setItem("currentUser", JSON.stringify(userData));
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Sign up failed' };
      }
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("currentUser");
  };

  if (isLoading) {
    return null; // or a loading spinner
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        signIn,
        signUp,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
