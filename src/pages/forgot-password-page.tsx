import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Sending password reset email...");
    try {
      await api.post("/api/v1/auth/password/forgot", { email });
      setSent(true);
      toast.success("Reset email sent", {
        id: toastId,
        description: "If this email exists, it will receive a reset link.",
      });
    } catch (error: any) {
      toast.error("Could not send reset email", {
        id: toastId,
        description: error.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5 text-ink">
      <section className="w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-panel">
        <span className="grid size-12 place-items-center rounded-xl bg-soft text-moss">
          <Mail size={22} />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-[-.04em]">Forgot password</h1>
        <p className="mt-2 text-sm text-muted">
          {sent ? "If this email exists, a reset link has been sent." : "Enter your email and we will send a reset link."}
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          <Button className="w-full" disabled={loading || !email.trim()}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </form>
        <Link className="mx-auto mt-5 block text-center text-xs font-bold text-moss hover:underline" to="/login">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
