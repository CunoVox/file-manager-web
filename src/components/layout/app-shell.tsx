import {
  Bell,
  ClipboardList,
  Database,
  LayoutDashboard,
  Files,
  LogOut,
  Settings2,
  Share2,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { HaoBoxLogo } from "../brand/haobox-logo";
import { api } from "../../lib/api";
import { cn, formatSize } from "../../lib/utils";
import { useAuthStore } from "../../store/auth-store";
import { Button } from "../ui/button";
import type { AuthUser, NotificationItem, PagedResponse } from "../../types/file";

type NavItem = {
  to: string;
  Icon: LucideIcon;
  label: string;
  end?: boolean;
};

const workspaceItems: NavItem[] = [
  { to: "/files", Icon: Files, label: "My Files" },
  { to: "/shared", Icon: Share2, label: "Shared With Me" },
  { to: "/trash", Icon: Trash2, label: "Trash" },
];

const adminItems: NavItem[] = [
  { to: "/admin/dashboard", Icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/users", Icon: Users, label: "Users" },
  { to: "/admin/storage", Icon: Database, label: "S3 Store" },
  { to: "/admin/settings", Icon: Settings2, label: "Settings" },
  { to: "/admin/audit-logs", Icon: ClipboardList, label: "Audit Logs" },
];

export function AppShell() {
  const { user, refreshToken, clearSession, updateUser } = useAuthStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const client = useQueryClient();
  const navigate = useNavigate();
  const isAdmin = user?.roles.includes("ADMIN") ?? false;
  const initials = user?.fullName.slice(0, 2).toUpperCase() ?? "HV";
  const roleLabel = isAdmin ? "Administrator" : "User";

  useEffect(() => {
    api
      .get<AuthUser>("/api/v1/auth/me")
      .then((response) => updateUser(response.data))
      .catch(() => {
        // The API interceptor handles expired sessions; the shell can keep rendering meanwhile.
      });
  }, [updateUser]);

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: async () =>
      (await api.get<PagedResponse<NotificationItem>>("/api/v1/notifications?page=0&size=10")).data,
    refetchInterval: 30_000,
  });

  const unreadCount = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => (await api.get<number>("/api/v1/notifications/unread-count")).data,
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/notifications/${id}/read`),
    onSuccess: async () => refreshNotifications(),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch("/api/v1/notifications/read-all"),
    onSuccess: async () => refreshNotifications(),
  });

  async function refreshNotifications() {
    await client.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function handleLogout() {
    if (refreshToken) {
      try {
        await api.post("/api/v1/auth/logout", { refreshToken });
      } catch {
        // Local logout should still complete if the server is unavailable.
      }
    }
    clearSession();
    toast.success("Signed out", {
      description: "Your workspace session has ended.",
    });
  }

  return (
    <div className="min-h-screen bg-canvas text-ink md:flex md:h-screen md:overflow-hidden">
      <aside className="hidden w-72 shrink-0 border-r border-line bg-white md:flex md:h-screen md:flex-col">
        <div className="border-b border-line p-5">
          <Brand />
          <ProfileCard user={user} initials={initials} />
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto p-4">
          <NavSection title="Workspace" items={workspaceItems} />
          {isAdmin && <NavSection title="Administration" items={adminItems} />}
        </nav>

        <div className="border-t border-line p-4">
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-xs">
            {isAdmin ? (
              <ShieldCheck className="size-4 text-moss" />
            ) : (
              <UserRound className="size-4 text-moss" />
            )}
            <span className="font-bold">{roleLabel}</span>
          </div>
          <QuotaSummary user={user} />
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut size={16} /> Sign Out
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 md:h-screen md:overflow-y-auto">
        <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 md:px-8">
            <div className="md:hidden">
              <Brand />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5 text-xs font-bold text-muted sm:inline-flex">
                {isAdmin ? <ShieldCheck size={14} /> : <UserRound size={14} />}
                {roleLabel}
              </span>
              <NavLink
                to="/profile"
                className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
                title="Profile"
              >
                <Settings2 className="size-4" />
              </NavLink>
              <div className="relative">
                <button
                  className="relative grid size-9 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
                  title="Notifications"
                  onClick={() => setNotificationsOpen((open) => !open)}
                >
                  <Bell className="size-4" />
                  {(unreadCount.data ?? 0) > 0 && (
                    <span className="absolute right-1 top-1 min-w-4 rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">
                      {Math.min(unreadCount.data ?? 0, 99)}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <NotificationPanel
                    notifications={notifications.data?.content ?? []}
                    unreadCount={unreadCount.data ?? 0}
                    loading={notifications.isPending}
                    markAllLoading={markAllRead.isPending}
                    onMarkAllRead={() => markAllRead.mutate()}
                    onOpen={(notification) => {
                      if (!notification.readAt) markRead.mutate(notification.id);
                      setNotificationsOpen(false);
                      navigate(notificationRoute(notification, isAdmin));
                    }}
                  />
                )}
              </div>
              <div className="md:hidden">
                <Avatar initials={initials} />
              </div>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto border-t border-line px-3 py-2 md:hidden">
            {[...workspaceItems, ...(isAdmin ? adminItems : [])].map((item) => (
              <MobileNavItem key={item.to} item={item} />
            ))}
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

function NotificationPanel({
  notifications,
  unreadCount,
  loading,
  markAllLoading,
  onMarkAllRead,
  onOpen,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  markAllLoading: boolean;
  onMarkAllRead: () => void;
  onOpen: (notification: NotificationItem) => void;
}) {
  return (
    <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-white shadow-panel">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="text-sm font-extrabold">Notifications</p>
          <p className="text-xs text-muted">{unreadCount} unread</p>
        </div>
        <Button
          variant="ghost"
          className="h-8 px-2 text-xs"
          onClick={onMarkAllRead}
          disabled={markAllLoading || unreadCount === 0}
        >
          Mark all read
        </Button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex h-24 items-center justify-center text-muted">
            <Bell className="size-4 animate-pulse" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">No notifications yet.</div>
        ) : (
          notifications.map((notification) => (
            <button
              key={notification.id}
              className="flex w-full gap-3 border-b border-line px-4 py-3 text-left transition last:border-b-0 hover:bg-canvas"
              onClick={() => onOpen(notification)}
            >
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-soft text-moss">
                {notificationIcon(notification.type)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <strong className="truncate text-sm">{notification.title}</strong>
                  {!notification.readAt && <span className="size-2 shrink-0 rounded-full bg-moss" />}
                </span>
                <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                  {notification.message}
                </span>
                <span className="mt-1 block text-[11px] text-muted">
                  {formatNotificationTime(notification.createdAt)}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function notificationIcon(type: string) {
  if (type.includes("SHARED")) return <Share2 size={15} />;
  if (type.includes("MIGRATION") || type.includes("STORAGE")) return <Database size={15} />;
  return <Bell size={15} />;
}

function notificationRoute(notification: NotificationItem, isAdmin: boolean) {
  if (notification.targetType === "FILE") return "/shared";
  if (notification.targetType === "STORAGE_NODE" || notification.targetType === "STORAGE_MIGRATION") {
    return isAdmin ? "/admin/storage" : "/files";
  }
  return "/files";
}

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function ProfileCard({
  user,
  initials,
}: {
  user: ReturnType<typeof useAuthStore.getState>["user"];
  initials: string;
}) {
  return (
    <NavLink
      to="/profile"
      className={({ isActive }) =>
        cn(
          "mt-5 flex items-center gap-3 rounded-lg bg-canvas p-3 transition hover:bg-soft",
          isActive && "bg-soft ring-1 ring-moss/20",
        )
      }
      title="Open profile"
    >
      <Avatar initials={initials} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold">{user?.fullName}</p>
        <p className="truncate text-[11px] text-muted">{user?.email}</p>
      </div>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-white text-moss">
        <UserRound size={16} />
      </span>
    </NavLink>
  );
}

function QuotaSummary({ user }: { user: ReturnType<typeof useAuthStore.getState>["user"] }) {
  const used = user?.storageUsedBytes ?? 0;
  const quota = user?.effectiveStorageQuotaBytes ?? null;
  const percent = quota ? Math.min(100, Math.round((used / quota) * 100)) : 0;
  return (
    <div className="mb-3 rounded-lg border border-line bg-canvas px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-muted">Storage</span>
        <span className="font-bold">
          {formatSize(used)} / {quota == null ? "Unlimited" : formatSize(quota)}
        </span>
      </div>
      {quota != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-moss" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <HaoBoxLogo compact={compact} size="lg" />;
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="grid size-9 shrink-0 place-items-center rounded-full bg-ink font-mono text-[11px] font-bold text-emerald-100">
      {initials}
    </div>
  );
}

function NavSection({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <section>
      <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[.18em] text-muted">
        {title}
      </p>
      <div className="space-y-1">
        {items.map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}
      </div>
    </section>
  );
}

function NavItemLink({ item }: { item: NavItem }) {
  const { to, Icon, label, end } = item;
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-canvas hover:text-ink",
          isActive && "bg-soft text-moss",
        )
      }
    >
      <Icon size={17} />
      {label}
    </NavLink>
  );
}

function MobileNavItem({ item }: { item: NavItem }) {
  const { to, Icon, label } = item;
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-muted",
          isActive && "bg-soft text-moss",
        )
      }
    >
      <Icon size={15} />
      {label}
    </NavLink>
  );
}
