import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Activity,
  CheckCircle2,
  Clipboard,
  Code2,
  FileText,
  KeyRound,
  Loader2,
  Plus,
  Play,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { cn } from "../lib/utils";
import type { ApiUsageLog, DeveloperApiKey, DeveloperStats, PagedResponse } from "../types/file";

const scopes = [
  ["files:read", "Read files"],
  ["files:write", "Upload, rename, and move files"],
  ["files:delete", "Move files to Trash"],
  ["folders:read", "Read folders"],
  ["folders:write", "Create, rename, move, and delete folders"],
  ["shares:read", "Read sharing settings"],
  ["shares:write", "Manage sharing settings"],
];

const explorerEndpoints = [
  { id: "listFiles", label: "List files", method: "GET", path: "/api/v1/developer/files", scope: "files:read" },
  { id: "uploadFile", label: "Upload file", method: "POST", path: "/api/v1/developer/files", scope: "files:write" },
  { id: "downloadFile", label: "Download file", method: "GET", path: "/api/v1/developer/files/{id}/download", scope: "files:read" },
  { id: "renameFile", label: "Rename file", method: "PATCH", path: "/api/v1/developer/files/{id}/rename", scope: "files:write" },
  { id: "moveFile", label: "Move file", method: "PATCH", path: "/api/v1/developer/files/{id}/move", scope: "files:write" },
  { id: "deleteFile", label: "Delete file", method: "DELETE", path: "/api/v1/developer/files/{id}", scope: "files:delete" },
  { id: "listFolders", label: "List folders", method: "GET", path: "/api/v1/developer/folders", scope: "folders:read" },
  { id: "createFolder", label: "Create folder", method: "POST", path: "/api/v1/developer/folders", scope: "folders:write" },
] as const;

type ExplorerEndpointId = (typeof explorerEndpoints)[number]["id"];
type ExplorerResult = {
  status: number;
  durationMs: number;
  data: unknown;
  headers: Record<string, string>;
};

export function DeveloperPage() {
  const client = useQueryClient();
  const [tab, setTab] = useState<"keys" | "explorer" | "usage" | "docs">("keys");
  const [name, setName] = useState("Production app");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    "files:read",
    "files:write",
    "folders:read",
    "folders:write",
  ]);
  const [newToken, setNewToken] = useState("");
  const [page, setPage] = useState(0);
  const [explorerKey, setExplorerKey] = useState("");
  const [endpointId, setEndpointId] = useState<ExplorerEndpointId>("listFiles");
  const [fileId, setFileId] = useState("");
  const [folderName, setFolderName] = useState("New folder");
  const [renameValue, setRenameValue] = useState("");
  const [parentId, setParentId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [requestPage, setRequestPage] = useState("0");
  const [requestSize, setRequestSize] = useState("20");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [explorerResult, setExplorerResult] = useState<ExplorerResult | null>(null);

  const keys = useQuery({
    queryKey: ["developer-api-keys"],
    queryFn: async () => (await api.get<DeveloperApiKey[]>("/api/v1/developer/api-keys")).data,
  });
  const stats = useQuery({
    queryKey: ["developer-stats"],
    queryFn: async () => (await api.get<DeveloperStats>("/api/v1/developer/stats")).data,
  });
  const usage = useQuery({
    queryKey: ["developer-usage", page],
    queryFn: async () =>
      (await api.get<PagedResponse<ApiUsageLog>>(`/api/v1/developer/usage?page=${page}&size=25`)).data,
  });

  const createKey = useMutation({
    mutationFn: () => api.post<DeveloperApiKey>("/api/v1/developer/api-keys", { name, scopes: selectedScopes }),
    onSuccess: async (response) => {
      const token = response.data.token ?? "";
      setNewToken(token);
      setExplorerKey(token);
      toast.success("API key created", {
        description: "Copy the key now. It will only be shown once.",
      });
      await refresh();
    },
    onError: (error: any) =>
      toast.error("Could not create API key", {
        description: error.response?.data?.message ?? "Please check the key details.",
      }),
  });

  const revokeKey = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/developer/api-keys/${id}`),
    onSuccess: async () => {
      toast.success("API key revoked");
      await refresh();
    },
    onError: (error: any) =>
      toast.error("Could not revoke API key", {
        description: error.response?.data?.message ?? "Please try again.",
      }),
  });

  const apiBaseUrl = api.defaults.baseURL ?? "https://s3.haovo.cloud";
  const activeKeys = useMemo(() => keys.data?.filter((key) => key.active).length ?? 0, [keys.data]);
  const selectedEndpoint = explorerEndpoints.find((endpoint) => endpoint.id === endpointId) ?? explorerEndpoints[0];

  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["developer-api-keys"] }),
      client.invalidateQueries({ queryKey: ["developer-stats"] }),
      client.invalidateQueries({ queryKey: ["developer-usage"] }),
    ]);
  }

  function toggleScope(scope: string) {
    setSelectedScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
    );
  }

  async function copy(value: string, label = "Copied") {
    await navigator.clipboard.writeText(value);
    toast.success(label);
  }

  const runExplorer = useMutation({
    mutationFn: async () => {
      if (!explorerKey.trim()) throw new Error("Paste an API key first.");
      const started = performance.now();
      const { url, data, headers } = buildExplorerRequest();
      const response = await axios.request({
        baseURL: apiBaseUrl,
        url,
        method: selectedEndpoint.method,
        data,
        headers: {
          ...headers,
          Authorization: `Bearer ${explorerKey.trim()}`,
        },
        validateStatus: () => true,
      });
      return {
        status: response.status,
        durationMs: Math.round(performance.now() - started),
        data: response.data,
        headers: response.headers as Record<string, string>,
      };
    },
    onSuccess: (result) => {
      setExplorerResult(result);
      toast.success("API request completed", {
        description: `Status ${result.status} in ${result.durationMs}ms.`,
      });
      client.invalidateQueries({ queryKey: ["developer-usage"] });
      client.invalidateQueries({ queryKey: ["developer-stats"] });
    },
    onError: (error: any) => {
      toast.error("Could not run API request", {
        description: error.message ?? "Please check the request details.",
      });
    },
  });

  function buildExplorerRequest() {
    const params = new URLSearchParams();
    const addParam = (key: string, value: string) => {
      if (value.trim()) params.set(key, value.trim());
    };
    const withParams = (path: string) => {
      const query = params.toString();
      return query ? `${path}?${query}` : path;
    };
    switch (endpointId) {
      case "listFiles":
        addParam("parentId", parentId);
        addParam("keyword", keyword);
        addParam("page", requestPage);
        addParam("size", requestSize);
        return { url: withParams(selectedEndpoint.path), data: undefined, headers: {} };
      case "uploadFile": {
        if (!uploadFile) throw new Error("Choose a file to upload.");
        const form = new FormData();
        form.append("file", uploadFile);
        if (parentId.trim()) form.append("parentId", parentId.trim());
        return { url: selectedEndpoint.path, data: form, headers: {} };
      }
      case "downloadFile":
        if (!fileId.trim()) throw new Error("Enter a file ID.");
        return { url: selectedEndpoint.path.replace("{id}", encodeURIComponent(fileId.trim())), data: undefined, headers: {} };
      case "renameFile":
        if (!fileId.trim()) throw new Error("Enter a file ID.");
        if (!renameValue.trim()) throw new Error("Enter a new file name.");
        return { url: selectedEndpoint.path.replace("{id}", encodeURIComponent(fileId.trim())), data: { name: renameValue.trim() }, headers: { "Content-Type": "application/json" } };
      case "moveFile":
        if (!fileId.trim()) throw new Error("Enter a file ID.");
        return { url: selectedEndpoint.path.replace("{id}", encodeURIComponent(fileId.trim())), data: { parentId: parentId.trim() || null }, headers: { "Content-Type": "application/json" } };
      case "deleteFile":
        if (!fileId.trim()) throw new Error("Enter a file ID.");
        return { url: selectedEndpoint.path.replace("{id}", encodeURIComponent(fileId.trim())), data: undefined, headers: {} };
      case "listFolders":
        addParam("parentId", parentId);
        addParam("page", requestPage);
        addParam("size", requestSize);
        return { url: withParams(selectedEndpoint.path), data: undefined, headers: {} };
      case "createFolder":
        if (!folderName.trim()) throw new Error("Enter a folder name.");
        return { url: selectedEndpoint.path, data: { name: folderName.trim(), parentId: parentId.trim() || null }, headers: { "Content-Type": "application/json" } };
    }
  }

  function explorerCurl() {
    let request;
    try {
      request = buildExplorerRequest();
    } catch {
      request = { url: selectedEndpoint.path, data: undefined };
    }
    const lines = [`curl -X ${selectedEndpoint.method} ${apiBaseUrl}${request.url} \\`, `  -H "Authorization: Bearer hb_live_your_api_key"`];
    if (endpointId === "uploadFile") lines.push(`  -F "file=@your-file.pdf"`);
    else if (request.data) lines.push(`  -H "Content-Type: application/json" \\`, `  -d '${JSON.stringify(request.data)}'`);
    return lines.join("\n");
  }

  const loading = keys.isPending || stats.isPending;

  return (
    <section className="mx-auto max-w-6xl p-5 md:p-10">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">Developer</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">Developer Console</h1>
          <p className="mt-2 text-sm text-muted">
            Create API keys, monitor usage, and integrate HaoBox file workflows into your apps.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm text-muted">
          <ShieldCheck size={16} />
          {stats.data?.rateLimitPerMinute ?? 120} requests/min per key
        </div>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-4">
        <Metric icon={<KeyRound size={18} />} label="API keys" value={stats.data?.apiKeys ?? 0} detail={`${activeKeys} active`} />
        <Metric icon={<Activity size={18} />} label="Requests today" value={stats.data?.requestsToday ?? 0} detail="Developer API only" />
        <Metric icon={<FileText size={18} />} label="Failed today" value={stats.data?.failedRequestsToday ?? 0} detail="4xx and 5xx responses" />
        <Metric icon={<Code2 size={18} />} label="Base URL" value={new URL(apiBaseUrl).host} detail="Use bearer API keys" />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <a className="rounded-lg border border-line bg-white p-4 shadow-sm transition hover:bg-soft" href="/developers/docs" target="_blank" rel="noreferrer">
          <div className="flex items-center gap-2 font-extrabold"><FileText className="size-4 text-moss" /> Developer Docs</div>
          <p className="mt-2 text-sm leading-6 text-muted">Public guide for authentication, scopes, models, quota, and recipes.</p>
        </a>
        <a className="rounded-lg border border-line bg-white p-4 shadow-sm transition hover:bg-soft" href="/developers/reference" target="_blank" rel="noreferrer">
          <div className="flex items-center gap-2 font-extrabold"><Code2 className="size-4 text-moss" /> API Reference</div>
          <p className="mt-2 text-sm leading-6 text-muted">Endpoint details with parameters, responses, and examples.</p>
        </a>
        <a className="rounded-lg border border-line bg-white p-4 shadow-sm transition hover:bg-soft" href="/developers/console" target="_blank" rel="noreferrer">
          <div className="flex items-center gap-2 font-extrabold"><Play className="size-4 text-moss" /> API Console</div>
          <p className="mt-2 text-sm leading-6 text-muted">Test API calls with a full API key using bearer authentication.</p>
        </a>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto">
        <Tab active={tab === "keys"} onClick={() => setTab("keys")}>API Keys</Tab>
        <Tab active={tab === "usage"} onClick={() => setTab("usage")}>Usage Logs</Tab>
      </div>

      {loading ? (
        <div className="mt-6 flex h-64 items-center justify-center rounded-xl border border-line bg-white text-muted">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        <>
          {tab === "keys" && (
            <div className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
              <Panel title="Create API Key" icon={<Plus size={18} />}>
                <label className="text-xs font-bold uppercase text-muted">Name</label>
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-moss"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase text-muted">Scopes</p>
                  <div className="mt-3 grid gap-2">
                    {scopes.map(([scope, label]) => (
                      <label key={scope} className="flex items-start gap-3 rounded-lg border border-line bg-canvas p-3 text-sm">
                        <input
                          className="mt-1"
                          type="checkbox"
                          checked={selectedScopes.includes(scope)}
                          onChange={() => toggleScope(scope)}
                        />
                        <span>
                          <span className="block font-extrabold">{scope}</span>
                          <span className="text-xs text-muted">{label}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-moss px-4 text-sm font-bold text-white disabled:opacity-60"
                  disabled={createKey.isPending || !name.trim() || selectedScopes.length === 0}
                  onClick={() => createKey.mutate()}
                >
                  {createKey.isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                  Create key
                </button>
              </Panel>

              <Panel title="Your API Keys" icon={<KeyRound size={18} />}>
                <div className="overflow-x-auto">
                  <table className="min-w-[720px] w-full text-left text-sm">
                    <thead className="border-b border-line text-xs uppercase text-muted">
                      <tr>
                        <th className="px-3 py-3">Name</th>
                        <th className="px-3 py-3">Prefix</th>
                        <th className="px-3 py-3">Scopes</th>
                        <th className="px-3 py-3">Last used</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {(keys.data ?? []).map((key) => (
                        <tr key={key.id}>
                          <td className="px-3 py-3 font-extrabold">{key.name}</td>
                          <td className="px-3 py-3 font-mono text-xs">{key.prefix}...</td>
                          <td className="px-3 py-3 text-xs text-muted">{key.scopes.join(", ")}</td>
                          <td className="px-3 py-3 text-xs text-muted">{key.lastUsedAt ? formatDate(key.lastUsedAt) : "Never"}</td>
                          <td className="px-3 py-3">
                            <span className={cn("rounded-full px-2 py-1 text-xs font-bold", key.active ? "bg-emerald-50 text-moss" : "bg-red-50 text-red-700")}>
                              {key.active ? "Active" : "Revoked"}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <button
                              className="inline-flex h-8 items-center gap-1 rounded-lg bg-red-50 px-3 text-xs font-bold text-red-700 disabled:opacity-50"
                              disabled={!key.active || revokeKey.isPending}
                              onClick={() => {
                                if (window.confirm(`Revoke API key "${key.name}"?`)) revokeKey.mutate(key.id);
                              }}
                            >
                              <Trash2 className="size-3.5" />
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>
          )}

          {tab === "explorer" && (
            <div className="mt-6 grid items-start gap-6 xl:grid-cols-[21rem_minmax(0,1fr)]">
              <Panel title="Try API" icon={<Play size={18} />}>
                <label className="text-xs font-bold uppercase text-muted">API key</label>
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 font-mono text-sm outline-none focus:border-moss"
                  placeholder="hb_live_..."
                  type="password"
                  value={explorerKey}
                  onChange={(event) => setExplorerKey(event.target.value)}
                />

                <label className="mt-5 block text-xs font-bold uppercase text-muted">Endpoint</label>
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-moss"
                  value={endpointId}
                  onChange={(event) => setEndpointId(event.target.value as ExplorerEndpointId)}
                >
                  {explorerEndpoints.map((endpoint) => (
                    <option key={endpoint.id} value={endpoint.id}>
                      {endpoint.method} {endpoint.label}
                    </option>
                  ))}
                </select>

                <div className="mt-4 rounded-lg border border-line bg-canvas p-3">
                  <div className="font-mono text-sm font-bold">
                    <span className="text-moss">{selectedEndpoint.method}</span>{" "}
                    <span className="break-all">{selectedEndpoint.path}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted">Required scope: {selectedEndpoint.scope}</div>
                </div>

                <ExplorerFields
                  endpointId={endpointId}
                  fileId={fileId}
                  setFileId={setFileId}
                  folderName={folderName}
                  setFolderName={setFolderName}
                  renameValue={renameValue}
                  setRenameValue={setRenameValue}
                  parentId={parentId}
                  setParentId={setParentId}
                  keyword={keyword}
                  setKeyword={setKeyword}
                  requestPage={requestPage}
                  setRequestPage={setRequestPage}
                  requestSize={requestSize}
                  setRequestSize={setRequestSize}
                  setUploadFile={setUploadFile}
                />

                <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
                  <button
                    className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg bg-moss px-3 text-sm font-bold text-white disabled:opacity-60"
                    disabled={runExplorer.isPending}
                    onClick={() => runExplorer.mutate()}
                  >
                    {runExplorer.isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                    <span className="hidden 2xl:inline">Run request</span>
                    <span className="2xl:hidden">Run</span>
                  </button>
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-bold hover:bg-canvas"
                    onClick={() => copy(explorerCurl(), "cURL copied")}
                    title="Copy cURL"
                  >
                    <Clipboard className="size-4" />
                    <span className="hidden 2xl:inline">Copy cURL</span>
                  </button>
                </div>
              </Panel>

              <Panel className="min-w-0" title="Response" icon={<Code2 size={18} />}>
                {explorerResult ? (
                  <div className="min-w-0">
                    <div className="mb-4 flex flex-wrap gap-2">
                      <span className={cn("rounded-full px-3 py-1 text-xs font-bold", explorerResult.status < 400 ? "bg-emerald-50 text-moss" : "bg-red-50 text-red-700")}>
                        Status {explorerResult.status}
                      </span>
                      <span className="rounded-full bg-canvas px-3 py-1 text-xs font-bold text-muted">
                        {explorerResult.durationMs}ms
                      </span>
                    </div>
                    <pre className="h-[34rem] max-h-[calc(100vh-18rem)] min-h-[22rem] max-w-full overflow-auto rounded-lg bg-[#0c1712] p-4 text-xs leading-6 text-emerald-50">
                      {JSON.stringify(explorerResult.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="grid h-[34rem] max-h-[calc(100vh-18rem)] min-h-[22rem] place-items-center rounded-lg border border-dashed border-line bg-canvas px-8 text-center text-sm text-muted">
                    Run a request to inspect the response body, status, and latency.
                  </div>
                )}
              </Panel>
            </div>
          )}

          {tab === "usage" && (
            <Panel className="mt-6" title="Usage Logs" icon={<Activity size={18} />}>
              <div className="overflow-x-auto">
                <table className="min-w-[860px] w-full text-left text-sm">
                  <thead className="border-b border-line text-xs uppercase text-muted">
                    <tr>
                      <th className="px-3 py-3">Time</th>
                      <th className="px-3 py-3">Key</th>
                      <th className="px-3 py-3">Method</th>
                      <th className="px-3 py-3">Path</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Latency</th>
                      <th className="px-3 py-3">Client</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {(usage.data?.content ?? []).map((log) => (
                      <tr key={log.id}>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-muted">{formatDate(log.createdAt)}</td>
                        <td className="px-3 py-3 font-bold">{log.apiKeyName}</td>
                        <td className="px-3 py-3 font-mono text-xs">{log.method}</td>
                        <td className="px-3 py-3 font-mono text-xs">{log.path}</td>
                        <td className="px-3 py-3">
                          <span className={cn("rounded-full px-2 py-1 text-xs font-bold", log.status < 400 ? "bg-emerald-50 text-moss" : "bg-red-50 text-red-700")}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-muted">{log.durationMs}ms</td>
                        <td className="px-3 py-3 text-xs text-muted">{log.ipAddress ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-muted">Page {(usage.data?.number ?? 0) + 1} of {usage.data?.totalPages || 1}</span>
                <div className="flex gap-2">
                  <button className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold disabled:opacity-50" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button>
                  <button className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold disabled:opacity-50" disabled={usage.data?.last ?? true} onClick={() => setPage((value) => value + 1)}>Next</button>
                </div>
              </div>
            </Panel>
          )}

          {tab === "docs" && (
            <DeveloperDocs
              apiBaseUrl={apiBaseUrl}
              onCopy={copy}
              onTry={(id) => {
                setEndpointId(id);
                setTab("explorer");
              }}
            />
          )}
        </>
      )}

      {newToken && (
        <ApiKeyCreatedDialog
          token={newToken}
          onClose={() => setNewToken("")}
          onCopy={() => copy(newToken, "API key copied")}
        />
      )}
    </section>
  );
}

function ApiKeyCreatedDialog({
  token,
  onClose,
  onCopy,
}: {
  token: string;
  onClose: () => void;
  onCopy: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-line bg-white shadow-panel">
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div className="flex gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-soft text-moss">
              <KeyRound className="size-5" />
            </span>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">New API Key</p>
              <h2 className="mt-1 text-2xl font-extrabold">Copy your API key now</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                For security, the full key is only shown once. Store it in a private server environment before closing this dialog.
              </p>
            </div>
          </div>
          <button
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
            onClick={onClose}
            title="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-extrabold text-amber-950">This secret cannot be viewed again later.</p>
            <p className="mt-1 text-xs leading-5 text-amber-800">
              If you lose it, revoke this key and create a new one.
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-line bg-canvas p-3">
            <p className="mb-2 text-xs font-bold uppercase text-muted">API key secret</p>
            <code className="block max-h-36 overflow-auto rounded-lg bg-white px-3 py-3 font-mono text-sm leading-6 text-ink">
              {token}
            </code>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-bold text-ink hover:bg-canvas"
              onClick={onClose}
            >
              I have saved it
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-moss px-4 text-sm font-bold text-white hover:bg-moss/90"
              onClick={onCopy}
            >
              <Clipboard className="size-4" />
              Copy API key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: ReactNode; detail: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="mb-3 text-moss">{icon}</div>
      <p className="text-xs font-bold uppercase text-muted">{label}</p>
      <p className="mt-2 truncate text-2xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}

function Panel({ title, icon, className, children }: { title: string; icon: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-line bg-white p-5 shadow-sm", className)}>
      <div className="mb-5 flex items-center gap-2">
        <span className="text-moss">{icon}</span>
        <h2 className="text-lg font-extrabold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button className={cn("rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-muted", active && "bg-soft text-moss ring-1 ring-moss/20")} onClick={onClick}>
      {children}
    </button>
  );
}

function ExplorerFields({
  endpointId,
  fileId,
  setFileId,
  folderName,
  setFolderName,
  renameValue,
  setRenameValue,
  parentId,
  setParentId,
  keyword,
  setKeyword,
  requestPage,
  setRequestPage,
  requestSize,
  setRequestSize,
  setUploadFile,
}: {
  endpointId: ExplorerEndpointId;
  fileId: string;
  setFileId: (value: string) => void;
  folderName: string;
  setFolderName: (value: string) => void;
  renameValue: string;
  setRenameValue: (value: string) => void;
  parentId: string;
  setParentId: (value: string) => void;
  keyword: string;
  setKeyword: (value: string) => void;
  requestPage: string;
  setRequestPage: (value: string) => void;
  requestSize: string;
  setRequestSize: (value: string) => void;
  setUploadFile: (value: File | null) => void;
}) {
  const needsFileId = ["downloadFile", "renameFile", "moveFile", "deleteFile"].includes(endpointId);
  const needsParent = ["listFiles", "uploadFile", "moveFile", "listFolders", "createFolder"].includes(endpointId);
  const needsPagination = ["listFiles", "listFolders"].includes(endpointId);

  return (
    <div className="mt-5 grid gap-4">
      {needsFileId && (
        <Field label="File ID">
          <input className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-moss" value={fileId} onChange={(event) => setFileId(event.target.value)} />
        </Field>
      )}
      {endpointId === "renameFile" && (
        <Field label="New file name">
          <input className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-moss" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
        </Field>
      )}
      {endpointId === "createFolder" && (
        <Field label="Folder name">
          <input className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-moss" value={folderName} onChange={(event) => setFolderName(event.target.value)} />
        </Field>
      )}
      {endpointId === "uploadFile" && (
        <Field label="File">
          <input
            className="block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-soft file:px-3 file:py-2 file:text-sm file:font-bold file:text-moss"
            type="file"
            onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
          />
        </Field>
      )}
      {needsParent && (
        <Field label={endpointId === "moveFile" ? "Destination folder ID" : "Parent folder ID"}>
          <input className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-moss" placeholder="Leave empty for root" value={parentId} onChange={(event) => setParentId(event.target.value)} />
        </Field>
      )}
      {endpointId === "listFiles" && (
        <Field label="Keyword">
          <input className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-moss" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        </Field>
      )}
      {needsPagination && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Page">
            <input className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-moss" value={requestPage} onChange={(event) => setRequestPage(event.target.value)} />
          </Field>
          <Field label="Size">
            <input className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-moss" value={requestSize} onChange={(event) => setRequestSize(event.target.value)} />
          </Field>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-muted">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function DeveloperDocs({
  apiBaseUrl,
  onCopy,
  onTry,
}: {
  apiBaseUrl: string;
  onCopy: (value: string, label?: string) => void;
  onTry: (id: ExplorerEndpointId) => void;
}) {
  const [selectedId, setSelectedId] = useState<ExplorerEndpointId>("listFiles");
  const selectedEndpoint = explorerEndpoints.find((endpoint) => endpoint.id === selectedId) ?? explorerEndpoints[0];
  const doc = endpointDoc(selectedEndpoint.id, apiBaseUrl);
  return (
    <div className="mt-6 grid items-start gap-5 xl:grid-cols-[16rem_minmax(0,1fr)_24rem]">
      <aside className="sticky top-20 rounded-xl border border-line bg-white p-3 shadow-sm">
        <p className="px-3 py-2 text-xs font-bold uppercase text-muted">Guide</p>
        {["Overview", "Authentication", "Scopes", "Errors"].map((item) => (
          <a key={item} className="block rounded-lg px-3 py-2 text-sm font-bold text-muted hover:bg-canvas hover:text-moss" href={`#docs-${item.toLowerCase()}`}>
            {item}
          </a>
        ))}
        <p className="mt-4 px-3 py-2 text-xs font-bold uppercase text-muted">Endpoints</p>
        <div className="space-y-1">
          {explorerEndpoints.map((endpoint) => (
            <button
              key={endpoint.id}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-muted hover:bg-canvas hover:text-moss",
                selectedId === endpoint.id && "bg-soft text-moss",
              )}
              onClick={() => setSelectedId(endpoint.id)}
            >
              <span className="block font-mono text-[11px]">{endpoint.method}</span>
              <span className="block truncate">{endpoint.label}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="grid min-w-0 gap-5">
        <DocSection id="overview" title="Overview" icon={<Code2 size={18} />}>
          <p className="text-sm leading-7 text-muted">
            HaoBox Developer API lets external applications upload, organize, download, and manage files using API keys.
            API keys act on behalf of the user who created them, so quota and permissions follow that owner account.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <InfoRow label="Base URL" value={apiBaseUrl} mono />
            <InfoRow label="Authentication" value="Authorization: Bearer <API_KEY>" mono />
            <InfoRow label="Default rate limit" value="120 requests/minute per API key" />
            <InfoRow label="Response format" value="JSON unless downloading file content" />
          </div>
        </DocSection>

        <DocSection id="authentication" title="Authentication" icon={<KeyRound size={18} />}>
          <p className="text-sm leading-7 text-muted">
            Send the full API key in the `Authorization` header. Do not put API keys in URLs, browser links, GitHub commits, or public client-side code.
          </p>
          <CodeBlock value={`Authorization: Bearer hb_live_xxxxxxxxxxxxxxxxxxxxxxxxx`} onCopy={onCopy} />
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 text-moss" /> The full key is shown once when created.</li>
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 text-moss" /> HaoBox stores only a SHA-256 hash of the key.</li>
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 text-moss" /> Revoke and recreate a key immediately if it is exposed.</li>
          </ul>
        </DocSection>

        <DocSection id="scopes" title="Scopes" icon={<ShieldCheck size={18} />}>
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase text-muted">
                <tr><th className="px-3 py-3">Scope</th><th className="px-3 py-3">Allows</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {scopes.map(([scope, label]) => (
                  <tr key={scope}>
                    <td className="px-3 py-3 font-mono text-xs font-bold text-moss">{scope}</td>
                    <td className="px-3 py-3 text-muted">{label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DocSection>

        <DocSection id="reference" title={selectedEndpoint.label} icon={<Activity size={18} />}>
          <div className="rounded-lg border border-line bg-canvas p-4">
            <div className="font-mono text-sm font-bold">
              <span className="text-moss">{selectedEndpoint.method}</span>{" "}
              <span className="break-all">{selectedEndpoint.path}</span>
            </div>
            <p className="mt-3 text-sm leading-7 text-muted">{doc.description}</p>
            <div className="mt-3 inline-flex rounded-full bg-soft px-3 py-1 text-xs font-bold text-moss">
              Required scope: {selectedEndpoint.scope}
            </div>
          </div>

          <h3 className="mt-6 text-sm font-extrabold">Parameters</h3>
          <ParamTable params={doc.params} />

          <h3 className="mt-6 text-sm font-extrabold">Successful response</h3>
          <CodeBlock value={doc.response} onCopy={onCopy} />

          <div className="mt-6 flex flex-wrap gap-2">
            <button className="rounded-lg bg-moss px-4 py-2 text-sm font-bold text-white hover:bg-moss/90" onClick={() => onTry(selectedEndpoint.id)}>
              Try in API Explorer
            </button>
            <button className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold hover:bg-soft" onClick={() => onCopy(doc.curl, "cURL copied")}>
              Copy cURL
            </button>
          </div>
        </DocSection>

        <DocSection id="errors" title="Errors" icon={<FileText size={18} />}>
          <CodeBlock
            value={`{
  "timestamp": "2026-09-09T10:00:00Z",
  "status": 403,
  "code": "ACCESS_DENIED",
  "message": "This API key does not have the required scope.",
  "path": "/api/v1/developer/files"
}`}
            onCopy={onCopy}
          />
          <div className="mt-4 grid gap-2 text-sm">
            <InfoRow label="401 INVALID_API_KEY" value="The key is wrong, expired, or revoked." />
            <InfoRow label="403 ACCESS_DENIED" value="The key is valid but lacks scope or file access." />
            <InfoRow label="413 FILE_TOO_LARGE" value="The upload exceeds the configured maximum file size." />
            <InfoRow label="429 RATE_LIMITED" value="The key exceeded its requests-per-minute limit." />
            <InfoRow label="502 STORAGE_UNAVAILABLE" value="A MinIO/S3 node could not complete the operation." />
          </div>
        </DocSection>

        <DocSection id="limits" title="Rate Limit And Quota" icon={<ShieldCheck size={18} />}>
          <p className="text-sm leading-7 text-muted">
            Each API key has its own per-minute rate limit. Uploads use the storage quota of the key owner.
            Files in Trash still count toward quota until they are deleted forever by the user or retention policy.
          </p>
        </DocSection>
      </div>

      <aside className="sticky top-20 min-w-0 rounded-xl border border-line bg-white p-4 shadow-sm">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase text-muted">Request</p>
          <div className="mt-2 rounded-lg border border-line bg-canvas p-3 font-mono text-xs">
            <span className="font-bold text-moss">{selectedEndpoint.method}</span>{" "}
            <span className="break-all">{selectedEndpoint.path}</span>
          </div>
        </div>
        <CodeBlock value={doc.curl} onCopy={onCopy} />
        <div className="mt-4">
          <p className="text-xs font-bold uppercase text-muted">JavaScript</p>
          <CodeBlock value={doc.javascript} onCopy={onCopy} />
        </div>
      </aside>
    </div>
  );
}

type DocParam = {
  name: string;
  location: string;
  required: string;
  description: string;
};

function ParamTable({ params }: { params: DocParam[] }) {
  if (params.length === 0) {
    return <div className="mt-3 rounded-lg border border-line bg-canvas p-4 text-sm text-muted">No parameters.</div>;
  }
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-line">
      <table className="min-w-[640px] w-full text-left text-sm">
        <thead className="border-b border-line bg-canvas text-xs uppercase text-muted">
          <tr>
            <th className="px-3 py-3">Name</th>
            <th className="px-3 py-3">In</th>
            <th className="px-3 py-3">Required</th>
            <th className="px-3 py-3">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-white">
          {params.map((param) => (
            <tr key={`${param.location}-${param.name}`}>
              <td className="px-3 py-3 font-mono text-xs font-bold">{param.name}</td>
              <td className="px-3 py-3 text-muted">{param.location}</td>
              <td className="px-3 py-3 text-muted">{param.required}</td>
              <td className="px-3 py-3 text-muted">{param.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function endpointDoc(id: ExplorerEndpointId, apiBaseUrl: string) {
  const fileResponse = `{
  "id": "file-id",
  "name": "invoice.pdf",
  "mimeType": "application/pdf",
  "size": 49280,
  "visibility": "PUBLIC",
  "viewUrl": "${apiBaseUrl}/view/file-id",
  "downloadUrl": "${apiBaseUrl}/download/file-id",
  "createdAt": "2026-09-09T10:00:00Z"
}`;
  const pageResponse = `{
  "content": [${fileResponse}],
  "number": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1,
  "last": true
}`;
  const folderResponse = `{
  "id": "folder-id",
  "name": "Invoices",
  "createdAt": "2026-09-09T10:00:00Z"
}`;
  const docs: Record<ExplorerEndpointId, {
    description: string;
    params: DocParam[];
    response: string;
    curl: string;
    javascript: string;
  }> = {
    listFiles: {
      description: "Returns a paginated list of files owned by the API key owner. Use parentId to browse inside a folder, or keyword to search by file name.",
      params: [
        { name: "parentId", location: "query", required: "No", description: "Folder id. Leave empty to list files at root." },
        { name: "keyword", location: "query", required: "No", description: "Search files by name." },
        { name: "page", location: "query", required: "No", description: "Zero-based page number." },
        { name: "size", location: "query", required: "No", description: "Page size, max 100." },
      ],
      response: pageResponse,
      curl: `curl "${apiBaseUrl}/api/v1/developer/files?page=0&size=20" \\
  -H "Authorization: Bearer hb_live_your_api_key"`,
      javascript: `const response = await fetch("${apiBaseUrl}/api/v1/developer/files?page=0&size=20", {
  headers: { Authorization: "Bearer hb_live_your_api_key" }
});
const files = await response.json();`,
    },
    uploadFile: {
      description: "Uploads one file to HaoBox. The request must be multipart/form-data with a field named file.",
      params: [
        { name: "file", location: "form", required: "Yes", description: "Binary file content." },
        { name: "parentId", location: "query", required: "No", description: "Folder id to upload into." },
        { name: "storageNodeId", location: "query", required: "No", description: "Admin/internal node id. Leave empty for automatic assignment." },
      ],
      response: fileResponse,
      curl: `curl -X POST ${apiBaseUrl}/api/v1/developer/files \\
  -H "Authorization: Bearer hb_live_your_api_key" \\
  -F "file=@invoice.pdf"`,
      javascript: `const form = new FormData();
form.append("file", fileInput.files[0]);

const response = await fetch("${apiBaseUrl}/api/v1/developer/files", {
  method: "POST",
  headers: { Authorization: "Bearer hb_live_your_api_key" },
  body: form
});
const file = await response.json();`,
    },
    downloadFile: {
      description: "Streams file content. This endpoint supports HTTP Range requests for video playback and partial downloads.",
      params: [{ name: "id", location: "path", required: "Yes", description: "File id returned by list or upload." }],
      response: "Binary file stream",
      curl: `curl -L ${apiBaseUrl}/api/v1/developer/files/file-id/download \\
  -H "Authorization: Bearer hb_live_your_api_key" \\
  -o invoice.pdf`,
      javascript: `const response = await fetch("${apiBaseUrl}/api/v1/developer/files/file-id/download", {
  headers: { Authorization: "Bearer hb_live_your_api_key" }
});
const blob = await response.blob();`,
    },
    renameFile: {
      description: "Renames a file without changing its stored object content.",
      params: [
        { name: "id", location: "path", required: "Yes", description: "File id." },
        { name: "name", location: "json", required: "Yes", description: "New file name." },
      ],
      response: fileResponse,
      curl: `curl -X PATCH ${apiBaseUrl}/api/v1/developer/files/file-id/rename \\
  -H "Authorization: Bearer hb_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"invoice-final.pdf"}'`,
      javascript: `const response = await fetch("${apiBaseUrl}/api/v1/developer/files/file-id/rename", {
  method: "PATCH",
  headers: {
    Authorization: "Bearer hb_live_your_api_key",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ name: "invoice-final.pdf" })
});`,
    },
    moveFile: {
      description: "Moves a file to another folder. Send null or an empty parentId to move it back to root.",
      params: [
        { name: "id", location: "path", required: "Yes", description: "File id." },
        { name: "parentId", location: "json", required: "No", description: "Destination folder id, or null for root." },
      ],
      response: fileResponse,
      curl: `curl -X PATCH ${apiBaseUrl}/api/v1/developer/files/file-id/move \\
  -H "Authorization: Bearer hb_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"parentId":"folder-id"}'`,
      javascript: `await fetch("${apiBaseUrl}/api/v1/developer/files/file-id/move", {
  method: "PATCH",
  headers: {
    Authorization: "Bearer hb_live_your_api_key",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ parentId: "folder-id" })
});`,
    },
    deleteFile: {
      description: "Moves a file to Trash. It still counts toward quota until permanently deleted by the user or retention policy.",
      params: [{ name: "id", location: "path", required: "Yes", description: "File id." }],
      response: "204 No Content",
      curl: `curl -X DELETE ${apiBaseUrl}/api/v1/developer/files/file-id \\
  -H "Authorization: Bearer hb_live_your_api_key"`,
      javascript: `await fetch("${apiBaseUrl}/api/v1/developer/files/file-id", {
  method: "DELETE",
  headers: { Authorization: "Bearer hb_live_your_api_key" }
});`,
    },
    listFolders: {
      description: "Returns a paginated list of folders owned by the API key owner.",
      params: [
        { name: "parentId", location: "query", required: "No", description: "Parent folder id. Leave empty for root." },
        { name: "page", location: "query", required: "No", description: "Zero-based page number." },
        { name: "size", location: "query", required: "No", description: "Page size, max 100." },
      ],
      response: `{
  "content": [${folderResponse}],
  "number": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1,
  "last": true
}`,
      curl: `curl "${apiBaseUrl}/api/v1/developer/folders?page=0&size=20" \\
  -H "Authorization: Bearer hb_live_your_api_key"`,
      javascript: `const response = await fetch("${apiBaseUrl}/api/v1/developer/folders?page=0&size=20", {
  headers: { Authorization: "Bearer hb_live_your_api_key" }
});
const folders = await response.json();`,
    },
    createFolder: {
      description: "Creates a folder. Use the returned folder id as parentId when uploading files into it.",
      params: [
        { name: "name", location: "json", required: "Yes", description: "Folder name." },
        { name: "parentId", location: "json", required: "No", description: "Parent folder id, or null for root." },
      ],
      response: folderResponse,
      curl: `curl -X POST ${apiBaseUrl}/api/v1/developer/folders \\
  -H "Authorization: Bearer hb_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Invoices","parentId":null}'`,
      javascript: `const response = await fetch("${apiBaseUrl}/api/v1/developer/folders", {
  method: "POST",
  headers: {
    Authorization: "Bearer hb_live_your_api_key",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ name: "Invoices", parentId: null })
});
const folder = await response.json();`,
    },
  };
  return docs[id];
}

function Endpoint({ method, path, scope }: { method: string; path: string; scope: string }) {
  return (
    <div className="grid gap-2 rounded-lg border border-line bg-canvas p-3 sm:grid-cols-[80px_1fr_130px]">
      <span className="font-bold text-moss">{method}</span>
      <span className="break-all">{path}</span>
      <span className="text-xs text-muted">{scope}</span>
    </div>
  );
}

function DocSection({ id, title, icon, children }: { id: string; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section id={`docs-${id}`} className="scroll-mt-24 rounded-xl border border-line bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-moss">{icon}</span>
        <h2 className="text-xl font-extrabold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-canvas p-3">
      <div className="text-xs font-bold uppercase text-muted">{label}</div>
      <div className={cn("mt-1 break-all text-sm font-bold", mono && "font-mono text-xs")}>{value}</div>
    </div>
  );
}

function CodeBlock({ value, onCopy }: { value: string; onCopy: (value: string, label?: string) => void }) {
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-line bg-[#0c1712]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="font-mono text-xs text-white/50">Example</span>
        <button className="inline-flex h-8 items-center gap-2 rounded-lg bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/15" onClick={() => onCopy(value)}>
          <Clipboard className="size-3.5" />
          Copy
        </button>
      </div>
      <pre className="max-h-96 overflow-auto p-4 text-xs leading-6 text-emerald-50">
        {value}
      </pre>
    </div>
  );
}

function EndpointCard({
  endpoint,
  apiBaseUrl,
  onCopy,
  onTry,
}: {
  endpoint: (typeof explorerEndpoints)[number];
  apiBaseUrl: string;
  onCopy: (value: string, label?: string) => void;
  onTry: (id: ExplorerEndpointId) => void;
}) {
  const curl = endpoint.id === "uploadFile"
    ? `curl -X POST ${apiBaseUrl}${endpoint.path} \\
  -H "Authorization: Bearer hb_live_your_api_key" \\
  -F "file=@invoice.pdf"`
    : endpoint.method === "PATCH"
      ? `curl -X PATCH ${apiBaseUrl}${endpoint.path} \\
  -H "Authorization: Bearer hb_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"new-name.pdf"}'`
      : `curl -X ${endpoint.method} ${apiBaseUrl}${endpoint.path} \\
  -H "Authorization: Bearer hb_live_your_api_key"`;
  return (
    <article className="rounded-lg border border-line bg-canvas p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="font-mono text-sm font-bold">
            <span className="text-moss">{endpoint.method}</span>{" "}
            <span className="break-all">{endpoint.path}</span>
          </div>
          <p className="mt-2 text-sm font-bold">{endpoint.label}</p>
          <p className="mt-1 text-xs text-muted">Required scope: {endpoint.scope}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold hover:bg-soft" onClick={() => onCopy(curl, "cURL copied")}>
            Copy cURL
          </button>
          <button className="rounded-lg bg-moss px-3 py-2 text-xs font-bold text-white hover:bg-moss/90" onClick={() => onTry(endpoint.id)}>
            Try
          </button>
        </div>
      </div>
    </article>
  );
}

function Recipe({
  title,
  description,
  steps,
  code,
  codeLabel,
  altCode,
  altCodeLabel,
  onCopy,
  onTry,
}: {
  title: string;
  description: string;
  steps: string[];
  code: string;
  codeLabel: string;
  altCode?: string;
  altCodeLabel?: string;
  onCopy: (value: string, label?: string) => void;
  onTry: () => void;
}) {
  return (
    <article className="rounded-lg border border-line bg-canvas p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-extrabold">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold hover:bg-soft" onClick={() => onCopy(code, "Recipe copied")}>
            Copy {codeLabel}
          </button>
          <button className="rounded-lg bg-moss px-3 py-2 text-xs font-bold text-white hover:bg-moss/90" onClick={onTry}>
            Try in Explorer
          </button>
        </div>
      </div>
      <div className="mt-5 rounded-lg border border-line bg-white p-4">
        <p className="text-xs font-bold uppercase text-muted">How it works</p>
        <ol className="mt-3 grid gap-3">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-6">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-soft text-xs font-extrabold text-moss">
                {index + 1}
              </span>
              <span className="text-muted">{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase text-muted">{codeLabel}</p>
          <CodeBlock value={code} onCopy={onCopy} />
        </div>
        {altCode && (
          <div>
            <p className="text-xs font-bold uppercase text-muted">{altCodeLabel ?? "Example"}</p>
            <CodeBlock value={altCode} onCopy={onCopy} />
          </div>
        )}
      </div>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
