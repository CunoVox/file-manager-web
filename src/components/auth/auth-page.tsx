import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { HaoBoxLogo } from "../brand/haobox-logo";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth-store";
import type { AuthResponse } from "../../types/file";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
  fullName: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function AuthPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [serverError, setServerError] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorEmail, setTwoFactorEmail] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verifyingTwoFactor, setVerifyingTwoFactor] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError("");
    try {
      const { data } = await api.post<AuthResponse>(
        `/api/v1/auth/${mode}`,
        values,
      );
      if (data.twoFactorRequired && data.twoFactorToken) {
        setTwoFactorToken(data.twoFactorToken);
        setTwoFactorEmail(values.email);
        setTwoFactorCode("");
        toast.info("Verification required", {
          description: "Enter the 6-digit code to finish signing in.",
        });
        return;
      }
      if (data.emailVerificationRequired) {
        setVerificationEmail(data.email ?? values.email);
        toast.info("Verify your email", {
          description: "We sent a verification link to your email address.",
        });
        return;
      }
      completeSession(data, mode === "login" ? "Welcome back" : "Account created");
    } catch (error: any) {
      const message =
        error.response?.data?.message ??
        (mode === "login"
          ? "Could not sign in. Please check your email and password."
          : "Could not create your account right now. Please try again.");
      setServerError(message);
      toast.error(mode === "login" ? "Sign in failed" : "Registration failed", {
        description: message,
      });
    }
  }

  async function verifyTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (twoFactorCode.trim().length !== 6) {
      setServerError("Enter the 6-digit verification code.");
      return;
    }
    setServerError("");
    setVerifyingTwoFactor(true);
    try {
      const { data } = await api.post<AuthResponse>("/api/v1/auth/2fa/verify", {
        challengeId: twoFactorToken,
        code: twoFactorCode.trim(),
      });
      completeSession(data, "Welcome back");
    } catch (error: any) {
      const message =
        error.response?.data?.message ?? "Could not verify the code. Please try again.";
      setServerError(message);
      toast.error("Verification failed", { description: message });
    } finally {
      setVerifyingTwoFactor(false);
    }
  }

  function completeSession(data: AuthResponse, title: string) {
    if (!data.accessToken || !data.refreshToken || !data.user) {
      throw new Error("The sign-in response is incomplete. Please try again.");
    }
    setSession(data.accessToken, data.refreshToken, data.user);
      toast.success(title, {
        description: `Signed in as ${data.user.fullName}.`,
      });
      navigate("/files", { replace: true });
  }

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setServerError("");
    setTwoFactorToken("");
    setTwoFactorCode("");
    setTwoFactorEmail("");
    setVerificationEmail("");
    reset();
  }

  function backToSignIn() {
    setTwoFactorToken("");
    setTwoFactorCode("");
    setVerificationEmail("");
    setServerError("");
  }

  async function resendVerification() {
    setResendingVerification(true);
    const toastId = toast.loading("Sending verification email...");
    try {
      await api.post("/api/v1/auth/email/resend-verification", { email: verificationEmail });
      toast.success("Verification email sent", {
        id: toastId,
        description: "Open the link in your inbox to activate the account.",
      });
    } catch (error: any) {
      toast.error("Could not send verification email", {
        id: toastId,
        description: error.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setResendingVerification(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas px-5 py-10 text-ink md:grid md:place-items-center">
      <div className="w-full max-w-[1040px] overflow-hidden rounded-2xl border border-line bg-white shadow-panel md:grid md:grid-cols-[.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-ink p-10 text-white md:flex md:flex-col md:justify-between">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/10 bg-moss/30 blur-2xl" />
          <HaoBoxLogo inverse size="lg" />
          <div className="relative max-w-sm pb-5">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[.2em] text-emerald-200/70">
              A calmer file workspace
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-[-.04em]">
              Your files,
              <br />
              in their place.
            </h1>
            <p className="mt-5 text-sm leading-7 text-white/60">
              Store, find and share your work from one focused workspace backed
              by your own storage.
            </p>
          </div>
        </section>
        <section className="p-7 sm:p-12">
          <div className="mb-10 md:hidden">
            <HaoBoxLogo size="lg" />
          </div>
          <div className="mb-8">
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
              Private workspace
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-.04em]">
              {twoFactorToken
                ? "Verification"
                : verificationEmail
                  ? "Verify your email"
                : mode === "login"
                  ? "Welcome back"
                  : "Create your workspace"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {twoFactorToken
                ? `Complete sign-in for ${twoFactorEmail}.`
                : verificationEmail
                  ? `We sent a verification link to ${verificationEmail}.`
                : mode === "login"
                  ? "Sign in to manage your files securely."
                  : "Start organizing your files in one quiet place."}
            </p>
          </div>
          {verificationEmail ? (
            <div className="space-y-5">
              <div className="rounded-lg border border-line bg-canvas p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 place-items-center rounded-lg bg-soft text-moss">
                    <MailCheck size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-bold">Check your inbox</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Open the verification link to activate this account.
                    </p>
                  </div>
                </div>
              </div>
              <Button className="w-full" onClick={resendVerification} disabled={resendingVerification}>
                {resendingVerification && <Loader2 className="size-4 animate-spin" />}
                {resendingVerification ? "Sending..." : "Resend verification email"}
              </Button>
              <button
                type="button"
                className="mx-auto block text-xs font-bold text-moss hover:underline"
                onClick={backToSignIn}
              >
                Back to sign in
              </button>
            </div>
          ) : twoFactorToken ? (
            <form className="space-y-5" onSubmit={verifyTwoFactor}>
              <div className="rounded-lg border border-line bg-canvas p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 place-items-center rounded-lg bg-soft text-moss">
                    <ShieldCheck size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-bold">Two-factor authentication</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Enter the 6-digit code for this sign-in. In development, the code is printed in the API logs.
                    </p>
                  </div>
                </div>
              </div>
              <Field label="Verification code">
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, ""))}
                />
              </Field>
              {serverError && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                >
                  {serverError}
                </p>
              )}
              <Button className="w-full" disabled={verifyingTwoFactor || twoFactorCode.length !== 6}>
                {verifyingTwoFactor && <Loader2 className="size-4 animate-spin" />}
                Verify and sign in
              </Button>
              <button
                type="button"
                className="mx-auto block text-xs font-bold text-moss hover:underline"
                onClick={backToSignIn}
              >
                Back to sign in
              </button>
            </form>
          ) : (
            <>
              <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {mode === "register" && (
              <Field label="Full name" error={errors.fullName?.message}>
                <Input placeholder="Your name" {...register("fullName")} />
              </Field>
            )}
            <Field label="Email" error={errors.email?.message}>
              <Input
                type="email"
                placeholder="you@example.com"
                {...register("email")}
              />
            </Field>
            <Field label="Password" error={errors.password?.message}>
              <Input
                type="password"
                placeholder="At least 8 characters"
                {...register("password")}
              />
            </Field>
            {serverError && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
              >
                {serverError}
              </p>
            )}
            <Button className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>
              </form>
              {mode === "login" && (
                <Link
                  className="mx-auto mt-4 block text-center text-xs font-bold text-moss hover:underline"
                  to="/forgot-password"
                >
                  Forgot password?
                </Link>
              )}
              <button
                className="mx-auto mt-6 block text-xs font-bold text-moss hover:underline"
                onClick={switchMode}
              >
                {mode === "login"
                  ? "New here? Create an account"
                  : "Already have an account? Sign in"}
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-xs font-semibold text-ink">
      <span>{label}</span>
      {children}
      {error && <span className="font-normal text-red-600">{error}</span>}
    </label>
  );
}
