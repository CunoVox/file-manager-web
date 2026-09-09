import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/auth-store";
import type { AuthResponse } from "../types/file";

type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8080",
});

export function authenticatedFileUrl(path: string) {
  const baseUrl = api.defaults.baseURL ?? "";
  const token = useAuthStore.getState().token;
  const separator = path.includes("?") ? "&" : "?";
  return `${baseUrl}${path}${token ? `${separator}access_token=${encodeURIComponent(token)}` : ""}`;
}

export function downloadFileDirect(path: string, fileName: string) {
  const link = document.createElement("a");
  link.href = authenticatedFileUrl(path);
  link.download = fileName;
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

let refreshRequest: Promise<AuthResponse> | null = null;

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    const isAuthRequest = original?.url?.includes("/api/v1/auth/");

    const shouldTryRefresh =
      (status === 401 || status === 403) &&
      Boolean(original?.headers?.Authorization);

    if (!shouldTryRefresh || !original || original._retry || isAuthRequest) {
      if (status === 401) useAuthStore.getState().clearSession();
      return Promise.reject(error);
    }

    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      useAuthStore.getState().clearSession();
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      refreshRequest ??= api
        .post<AuthResponse>("/api/v1/auth/refresh", { refreshToken })
        .then((response) => response.data)
        .finally(() => {
          refreshRequest = null;
        });

      const session = await refreshRequest;
      if (!session.accessToken || !session.refreshToken || !session.user) {
        useAuthStore.getState().clearSession();
        return Promise.reject(error);
      }
      useAuthStore
        .getState()
        .setSession(session.accessToken, session.refreshToken, session.user);
      original.headers.Authorization = `Bearer ${session.accessToken}`;
      return api(original);
    } catch (refreshError) {
      useAuthStore.getState().clearSession();
      return Promise.reject(refreshError);
    }
  },
);
