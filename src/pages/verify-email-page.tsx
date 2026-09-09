import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, MailCheck, XCircle } from "lucide-react";
import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const verify = useMutation({
    mutationFn: async () => api.post("/api/v1/auth/email/verify", { token }),
  });

  useEffect(() => {
    if (token) verify.mutate();
  }, [token]);

  const success = verify.isSuccess;
  const failed = verify.isError || !token;

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5 text-ink">
      <section className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-panel">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-soft text-moss">
          {verify.isPending ? <Loader2 className="size-6 animate-spin" /> : success ? <CheckCircle2 size={24} /> : failed ? <XCircle size={24} /> : <MailCheck size={24} />}
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-[-.04em]">
          {success ? "Email verified" : failed ? "Verification failed" : "Verifying email"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {success
            ? "Your account is active. You can sign in now."
            : failed
              ? "This verification link is invalid or expired."
              : "Please wait while we verify your account."}
        </p>
        <Link
          className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg bg-moss px-4 text-sm font-semibold text-white shadow-sm hover:bg-moss/90"
          to="/login"
        >
          Go to sign in
        </Link>
      </section>
    </main>
  );
}
