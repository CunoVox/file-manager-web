import axios from "axios";
import {
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Code2,
  FileText,
  Gauge,
  Loader2,
  LockKeyhole,
  Play,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { HaoBoxLogo } from "../components/brand/haobox-logo";
import { api } from "../lib/api";
import { cn } from "../lib/utils";

const endpoints = [
  { id: "listFiles", label: "List files", method: "GET", path: "/api/v1/developer/files", scope: "files:read" },
  { id: "uploadFile", label: "Upload file", method: "POST", path: "/api/v1/developer/files", scope: "files:write" },
  { id: "downloadFile", label: "Download file", method: "GET", path: "/api/v1/developer/files/{id}/download", scope: "files:read" },
  { id: "renameFile", label: "Rename file", method: "PATCH", path: "/api/v1/developer/files/{id}/rename", scope: "files:write" },
  { id: "moveFile", label: "Move file", method: "PATCH", path: "/api/v1/developer/files/{id}/move", scope: "files:write" },
  { id: "deleteFile", label: "Delete file", method: "DELETE", path: "/api/v1/developer/files/{id}", scope: "files:delete" },
  { id: "listFolders", label: "List folders", method: "GET", path: "/api/v1/developer/folders", scope: "folders:read" },
  { id: "createFolder", label: "Create folder", method: "POST", path: "/api/v1/developer/folders", scope: "folders:write" },
] as const;

type EndpointId = (typeof endpoints)[number]["id"];

const scopes = [
  ["files:read", "List files, inspect metadata, and download content"],
  ["files:write", "Upload, rename, and move files"],
  ["files:delete", "Move files to Trash"],
  ["folders:read", "List folders"],
  ["folders:write", "Create, rename, move, and delete folders"],
  ["shares:read", "Read sharing settings"],
  ["shares:write", "Manage sharing settings"],
];

export function DeveloperPublicPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const apiBaseUrl = api.defaults.baseURL ?? "https://s3.haovo.cloud";
  const initialView = location.pathname.endsWith("/console")
    ? "console"
    : location.pathname.endsWith("/reference")
      ? "reference"
      : "docs";
  const [view, setView] = useState<"docs" | "reference" | "console">(initialView);
  const [selectedId, setSelectedId] = useState<EndpointId>("listFiles");

  function selectView(next: "docs" | "reference" | "console") {
    setView(next);
    navigate(`/developers/${next === "docs" ? "docs" : next}`);
  }

  function tryEndpoint(id: EndpointId) {
    setSelectedId(id);
    selectView("console");
  }

  async function copy(value: string, label = "Copied") {
    await navigator.clipboard.writeText(value);
    toast.success(label);
  }

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link to="/" aria-label="HaoBox home">
            <HaoBoxLogo size="lg" className="h-12 max-w-[210px]" />
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            <NavButton active={view === "docs"} onClick={() => selectView("docs")}>Docs</NavButton>
            <NavButton active={view === "reference"} onClick={() => selectView("reference")}>API Reference</NavButton>
            <NavButton active={view === "console"} onClick={() => selectView("console")}>API Console</NavButton>
          </nav>
          <Link className="inline-flex h-10 items-center gap-2 rounded-lg bg-moss px-4 text-sm font-bold text-white" to="/login">
            Dashboard <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div className="mb-6 flex gap-2 overflow-x-auto md:hidden">
          <NavButton active={view === "docs"} onClick={() => selectView("docs")}>Docs</NavButton>
          <NavButton active={view === "reference"} onClick={() => selectView("reference")}>Reference</NavButton>
          <NavButton active={view === "console"} onClick={() => selectView("console")}>Console</NavButton>
        </div>
        {view === "docs" && <Docs apiBaseUrl={apiBaseUrl} onCopy={copy} onTry={tryEndpoint} />}
        {view === "reference" && <Reference apiBaseUrl={apiBaseUrl} selectedId={selectedId} setSelectedId={setSelectedId} onCopy={copy} onTry={tryEndpoint} />}
        {view === "console" && <Console apiBaseUrl={apiBaseUrl} selectedId={selectedId} setSelectedId={setSelectedId} onCopy={copy} />}
      </div>
    </main>
  );
}

function Docs({ apiBaseUrl, onCopy, onTry }: { apiBaseUrl: string; onCopy: (value: string, label?: string) => void; onTry: (id: EndpointId) => void }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <DocSide items={["Quick start", "Authentication", "Scopes", "Pagination", "Models", "Errors", "Quota", "Recipes"]} />
      <div className="grid min-w-0 gap-6">
        <DocBlock id="quick-start" title="Quick start" icon={<Code2 />}>
          <p className="text-sm leading-7 text-muted">
            HaoBox API uses API keys. Create a key in the dashboard, copy it once, and send it as a bearer token from your server-side application.
          </p>
          <StepList steps={[
            "Create an API key from Dashboard -> Developer -> API Keys.",
            "Choose only the scopes your app needs.",
            "Call API endpoints with Authorization: Bearer hb_live_...",
            "Use Usage Logs to monitor status, latency, and failures.",
          ]} />
          <CodeBlock value={`curl "${apiBaseUrl}/api/v1/developer/files?page=0&size=20" \\
  -H "Authorization: Bearer hb_live_your_api_key"`} onCopy={onCopy} />
        </DocBlock>

        <DocBlock id="authentication" title="Authentication" icon={<LockKeyhole />}>
          <p className="text-sm leading-7 text-muted">
            API keys should be treated like passwords. They are shown once, stored as hashes, and can be revoked at any time.
          </p>
          <InfoGrid rows={[
            ["Header", "Authorization: Bearer <API_KEY>"],
            ["Token prefix", "hb_live_"],
            ["Base URL", apiBaseUrl],
            ["Recommended location", "Server-side code or private backend jobs"],
          ]} />
        </DocBlock>

        <DocBlock id="scopes" title="Scopes" icon={<ShieldCheck />}>
          <SimpleTable headers={["Scope", "Allows"]} rows={scopes} />
        </DocBlock>

        <DocBlock id="pagination" title="Pagination" icon={<FileText />}>
          <p className="text-sm leading-7 text-muted">
            List endpoints use zero-based pagination. Start with `page=0`, keep the page size under 100, and stop when `last` is true.
          </p>
          <CodeBlock value={`{
  "content": [],
  "number": 0,
  "size": 20,
  "totalElements": 0,
  "totalPages": 0,
  "last": true
}`} onCopy={onCopy} />
        </DocBlock>

        <DocBlock id="models" title="Models" icon={<FileText />}>
          <div className="grid gap-4 xl:grid-cols-2">
            <CodeBlock title="File" value={sampleFile(apiBaseUrl)} onCopy={onCopy} />
            <CodeBlock title="Folder" value={`{
  "id": "folder-id",
  "name": "Invoices",
  "createdAt": "2026-09-09T10:00:00Z"
}`} onCopy={onCopy} />
          </div>
          <p className="mt-3 text-sm text-muted">Null fields are omitted from JSON responses.</p>
        </DocBlock>

        <DocBlock id="errors" title="Errors" icon={<FileText />}>
          <CodeBlock value={`{
  "timestamp": "2026-09-09T10:00:00Z",
  "status": 429,
  "code": "RATE_LIMITED",
  "message": "Too many API requests. Please try again later.",
  "path": "/api/v1/developer/files"
}`} onCopy={onCopy} />
          <InfoGrid rows={[
            ["401 INVALID_API_KEY", "Wrong, expired, or revoked API key."],
            ["403 ACCESS_DENIED", "The key lacks scope or file access."],
            ["413 FILE_TOO_LARGE", "The upload exceeds backend limits."],
            ["429 RATE_LIMITED", "Too many requests for this API key."],
            ["502 STORAGE_UNAVAILABLE", "A MinIO/S3 node could not complete the operation."],
          ]} />
        </DocBlock>

        <DocBlock id="quota" title="Rate limit and quota" icon={<Gauge />}>
          <p className="text-sm leading-7 text-muted">
            Every API key has an independent per-minute rate limit. Uploads consume the quota of the user who created the key.
            Files moved to Trash still count toward quota until they are permanently deleted.
          </p>
        </DocBlock>

        <DocBlock id="recipes" title="Recipes" icon={<Clipboard />}>
          <div className="grid gap-4">
            <Recipe title="Upload a file" description="Send a local file to the root workspace or into a folder." steps={[
              "Use a key with files:write.",
              "Build multipart/form-data with a field named file.",
              "Add parentId only when uploading into a folder.",
            ]} code={`const form = new FormData();
form.append("file", fileInput.files[0]);

const response = await fetch("${apiBaseUrl}/api/v1/developer/files", {
  method: "POST",
  headers: { Authorization: "Bearer hb_live_your_api_key" },
  body: form
});

const file = await response.json();`} onCopy={onCopy} onTry={() => onTry("uploadFile")} />
            <Recipe title="Create a folder" description="Group files by customer, project, invoice month, or workflow." steps={[
              "Use a key with folders:write.",
              "Send a JSON body with name and optional parentId.",
              "Use the returned folder id as parentId in upload/list calls.",
            ]} code={`const response = await fetch("${apiBaseUrl}/api/v1/developer/folders", {
  method: "POST",
  headers: {
    Authorization: "Bearer hb_live_your_api_key",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ name: "Invoices", parentId: null })
});

const folder = await response.json();`} onCopy={onCopy} onTry={() => onTry("createFolder")} />
            <Recipe title="List files" description="Render a file browser or sync metadata into another app." steps={[
              "Use a key with files:read.",
              "Start at page 0.",
              "Use keyword for search and parentId for folder browsing.",
            ]} code={`const response = await fetch("${apiBaseUrl}/api/v1/developer/files?page=0&size=20", {
  headers: { Authorization: "Bearer hb_live_your_api_key" }
});

const page = await response.json();`} onCopy={onCopy} onTry={() => onTry("listFiles")} />
          </div>
        </DocBlock>
      </div>
    </div>
  );
}

function Reference({ apiBaseUrl, selectedId, setSelectedId, onCopy, onTry }: { apiBaseUrl: string; selectedId: EndpointId; setSelectedId: (id: EndpointId) => void; onCopy: (value: string, label?: string) => void; onTry: (id: EndpointId) => void }) {
  const selected = endpoints.find((item) => item.id === selectedId) ?? endpoints[0];
  const doc = endpointDoc(selected.id, apiBaseUrl);
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[17rem_minmax(0,1fr)_25rem]">
      <aside className="sticky top-24 rounded-xl border border-line bg-white p-3 shadow-sm">
        <p className="px-3 py-2 text-xs font-bold uppercase text-muted">Endpoints</p>
        {endpoints.map((endpoint) => (
          <button key={endpoint.id} className={cn("mb-1 w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-muted hover:bg-canvas hover:text-moss", selectedId === endpoint.id && "bg-soft text-moss")} onClick={() => setSelectedId(endpoint.id)}>
            <span className="block font-mono text-[11px]">{endpoint.method}</span>
            <span className="block truncate">{endpoint.label}</span>
          </button>
        ))}
      </aside>
      <DocBlock id="endpoint" title={selected.label} icon={<Code2 />}>
        <div className="rounded-lg border border-line bg-canvas p-4 font-mono text-sm font-bold">
          <span className="text-moss">{selected.method}</span>{" "}
          <span className="break-all">{selected.path}</span>
        </div>
        <p className="mt-4 text-sm leading-7 text-muted">{doc.description}</p>
        <div className="mt-3 inline-flex rounded-full bg-soft px-3 py-1 text-xs font-bold text-moss">Required scope: {selected.scope}</div>
        <h3 className="mt-6 text-sm font-extrabold">Parameters</h3>
        <ParamTable params={doc.params} />
        <h3 className="mt-6 text-sm font-extrabold">Response</h3>
        <CodeBlock value={doc.response} onCopy={onCopy} />
        <button className="mt-5 rounded-lg bg-moss px-4 py-2 text-sm font-bold text-white" onClick={() => onTry(selected.id)}>
          Try in API Console
        </button>
      </DocBlock>
      <aside className="sticky top-24 min-w-0 rounded-xl border border-line bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase text-muted">cURL</p>
        <CodeBlock value={doc.curl} onCopy={onCopy} />
        <p className="mt-4 text-xs font-bold uppercase text-muted">JavaScript</p>
        <CodeBlock value={doc.javascript} onCopy={onCopy} />
      </aside>
    </div>
  );
}

function Console({ apiBaseUrl, selectedId, setSelectedId, onCopy }: { apiBaseUrl: string; selectedId: EndpointId; setSelectedId: (id: EndpointId) => void; onCopy: (value: string, label?: string) => void }) {
  const selected = endpoints.find((item) => item.id === selectedId) ?? endpoints[0];
  const [apiKey, setApiKey] = useState("");
  const [fileId, setFileId] = useState("");
  const [parentId, setParentId] = useState("");
  const [name, setName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState("0");
  const [size, setSize] = useState("20");
  const [file, setFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ status: number; durationMs: number; data: unknown } | null>(null);

  async function run() {
    if (!apiKey.trim()) {
      toast.error("Paste an API key first.");
      return;
    }
    setRunning(true);
    const started = performance.now();
    try {
      const request = buildRequest(selected.id, selected.path, { fileId, parentId, name, keyword, page, size, file });
      const response = await axios.request({
        baseURL: apiBaseUrl,
        url: request.url,
        method: selected.method,
        data: request.data,
        headers: { ...request.headers, Authorization: `Bearer ${apiKey.trim()}` },
        validateStatus: () => true,
      });
      setResult({ status: response.status, durationMs: Math.round(performance.now() - started), data: response.data || "No content" });
    } catch (error: any) {
      toast.error("Could not run request", { description: error.message ?? "Check the request inputs." });
    } finally {
      setRunning(false);
    }
  }

  const curl = endpointDoc(selected.id, apiBaseUrl).curl;
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-xl font-extrabold"><Play className="size-5 text-moss" /> API Console</h2>
        <Field label="API key"><input className="h-11 w-full rounded-lg border border-line px-3 font-mono text-sm" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="hb_live_..." /></Field>
        <Field label="Endpoint"><select className="h-11 w-full rounded-lg border border-line px-3 text-sm" value={selectedId} onChange={(event) => setSelectedId(event.target.value as EndpointId)}>{endpoints.map((endpoint) => <option key={endpoint.id} value={endpoint.id}>{endpoint.method} {endpoint.label}</option>)}</select></Field>
        <div className="mt-4 rounded-lg border border-line bg-canvas p-3 font-mono text-sm font-bold"><span className="text-moss">{selected.method}</span> <span className="break-all">{selected.path}</span></div>
        <ConsoleFields selectedId={selectedId} values={{ fileId, parentId, name, keyword, page, size }} setters={{ setFileId, setParentId, setName, setKeyword, setPage, setSize, setFile }} />
        <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-moss px-4 text-sm font-bold text-white" disabled={running} onClick={run}>{running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Run</button>
          <button className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-white px-3" onClick={() => onCopy(curl, "cURL copied")} title="Copy cURL"><Clipboard className="size-4" /></button>
        </div>
      </section>
      <section className="min-w-0 rounded-xl border border-line bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-xl font-extrabold"><Code2 className="size-5 text-moss" /> Response</h2>
        {result ? <><div className="mt-4 flex gap-2"><span className={cn("rounded-full px-3 py-1 text-xs font-bold", result.status < 400 ? "bg-emerald-50 text-moss" : "bg-red-50 text-red-700")}>Status {result.status}</span><span className="rounded-full bg-canvas px-3 py-1 text-xs font-bold text-muted">{result.durationMs}ms</span></div><pre className="mt-4 h-[34rem] max-w-full overflow-auto rounded-lg bg-[#0c1712] p-4 text-xs leading-6 text-emerald-50">{typeof result.data === "string" ? result.data : JSON.stringify(result.data, null, 2)}</pre></> : <div className="mt-4 grid h-[34rem] place-items-center rounded-lg border border-dashed border-line bg-canvas px-8 text-center text-sm text-muted">Run a request to inspect the response body, status, and latency.</div>}
      </section>
    </div>
  );
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button className={cn("rounded-lg px-4 py-2 text-sm font-bold text-muted hover:bg-canvas hover:text-moss", active && "bg-soft text-moss")} onClick={onClick}>
      {children}
    </button>
  );
}

function DocSide({ items }: { items: string[] }) {
  return (
    <aside className="sticky top-24 hidden rounded-xl border border-line bg-white p-3 shadow-sm lg:block">
      {items.map((item) => (
        <a key={item} className="block rounded-lg px-3 py-2 text-sm font-bold text-muted hover:bg-canvas hover:text-moss" href={`#${slug(item)}`}>
          {item}
        </a>
      ))}
    </aside>
  );
}

function DocBlock({ id, title, icon, children }: { id: string; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-xl border border-line bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-moss [&_svg]:size-5">{icon}</span>
        <h2 className="text-xl font-extrabold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-5 grid gap-3">
      {steps.map((step, index) => (
        <li key={step} className="flex gap-3 text-sm leading-6 text-muted">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-soft text-xs font-extrabold text-moss">{index + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

function InfoGrid({ rows }: { rows: string[][] }) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-line bg-canvas p-3">
          <p className="text-xs font-bold uppercase text-muted">{label}</p>
          <p className="mt-1 break-all text-sm font-bold">{value}</p>
        </div>
      ))}
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="min-w-[620px] w-full text-left text-sm">
        <thead className="border-b border-line bg-canvas text-xs uppercase text-muted">
          <tr>{headers.map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line bg-white">
          {rows.map((row) => (
            <tr key={row.join("-")}>{row.map((cell, index) => <td key={cell} className={cn("px-3 py-3 text-muted", index === 0 && "font-mono text-xs font-bold text-moss")}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ value, onCopy, title = "Example" }: { value: string; onCopy: (value: string, label?: string) => void; title?: string }) {
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-line bg-[#0c1712]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="font-mono text-xs text-white/50">{title}</span>
        <button className="inline-flex h-8 items-center gap-2 rounded-lg bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/15" onClick={() => onCopy(value)}>
          <Clipboard className="size-3.5" />
          Copy
        </button>
      </div>
      <pre className="max-h-96 overflow-auto p-4 text-xs leading-6 text-emerald-50">{value}</pre>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-5 block">
      <span className="text-xs font-bold uppercase text-muted">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

type Param = { name: string; in: string; required: string; description: string };

function ParamTable({ params }: { params: Param[] }) {
  if (params.length === 0) return <p className="mt-3 rounded-lg border border-line bg-canvas p-4 text-sm text-muted">No parameters.</p>;
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-line">
      <table className="min-w-[640px] w-full text-left text-sm">
        <thead className="border-b border-line bg-canvas text-xs uppercase text-muted">
          <tr><th className="px-3 py-3">Name</th><th className="px-3 py-3">In</th><th className="px-3 py-3">Required</th><th className="px-3 py-3">Description</th></tr>
        </thead>
        <tbody className="divide-y divide-line bg-white">
          {params.map((param) => (
            <tr key={`${param.in}-${param.name}`}>
              <td className="px-3 py-3 font-mono text-xs font-bold">{param.name}</td>
              <td className="px-3 py-3 text-muted">{param.in}</td>
              <td className="px-3 py-3 text-muted">{param.required}</td>
              <td className="px-3 py-3 text-muted">{param.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Recipe({ title, description, steps, code, onCopy, onTry }: { title: string; description: string; steps: string[]; code: string; onCopy: (value: string, label?: string) => void; onTry: () => void }) {
  return (
    <article className="rounded-lg border border-line bg-canvas p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-extrabold">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </div>
        <button className="rounded-lg bg-moss px-3 py-2 text-xs font-bold text-white" onClick={onTry}>Try in Console</button>
      </div>
      <StepList steps={steps} />
      <CodeBlock value={code} onCopy={onCopy} title="JavaScript" />
    </article>
  );
}

function ConsoleFields({ selectedId, values, setters }: {
  selectedId: EndpointId;
  values: { fileId: string; parentId: string; name: string; keyword: string; page: string; size: string };
  setters: {
    setFileId: (value: string) => void;
    setParentId: (value: string) => void;
    setName: (value: string) => void;
    setKeyword: (value: string) => void;
    setPage: (value: string) => void;
    setSize: (value: string) => void;
    setFile: (value: File | null) => void;
  };
}) {
  const needsFileId = ["downloadFile", "renameFile", "moveFile", "deleteFile"].includes(selectedId);
  const needsParent = ["listFiles", "uploadFile", "moveFile", "listFolders", "createFolder"].includes(selectedId);
  const needsPagination = ["listFiles", "listFolders"].includes(selectedId);
  return (
    <div>
      {needsFileId && <Field label="File ID"><input className="h-11 w-full rounded-lg border border-line px-3 text-sm" value={values.fileId} onChange={(event) => setters.setFileId(event.target.value)} /></Field>}
      {(selectedId === "renameFile" || selectedId === "createFolder") && <Field label={selectedId === "renameFile" ? "Name" : "Folder name"}><input className="h-11 w-full rounded-lg border border-line px-3 text-sm" value={values.name} onChange={(event) => setters.setName(event.target.value)} /></Field>}
      {selectedId === "uploadFile" && <Field label="File"><input className="block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-soft file:px-3 file:py-2 file:text-sm file:font-bold file:text-moss" type="file" onChange={(event) => setters.setFile(event.target.files?.[0] ?? null)} /></Field>}
      {needsParent && <Field label={selectedId === "moveFile" ? "Destination folder ID" : "Parent folder ID"}><input className="h-11 w-full rounded-lg border border-line px-3 text-sm" placeholder="Leave empty for root" value={values.parentId} onChange={(event) => setters.setParentId(event.target.value)} /></Field>}
      {selectedId === "listFiles" && <Field label="Keyword"><input className="h-11 w-full rounded-lg border border-line px-3 text-sm" value={values.keyword} onChange={(event) => setters.setKeyword(event.target.value)} /></Field>}
      {needsPagination && <div className="grid gap-3 sm:grid-cols-2"><Field label="Page"><input className="h-11 w-full rounded-lg border border-line px-3 text-sm" value={values.page} onChange={(event) => setters.setPage(event.target.value)} /></Field><Field label="Size"><input className="h-11 w-full rounded-lg border border-line px-3 text-sm" value={values.size} onChange={(event) => setters.setSize(event.target.value)} /></Field></div>}
    </div>
  );
}

function buildRequest(id: EndpointId, path: string, values: { fileId: string; parentId: string; name: string; keyword: string; page: string; size: string; file: File | null }) {
  const params = new URLSearchParams();
  const add = (key: string, value: string) => { if (value.trim()) params.set(key, value.trim()); };
  const withParams = (value: string) => {
    const query = params.toString();
    return query ? `${value}?${query}` : value;
  };
  if (id === "listFiles") {
    add("parentId", values.parentId); add("keyword", values.keyword); add("page", values.page); add("size", values.size);
    return { url: withParams(path), data: undefined, headers: {} };
  }
  if (id === "listFolders") {
    add("parentId", values.parentId); add("page", values.page); add("size", values.size);
    return { url: withParams(path), data: undefined, headers: {} };
  }
  if (id === "uploadFile") {
    if (!values.file) throw new Error("Choose a file to upload.");
    const form = new FormData();
    form.append("file", values.file);
    add("parentId", values.parentId);
    return { url: withParams(path), data: form, headers: {} };
  }
  if (path.includes("{id}") && !values.fileId.trim()) throw new Error("Enter a file ID.");
  const url = path.replace("{id}", encodeURIComponent(values.fileId.trim()));
  if (id === "renameFile") return { url, data: { name: values.name.trim() }, headers: { "Content-Type": "application/json" } };
  if (id === "moveFile") return { url, data: { parentId: values.parentId.trim() || null }, headers: { "Content-Type": "application/json" } };
  if (id === "createFolder") return { url, data: { name: values.name.trim(), parentId: values.parentId.trim() || null }, headers: { "Content-Type": "application/json" } };
  return { url, data: undefined, headers: {} };
}

function endpointDoc(id: EndpointId, apiBaseUrl: string) {
  const file = sampleFile(apiBaseUrl);
  const folder = `{
  "id": "folder-id",
  "name": "Invoices",
  "createdAt": "2026-09-09T10:00:00Z"
}`;
  const common = (path: string, method: string) => `curl -X ${method} ${apiBaseUrl}${path} \\
  -H "Authorization: Bearer hb_live_your_api_key"`;
  const docs: Record<EndpointId, { description: string; params: Param[]; response: string; curl: string; javascript: string }> = {
    listFiles: {
      description: "Return a paginated list of files. Use parentId to browse a folder, keyword to search by name.",
      params: [{ name: "parentId", in: "query", required: "No", description: "Folder id, empty means root." }, { name: "keyword", in: "query", required: "No", description: "Search by file name." }, { name: "page", in: "query", required: "No", description: "Zero-based page number." }, { name: "size", in: "query", required: "No", description: "Page size, max 100." }],
      response: `{ "content": [${file}], "number": 0, "size": 20, "totalElements": 1, "totalPages": 1, "last": true }`,
      curl: `curl "${apiBaseUrl}/api/v1/developer/files?page=0&size=20" \\
  -H "Authorization: Bearer hb_live_your_api_key"`,
      javascript: `const response = await fetch("${apiBaseUrl}/api/v1/developer/files?page=0&size=20", {
  headers: { Authorization: "Bearer hb_live_your_api_key" }
});`,
    },
    uploadFile: {
      description: "Upload one file using multipart/form-data with a field named file.",
      params: [{ name: "file", in: "form", required: "Yes", description: "Binary file content." }, { name: "parentId", in: "query", required: "No", description: "Folder id." }],
      response: file,
      curl: `${common("/api/v1/developer/files", "POST")} \\
  -F "file=@invoice.pdf"`,
      javascript: `const form = new FormData();
form.append("file", fileInput.files[0]);
await fetch("${apiBaseUrl}/api/v1/developer/files", { method: "POST", headers: { Authorization: "Bearer hb_live_your_api_key" }, body: form });`,
    },
    downloadFile: { description: "Download or stream a file. Supports HTTP Range.", params: [{ name: "id", in: "path", required: "Yes", description: "File id." }], response: "Binary file stream", curl: `${common("/api/v1/developer/files/file-id/download", "GET")} -o invoice.pdf`, javascript: `const response = await fetch("${apiBaseUrl}/api/v1/developer/files/file-id/download", { headers: { Authorization: "Bearer hb_live_your_api_key" } });` },
    renameFile: { description: "Rename a file without changing object content.", params: [{ name: "id", in: "path", required: "Yes", description: "File id." }, { name: "name", in: "json", required: "Yes", description: "New file name." }], response: file, curl: `${common("/api/v1/developer/files/file-id/rename", "PATCH")} \\
  -H "Content-Type: application/json" \\
  -d '{"name":"invoice-final.pdf"}'`, javascript: `await fetch("${apiBaseUrl}/api/v1/developer/files/file-id/rename", { method: "PATCH", headers: { Authorization: "Bearer hb_live_your_api_key", "Content-Type": "application/json" }, body: JSON.stringify({ name: "invoice-final.pdf" }) });` },
    moveFile: { description: "Move a file to another folder or root.", params: [{ name: "id", in: "path", required: "Yes", description: "File id." }, { name: "parentId", in: "json", required: "No", description: "Destination folder id or null." }], response: file, curl: `${common("/api/v1/developer/files/file-id/move", "PATCH")} \\
  -H "Content-Type: application/json" \\
  -d '{"parentId":"folder-id"}'`, javascript: `await fetch("${apiBaseUrl}/api/v1/developer/files/file-id/move", { method: "PATCH", headers: { Authorization: "Bearer hb_live_your_api_key", "Content-Type": "application/json" }, body: JSON.stringify({ parentId: "folder-id" }) });` },
    deleteFile: { description: "Move a file to Trash.", params: [{ name: "id", in: "path", required: "Yes", description: "File id." }], response: "204 No Content", curl: common("/api/v1/developer/files/file-id", "DELETE"), javascript: `await fetch("${apiBaseUrl}/api/v1/developer/files/file-id", { method: "DELETE", headers: { Authorization: "Bearer hb_live_your_api_key" } });` },
    listFolders: { description: "Return a paginated list of folders.", params: [{ name: "parentId", in: "query", required: "No", description: "Parent folder id." }, { name: "page", in: "query", required: "No", description: "Zero-based page." }, { name: "size", in: "query", required: "No", description: "Page size." }], response: `{ "content": [${folder}], "number": 0, "size": 20, "totalElements": 1, "totalPages": 1, "last": true }`, curl: `curl "${apiBaseUrl}/api/v1/developer/folders?page=0&size=20" \\
  -H "Authorization: Bearer hb_live_your_api_key"`, javascript: `const response = await fetch("${apiBaseUrl}/api/v1/developer/folders?page=0&size=20", { headers: { Authorization: "Bearer hb_live_your_api_key" } });` },
    createFolder: { description: "Create a folder and use its id as parentId later.", params: [{ name: "name", in: "json", required: "Yes", description: "Folder name." }, { name: "parentId", in: "json", required: "No", description: "Parent folder id or null." }], response: folder, curl: `${common("/api/v1/developer/folders", "POST")} \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Invoices","parentId":null}'`, javascript: `await fetch("${apiBaseUrl}/api/v1/developer/folders", { method: "POST", headers: { Authorization: "Bearer hb_live_your_api_key", "Content-Type": "application/json" }, body: JSON.stringify({ name: "Invoices", parentId: null }) });` },
  };
  return docs[id];
}

function sampleFile(apiBaseUrl: string) {
  return `{
  "id": "file-id",
  "name": "invoice.pdf",
  "mimeType": "application/pdf",
  "size": 49280,
  "visibility": "PUBLIC",
  "viewUrl": "${apiBaseUrl}/view/file-id",
  "downloadUrl": "${apiBaseUrl}/download/file-id",
  "createdAt": "2026-09-09T10:00:00Z"
}`;
}

function slug(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-");
}
