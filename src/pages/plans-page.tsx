import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, CreditCard, Database, Loader2, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { formatMoney } from "../lib/billing";
import { useAuthStore } from "../store/auth-store";
import type { BillingPlan, CheckoutResponse } from "../types/file";

const fallbackPlans: BillingPlan[] = [
  {
    id: "free-display",
    name: "Free 5GB",
    quotaBytes: 5 * 1024 * 1024 * 1024,
    quotaGb: 5,
    price: 0,
    currency: "VND",
    durationDays: 0,
    description: "A free workspace to try HaoBox, store essential files, and explore secure sharing.",
    active: true,
    sortOrder: 0,
  },
  {
    id: "starter-fallback",
    name: "Starter 20GB",
    quotaBytes: 20 * 1024 * 1024 * 1024,
    quotaGb: 20,
    price: 29000,
    currency: "VND",
    durationDays: 30,
    description: "20GB private storage for personal files and everyday sharing.",
    active: true,
    sortOrder: 1,
  },
  {
    id: "pro-fallback",
    name: "Pro 50GB",
    quotaBytes: 50 * 1024 * 1024 * 1024,
    quotaGb: 50,
    price: 69000,
    currency: "VND",
    durationDays: 30,
    description: "50GB storage for frequent uploads, previews, and file sharing.",
    active: true,
    sortOrder: 2,
  },
  {
    id: "business-fallback",
    name: "Business 100GB",
    quotaBytes: 100 * 1024 * 1024 * 1024,
    quotaGb: 100,
    price: 129000,
    currency: "VND",
    durationDays: 30,
    description: "100GB storage for small teams, shops, and heavier file workflows.",
    active: true,
    sortOrder: 3,
  },
];

export function PlansPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [confirmPlan, setConfirmPlan] = useState<BillingPlan | null>(null);
  const quota = user?.effectiveStorageQuotaBytes ?? null;

  const plans = useQuery({
    queryKey: ["billing", "plans"],
    queryFn: async () => (await api.get<BillingPlan[]>("/api/v1/billing/plans")).data,
    retry: false,
  });
  const visiblePlans = plans.data?.length ? withFreePlan(plans.data) : fallbackPlans;

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

  function selectPlan(plan: BillingPlan) {
    if (plan.price === 0) {
      navigate(token ? "/files" : "/login", { state: token ? undefined : { from: { pathname: "/plans" } } });
      return;
    }
    if (!token) {
      navigate("/login", { state: { from: { pathname: "/plans" } } });
      return;
    }
    if (plan.id.endsWith("-fallback")) {
      toast.error("Plans are not connected yet", {
        description: "Please try again after the billing API is available.",
      });
      return;
    }
    setConfirmPlan(plan);
  }

  function confirmCheckout() {
    if (!confirmPlan) return;
    checkout.mutate(confirmPlan.id);
    setConfirmPlan(null);
  }

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-16">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link className="inline-flex items-center gap-2 text-sm font-bold text-moss hover:underline" to="/">
              HaoBox
            </Link>
            <p className="mt-8 font-mono text-[10px] uppercase tracking-[.22em] text-muted">
              Plans
            </p>
            <h1 className="mt-3 max-w-3xl text-5xl font-extrabold leading-[1.05]">
              Choose storage that fits your file workflow.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted">
              Start free, then upgrade when you need more room for uploads, previews, sharing, and API-backed workflows.
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-extrabold hover:bg-soft"
            to={token ? "/files" : "/login"}
          >
            {token ? "Open dashboard" : "Sign in"}
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mt-10 grid gap-4 rounded-xl border border-line bg-white p-4 md:grid-cols-3">
          <PlanSignal Icon={Database} title="Free included" description="New users start with a free workspace quota automatically." />
          <PlanSignal Icon={CreditCard} title="PayOS checkout" description="Paid plans redirect securely to PayOS and update by webhook." />
          <PlanSignal Icon={Sparkles} title="Upgrade only" description="Plans below your current quota are blocked when signed in." />
        </div>

        {plans.isPending && !visiblePlans.length ? (
          <div className="mt-10 flex h-64 items-center justify-center rounded-xl border border-line bg-white text-muted">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : visiblePlans.length ? (
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {visiblePlans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                currentQuota={quota}
                pending={checkout.isPending}
                signedIn={Boolean(token)}
                onSelect={() => selectPlan(plan)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-xl border border-dashed border-line bg-white p-12 text-center text-sm text-muted">
            No active plans are available yet.
          </div>
        )}
      </section>
      {confirmPlan && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-line bg-white p-6 shadow-panel">
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">Confirm upgrade</p>
            <h2 className="mt-2 text-2xl font-extrabold">{confirmPlan.name}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              You are about to create a PayOS checkout for this storage plan.
            </p>
            <div className="mt-5 rounded-lg border border-line bg-canvas p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted">Storage</span>
                <strong>{confirmPlan.quotaGb} GB</strong>
              </div>
              <div className="mt-3 flex justify-between gap-4">
                <span className="text-muted">Price</span>
                <strong>{formatMoney(confirmPlan.price, confirmPlan.currency)}</strong>
              </div>
              <div className="mt-3 flex justify-between gap-4">
                <span className="text-muted">Duration</span>
                <strong>{confirmPlan.durationDays > 0 ? `${confirmPlan.durationDays} days` : "No expiry"}</strong>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmPlan(null)} disabled={checkout.isPending}>
                Cancel
              </Button>
              <Button onClick={confirmCheckout} disabled={checkout.isPending}>
                {checkout.isPending ? <Loader2 className="size-4 animate-spin" /> : <CreditCard size={16} />}
                Continue to PayOS
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function PricingCard({
  plan,
  currentQuota,
  pending,
  signedIn,
  onSelect,
}: {
  plan: BillingPlan;
  currentQuota: number | null;
  pending: boolean;
  signedIn: boolean;
  onSelect: () => void;
}) {
  const isCurrent = currentQuota != null && plan.quotaBytes === currentQuota;
  const isDowngrade = currentQuota != null && plan.quotaBytes < currentQuota;
  const isFree = plan.price === 0;
  const disabled = pending || isCurrent || isDowngrade || isFree;
  const label = isFree ? "Included" : !signedIn ? "Sign in to choose" : isCurrent ? "Current plan" : isDowngrade ? "Included" : "Upgrade";

  return (
    <article className={isCurrent ? "flex h-full min-h-[490px] flex-col rounded-xl border border-moss/30 bg-soft p-6 pb-7" : "flex h-full min-h-[490px] flex-col rounded-xl border border-line bg-white p-6 pb-7 shadow-sm"}>
      <div className="relative">
        <span className="absolute right-0 top-0 grid size-14 place-items-center rounded-full bg-soft text-center text-xs font-extrabold leading-4 text-moss">
          {plan.quotaGb}
          <br />
          GB
        </span>
        <h2 className="min-h-[4rem] pr-16 text-2xl font-extrabold leading-tight">{plan.name}</h2>
        <p className="mt-3 min-h-[6rem] text-sm leading-6 text-muted">
          {plan.description || "Private storage for your HaoBox workspace."}
        </p>
      </div>
      <div className="mt-4 min-h-[5.5rem]">
        <p className="text-4xl font-extrabold tracking-[-.04em]">{formatMoney(plan.price, plan.currency)}</p>
        <p className="mt-2 text-sm text-muted">
          {isFree ? "Included for new users" : plan.durationDays > 0 ? `Valid for ${plan.durationDays} days` : "No expiry"}
        </p>
      </div>
      <div className="mt-4 grid min-h-[6.5rem] gap-3 text-sm">
        {["Private file workspace", "Secure file previews", "Sharing and developer API"].map((item) => (
          <div key={item} className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="size-4 text-moss" />
            {item}
          </div>
        ))}
      </div>
      <Button className="mt-auto w-full translate-y-1" variant={disabled ? "outline" : "default"} disabled={disabled} onClick={onSelect}>
        {pending && !disabled ? <Loader2 className="size-4 animate-spin" /> : <CreditCard size={16} />}
        {label}
      </Button>
    </article>
  );
}

function withFreePlan(plans: BillingPlan[]) {
  return [
    fallbackPlans[0],
    ...plans.filter((plan) => plan.price > 0).sort((a, b) => a.sortOrder - b.sortOrder),
  ];
}

function PlanSignal({ Icon, title, description }: { Icon: typeof Database; title: string; description: string }) {
  return (
    <div className="rounded-lg bg-canvas p-4">
      <Icon className="size-5 text-moss" />
      <h3 className="mt-3 font-extrabold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}
