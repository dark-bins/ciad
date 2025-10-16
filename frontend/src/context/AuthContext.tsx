import { useEffect, useState, ReactNode } from "react";
import { authAPI, User, LoginRequest, RegisterRequest } from "../api/client";
import { AuthContext, AuthContextType } from "./AuthContextBase";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("auth_token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        try {
          const { user: currentUser } = await authAPI.me();
          setUser(currentUser);
          setToken(storedToken);
          localStorage.setItem("user", JSON.stringify(currentUser));
        } catch (cause) {
          console.warn("Token invalido; limpiando sesion", cause);
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user");
        }
      }

      setLoading(false);
    };

    void initAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    const response = await authAPI.login(credentials);
    setUser(response.user);
    setToken(response.token);
    localStorage.setItem("auth_token", response.token);
    localStorage.setItem("user", JSON.stringify(response.user));
  };

  const register = async (data: RegisterRequest) => {
    const response = await authAPI.register(data);
    setUser(response.user);
    setToken(response.token);
    localStorage.setItem("auth_token", response.token);
    localStorage.setItem("user", JSON.stringify(response.user));
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (cause) {
      console.warn("Error cerrando sesion", cause);
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
