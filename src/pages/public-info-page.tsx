import { ArrowLeft, CheckCircle2, FileText, HelpCircle, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { HaoBoxLogo } from "../components/brand/haobox-logo";

const pages = {
  help: {
    eyebrow: "Support",
    title: "Help Center",
    description: "Quick answers for common HaoBox workflows.",
    icon: <HelpCircle className="size-5" />,
    sections: [
      {
        title: "Getting started",
        items: [
          "Sign in, open My Files, and use Upload to add files to your workspace.",
          "Create folders to group files by project, customer, or month.",
          "Use search when you know part of a file or folder name.",
        ],
      },
      {
        title: "Sharing files",
        items: [
          "Use private sharing when the recipient has a HaoBox account.",
          "Use public links only for files that are safe to expose outside your workspace.",
          "Review Shared With Me to find files that other people sent to you.",
        ],
      },
      {
        title: "Account access",
        items: [
          "Use Forgot password from the sign-in page if you cannot access your account.",
          "If two-factor authentication is enabled, enter the OTP sent to your email during sign-in.",
          "Keep your password and API keys private.",
        ],
      },
    ],
  },
  privacy: {
    eyebrow: "Legal",
    title: "Privacy Policy",
    description: "How HaoBox treats account data, files, and activity information.",
    icon: <ShieldCheck className="size-5" />,
    sections: [
      {
        title: "Data we use",
        items: [
          "Account details such as name, email, role, and security settings.",
          "File metadata such as name, size, type, folder, owner, and sharing state.",
          "Operational records such as sign-in, upload, download, share, and API usage events.",
        ],
      },
      {
        title: "Why we use it",
        items: [
          "To provide file storage, preview, sharing, recovery, and developer API features.",
          "To protect accounts, verify identity, and send important email notifications.",
          "To diagnose reliability and security issues.",
        ],
      },
      {
        title: "Your control",
        items: [
          "You can update profile details from your account profile.",
          "Files in Trash can be restored or permanently deleted according to workspace policy.",
          "API keys can be revoked from the Developer Console.",
        ],
      },
    ],
  },
  terms: {
    eyebrow: "Legal",
    title: "Terms of Service",
    description: "Simple usage terms for the HaoBox workspace and developer API.",
    icon: <FileText className="size-5" />,
    sections: [
      {
        title: "Acceptable use",
        items: [
          "Use HaoBox only for files you are allowed to store, share, and process.",
          "Do not use public links or API keys to distribute harmful, illegal, or abusive content.",
          "Do not attempt to bypass rate limits, account security, or access restrictions.",
        ],
      },
      {
        title: "Account responsibility",
        items: [
          "You are responsible for keeping passwords, OTP codes, and API keys confidential.",
          "Actions performed using your account or API keys may be attributed to your account.",
          "Revoke API keys that are no longer needed or may have been exposed.",
        ],
      },
      {
        title: "Service changes",
        items: [
          "Features may change as HaoBox improves.",
          "Limits may apply to upload size, storage usage, sharing, and API requests.",
          "Critical account or security notices may be sent by email.",
        ],
      },
    ],
  },
  security: {
    eyebrow: "Trust",
    title: "Security",
    description: "Recommended practices for protecting your HaoBox workspace.",
    icon: <LockKeyhole className="size-5" />,
    sections: [
      {
        title: "Protect your account",
        items: [
          "Use a strong password and update it if you suspect exposure.",
          "Enable two-factor authentication when available for your account.",
          "Watch for unexpected password reset or sharing notification emails.",
        ],
      },
      {
        title: "Protect API keys",
        items: [
          "Store API keys only in private server-side environments.",
          "Never paste production API keys into public code, browser snippets, or screenshots.",
          "Create separate keys for separate apps so each key can be revoked independently.",
        ],
      },
      {
        title: "Report an issue",
        items: [
          "Send suspected security issues to the support contact below.",
          "Include the affected URL, time, account email, and steps to reproduce when possible.",
          "Do not include passwords or full API keys in the report.",
        ],
      },
    ],
  },
} as const;

type PageKey = keyof typeof pages;

export function PublicInfoPage() {
  const location = useLocation();
  const page = location.pathname.replace("/", "") || "help";
  const content = pages[(page as PageKey) in pages ? (page as PageKey) : "help"];

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5">
          <Link to="/" aria-label="HaoBox home">
            <HaoBoxLogo size="lg" className="h-12 max-w-[210px]" />
          </Link>
          <Link className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold text-muted hover:bg-soft hover:text-ink" to="/">
            <ArrowLeft className="size-4" />
            Home
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="rounded-lg border border-line bg-white p-6 shadow-sm md:p-8">
          <div className="flex size-12 items-center justify-center rounded-lg bg-soft text-moss">
            {content.icon}
          </div>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[.22em] text-muted">{content.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-[-.03em]">{content.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted">{content.description}</p>

          <div className="mt-8 grid gap-5">
            {content.sections.map((section) => (
              <article key={section.title} className="rounded-lg border border-line bg-canvas p-5">
                <h2 className="text-lg font-extrabold">{section.title}</h2>
                <div className="mt-4 grid gap-3">
                  {section.items.map((item) => (
                    <p key={item} className="flex gap-3 text-sm leading-6 text-muted">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-moss" />
                      <span>{item}</span>
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-lg border border-line bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-extrabold">
              <Mail className="size-4 text-moss" />
              Contact
            </div>
            <a className="mt-2 inline-block text-sm font-bold text-moss hover:underline" href="mailto:support@haovo.cloud">
              support@haovo.cloud
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
