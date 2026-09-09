import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthPage } from "./components/auth/auth-page";
import { ProtectedRoute } from "./components/auth/protected-route";
import { AppShell } from "./components/layout/app-shell";
import { Seo } from "./components/seo";
import { AdminDashboardPage } from "./pages/admin-dashboard-page";
import { AdminSettingsPage } from "./pages/admin-settings-page";
import { AuditLogsPage } from "./pages/audit-logs-page";
import { DeveloperPage } from "./pages/developer-page";
import { DeveloperPublicPage } from "./pages/developer-public-page";
import { FilesPage } from "./pages/files-page";
import { ForgotPasswordPage } from "./pages/forgot-password-page";
import { LandingPage } from "./pages/landing-page";
import { ProfilePage } from "./pages/profile-page";
import { PublicInfoPage } from "./pages/public-info-page";
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
  const location = useLocation();
  const seo = getRouteSeo(location.pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <Seo {...seo} />
      <Toaster position="top-right" closeButton richColors duration={3500} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/developers" element={<DeveloperPublicPage />} />
        <Route path="/developers/docs" element={<DeveloperPublicPage />} />
        <Route path="/developers/reference" element={<DeveloperPublicPage />} />
        <Route path="/developers/console" element={<DeveloperPublicPage />} />
        <Route path="/help" element={<PublicInfoPage />} />
        <Route path="/privacy" element={<PublicInfoPage />} />
        <Route path="/terms" element={<PublicInfoPage />} />
        <Route path="/security" element={<PublicInfoPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/files" element={<FilesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/developer" element={<DeveloperPage />} />
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

function getRouteSeo(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const baseKeywords =
    "HaoBox, private file workspace, file manager, secure file sharing, file preview, developer API";

  switch (normalized) {
    case "/":
      return {
        title: "HaoBox - Private File Workspace",
        description:
          "HaoBox helps teams upload, preview, organize, share, and automate files from one private workspace.",
        canonicalPath: "/",
        keywords: `${baseKeywords}, file storage, cloud file manager`,
      };
    case "/developers":
    case "/developers/docs":
      return {
        title: "HaoBox Developer Docs - File API Guide",
        description:
          "Learn how to use HaoBox API keys, scopes, pagination, file uploads, downloads, folders, rate limits, and response formats.",
        canonicalPath: "/developers/docs",
        keywords: `${baseKeywords}, API keys, file upload API, file download API`,
      };
    case "/developers/reference":
      return {
        title: "HaoBox API Reference - File and Folder Endpoints",
        description:
          "Explore HaoBox developer API endpoints for listing files, uploading files, downloading content, renaming, moving, deleting, and managing folders.",
        canonicalPath: "/developers/reference",
        keywords: `${baseKeywords}, API reference, REST API, file endpoints`,
      };
    case "/developers/console":
      return {
        title: "HaoBox API Console - Test Developer Requests",
        description:
          "Test HaoBox developer API requests directly from the browser with an API key and inspect status, latency, and response bodies.",
        canonicalPath: "/developers/console",
        keywords: `${baseKeywords}, API console, test API request`,
      };
    case "/help":
      return {
        title: "HaoBox Help Center",
        description:
          "Find quick help for uploading files, creating folders, sharing files, previewing content, and recovering account access in HaoBox.",
        canonicalPath: "/help",
        keywords: `${baseKeywords}, help center, file sharing help`,
      };
    case "/security":
      return {
        title: "HaoBox Security",
        description:
          "Security guidance for protecting HaoBox accounts, passwords, two-factor authentication, public links, and developer API keys.",
        canonicalPath: "/security",
        keywords: `${baseKeywords}, security, two-factor authentication, API key security`,
      };
    case "/privacy":
      return {
        title: "HaoBox Privacy Policy",
        description:
          "Read how HaoBox handles account information, file metadata, sharing records, API usage, and important security notifications.",
        canonicalPath: "/privacy",
        keywords: `${baseKeywords}, privacy policy, data privacy`,
      };
    case "/terms":
      return {
        title: "HaoBox Terms of Service",
        description:
          "Review the usage terms for HaoBox file workspace features, sharing, account responsibility, and developer API access.",
        canonicalPath: "/terms",
        keywords: `${baseKeywords}, terms of service, acceptable use`,
      };
    default:
      return {
        title: "HaoBox",
        description:
          "HaoBox is a private file workspace for uploading, previewing, organizing, sharing, and integrating files.",
        canonicalPath: normalized,
        robots: "noindex, nofollow" as const,
      };
  }
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
