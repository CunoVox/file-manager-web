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
        sessionStorage.setItem("file-manager-token", token);
        sessionStorage.setItem("file-manager-refresh-token", refreshToken);
        set({ token, refreshToken, user });
      },
      updateUser: (user) => set({ user }),
      clearSession: () => {
        sessionStorage.removeItem("file-manager-token");
        sessionStorage.removeItem("file-manager-refresh-token");
        set({ token: null, refreshToken: null, user: null });
      },
    }),
    {
      name: "file-manager-auth",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
