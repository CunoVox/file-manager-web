import {
  Activity,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Code2,
  Database,
  FileArchive,
  FileText,
  Gauge,
  KeyRound,
  LockKeyhole,
  Mail,
  Server,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { HaoBoxLogo } from "../components/brand/haobox-logo";
import { useAuthStore } from "../store/auth-store";

const features = [
  {
    title: "Private S3 storage",
    description: "Run files on your own MinIO/S3-compatible nodes with admin-controlled access.",
    Icon: Database,
  },
  {
    title: "Multi-node scaling",
    description: "Distribute uploads across multiple storage nodes and migrate data when a node fills up.",
    Icon: Boxes,
  },
  {
    title: "Secure sharing",
    description: "Share files privately with users or publish controlled public links when needed.",
    Icon: Share2,
  },
  {
    title: "Operations ready",
    description: "Track quota, audit logs, health checks, notifications, and background migrations.",
    Icon: Activity,
  },
];

const capabilities = [
  "Multi-file and drag-and-drop uploads",
  "Folder, rename, move, trash, and restore",
  "Inline image, video, and PDF previews",
  "User quota and admin role management",
  "SMTP email templates and 2FA OTP",
  "Swagger API for developer workflows",
];

const stats = [
  { label: "Storage nodes", value: "Multi" },
  { label: "Sharing modes", value: "3" },
  { label: "Admin controls", value: "Live" },
];

export function LandingPage() {
  const isSignedIn = Boolean(useAuthStore((state) => state.token));
  const primaryHref = isSignedIn ? "/files" : "/login";

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link to="/" aria-label="HaoBox home">
            <HaoBoxLogo size="lg" className="h-12 max-w-[210px]" />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-muted md:flex">
            <a className="hover:text-moss" href="#features">
              Features
            </a>
            <a className="hover:text-moss" href="#platform">
              Platform
            </a>
            <a className="hover:text-moss" href="#developers">
              Developers
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              className="hidden h-10 items-center justify-center rounded-lg px-4 text-sm font-bold text-muted hover:bg-white hover:text-ink sm:inline-flex"
              to="/login"
            >
              Sign in
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-moss px-4 text-sm font-bold text-white shadow-sm hover:bg-moss/90"
              to={primaryHref}
            >
              {isSignedIn ? "Open Dashboard" : "Get Started"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-14 lg:grid-cols-[.9fr_1.1fr] lg:px-8 lg:py-20">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-xs font-bold text-moss shadow-sm">
            <Sparkles className="h-4 w-4" />
            Private file storage for modern teams
          </div>
          <h1 className="mt-7 max-w-3xl text-5xl font-extrabold leading-[1.05] md:text-6xl">
            HaoBox keeps files organized, shared, and under your control.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            Store and deliver files through your own S3-compatible infrastructure, with the dashboard, permissions, quota, and admin tools your users expect.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-moss px-5 text-sm font-extrabold text-white shadow-sm hover:bg-moss/90"
              to={primaryHref}
            >
              {isSignedIn ? "Open Dashboard" : "Start with HaoBox"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-line bg-white px-5 text-sm font-extrabold text-ink hover:bg-soft"
              href="https://s3.haovo.cloud/swagger-ui/index.html"
              rel="noreferrer"
              target="_blank"
            >
              <Code2 className="h-4 w-4" />
              View API Docs
            </a>
          </div>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            {stats.map((item) => (
              <div key={item.label} className="border-l border-line pl-4">
                <div className="text-2xl font-extrabold">{item.value}</div>
                <div className="mt-1 text-xs font-semibold text-muted">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <ProductPreview />
      </section>

      <section id="features" className="scroll-mt-24 border-y border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-12 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {features.map(({ title, description, Icon }) => (
            <article key={title} className="rounded-lg border border-line bg-canvas p-6">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-soft text-moss">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-extrabold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="platform" className="mx-auto grid max-w-7xl scroll-mt-24 gap-10 px-5 py-16 lg:grid-cols-[.95fr_1.05fr] lg:px-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.22em] text-muted">
            Storage platform
          </p>
          <h2 className="mt-3 text-4xl font-extrabold">Built for admins, useful for everyone.</h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-muted">
            HaoBox gives users a clean workspace while administrators manage the storage layer, quota, health checks, migrations, email templates, and access policy.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {capabilities.map((capability) => (
            <div key={capability} className="flex items-start gap-3 rounded-lg border border-line bg-white p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-moss" />
              <span className="text-sm font-semibold leading-6">{capability}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="developers" className="scroll-mt-24 bg-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[.85fr_1.15fr] lg:px-8">
          <div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-emerald-200">
              <Code2 className="h-6 w-6" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[.22em] text-emerald-200/80">
              Developer ready
            </p>
            <h2 className="mt-3 text-4xl font-extrabold">Expose file workflows through a clean API.</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/65">
              Start with Swagger today, then grow into API keys, rate limits, and developer-facing file automation when the product is ready.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0c1712]">
            <div className="border-b border-white/10 px-5 py-3 font-mono text-xs text-white/50">
              HaoBox API
            </div>
            <div className="space-y-3 p-5 font-mono text-sm">
              <ApiLine method="POST" path="/api/v1/files" label="Upload a file" />
              <ApiLine method="GET" path="/api/v1/files" label="List workspace files" />
              <ApiLine method="PATCH" path="/api/v1/files/{id}/move" label="Move files and folders" />
              <ApiLine method="GET" path="/download/{id}" label="Stream or download content" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto px-5 py-16 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-extrabold">Give your files a calmer place to live.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-muted">
            Launch a private workspace, connect your MinIO nodes, and keep storage operations visible from one focused dashboard.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-moss px-5 text-sm font-extrabold text-white shadow-sm hover:bg-moss/90"
              to={primaryHref}
            >
              {isSignedIn ? "Go to My Files" : "Create your workspace"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <HaoBoxLogo size="sm" />
          <div className="flex flex-wrap gap-5">
            <Link className="hover:text-moss" to="/login">
              Sign in
            </Link>
            <a className="hover:text-moss" href="https://s3.haovo.cloud/swagger-ui/index.html" rel="noreferrer" target="_blank">
              API Docs
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-coral" />
            <span className="h-3 w-3 rounded-full bg-amber-300" />
            <span className="h-3 w-3 rounded-full bg-moss" />
          </div>
          <span className="rounded-full bg-soft px-3 py-1 text-xs font-bold text-moss">Admin workspace</span>
        </div>
        <div className="grid min-h-[480px] md:grid-cols-[190px_1fr]">
          <aside className="hidden border-r border-line bg-canvas p-4 md:block">
            <HaoBoxLogo size="sm" className="mb-8 h-9" />
            <PreviewNav Icon={FileArchive} label="My Files" active />
            <PreviewNav Icon={Share2} label="Shared" />
            <PreviewNav Icon={Users} label="Users" />
            <PreviewNav Icon={Server} label="S3 Store" />
          </aside>
          <div className="p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">Workspace</p>
                <h3 className="mt-2 text-2xl font-extrabold">My Files</h3>
              </div>
              <div className="flex gap-2">
                <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-xs font-bold">
                  <FileText className="h-4 w-4" />
                  New folder
                </span>
                <span className="inline-flex h-10 items-center gap-2 rounded-lg bg-moss px-3 text-xs font-bold text-white">
                  <ArrowRight className="h-4 w-4" />
                  Upload
                </span>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <PreviewMetric Icon={Gauge} label="Storage" value="10.5 MB / 40 GB" />
              <PreviewMetric Icon={ShieldCheck} label="Healthy nodes" value="2 / 2" />
              <PreviewMetric Icon={KeyRound} label="2FA" value="Enabled" />
            </div>

            <div className="mt-7 overflow-hidden rounded-lg border border-line">
              <PreviewFile name="Brand-assets.zip" meta="application/zip · 86.2 MB" Icon={FileArchive} />
              <PreviewFile name="Invoice-September.pdf" meta="application/pdf · 49.5 KB" Icon={FileText} />
              <PreviewFile name="Product-demo.mp4" meta="video/mp4 · 9.2 MB" Icon={FileText} />
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-canvas p-4">
                <div className="flex items-center gap-2 text-sm font-extrabold">
                  <Mail className="h-4 w-4 text-moss" />
                  Email notifications
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">OTP, password reset, sharing, and admin alerts.</p>
              </div>
              <div className="rounded-lg border border-line bg-canvas p-4">
                <div className="flex items-center gap-2 text-sm font-extrabold">
                  <LockKeyhole className="h-4 w-4 text-moss" />
                  Audit trail
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">Trace upload, delete, share, migrate, and user actions.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewNav({ Icon, label, active = false }: { Icon: typeof FileArchive; label: string; active?: boolean }) {
  return (
    <div className={["mb-2 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold", active ? "bg-soft text-moss" : "text-muted"].join(" ")}>
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}

function PreviewMetric({ Icon, label, value }: { Icon: typeof Gauge; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-canvas p-4">
      <Icon className="h-4 w-4 text-moss" />
      <div className="mt-3 text-sm font-extrabold">{value}</div>
      <div className="mt-1 text-xs font-semibold text-muted">{label}</div>
    </div>
  );
}

function PreviewFile({ Icon, name, meta }: { Icon: typeof FileText; name: string; meta: string }) {
  return (
    <div className="flex items-center gap-4 border-b border-line bg-white p-4 last:border-b-0">
      <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-soft text-moss">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-extrabold">{name}</div>
        <div className="mt-1 text-xs text-muted">{meta}</div>
      </div>
    </div>
  );
}

function ApiLine({ method, path, label }: { method: string; path: string; label: string }) {
  return (
    <div className="grid gap-2 rounded-lg border border-white/10 bg-white/5 p-4 sm:grid-cols-[90px_1fr]">
      <span className="text-emerald-200">{method}</span>
      <div>
        <div className="break-all text-white">{path}</div>
        <div className="mt-1 font-sans text-xs text-white/50">{label}</div>
      </div>
    </div>
  );
}
