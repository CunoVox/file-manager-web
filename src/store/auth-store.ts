import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthUser } from "../types/file";

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (token: string, refreshToken: string, user: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      setSession: (token, refreshToken, user) => {
        localStorage.setItem("file-manager-token", token);
        localStorage.setItem("file-manager-refresh-token", refreshToken);
        sessionStorage.removeItem("file-manager-token");
        sessionStorage.removeItem("file-manager-refresh-token");
        set({ token, refreshToken, user });
      },
      updateUser: (user) => set({ user }),
      clearSession: () => {
        localStorage.removeItem("file-manager-token");
        localStorage.removeItem("file-manager-refresh-token");
        sessionStorage.removeItem("file-manager-token");
        sessionStorage.removeItem("file-manager-refresh-token");
        set({ token: null, refreshToken: null, user: null });
      },
    }),
    {
      name: "file-manager-auth",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
