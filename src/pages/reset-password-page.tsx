import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    const toastId = toast.loading("Resetting password...");
    try {
      await api.post("/api/v1/auth/password/reset", { token, newPassword: password });
      setDone(true);
      toast.success("Password reset", {
        id: toastId,
        description: "You can sign in with the new password now.",
      });
    } catch (error: any) {
      toast.error("Could not reset password", {
        id: toastId,
        description: error.response?.data?.message ?? "This reset link may be invalid or expired.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5 text-ink">
      <section className="w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-panel">
        <span className="grid size-12 place-items-center rounded-xl bg-soft text-moss">
          <KeyRound size={22} />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-[-.04em]">Reset password</h1>
        <p className="mt-2 text-sm text-muted">
          {done ? "Your password has been updated." : "Choose a new password for your account."}
        </p>
        {done ? (
          <Link
            className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg bg-moss px-4 text-sm font-semibold text-white shadow-sm hover:bg-moss/90"
            to="/login"
          >
            Go to sign in
          </Link>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" autoComplete="new-password" />
            <Input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Confirm new password" autoComplete="new-password" />
            <Button className="w-full" disabled={loading || !token}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? "Resetting..." : "Reset password"}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
