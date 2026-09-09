import { useMemo, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HardDrive, KeyRound, Lock, Loader2, MoreVertical, ShieldCheck, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import { formatSize } from "../lib/utils";
import type { AdminUser } from "../types/file";

type UserForm = {
  email: string;
  fullName: string;
  password: string;
  role: "ADMIN" | "MEMBER";
  enabled: boolean;
  storageQuotaBytes: number | null;
};

const emptyForm: UserForm = {
  email: "",
  fullName: "",
  password: "",
  role: "MEMBER",
  enabled: true,
  storageQuotaBytes: null,
};

const GB = 1024 * 1024 * 1024;
const UNLIMITED_QUOTA = -1;
const ACTION_MENU_WIDTH = 192;

export function UserAdminPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [resettingUserId, setResettingUserId] = useState("");
  const [actionMenu, setActionMenu] = useState<{ userId: string; top: number; left: number } | null>(null);
  const client = useQueryClient();

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await api.get<AdminUser[]>("/api/v1/admin/users")).data,
  });

  const stats = useMemo(() => {
    const data = users.data ?? [];
    return {
      total: data.length,
      admins: data.filter((user) => user.roles.includes("ADMIN")).length,
      disabled: data.filter((user) => !user.enabled).length,
      storageUsed: data.reduce((total, user) => total + (user.storageUsedBytes ?? 0), 0),
    };
  }, [users.data]);

  const create = useMutation({
    mutationFn: () => api.post("/api/v1/admin/users", form),
    onMutate: () =>
      toast.loading("Creating user and sending invitation email...", {
        id: "admin-create-user-email",
      }),
    onSuccess: async () => {
      toast.success("User created", {
        id: "admin-create-user-email",
        description: "The invitation details are being sent to the user.",
      });
      closeDialog();
      await client.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) =>
      toast.error("Could not create user", {
        id: "admin-create-user-email",
        description: error.response?.data?.message ?? "Please check the user details.",
      }),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "ADMIN" | "MEMBER" }) =>
      api.patch(`/api/v1/admin/users/${id}/role`, { role }),
    onSuccess: async () => {
      toast.success("Role updated");
      await client.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) =>
      toast.error("Could not update role", {
        description: error.response?.data?.message ?? "Please try again.",
      }),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.patch(`/api/v1/admin/users/${id}/status`, { enabled }),
    onSuccess: async (_response, variables) => {
      toast.success(variables.enabled ? "User unlocked" : "User locked");
      await client.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) =>
      toast.error("Could not update user status", {
        description: error.response?.data?.message ?? "Please try again.",
      }),
  });

  const changeQuota = useMutation({
    mutationFn: ({ id, storageQuotaBytes }: { id: string; storageQuotaBytes: number | null }) =>
      api.patch(`/api/v1/admin/users/${id}/quota`, { storageQuotaBytes }),
    onSuccess: async () => {
      toast.success("Quota updated");
      await client.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) =>
      toast.error("Could not update quota", {
        description: error.response?.data?.message ?? "Please try again.",
      }),
  });
  const resetPassword = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      api.post(`/api/v1/admin/users/${id}/password/reset`, { newPassword }),
    onMutate: (variables) => {
      setResettingUserId(variables.id);
      toast.loading("Resetting password and sending email...", {
        id: "admin-reset-password-email",
      });
    },
    onSuccess: async () => {
      toast.success("Password reset by administrator", {
        id: "admin-reset-password-email",
        description: "The temporary password is being sent to the user.",
      });
      await client.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) =>
      toast.error("Could not reset password", {
        id: "admin-reset-password-email",
        description: error.response?.data?.message ?? "Please try again.",
      }),
    onSettled: () => setResettingUserId(""),
  });

  const busy =
    create.isPending ||
    changeRole.isPending ||
    changeStatus.isPending ||
    changeQuota.isPending ||
    resetPassword.isPending;

  function closeDialog() {
    setDialogOpen(false);
    setForm(emptyForm);
  }

  function updateForm<K extends keyof UserForm>(key: K, value: UserForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submitCreate() {
    if (!form.email.trim() || !form.fullName.trim() || !form.password.trim()) return;
    create.mutate();
  }

  function requestRoleChange(user: AdminUser, role: "ADMIN" | "MEMBER") {
    if (role === primaryRole(user)) return;
    const label = role === "ADMIN" ? "promote this user to Administrator" : "change this user to Member";
    if (window.confirm(`Are you sure you want to ${label}?`)) {
      changeRole.mutate({ id: user.id, role });
    }
  }

  function requestStatusChange(user: AdminUser) {
    const nextEnabled = !user.enabled;
    const action = nextEnabled ? "unlock" : "lock";
    if (window.confirm(`Are you sure you want to ${action} ${user.email}?`)) {
      setActionMenu(null);
      changeStatus.mutate({ id: user.id, enabled: nextEnabled });
    }
  }

  function requestQuotaChange(user: AdminUser, value: string) {
    const nextQuota = parseQuotaValue(value);
    const label = quotaLabel(nextQuota, user);
    if (window.confirm(`Are you sure you want to set ${user.email} quota to ${label}?`)) {
      changeQuota.mutate({ id: user.id, storageQuotaBytes: nextQuota });
    }
  }

  function requestPasswordReset(user: AdminUser) {
    const newPassword = window.prompt(`Enter a temporary password for ${user.email}`);
    if (!newPassword) return;
    if (newPassword.length < 8) {
      toast.error("Temporary password must be at least 8 characters");
      return;
    }
    if (window.confirm(`Reset password for ${user.email} and email the temporary password?`)) {
      setActionMenu(null);
      resetPassword.mutate({ id: user.id, newPassword });
    }
  }

  function toggleActionMenu(event: MouseEvent<HTMLButtonElement>, userId: string) {
    const rect = event.currentTarget.getBoundingClientRect();
    setActionMenu((current) =>
      current?.userId === userId
        ? null
        : {
            userId,
            top: rect.bottom + 8,
            left: Math.max(12, rect.right - ACTION_MENU_WIDTH),
          },
    );
  }

  return (
    <section className="mx-auto max-w-6xl p-5 md:p-10">
      {actionMenu && (
        <button
          className="fixed inset-0 z-30 cursor-default"
          aria-label="Close user actions"
          onClick={() => setActionMenu(null)}
        />
      )}
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">User Management</h1>
          <p className="mt-2 text-sm text-muted">
            Create accounts, assign roles, and lock users when access should be paused.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus size={16} /> New User
        </Button>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-4">
        <Metric icon={<Users size={18} />} label="Users" value={stats.total} />
        <Metric icon={<ShieldCheck size={18} />} label="Administrators" value={stats.admins} />
        <Metric icon={<Lock size={18} />} label="Locked" value={stats.disabled} />
        <Metric icon={<HardDrive size={18} />} label="Used Storage" value={formatSize(stats.storageUsed)} />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-line bg-white">
        {users.isPending ? (
          <div className="flex h-32 items-center justify-center text-muted">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : !users.data?.length ? (
          <div className="p-12 text-center text-sm text-muted">No users yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Storage</th>
                  <th className="px-4 py-3">Quota</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.data.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-4">
                      <p className="font-bold">{user.fullName}</p>
                      <p className="text-xs text-muted">{user.email}</p>
                      <p className="mt-1 text-[11px] text-muted">Created {formatDate(user.createdAt)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        className="h-10 rounded-lg border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-moss focus:ring-2 focus:ring-moss/10"
                        value={primaryRole(user)}
                        onChange={(event) =>
                          requestRoleChange(user, event.target.value as "ADMIN" | "MEMBER")
                        }
                        disabled={busy}
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Administrator</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs font-bold">
                        {formatSize(user.storageUsedBytes ?? 0)} /{" "}
                        {user.effectiveStorageQuotaBytes == null
                          ? "Unlimited"
                          : formatSize(user.effectiveStorageQuotaBytes)}
                      </p>
                      {user.effectiveStorageQuotaBytes != null && (
                        <div className="mt-2 h-1.5 w-36 overflow-hidden rounded-full bg-line">
                          <div
                            className="h-full rounded-full bg-moss"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(((user.storageUsedBytes ?? 0) / user.effectiveStorageQuotaBytes) * 100),
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <select
                        className="h-10 rounded-lg border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-moss focus:ring-2 focus:ring-moss/10"
                        value={quotaValue(user.storageQuotaBytes)}
                        onChange={(event) => requestQuotaChange(user, event.target.value)}
                        disabled={busy}
                      >
                        <option value="default">Default ({primaryRole(user) === "ADMIN" ? "Unlimited" : "5 GB"})</option>
                        <option value={`${1 * GB}`}>1 GB</option>
                        <option value={`${5 * GB}`}>5 GB</option>
                        <option value={`${10 * GB}`}>10 GB</option>
                        <option value={`${50 * GB}`}>50 GB</option>
                        <option value="-1">Unlimited</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={
                          user.enabled
                            ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                            : "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                        }
                      >
                        {user.enabled ? "Active" : "Locked"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="inline-flex justify-end">
                        <Button
                          variant="ghost"
                          className="size-9 px-0"
                          onClick={(event) => toggleActionMenu(event, user.id)}
                          disabled={busy && resettingUserId !== user.id}
                          title="User actions"
                        >
                          {resettingUserId === user.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <MoreVertical size={17} />
                          )}
                        </Button>
                        {actionMenu?.userId === user.id && (
                          <UserActionMenu
                            user={user}
                            top={actionMenu.top}
                            left={actionMenu.left}
                            resetting={resettingUserId === user.id}
                            busy={busy}
                            onReset={() => requestPasswordReset(user)}
                            onStatus={() => {
                              setActionMenu(null);
                              requestStatusChange(user);
                            }}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialogOpen && (
        <UserDialog
          form={form}
          loading={create.isPending}
          onChange={updateForm}
          onClose={closeDialog}
          onSubmit={submitCreate}
        />
      )}
    </section>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-center justify-between text-moss">
        {icon}
        <span className="text-2xl font-extrabold text-ink">{value}</span>
      </div>
      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

function UserActionMenu({
  user,
  top,
  left,
  resetting,
  busy,
  onReset,
  onStatus,
}: {
  user: AdminUser;
  top: number;
  left: number;
  resetting: boolean;
  busy: boolean;
  onReset: () => void;
  onStatus: () => void;
}) {
  return (
    <div
      className="fixed z-50 w-48 overflow-hidden rounded-lg border border-line bg-white py-1 text-left shadow-panel"
      style={{ top, left }}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        className="flex h-10 w-full items-center gap-2 px-3 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50"
        onClick={onReset}
        disabled={busy}
      >
        {resetting ? <Loader2 className="size-4 animate-spin" /> : <KeyRound size={15} />}
        {resetting ? "Sending..." : "Reset password"}
      </button>
      <button
        className={`flex h-10 w-full items-center gap-2 px-3 text-sm font-semibold hover:bg-canvas disabled:opacity-50 ${
          user.enabled ? "text-red-600" : "text-ink"
        }`}
        onClick={onStatus}
        disabled={busy}
      >
        <Lock size={15} />
        {user.enabled ? "Lock user" : "Unlock user"}
      </button>
    </div>
  );
}

function UserDialog({
  form,
  loading,
  onChange,
  onClose,
  onSubmit,
}: {
  form: UserForm;
  loading: boolean;
  onChange: <K extends keyof UserForm>(key: K, value: UserForm[K]) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const disabled = !form.email.trim() || !form.fullName.trim() || form.password.length < 6 || loading;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-5" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl border border-line bg-white p-6 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">New user</p>
            <h2 className="mt-2 text-xl font-extrabold">Create Account</h2>
          </div>
          <Button variant="ghost" className="size-8 px-0" onClick={onClose} disabled={loading}>
            <X size={17} />
          </Button>
        </div>

        <div className="grid gap-4">
          <Field label="Full name">
            <Input value={form.fullName} onChange={(event) => onChange("fullName", event.target.value)} />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(event) => onChange("email", event.target.value)}
            />
          </Field>
          <Field label="Initial password">
            <Input
              type="password"
              value={form.password}
              onChange={(event) => onChange("password", event.target.value)}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Role">
              <select
                className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-moss focus:ring-2 focus:ring-moss/10"
                value={form.role}
                onChange={(event) => onChange("role", event.target.value as "ADMIN" | "MEMBER")}
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </Field>
            <Field label="Storage quota">
              <select
                className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-moss focus:ring-2 focus:ring-moss/10"
                value={quotaValue(form.storageQuotaBytes)}
                onChange={(event) => onChange("storageQuotaBytes", parseQuotaValue(event.target.value))}
              >
                <option value="default">Default by role</option>
                <option value={`${1 * GB}`}>1 GB</option>
                <option value={`${5 * GB}`}>5 GB</option>
                <option value={`${10 * GB}`}>10 GB</option>
                <option value={`${50 * GB}`}>50 GB</option>
                <option value="-1">Unlimited</option>
              </select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-lg border border-line px-3 py-3 text-sm font-semibold">
              <input
                type="checkbox"
                className="size-4 accent-moss"
                checked={form.enabled}
                onChange={(event) => onChange("enabled", event.target.checked)}
              />
              Active
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={disabled}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Creating and sending..." : "Create user"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

function primaryRole(user: AdminUser): "ADMIN" | "MEMBER" {
  return user.roles.includes("ADMIN") ? "ADMIN" : "MEMBER";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

function quotaValue(value?: number | null) {
  if (value == null) return "default";
  return `${value}`;
}

function parseQuotaValue(value: string) {
  if (value === "default") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function quotaLabel(value: number | null, user: AdminUser) {
  if (value == null) return `Default (${primaryRole(user) === "ADMIN" ? "Unlimited" : "5 GB"})`;
  if (value < 0) return "Unlimited";
  return formatSize(value);
}
