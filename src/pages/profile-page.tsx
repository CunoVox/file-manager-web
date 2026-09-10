import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, HardDrive, KeyRound, Loader2, RefreshCw, Save, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import { formatSize } from "../lib/utils";
import { useAuthStore } from "../store/auth-store";
import type { AuthResponse, AuthUser, BillingPlan, CheckoutResponse } from "../types/file";

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const setSession = useAuthStore((state) => state.setSession);
  const token = useAuthStore((state) => state.token);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [updatingTwoFactor, setUpdatingTwoFactor] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [twoFactorPassword, setTwoFactorPassword] = useState("");

  const used = user?.storageUsedBytes ?? 0;
  const quota = user?.effectiveStorageQuotaBytes ?? null;
  const percent = quota ? Math.min(100, Math.round((used / quota) * 100)) : 0;
  const isAdmin = user?.roles.includes("ADMIN") ?? false;
  const currentPlan = planFromQuota(quota);

  const billingPlans = useQuery({
    queryKey: ["billing", "plans"],
    queryFn: async () => (await api.get<BillingPlan[]>("/api/v1/billing/plans")).data,
  });

  const checkout = useMutation({
    mutationFn: async (planId: string) =>
      (await api.post<CheckoutResponse>("/api/v1/billing/checkout", { planId })).data,
    onSuccess: (response) => {
      toast.success("Redirecting to PayOS checkout");
      window.location.href = response.checkoutUrl;
    },
    onError: (error: any) =>
      toast.error("Could not start checkout", {
        description: error.response?.data?.message ?? "Please try again later.",
      }),
  });

  useEffect(() => {
    setFullName(user?.fullName ?? "");
  }, [user?.fullName]);

  async function refreshProfile() {
    setLoading(true);
    try {
      const currentUser = (await api.get<AuthUser>("/api/v1/auth/me")).data;
      updateUser(currentUser);
      toast.success("Profile refreshed");
    } catch (error: any) {
      toast.error("Could not refresh profile", {
        description: error.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    const cleanedName = fullName.trim();
    if (!cleanedName) {
      toast.error("Full name is required");
      return;
    }
    setSavingProfile(true);
    try {
      const currentUser = (
        await api.patch<AuthUser>("/api/v1/auth/profile", { fullName: cleanedName })
      ).data;
      updateUser(currentUser);
      toast.success("Profile updated");
    } catch (error: any) {
      toast.error("Could not update profile", {
        description: error.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    if (passwordForm.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChangingPassword(true);
    try {
      const session = (
        await api.patch<AuthResponse>("/api/v1/auth/password", {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        })
      ).data;
      if (!session.accessToken || !session.refreshToken || !session.user) {
        throw new Error("The password update response is incomplete. Please sign in again.");
      }
      setSession(session.accessToken, session.refreshToken, session.user);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password updated");
    } catch (error: any) {
      toast.error("Could not update password", {
        description: error.response?.data?.message ?? "Please check your current password.",
      });
    } finally {
      setChangingPassword(false);
    }
  }

  async function updateTwoFactor(enabled: boolean) {
    if (!twoFactorPassword) {
      toast.error("Current password is required");
      return;
    }
    setUpdatingTwoFactor(true);
    try {
      const currentUser = (
        await api.patch<AuthUser>("/api/v1/auth/2fa", {
          currentPassword: twoFactorPassword,
          enabled,
        })
      ).data;
      updateUser(currentUser);
      setTwoFactorPassword("");
      toast.success(enabled ? "Two-factor authentication enabled" : "Two-factor authentication disabled");
    } catch (error: any) {
      toast.error("Could not update two-factor authentication", {
        description: error.response?.data?.message ?? "Please check your current password.",
      });
    } finally {
      setUpdatingTwoFactor(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl p-5 md:p-10">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
            Account
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">Profile</h1>
          <p className="mt-2 text-sm text-muted">
            Review your account, permissions, and storage quota.
          </p>
        </div>
        <Button variant="outline" onClick={refreshProfile} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw size={16} />}
          Refresh
        </Button>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section className="rounded-xl border border-line bg-white p-5">
          <div className="flex items-center gap-4">
            <div className="grid size-14 place-items-center rounded-full bg-ink font-mono text-sm font-bold text-emerald-100">
              {user?.fullName.slice(0, 2).toUpperCase() ?? "HB"}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-extrabold">{user?.fullName}</h2>
              <p className="truncate text-sm text-muted">{user?.email}</p>
            </div>
          </div>

          <dl className="mt-6 grid gap-3 text-sm">
            <ProfileField label="Email">
              <span className="text-sm font-semibold">{user?.email}</span>
            </ProfileField>
            <ProfileField label="Role">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5 text-xs font-bold">
                {isAdmin ? <ShieldCheck size={14} /> : <UserRound size={14} />}
                {isAdmin ? "Administrator" : "User"}
              </span>
            </ProfileField>
            <ProfileField label="Account ID">
              <span className="font-mono text-xs text-muted">{user?.id}</span>
            </ProfileField>
          </dl>
        </section>

        <section className="rounded-xl border border-line bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
                Storage
              </p>
              <h2 className="mt-2 text-xl font-extrabold">Storage Quota</h2>
            </div>
            <span className="grid size-10 place-items-center rounded-lg bg-soft text-moss">
              <HardDrive size={18} />
            </span>
          </div>

          <div className="mt-6">
            <div className="mb-5 rounded-lg border border-line bg-canvas px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
                    Current plan
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <strong className="text-lg">{currentPlan.name}</strong>
                    <span className="inline-flex items-center gap-1 rounded-full bg-soft px-2 py-1 text-xs font-bold text-moss">
                      <Sparkles size={12} />
                      {quota == null ? "Unlimited" : formatSize(quota)}
                    </span>
                  </div>
                </div>
                <a href="#upgrade-storage" className="text-sm font-extrabold text-moss hover:underline">
                  Upgrade plan
                </a>
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-extrabold tracking-[-.04em]">{formatSize(used)}</p>
                <p className="mt-1 text-sm text-muted">
                  used of {quota == null ? "Unlimited" : formatSize(quota)}
                </p>
              </div>
              {quota != null && <strong className="text-sm text-moss">{percent}% used</strong>}
            </div>

            {quota != null && (
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-moss" style={{ width: `${percent}%` }} />
              </div>
            )}

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Files in Trash still count toward your storage quota. Delete them forever to free up space.
            </div>
          </div>
        </section>
      </div>

      <section id="upgrade-storage" className="mt-4 scroll-mt-24 rounded-xl border border-line bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
              Billing
            </p>
            <h2 className="mt-2 text-xl font-extrabold">Upgrade Storage</h2>
            <p className="mt-2 text-sm text-muted">
              Choose a quota plan and pay securely with PayOS.
            </p>
          </div>
          <span className="grid size-10 place-items-center rounded-lg bg-soft text-moss">
            <CreditCard size={18} />
          </span>
        </div>

        {billingPlans.isPending ? (
          <div className="mt-6 flex h-28 items-center justify-center text-muted">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : billingPlans.data?.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {billingPlans.data.map((plan) => (
              <UpgradePlanCard
                key={plan.id}
                plan={plan}
                currentQuota={quota}
                pending={checkout.isPending}
                onUpgrade={() => checkout.mutate(plan.id)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-dashed border-line bg-canvas p-8 text-center text-sm text-muted">
            No upgrade plans are available yet.
          </div>
        )}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-white p-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
              Personal
            </p>
            <h2 className="mt-2 text-xl font-extrabold">Personal Information</h2>
          </div>

          <div className="mt-5 grid gap-4">
            <FormField label="Full name">
              <Input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
              />
            </FormField>
            <FormField label="Email">
              <Input value={user?.email ?? ""} disabled />
            </FormField>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              onClick={saveProfile}
              disabled={savingProfile || fullName.trim() === (user?.fullName ?? "")}
            >
              {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save size={16} />}
              Save changes
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
                Security
              </p>
              <h2 className="mt-2 text-xl font-extrabold">Update Password</h2>
            </div>
            <span className="grid size-10 place-items-center rounded-lg bg-soft text-moss">
              <KeyRound size={18} />
            </span>
          </div>

          <div className="mt-5 grid gap-4">
            <FormField label="Current password">
              <Input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    currentPassword: event.target.value,
                  }))
                }
                autoComplete="current-password"
              />
            </FormField>
            <FormField label="New password">
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    newPassword: event.target.value,
                  }))
                }
                autoComplete="new-password"
              />
            </FormField>
            <FormField label="Confirm new password">
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
                autoComplete="new-password"
              />
            </FormField>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              onClick={changePassword}
              disabled={
                changingPassword ||
                !passwordForm.currentPassword ||
                !passwordForm.newPassword ||
                !passwordForm.confirmPassword ||
                !token ||
                !refreshToken
              }
            >
              {changingPassword ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound size={16} />
              )}
              Update password
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-white p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
                Security
              </p>
              <h2 className="mt-2 text-xl font-extrabold">Two-Factor Authentication</h2>
              <p className="mt-2 text-sm text-muted">
                Add a 6-digit verification step after password sign-in.
              </p>
            </div>
            <span
              className={
                user?.twoFactorEnabled
                  ? "rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"
                  : "rounded-full bg-canvas px-3 py-1.5 text-xs font-bold text-muted"
              }
            >
              {user?.twoFactorEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <FormField label="Current password">
              <Input
                type="password"
                value={twoFactorPassword}
                onChange={(event) => setTwoFactorPassword(event.target.value)}
                autoComplete="current-password"
              />
            </FormField>
            <Button
              variant={user?.twoFactorEnabled ? "danger" : "default"}
              onClick={() => updateTwoFactor(!(user?.twoFactorEnabled ?? false))}
              disabled={updatingTwoFactor || !twoFactorPassword}
            >
              {updatingTwoFactor ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck size={16} />
              )}
              {user?.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
            </Button>
          </div>
        </section>
      </div>
    </section>
  );
}

function UpgradePlanCard({
  plan,
  currentQuota,
  pending,
  onUpgrade,
}: {
  plan: BillingPlan;
  currentQuota: number | null;
  pending: boolean;
  onUpgrade: () => void;
}) {
  const isCurrent = currentQuota != null && plan.quotaBytes === currentQuota;
  const isDowngrade = currentQuota != null && plan.quotaBytes < currentQuota;
  const disabled = pending || isCurrent || isDowngrade;
  const label = isCurrent ? "Current plan" : isDowngrade ? "Included" : "Upgrade";

  return (
    <article
      className={
        isCurrent
          ? "rounded-lg border border-moss/30 bg-soft p-4"
          : "rounded-lg border border-line bg-canvas p-4"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold">{plan.name}</h3>
          <p className="mt-1 text-sm text-muted">{plan.description || "More room for your files."}</p>
        </div>
        <strong className="rounded-full bg-soft px-2.5 py-1 text-xs text-moss">{plan.quotaGb} GB</strong>
      </div>
      <div className="mt-5">
        <p className="text-2xl font-extrabold tracking-[-.03em]">{formatMoney(plan.price, plan.currency)}</p>
        <p className="mt-1 text-xs text-muted">
          {plan.durationDays > 0 ? `Valid for ${plan.durationDays} days` : "No expiry"}
        </p>
      </div>
      <Button
        className="mt-4 w-full"
        variant={isCurrent || isDowngrade ? "outline" : "default"}
        onClick={onUpgrade}
        disabled={disabled}
      >
        {pending && !isCurrent && !isDowngrade ? <Loader2 className="size-4 animate-spin" /> : <CreditCard size={16} />}
        {label}
      </Button>
    </article>
  );
}
function ProfileField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-canvas px-3 py-2">
      <dt className="text-xs font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: currency || "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function planFromQuota(quota: number | null) {
  if (quota == null) return { name: "Unlimited" };
  const gb = Math.round(quota / 1024 / 1024 / 1024);
  if (gb <= 5) return { name: "Free" };
  if (gb <= 20) return { name: "Starter 20GB" };
  if (gb <= 50) return { name: "Pro 50GB" };
  if (gb <= 100) return { name: "Business 100GB" };
  if (gb >= 150) return { name: "Unlimited" };
  return { name: `${gb}GB Plan` };
}
