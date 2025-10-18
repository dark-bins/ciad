import axios, { AxiosInstance, AxiosError } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    if (error.response?.status === 401) {
      const errorCode = error.response.data?.error;
      const errorMessage = error.response.data?.message;

      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");

      // Show alert if session expired due to IP change
      if (errorCode === "session_expired" && errorMessage) {
        alert(errorMessage);
      }

      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default apiClient;

export interface User {
  id: string;
  username: string;
  email: string;
  role: "user" | "premium" | "admin";
  plan: "FREE" | "BASIC" | "PREMIUM" | "GOLD" | "PLATINUM" | "ADMIN";
  credits: number;
  is_active?: boolean;
  created_at?: string;
  last_login?: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface SystemStats {
  users: {
    total_users: number;
    admin_count: number;
    premium_count: number;
    active_users: number;
    active_24h: number;
  };
  commands: {
    total_commands: number;
    successful_commands: number;
    total_credits_used: number;
  };
  sessions: {
    active_sessions: number;
  };
}

export interface SystemConfig {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export interface CommandProviderInfo {
  id: string;
  name: string;
  description: string;
  accentColor?: string;
  badge?: string;
}

export interface CommandDefinition {
  command: string;
  label: string;
  provider: string;
  description?: string;
  tags?: string[];
  availability?: "all" | "admin" | "premium";
  cooldownSeconds?: number;
}

export interface CommandCategory {
  id: string;
  title: string;
  icon: string;
  description: string;
  commands: CommandDefinition[];
}

export interface CommandCatalogResponse {
  providers: CommandProviderInfo[];
  categories: CommandCategory[];
  updatedAt: string;
  totalCommands: number;
}

export const authAPI = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/login", data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/register", data);
    return response.data;
  },

  me: async (): Promise<{ user: User }> => {
    const response = await apiClient.get<{ user: User }>("/auth/me");
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
  },
};

export const adminAPI = {
  getUsers: async (): Promise<{ users: User[] }> => {
    const response = await apiClient.get<{ users: User[] }>("/admin/users");
    return response.data;
  },

  getStats: async (): Promise<SystemStats> => {
    const response = await apiClient.get<SystemStats>("/admin/stats");
    return response.data;
  },

  updateUser: async (userId: string, data: Partial<User>): Promise<{ user: User }> => {
    const response = await apiClient.put<{ user: User }>(`/admin/users/${userId}`, data);
    return response.data;
  },

  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}`);
  },

  addCredits: async (userId: string, amount: number): Promise<{ credits: number }> => {
    const response = await apiClient.post<{ credits: number }>(`/admin/users/${userId}/credits`, {
      amount,
      operation: "add",
    });
    return response.data;
  },

  deductCredits: async (userId: string, amount: number): Promise<{ credits: number }> => {
    const response = await apiClient.post<{ credits: number }>(`/admin/users/${userId}/credits`, {
      amount,
      operation: "deduct",
    });
    return response.data;
  },

  getConfig: async (): Promise<{ config: SystemConfig[] }> => {
    const response = await apiClient.get<{ config: SystemConfig[] }>("/admin/config");
    return response.data;
  },

  updateConfig: async (config: Record<string, string>): Promise<void> => {
    await apiClient.put("/admin/config", { config });
  },

  getRecentCommands: async (limit = 50): Promise<{ commands: unknown[] }> => {
    const response = await apiClient.get<{ commands: unknown[] }>(`/admin/commands/recent?limit=${limit}`);
    return response.data;
  },
};

export const catalogAPI = {
  getCatalog: async (): Promise<CommandCatalogResponse> => {
    const response = await apiClient.get<CommandCatalogResponse>("/commands/catalog");
    return response.data;
  },
};
