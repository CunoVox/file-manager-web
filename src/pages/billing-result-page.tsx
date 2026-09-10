import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "../components/ui/button";

export function BillingResultPage() {
  const location = useLocation();
  const success = location.pathname.includes("success");
  const Icon = success ? CheckCircle2 : XCircle;

  return (
    <section className="mx-auto max-w-3xl p-5 md:p-10">
      <div className="rounded-xl border border-line bg-white p-8 text-center">
        <span className={success ? "mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-moss" : "mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-700"}>
          <Icon size={26} />
        </span>
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[.18em] text-muted">
          Billing
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">
          {success ? "Payment received" : "Payment cancelled"}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
          {success
            ? "Your quota will update after PayOS confirms the webhook. Refresh your profile in a moment to see the new storage limit."
            : "No quota change was made. You can return to your profile and choose a plan again whenever you are ready."}
        </p>
        <div className="mt-6 flex justify-center">
          <Link to="/profile">
            <Button>Back to profile</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
