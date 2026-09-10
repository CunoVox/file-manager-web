import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { Code2, Copy, CreditCard, Loader2, Mail, Plus, Save, Send, Settings2, Trash2, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import type { BillingPlan, EmailTemplate, PayosSettings, SmtpSettings, SystemSettings, TrashPolicy } from "../types/file";

type SmtpForm = {
  enabled: boolean;
  host: string;
  port: string;
  username: string;
  password: string;
  startTls: boolean;
  auth: boolean;
  fromEmail: string;
  fromName: string;
  otpSubject: string;
};

type PayosForm = {
  enabled: boolean;
  clientId: string;
  apiKey: string;
  checksumKey: string;
  returnUrl: string;
  cancelUrl: string;
};

type PlanForm = {
  id?: string;
  name: string;
  quotaGb: string;
  price: string;
  currency: string;
  durationDays: string;
  description: string;
  active: boolean;
  sortOrder: string;
};

const emptySmtpForm: SmtpForm = {
  enabled: false,
  host: "",
  port: "587",
  username: "",
  password: "",
  startTls: true,
  auth: true,
  fromEmail: "",
  fromName: "HaoBox",
  otpSubject: "Your HaoBox verification code",
};

const emptyPayosForm: PayosForm = {
  enabled: false,
  clientId: "",
  apiKey: "",
  checksumKey: "",
  returnUrl: "",
  cancelUrl: "",
};

const emptyPlanForm: PlanForm = {
  name: "",
  quotaGb: "20",
  price: "99000",
  currency: "VND",
  durationDays: "30",
  description: "",
  active: true,
  sortOrder: "0",
};

export function AdminSettingsPage() {
  const client = useQueryClient();
  const [retentionDays, setRetentionDays] = useState("30");
  const [smtpForm, setSmtpForm] = useState<SmtpForm>(emptySmtpForm);
  const [testEmail, setTestEmail] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templateForm, setTemplateForm] = useState({ subject: "", htmlBody: "", textBody: "" });

  const settings = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => (await api.get<SystemSettings>("/api/v1/admin/settings")).data,
  });
  const templates = useQuery({
    queryKey: ["admin", "email-templates"],
    queryFn: async () => (await api.get<EmailTemplate[]>("/api/v1/admin/settings/email-templates")).data,
  });

  const updateTrashPolicy = useMutation({
    mutationFn: async () => {
      const days = Number(retentionDays);
      if (!Number.isInteger(days) || days < 1 || days > 3650) {
        throw new Error("Retention days must be between 1 and 3650.");
      }
      return (await api.patch<TrashPolicy>("/api/v1/admin/settings/trash-policy", { retentionDays: days })).data;
    },
    onSuccess: async (policy) => {
      setRetentionDays(String(policy.retentionDays));
      toast.success("Recycle bin policy updated");
      await invalidateSettings(client);
    },
    onError: (error: any) =>
      toast.error("Could not update recycle bin policy", {
        description: error.response?.data?.message ?? error.message ?? "Please try again.",
      }),
  });

  const updateSmtp = useMutation({
    mutationFn: async () => {
      const port = Number(smtpForm.port);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("SMTP port must be between 1 and 65535.");
      }
      return (
        await api.patch<SmtpSettings>("/api/v1/admin/settings/smtp", {
          ...smtpForm,
          port,
          password: smtpForm.password.trim(),
        })
      ).data;
    },
    onSuccess: async (smtp) => {
      setSmtpForm(fromSmtpSettings(smtp));
      toast.success("SMTP settings updated");
      await invalidateSettings(client);
    },
    onError: (error: any) =>
      toast.error("Could not update SMTP settings", {
        description: error.response?.data?.message ?? error.message ?? "Please check the form.",
      }),
  });

  const testSmtp = useMutation({
    mutationFn: async () => api.post("/api/v1/admin/settings/smtp/test", { recipientEmail: testEmail.trim() }),
    onMutate: () =>
      toast.loading("Sending SMTP test email...", {
        id: "smtp-test-email",
      }),
    onSuccess: () =>
      toast.success("SMTP test email sent", {
        id: "smtp-test-email",
        description: "Check the recipient inbox to confirm delivery.",
      }),
    onError: (error: any) =>
      toast.error("Could not send test email", {
        id: "smtp-test-email",
        description: error.response?.data?.message ?? "Please check the SMTP settings.",
      }),
  });
  const updateTemplate = useMutation({
    mutationFn: async () =>
      (
        await api.patch<EmailTemplate>(`/api/v1/admin/settings/email-templates/${selectedTemplate}`, templateForm)
      ).data,
    onSuccess: async (template) => {
      applyTemplate(template);
      toast.success("Email template updated");
      await client.invalidateQueries({ queryKey: ["admin", "email-templates"] });
      await client.invalidateQueries({ queryKey: ["audit-logs"] });
    },
    onError: (error: any) =>
      toast.error("Could not update email template", {
        description: error.response?.data?.message ?? "Please check the template.",
      }),
  });
  const resetTemplate = useMutation({
    mutationFn: async () =>
      (await api.post<EmailTemplate>(`/api/v1/admin/settings/email-templates/${selectedTemplate}/reset`)).data,
    onSuccess: async (template) => {
      applyTemplate(template);
      toast.success("Template reset");
      await client.invalidateQueries({ queryKey: ["admin", "email-templates"] });
    },
  });
  const testTemplate = useMutation({
    mutationFn: async () =>
      api.post(`/api/v1/admin/settings/email-templates/${selectedTemplate}/test`, {
        recipientEmail: testEmail.trim(),
      }),
    onMutate: () =>
      toast.loading("Sending template test email...", {
        id: "template-test-email",
      }),
    onSuccess: () =>
      toast.success("Template test email sent", {
        id: "template-test-email",
        description: "The selected template was rendered with sample data.",
      }),
    onError: (error: any) =>
      toast.error("Could not send template test", {
        id: "template-test-email",
        description: error.response?.data?.message ?? "Please check SMTP and template settings.",
      }),
  });

  useEffect(() => {
    if (settings.data) {
      setRetentionDays(String(settings.data.trashPolicy.retentionDays));
      setSmtpForm(fromSmtpSettings(settings.data.smtp));
    }
  }, [settings.data]);

  useEffect(() => {
    if (!templates.data?.length) return;
    const template = templates.data.find((item) => item.key === selectedTemplate) ?? templates.data[0];
    setSelectedTemplate(template.key);
    applyTemplate(template);
  }, [templates.data]);

  function applyTemplate(template: EmailTemplate) {
    setTemplateForm({
      subject: template.subject,
      htmlBody: template.htmlBody,
      textBody: template.textBody,
    });
  }

  if (settings.isPending) {
    return (
      <section className="mx-auto max-w-6xl p-5 md:p-10">
        <div className="flex h-64 items-center justify-center text-muted">
          <Loader2 className="size-6 animate-spin" />
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl p-5 md:p-10">
      <div className="flex items-start gap-4">
        <span className="grid size-11 place-items-center rounded-lg bg-soft text-moss">
          <Settings2 size={20} />
        </span>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">System Settings</h1>
          <p className="mt-2 text-sm text-muted">
            Configure authentication email and system retention policies.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-5">
        <section className="rounded-xl border border-line bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Trash2 className="size-5 text-moss" />
                <h2 className="text-xl font-extrabold">Recycle Bin Policy</h2>
              </div>
              <p className="mt-2 text-sm text-muted">
                Files and folders in Trash are deleted forever after this many days.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-[220px_auto] md:items-end">
            <Field label="Retention days">
              <Input
                type="number"
                min={1}
                max={3650}
                value={retentionDays}
                onChange={(event) => setRetentionDays(event.target.value)}
              />
            </Field>
            <Button
              className="md:w-36"
              onClick={() => updateTrashPolicy.mutate()}
              disabled={updateTrashPolicy.isPending}
            >
              {updateTrashPolicy.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save size={16} />}
              Save policy
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-white p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Mail className="size-5 text-moss" />
                <h2 className="text-xl font-extrabold">OTP Email SMTP</h2>
              </div>
              <p className="mt-2 text-sm text-muted">
                Used to send two-factor authentication codes during sign-in.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-sm font-bold">
              <input
                type="checkbox"
                className="size-4 accent-moss"
                checked={smtpForm.enabled}
                onChange={(event) => setSmtpForm((current) => ({ ...current, enabled: event.target.checked }))}
              />
              Enabled
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="SMTP host">
              <Input value={smtpForm.host} onChange={(event) => updateSmtpField("host", event.target.value, setSmtpForm)} placeholder="smtp.gmail.com" />
            </Field>
            <Field label="Port">
              <Input type="number" min={1} max={65535} value={smtpForm.port} onChange={(event) => updateSmtpField("port", event.target.value, setSmtpForm)} />
            </Field>
            <Field label="Username">
              <Input value={smtpForm.username} onChange={(event) => updateSmtpField("username", event.target.value, setSmtpForm)} autoComplete="off" />
            </Field>
            <Field label={`Password${settings.data?.smtp.passwordConfigured ? " (leave blank to keep current)" : ""}`}>
              <Input
                type="password"
                value={smtpForm.password}
                onChange={(event) => updateSmtpField("password", event.target.value, setSmtpForm)}
                autoComplete="new-password"
              />
            </Field>
            <Field label="From email">
              <Input type="email" value={smtpForm.fromEmail} onChange={(event) => updateSmtpField("fromEmail", event.target.value, setSmtpForm)} placeholder="no-reply@example.com" />
            </Field>
            <Field label="From name">
              <Input value={smtpForm.fromName} onChange={(event) => updateSmtpField("fromName", event.target.value, setSmtpForm)} />
            </Field>
            <Field label="OTP subject">
              <Input value={smtpForm.otpSubject} onChange={(event) => updateSmtpField("otpSubject", event.target.value, setSmtpForm)} />
            </Field>
            <div className="grid content-end gap-3 sm:grid-cols-2">
              <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-canvas px-3 text-sm font-bold">
                <input
                  type="checkbox"
                  className="size-4 accent-moss"
                  checked={smtpForm.auth}
                  onChange={(event) => setSmtpForm((current) => ({ ...current, auth: event.target.checked }))}
                />
                SMTP auth
              </label>
              <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-canvas px-3 text-sm font-bold">
                <input
                  type="checkbox"
                  className="size-4 accent-moss"
                  checked={smtpForm.startTls}
                  onChange={(event) => setSmtpForm((current) => ({ ...current, startTls: event.target.checked }))}
                />
                STARTTLS
              </label>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button onClick={() => updateSmtp.mutate()} disabled={updateSmtp.isPending}>
              {updateSmtp.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save size={16} />}
              Save SMTP
            </Button>
          </div>

          <div className="mt-6 rounded-lg border border-line bg-canvas p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <Field label="Send test email to">
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(event) => setTestEmail(event.target.value)}
                  placeholder="admin@example.com"
                />
              </Field>
              <Button
                variant="outline"
                onClick={() => testSmtp.mutate()}
                disabled={testSmtp.isPending || !testEmail.trim()}
              >
                {testSmtp.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send size={16} />}
                {testSmtp.isPending ? "Sending..." : "Send test"}
              </Button>
            </div>
          </div>
        </section>

        <BillingSettingsSection />

        <section className="rounded-xl border border-line bg-white p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-soft text-moss">
              <Code2 size={18} />
            </span>
            <div>
              <h2 className="text-xl font-extrabold">Email Templates</h2>
              <p className="mt-2 text-sm text-muted">
                Edit the subject, HTML body, and plain text fallback for each email workflow.
              </p>
            </div>
          </div>

          {templates.isPending ? (
            <div className="mt-6 flex h-40 items-center justify-center text-muted">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : (
            <div className="mt-5 grid gap-5 xl:grid-cols-[280px_1fr]">
              <div className="space-y-2">
                {(templates.data ?? []).map((template) => (
                  <button
                    key={template.key}
                    className={
                      template.key === selectedTemplate
                        ? "w-full rounded-lg bg-soft px-3 py-3 text-left text-sm font-bold text-moss"
                        : "w-full rounded-lg border border-line bg-white px-3 py-3 text-left text-sm font-bold hover:bg-canvas"
                    }
                    onClick={() => {
                      setSelectedTemplate(template.key);
                      applyTemplate(template);
                    }}
                  >
                    {template.name}
                    <span className="mt-1 block truncate font-mono text-[10px] uppercase tracking-wide text-muted">
                      {template.key}
                    </span>
                  </button>
                ))}
              </div>

              <div className="min-w-0 space-y-4">
                <Field label="Subject">
                  <Input
                    value={templateForm.subject}
                    onChange={(event) => setTemplateForm((current) => ({ ...current, subject: event.target.value }))}
                  />
                </Field>
                <Field label="HTML body">
                  <textarea
                    className="min-h-[260px] w-full rounded-lg border border-line bg-white px-3 py-3 font-mono text-xs outline-none transition placeholder:text-muted/70 focus:border-moss focus:ring-2 focus:ring-moss/10"
                    value={templateForm.htmlBody}
                    onChange={(event) => setTemplateForm((current) => ({ ...current, htmlBody: event.target.value }))}
                  />
                </Field>
                <Field label="Plain text body">
                  <textarea
                    className="min-h-[140px] w-full rounded-lg border border-line bg-white px-3 py-3 font-mono text-xs outline-none transition placeholder:text-muted/70 focus:border-moss focus:ring-2 focus:ring-moss/10"
                    value={templateForm.textBody}
                    onChange={(event) => setTemplateForm((current) => ({ ...current, textBody: event.target.value }))}
                  />
                </Field>
                <div className="rounded-lg border border-line bg-canvas p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">Available variables</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {currentTemplate(templates.data, selectedTemplate)?.variables.map((variable) => (
                      <code key={variable} className="rounded bg-white px-2 py-1 text-xs text-moss">
                        {"{{" + variable + "}}"}
                      </code>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" onClick={() => resetTemplate.mutate()} disabled={!selectedTemplate || resetTemplate.isPending}>
                    {resetTemplate.isPending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw size={16} />}
                    Reset default
                  </Button>
                  <Button variant="outline" onClick={() => testTemplate.mutate()} disabled={!selectedTemplate || !testEmail.trim() || testTemplate.isPending}>
                    {testTemplate.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send size={16} />}
                    {testTemplate.isPending ? "Sending..." : "Send template test"}
                  </Button>
                  <Button onClick={() => updateTemplate.mutate()} disabled={!selectedTemplate || updateTemplate.isPending}>
                    {updateTemplate.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save size={16} />}
                    Save template
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function BillingSettingsSection() {
  const client = useQueryClient();
  const [payosForm, setPayosForm] = useState<PayosForm>(emptyPayosForm);
  const [planForm, setPlanForm] = useState<PlanForm>(emptyPlanForm);

  const payos = useQuery({
    queryKey: ["admin", "billing", "payos"],
    queryFn: async () => (await api.get<PayosSettings>("/api/v1/admin/billing/payos")).data,
  });
  const plans = useQuery({
    queryKey: ["admin", "billing", "plans"],
    queryFn: async () => (await api.get<BillingPlan[]>("/api/v1/admin/billing/plans")).data,
  });

  const updatePayos = useMutation({
    mutationFn: async () =>
      (
        await api.patch<PayosSettings>("/api/v1/admin/billing/payos", {
          ...payosForm,
          apiKey: payosForm.apiKey.trim(),
          checksumKey: payosForm.checksumKey.trim(),
        })
      ).data,
    onSuccess: async (settings) => {
      setPayosForm(fromPayosSettings(settings));
      toast.success("PayOS settings updated");
      await client.invalidateQueries({ queryKey: ["admin", "billing", "payos"] });
      await client.invalidateQueries({ queryKey: ["audit-logs"] });
    },
    onError: (error: any) =>
      toast.error("Could not update PayOS settings", {
        description: error.response?.data?.message ?? "Check APP_ENCRYPTION_KEY and PayOS credentials.",
      }),
  });

  const savePlan = useMutation({
    mutationFn: async () => {
      const payload = planPayload(planForm);
      if (planForm.id) {
        return (await api.patch<BillingPlan>(`/api/v1/admin/billing/plans/${planForm.id}`, payload)).data;
      }
      return (await api.post<BillingPlan>("/api/v1/admin/billing/plans", payload)).data;
    },
    onSuccess: async () => {
      setPlanForm(emptyPlanForm);
      toast.success(planForm.id ? "Quota plan updated" : "Quota plan created");
      await client.invalidateQueries({ queryKey: ["admin", "billing", "plans"] });
      await client.invalidateQueries({ queryKey: ["billing", "plans"] });
      await client.invalidateQueries({ queryKey: ["audit-logs"] });
    },
    onError: (error: any) =>
      toast.error("Could not save quota plan", {
        description: error.response?.data?.message ?? error.message ?? "Please check the plan form.",
      }),
  });

  useEffect(() => {
    if (payos.data) setPayosForm(fromPayosSettings(payos.data));
  }, [payos.data]);

  async function copyWebhook() {
    if (!payos.data?.webhookUrl) return;
    await navigator.clipboard.writeText(payos.data.webhookUrl);
    toast.success("Webhook URL copied");
  }

  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-moss" />
            <h2 className="text-xl font-extrabold">PayOS & Quota Plans</h2>
          </div>
          <p className="mt-2 text-sm text-muted">
            Connect PayOS and publish storage plans users can buy from their profile.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-sm font-bold">
          <input
            type="checkbox"
            className="size-4 accent-moss"
            checked={payosForm.enabled}
            onChange={(event) => setPayosForm((current) => ({ ...current, enabled: event.target.checked }))}
          />
          Enabled
        </label>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.1fr]">
        <div className="rounded-lg border border-line bg-canvas p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Client ID">
              <Input value={payosForm.clientId} onChange={(event) => updatePayosField("clientId", event.target.value, setPayosForm)} autoComplete="off" />
            </Field>
            <Field label={`API Key${payos.data?.apiKeyConfigured ? " (leave blank to keep current)" : ""}`}>
              <Input type="password" value={payosForm.apiKey} onChange={(event) => updatePayosField("apiKey", event.target.value, setPayosForm)} autoComplete="new-password" />
            </Field>
            <Field label={`Checksum Key${payos.data?.checksumKeyConfigured ? " (leave blank to keep current)" : ""}`}>
              <Input type="password" value={payosForm.checksumKey} onChange={(event) => updatePayosField("checksumKey", event.target.value, setPayosForm)} autoComplete="new-password" />
            </Field>
            <Field label="Return URL">
              <Input value={payosForm.returnUrl} onChange={(event) => updatePayosField("returnUrl", event.target.value, setPayosForm)} placeholder="https://haobox.cloud/billing/success" />
            </Field>
            <Field label="Cancel URL">
              <Input value={payosForm.cancelUrl} onChange={(event) => updatePayosField("cancelUrl", event.target.value, setPayosForm)} placeholder="https://haobox.cloud/billing/cancel" />
            </Field>
            <div className="grid content-end">
              <Button onClick={() => updatePayos.mutate()} disabled={updatePayos.isPending || payos.isPending}>
                {updatePayos.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save size={16} />}
                Save PayOS
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-line bg-white p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Webhook URL</p>
                <p className="mt-1 truncate font-mono text-xs text-ink">{payos.data?.webhookUrl ?? "Loading..."}</p>
              </div>
              <Button variant="outline" onClick={copyWebhook} disabled={!payos.data?.webhookUrl}>
                <Copy size={16} />
                Copy
              </Button>
            </div>
            {!payos.data?.encryptionConfigured && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                APP_ENCRYPTION_KEY is not configured. Add it before saving PayOS secret keys.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-canvas p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold">{planForm.id ? "Edit Quota Plan" : "Create Quota Plan"}</h3>
              <p className="mt-1 text-xs text-muted">Plans are shown to users when active.</p>
            </div>
            {planForm.id && (
              <Button variant="outline" onClick={() => setPlanForm(emptyPlanForm)}>
                New plan
              </Button>
            )}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Plan name">
              <Input value={planForm.name} onChange={(event) => updatePlanField("name", event.target.value, setPlanForm)} placeholder="Pro 100GB" />
            </Field>
            <Field label="Quota GB">
              <Input type="number" min={1} value={planForm.quotaGb} onChange={(event) => updatePlanField("quotaGb", event.target.value, setPlanForm)} />
            </Field>
            <Field label="Price">
              <Input type="number" min={0} value={planForm.price} onChange={(event) => updatePlanField("price", event.target.value, setPlanForm)} />
            </Field>
            <Field label="Currency">
              <Input value={planForm.currency} onChange={(event) => updatePlanField("currency", event.target.value, setPlanForm)} />
            </Field>
            <Field label="Duration days">
              <Input type="number" min={0} value={planForm.durationDays} onChange={(event) => updatePlanField("durationDays", event.target.value, setPlanForm)} />
            </Field>
            <Field label="Sort order">
              <Input type="number" value={planForm.sortOrder} onChange={(event) => updatePlanField("sortOrder", event.target.value, setPlanForm)} />
            </Field>
            <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-bold">
              <input
                type="checkbox"
                className="size-4 accent-moss"
                checked={planForm.active}
                onChange={(event) => setPlanForm((current) => ({ ...current, active: event.target.checked }))}
              />
              Active
            </label>
            <div className="grid content-end">
              <Button onClick={() => savePlan.mutate()} disabled={savePlan.isPending}>
                {savePlan.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus size={16} />}
                {planForm.id ? "Save plan" : "Create plan"}
              </Button>
            </div>
            <Field label="Description">
              <textarea
                className="min-h-[88px] w-full rounded-lg border border-line bg-white px-3 py-3 text-sm outline-none transition placeholder:text-muted/70 focus:border-moss focus:ring-2 focus:ring-moss/10 md:col-span-2"
                value={planForm.description}
                onChange={(event) => updatePlanField("description", event.target.value, setPlanForm)}
                placeholder="Best for teams that need more storage."
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-line">
        <div className="grid grid-cols-[1.3fr_.8fr_.8fr_.8fr_.6fr] gap-3 border-b border-line bg-canvas px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted">
          <span>Plan</span>
          <span>Quota</span>
          <span>Price</span>
          <span>Duration</span>
          <span>Status</span>
        </div>
        {(plans.data ?? []).map((plan) => (
          <button
            key={plan.id}
            className="grid w-full grid-cols-[1.3fr_.8fr_.8fr_.8fr_.6fr] gap-3 border-b border-line px-4 py-3 text-left text-sm last:border-b-0 hover:bg-canvas"
            onClick={() => setPlanForm(fromPlan(plan))}
          >
            <span className="min-w-0">
              <strong className="block truncate">{plan.name}</strong>
              <span className="block truncate text-xs text-muted">{plan.description || "No description"}</span>
            </span>
            <span className="font-bold">{plan.quotaGb} GB</span>
            <span className="font-bold">{formatMoney(plan.price, plan.currency)}</span>
            <span>{plan.durationDays > 0 ? `${plan.durationDays} days` : "No expiry"}</span>
            <span className={plan.active ? "font-bold text-moss" : "font-bold text-muted"}>{plan.active ? "Active" : "Hidden"}</span>
          </button>
        ))}
        {!plans.isPending && !plans.data?.length && (
          <div className="px-4 py-8 text-center text-sm text-muted">No quota plans yet.</div>
        )}
      </div>
    </section>
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

function fromSmtpSettings(settings: SmtpSettings): SmtpForm {
  return {
    enabled: settings.enabled,
    host: settings.host ?? "",
    port: String(settings.port ?? 587),
    username: settings.username ?? "",
    password: "",
    startTls: settings.startTls,
    auth: settings.auth,
    fromEmail: settings.fromEmail ?? "",
    fromName: settings.fromName ?? "HaoBox",
    otpSubject: settings.otpSubject ?? "Your HaoBox verification code",
  };
}

function fromPayosSettings(settings: PayosSettings): PayosForm {
  return {
    enabled: settings.enabled,
    clientId: settings.clientId ?? "",
    apiKey: "",
    checksumKey: "",
    returnUrl: settings.returnUrl ?? "",
    cancelUrl: settings.cancelUrl ?? "",
  };
}

function fromPlan(plan: BillingPlan): PlanForm {
  return {
    id: plan.id,
    name: plan.name,
    quotaGb: String(plan.quotaGb),
    price: String(plan.price),
    currency: plan.currency || "VND",
    durationDays: String(plan.durationDays),
    description: plan.description ?? "",
    active: plan.active,
    sortOrder: String(plan.sortOrder),
  };
}

function planPayload(form: PlanForm) {
  const quotaGb = Number(form.quotaGb);
  const price = Number(form.price);
  const durationDays = Number(form.durationDays);
  const sortOrder = Number(form.sortOrder);
  if (!form.name.trim()) throw new Error("Plan name is required.");
  if (!Number.isFinite(quotaGb) || quotaGb < 1) throw new Error("Quota must be at least 1 GB.");
  if (!Number.isFinite(price) || price < 0) throw new Error("Price must be zero or greater.");
  if (!Number.isFinite(durationDays) || durationDays < 0) throw new Error("Duration must be zero or greater.");
  return {
    name: form.name.trim(),
    quotaGb,
    price,
    currency: (form.currency || "VND").trim().toUpperCase(),
    durationDays,
    description: form.description.trim(),
    active: form.active,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: currency || "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function updateSmtpField(
  key: keyof SmtpForm,
  value: string,
  setSmtpForm: Dispatch<SetStateAction<SmtpForm>>,
) {
  setSmtpForm((current) => ({ ...current, [key]: value }));
}

function updatePayosField(
  key: keyof PayosForm,
  value: string,
  setPayosForm: Dispatch<SetStateAction<PayosForm>>,
) {
  setPayosForm((current) => ({ ...current, [key]: value }));
}

function updatePlanField(
  key: keyof PlanForm,
  value: string,
  setPlanForm: Dispatch<SetStateAction<PlanForm>>,
) {
  setPlanForm((current) => ({ ...current, [key]: value }));
}

function currentTemplate(templates: EmailTemplate[] | undefined, selectedTemplate: string) {
  return templates?.find((template) => template.key === selectedTemplate);
}

async function invalidateSettings(client: QueryClient) {
  await client.invalidateQueries({ queryKey: ["admin", "settings"] });
  await client.invalidateQueries({ queryKey: ["admin", "trash-policy"] });
  await client.invalidateQueries({ queryKey: ["settings", "trash-policy"] });
  await client.invalidateQueries({ queryKey: ["audit-logs"] });
}
