import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthPage } from "./components/auth/auth-page";
import { ProtectedRoute } from "./components/auth/protected-route";
import { AppShell } from "./components/layout/app-shell";
import { AdminDashboardPage } from "./pages/admin-dashboard-page";
import { AdminSettingsPage } from "./pages/admin-settings-page";
import { AuditLogsPage } from "./pages/audit-logs-page";
import { FilesPage } from "./pages/files-page";
import { ForgotPasswordPage } from "./pages/forgot-password-page";
import { LandingPage } from "./pages/landing-page";
import { ProfilePage } from "./pages/profile-page";
import { ResetPasswordPage } from "./pages/reset-password-page";
import { SharedPage } from "./pages/shared-page";
import { StorageAdminPage } from "./pages/storage-admin-page";
import { TrashPage } from "./pages/trash-page";
import { UserAdminPage } from "./pages/user-admin-page";
import { VerifyEmailPage } from "./pages/verify-email-page";
import { useAuthStore } from "./store/auth-store";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" closeButton richColors duration={3500} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/files" element={<FilesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route
              path="/admin/dashboard"
              element={
                <RequireAdmin>
                  <AdminDashboardPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/storage"
              element={
                <RequireAdmin>
                  <StorageAdminPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RequireAdmin>
                  <UserAdminPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <RequireAdmin>
                  <AdminSettingsPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <RequireAdmin>
                  <AuditLogsPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/shared"
              element={<SharedPage />}
            />
            <Route path="/trash" element={<TrashPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/files" replace />} />
      </Routes>
    </QueryClientProvider>
  );
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  return user?.roles.includes("ADMIN") ? (
    children
  ) : (
    <section className="mx-auto max-w-4xl p-5 md:p-10">
      <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
        Access denied
      </p>
      <h1 className="mt-2 text-3xl font-extrabold">Admin Area</h1>
      <div className="mt-8 rounded-lg border border-line bg-white p-10 text-sm text-muted">
        Your current account has user permissions only and cannot manage MinIO/S3 Store.
      </div>
    </section>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-6xl p-5 md:p-10">
      <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
        Workspace
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">
        {title}
      </h1>
      <div className="mt-8 rounded-xl border border-dashed border-line bg-white p-14 text-center text-sm text-muted">
        This view is ready for the next workflow.
      </div>
    </section>
  );
}
