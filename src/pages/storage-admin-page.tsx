import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRightLeft,
  Database,
  Edit3,
  Gauge,
  HardDrive,
  KeyRound,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { formatSize } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import type { MigrationJob, StorageNode } from "../types/file";

type NodeForm = {
  name: string;
  note: string;
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  capacityGb: string;
  bandwidthGb: string;
  priority: string;
  enabled: boolean;
};

type ConfirmAction = {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
};

const gb = 1024 ** 3;
const emptyForm: NodeForm = {
  name: "",
  note: "",
  endpoint: "",
  region: "vn-1",
  accessKey: "",
  secretKey: "",
  bucket: "",
  capacityGb: "20",
  bandwidthGb: "100",
  priority: "0",
  enabled: true,
};

export function StorageAdminPage() {
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; node?: StorageNode } | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [migrationSource, setMigrationSource] = useState<StorageNode | null>(null);
  const [migrationTargetId, setMigrationTargetId] = useState("");
  const [form, setForm] = useState<NodeForm>(emptyForm);
  const [credentialEditing, setCredentialEditing] = useState(false);
  const client = useQueryClient();

  const nodes = useQuery({
    queryKey: ["storage-nodes"],
    queryFn: async () =>
      (await api.get<StorageNode[]>("/api/v1/admin/storage-nodes")).data,
  });
  const migrations = useQuery({
    queryKey: ["storage-migrations"],
    queryFn: async () =>
      (await api.get<MigrationJob[]>("/api/v1/admin/storage-migrations")).data,
    refetchInterval: 5000,
  });

  const stats = useMemo(() => {
    const data = nodes.data ?? [];
    const enabled = data.filter((node) => node.enabled);
    return {
      total: data.length,
      enabled: enabled.length,
      healthy: enabled.filter((node) => !node.lastError).length,
      capacity: data.reduce((sum, node) => sum + node.capacityBytes, 0),
      used: data.reduce((sum, node) => sum + node.usedBytes, 0),
      bandwidth: data.reduce((sum, node) => sum + node.bandwidthLimitBytes, 0),
      bandwidthUsed: data.reduce((sum, node) => sum + node.bandwidthUsedBytes, 0),
    };
  }, [nodes.data]);

  const save = useMutation({
    mutationFn: () => {
      const payload = toPayload(
        form,
        dialog?.mode !== "edit" || credentialEditing,
        dialog?.mode !== "edit" || credentialEditing,
      );
      if (dialog?.mode === "edit" && dialog.node) {
        return api.patch(`/api/v1/admin/storage-nodes/${dialog.node.id}`, payload);
      }
      return api.post("/api/v1/admin/storage-nodes", payload);
    },
    onSuccess: () => {
      toast.success(dialog?.mode === "edit" ? "MinIO updated" : "MinIO added");
      closeDialog();
      void client.invalidateQueries({ queryKey: ["storage-nodes"] });
    },
    onError: (error: any) =>
      toast.error("Could not save MinIO", {
        description: error.response?.data?.message ?? "Check the connection settings.",
      }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/admin/storage-nodes/${id}`),
    onSuccess: () => {
      toast.success("MinIO removed");
      void client.invalidateQueries({ queryKey: ["storage-nodes"] });
    },
    onError: (error: any) =>
      toast.error("Could not remove node", {
        description:
          error.response?.data?.message ??
          "Nodes with stored files should be disabled or migrated first.",
      }),
  });

  const test = useMutation({
    mutationFn: (id: number) =>
      api.post<StorageNode>(`/api/v1/admin/storage-nodes/${id}/test`),
    onSuccess: () => {
      toast.success("MinIO connection is healthy");
      void client.invalidateQueries({ queryKey: ["storage-nodes"] });
    },
    onError: (error: any) => {
      toast.error("MinIO connection failed", {
        description:
          error.response?.data?.message ??
          "Check the endpoint, bucket, access key, and secret key.",
      });
      void client.invalidateQueries({ queryKey: ["storage-nodes"] });
    },
  });

  const resetBandwidth = useMutation({
    mutationFn: (id: number) =>
      api.post<StorageNode>(`/api/v1/admin/storage-nodes/${id}/bandwidth/reset`),
    onSuccess: () => {
      toast.success("Bandwidth counter reset");
      void client.invalidateQueries({ queryKey: ["storage-nodes"] });
    },
    onError: () => toast.error("Could not reset bandwidth"),
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      api.post<StorageNode>(`/api/v1/admin/storage-nodes/${id}/enabled`, null, {
        params: { enabled },
      }),
    onSuccess: (_, variables) => {
      toast.success(variables.enabled ? "Node enabled" : "Node disabled");
      void client.invalidateQueries({ queryKey: ["storage-nodes"] });
    },
    onError: () => toast.error("Could not update node status"),
  });
  const startMigration = useMutation({
    mutationFn: () =>
      api.post(`/api/v1/admin/storage-migrations/source/${migrationSource?.id}`, {
        targetNodeId: Number(migrationTargetId),
      }),
    onSuccess: async () => {
      toast.success("Migration started");
      setMigrationSource(null);
      setMigrationTargetId("");
      await migrations.refetch();
    },
    onError: (error: any) =>
      toast.error("Could not start migration", {
        description:
          error.response?.data?.message ??
          "Please check both storage nodes and try again.",
      }),
  });

  function openCreate() {
    setForm(emptyForm);
    setCredentialEditing(true);
    setDialog({ mode: "create" });
  }

  function openEdit(node: StorageNode) {
    setForm({
      name: node.name,
      note: node.note ?? "",
      endpoint: node.endpoint,
      region: node.region || "us-east-1",
      accessKey: "",
      secretKey: "",
      bucket: node.bucket,
      capacityGb: bytesToGb(node.capacityBytes),
      bandwidthGb: bytesToGb(node.bandwidthLimitBytes),
      priority: String(node.priority),
      enabled: node.enabled,
    });
    setCredentialEditing(false);
    setDialog({ mode: "edit", node });
  }

  function closeDialog() {
    setDialog(null);
    setForm(emptyForm);
    setCredentialEditing(false);
  }

  function requestResetBandwidth(node: StorageNode) {
    setConfirmAction({
      title: "Reset bandwidth counter?",
      message: `This will set the monthly bandwidth usage for ${node.name} back to 0. The stored files will not be changed.`,
      confirmLabel: "Reset bandwidth",
      onConfirm: () => resetBandwidth.mutate(node.id),
    });
  }

  function requestToggle(node: StorageNode) {
    setConfirmAction({
      title: node.enabled ? "Disable this node?" : "Enable this node?",
      message: node.enabled
        ? `${node.name} will stop receiving new uploads. Existing files remain available.`
        : `${node.name} can be selected for new uploads again if it has enough quota.`,
      confirmLabel: node.enabled ? "Disable node" : "Enable node",
      danger: node.enabled,
      onConfirm: () => toggle.mutate({ id: node.id, enabled: !node.enabled }),
    });
  }

  function requestDelete(node: StorageNode) {
    setConfirmAction({
      title: "Delete this S3 Store?",
      message: `${node.name} will be removed from management. Nodes that still contain files cannot be deleted.`,
      confirmLabel: "Delete node",
      danger: true,
      onConfirm: () => remove.mutate(node.id),
    });
  }

  function openMigration(node: StorageNode) {
    setMigrationSource(node);
    setMigrationTargetId("");
  }

  const nextNode = nodes.data?.find((node) => {
    const storage = percent(node.usedBytes, node.capacityBytes);
    const bandwidth = percent(node.bandwidthUsedBytes, node.bandwidthLimitBytes);
    return node.enabled && !node.lastError && storage < 95 && bandwidth < 95;
  });

  return (
    <section className="mx-auto max-w-7xl p-4 text-ink md:p-8">
      <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-soft text-moss">
              <Database size={20} />
            </span>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
                Storage administration
              </p>
              <h1 className="text-2xl font-extrabold">S3 Store Management</h1>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">
            Manage multiple 20GB MinIO nodes with 100GB monthly bandwidth. Uploads are assigned automatically.
          </p>
          <p className="mt-1 text-xs text-muted">
            Enabled nodes are health-checked automatically every 10 minutes; use Test connection for an immediate check.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void nodes.refetch()}>
            <RefreshCw size={16} /> Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} /> Add MinIO
          </Button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Database} label="S3 Stores" value={`${stats.total}`} detail={`${stats.enabled} enabled`} />
        <Metric icon={Activity} label="Healthy" value={`${stats.healthy}/${stats.enabled}`} detail="No recent errors" />
        <Metric icon={HardDrive} label="Storage" value={`${formatSize(stats.used)} / ${formatSize(stats.capacity)}`} detail={`${formatSize(Math.max(0, stats.capacity - stats.used))} available`} />
        <Metric icon={Gauge} label="Bandwidth" value={`${formatSize(stats.bandwidthUsed)} / ${formatSize(stats.bandwidth)}`} detail={`${formatSize(Math.max(0, stats.bandwidth - stats.bandwidthUsed))} available`} />
        <Metric icon={KeyRound} label="Next Upload Node" value={nextNode?.name ?? "None"} detail={nextNode ? `Priority ${nextNode.priority}` : "Add an available node"} />
      </div>

      {nodes.isPending ? (
        <div className="rounded-lg border border-dashed border-line p-16 text-center text-sm text-muted">
          Loading MinIO nodes...
        </div>
      ) : nodes.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Your account needs the ADMIN role to manage MinIO.
        </div>
      ) : !nodes.data?.length ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-white">
          <div className="hidden grid-cols-[1.25fr_.8fr_1fr_1fr_.75fr_220px] gap-4 border-b border-line bg-canvas px-4 py-3 text-xs font-bold text-muted lg:grid">
            <span>MinIO</span>
            <span>Plan</span>
            <span>Storage</span>
            <span>Bandwidth</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          {nodes.data.map((node) => (
            <NodeRow
              key={node.id}
              node={node}
              busy={
                test.isPending ||
                resetBandwidth.isPending ||
                remove.isPending ||
                toggle.isPending
              }
              onEdit={() => openEdit(node)}
              onMigrate={() => openMigration(node)}
              onTest={() => test.mutate(node.id)}
              onReset={() => requestResetBandwidth(node)}
              onToggle={() => requestToggle(node)}
              onDelete={() => requestDelete(node)}
            />
          ))}
        </div>
      )}

      <MigrationJobs jobs={migrations.data ?? []} loading={migrations.isPending} />

      {dialog && (
        <NodeDialog
          mode={dialog.mode}
          form={form}
          credentialEditing={credentialEditing}
          saving={save.isPending}
          onChange={(key, value) =>
            setForm((current) => ({ ...current, [key]: value }))
          }
          onEnableCredentialEditing={() => setCredentialEditing(true)}
          onClose={closeDialog}
          onSubmit={() => save.mutate()}
        />
      )}
      {confirmAction && (
        <ConfirmDialog
          action={confirmAction}
          busy={resetBandwidth.isPending || remove.isPending || toggle.isPending}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => {
            confirmAction.onConfirm();
            setConfirmAction(null);
          }}
        />
      )}
      {migrationSource && nodes.data && (
        <MigrationDialog
          source={migrationSource}
          nodes={nodes.data}
          targetId={migrationTargetId}
          loading={startMigration.isPending}
          onTargetChange={setMigrationTargetId}
          onClose={() => {
            setMigrationSource(null);
            setMigrationTargetId("");
          }}
          onSubmit={() => startMigration.mutate()}
        />
      )}
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <Icon className="size-4 text-moss" />
      <p className="mt-3 text-xs text-muted">{label}</p>
      <strong className="mt-1 block truncate text-sm">{value}</strong>
      <span className="mt-1 block truncate text-[11px] text-muted">{detail}</span>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white p-12 text-center">
      <Database className="mx-auto size-9 text-moss" />
      <h2 className="mt-4 text-lg font-extrabold">No MinIO nodes yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Add the first S3 Store so the system has a destination for uploads.
      </p>
      <Button className="mt-6" onClick={onCreate}>
        <Plus size={16} /> Add MinIO
      </Button>
    </div>
  );
}

function NodeRow({
  node,
  busy,
  onEdit,
  onMigrate,
  onTest,
  onReset,
  onToggle,
  onDelete,
}: {
  node: StorageNode;
  busy: boolean;
  onEdit: () => void;
  onMigrate: () => void;
  onTest: () => void;
  onReset: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const storagePercent = percent(node.usedBytes, node.capacityBytes);
  const bandwidthPercent = percent(node.bandwidthUsedBytes, node.bandwidthLimitBytes);
  const status = node.enabled
    ? node.lastError
      ? "Connection error"
      : storagePercent >= 95
        ? "Near storage limit"
        : bandwidthPercent >= 95
          ? "Bandwidth exhausted"
          : "Active"
    : "Disabled";

  return (
    <div className="grid grid-cols-1 gap-4 border-b border-line px-4 py-4 last:border-0 lg:grid-cols-[1.25fr_.8fr_1fr_1fr_.75fr_220px] lg:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Database className="size-4 shrink-0 text-moss" />
          <strong className="truncate text-sm">{node.name}</strong>
        </div>
        <p className="mt-1 truncate text-xs text-muted">{node.endpoint}</p>
        <p className="mt-1 truncate text-[11px] text-muted">Bucket: {node.bucket}</p>
        {node.note && (
          <p className="mt-2 line-clamp-2 text-xs text-muted">{node.note}</p>
        )}
      </div>
      <div className="text-xs">
        <strong>{formatSize(node.capacityBytes)}</strong>
        <p className="mt-1 text-muted">{formatSize(node.bandwidthLimitBytes)}/month</p>
        <p className="mt-1 text-muted">Priority {node.priority}</p>
      </div>
      <Usage value={node.usedBytes} limit={node.capacityBytes} percent={storagePercent} />
      <Usage
        value={node.bandwidthUsedBytes}
        limit={node.bandwidthLimitBytes}
        percent={bandwidthPercent}
        resetAt={node.bandwidthResetAt}
      />
      <div>
        <StatusBadge status={status} />
        {node.lastCheckedAt && (
          <p className="mt-2 text-[11px] text-muted">Test: {formatDate(node.lastCheckedAt)}</p>
        )}
        {node.lastError && (
          <p className="mt-2 line-clamp-2 text-xs text-red-600">{node.lastError}</p>
        )}
      </div>
      <div className="flex justify-end gap-1">
        <IconButton title="Edit" onClick={onEdit} disabled={busy}>
          <Edit3 size={15} />
        </IconButton>
        <IconButton title="Migrate all files" onClick={onMigrate} disabled={busy || node.usedBytes === 0}>
          <ArrowRightLeft size={15} />
        </IconButton>
        <IconButton title="Test connection" onClick={onTest} disabled={busy}>
          <RefreshCw size={15} />
        </IconButton>
        <IconButton title="Reset bandwidth" onClick={onReset} disabled={busy}>
          <RotateCcw size={15} />
        </IconButton>
        <IconButton title={node.enabled ? "Disable node" : "Enable node"} onClick={onToggle} disabled={busy}>
          <Power size={15} />
        </IconButton>
        <IconButton title="Delete" onClick={onDelete} disabled={busy} danger>
          <Trash2 size={15} />
        </IconButton>
      </div>
    </div>
  );
}

function Usage({
  value,
  limit,
  percent,
  resetAt,
}: {
  value: number;
  limit: number;
  percent: number;
  resetAt?: string;
}) {
  const color =
    percent >= 95 ? "bg-red-500" : percent >= 80 ? "bg-amber-500" : "bg-moss";
  return (
    <div>
      <div className="flex justify-between gap-2 text-xs">
        <strong className="truncate">{formatSize(value)}</strong>
        <span className="text-muted">{percent.toFixed(0)}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-muted">{formatSize(Math.max(0, limit - value))} available</p>
      {resetAt && <p className="mt-1 text-[11px] text-muted">Reset: {formatDate(resetAt)}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "Active"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Disabled"
        ? "bg-gray-100 text-gray-500"
        : status === "Connection error"
          ? "bg-red-50 text-red-700"
          : "bg-amber-50 text-amber-700";
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${className}`}>
      {status}
    </span>
  );
}

function IconButton({
  children,
  title,
  disabled,
  loading,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      className={`size-8 px-0 ${danger ? "text-red-600 hover:text-red-700" : ""}`}
      title={title}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : children}
    </Button>
  );
}

function MigrationJobs({ jobs, loading }: { jobs: MigrationJob[]; loading: boolean }) {
  if (loading || jobs.length === 0) return null;
  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-line bg-white">
      <div className="border-b border-line bg-canvas px-4 py-3">
        <h2 className="text-sm font-extrabold">Migration Jobs</h2>
        <p className="mt-1 text-xs text-muted">
          Recent storage migrations between MinIO nodes.
        </p>
      </div>
      <div className="divide-y divide-line">
        {jobs.map((job) => {
          const totalItems = job.totalFiles + job.totalFolders;
          const migratedItems = job.migratedFiles + job.migratedFolders;
          const progress =
            job.totalBytes > 0
              ? Math.min(100, (job.migratedBytes / job.totalBytes) * 100)
              : totalItems > 0
                ? Math.min(100, (migratedItems / totalItems) * 100)
                : 0;
          return (
            <div key={job.id} className="grid gap-4 px-4 py-4 lg:grid-cols-[1.2fr_1fr_.8fr] lg:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {job.sourceNodeName} {"->"} {job.targetNodeName}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {migratedItems}/{totalItems} items - {formatSize(job.migratedBytes)} / {formatSize(job.totalBytes)}
                </p>
                {job.errorMessage && (
                  <p className="mt-2 line-clamp-2 text-xs text-red-600">{job.errorMessage}</p>
                )}
              </div>
              <div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-moss" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-muted">{progress.toFixed(0)}% complete</p>
              </div>
              <div className="text-left lg:text-right">
                <MigrationStatusBadge status={job.status} />
                <p className="mt-2 text-[11px] text-muted">
                  Started: {job.startedAt ? formatDate(job.startedAt) : formatDate(job.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MigrationStatusBadge({ status }: { status: MigrationJob["status"] }) {
  const className =
    status === "COMPLETED"
      ? "bg-emerald-50 text-emerald-700"
      : status === "FAILED"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${className}`}>
      {status === "COMPLETED" ? "Completed" : status === "FAILED" ? "Failed" : "Running"}
    </span>
  );
}

function NodeDialog({
  mode,
  form,
  credentialEditing,
  saving,
  onChange,
  onEnableCredentialEditing,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  form: NodeForm;
  credentialEditing: boolean;
  saving: boolean;
  onChange: <K extends keyof NodeForm>(key: K, value: NodeForm[K]) => void;
  onEnableCredentialEditing: () => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const creating = mode === "create";
  const editingCredentials = creating || credentialEditing;
  const disabled =
    saving ||
    !form.name ||
    !form.endpoint ||
    !form.bucket ||
    !form.capacityGb ||
    !form.bandwidthGb ||
    (editingCredentials && (!form.accessKey || !form.secretKey));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-lg border border-line bg-white p-5 shadow-panel">
        <div className="mb-5 flex items-start justify-between border-b border-line pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
              {creating ? "Add S3 Store" : "Update S3 Store"}
            </p>
            <h2 className="mt-2 text-xl font-extrabold">
              {creating ? "Add New MinIO" : "Edit MinIO Settings"}
            </h2>
          </div>
          <Button variant="ghost" className="size-8 px-0" onClick={onClose} disabled={saving}>
            <X size={16} />
          </Button>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Display name" value={form.name} onChange={(value) => onChange("name", value)} />
            <Field label="Region" value={form.region} onChange={(value) => onChange("region", value)} />
          </div>
          <NoteField value={form.note} onChange={(value) => onChange("note", value)} />
          <Field label="API endpoint" value={form.endpoint} onChange={(value) => onChange("endpoint", value)} placeholder="https://minio1.example.com:9000" />
          <Field label="Bucket" value={form.bucket} onChange={(value) => onChange("bucket", value)} />
          <input className="hidden" name="username" autoComplete="username" tabIndex={-1} />
          <input className="hidden" name="password" type="password" autoComplete="current-password" tabIndex={-1} />
          {editingCredentials ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Access key"
                value={form.accessKey}
                onChange={(value) => onChange("accessKey", value)}
                placeholder="Access key"
                name="minio-access-key"
                autoComplete="off"
              />
              <Field
                label="Secret key"
                type="password"
                value={form.secretKey}
                onChange={(value) => onChange("secretKey", value)}
                placeholder="Secret key"
                name="minio-secret-key"
                autoComplete="new-password"
              />
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-amber-900">Credentials are unchanged</p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    Access key and secret key will be kept as-is unless you choose to replace them.
                  </p>
                </div>
                <Button variant="outline" onClick={onEnableCredentialEditing} disabled={saving}>
                  Change credentials
                </Button>
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Storage GB" value={form.capacityGb} onChange={(value) => onChange("capacityGb", value)} />
            <Field label="Bandwidth GB/month" value={form.bandwidthGb} onChange={(value) => onChange("bandwidthGb", value)} />
            <Field label="Priority" value={form.priority} onChange={(value) => onChange("priority", value)} />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => onChange("enabled", event.target.checked)}
            />
            Allow uploads to this node
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={disabled}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {creating ? "Add node" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  type = "text",
  placeholder,
  name,
  autoComplete,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  name?: string;
  autoComplete?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold">
      {label}
      <Input
        type={type}
        name={name}
        autoComplete={autoComplete}
        value={value}
        placeholder={placeholder ?? label}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function NoteField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold">
      Note
      <textarea
        value={value}
        rows={3}
        maxLength={1000}
        placeholder="Example: Webtui S3 Store 0, renews in 2032, owner account..."
        className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-moss focus:ring-2 focus:ring-moss/10"
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="justify-self-end text-[10px] font-normal text-muted">
        {value.length}/1000
      </span>
    </label>
  );
}

function MigrationDialog({
  source,
  nodes,
  targetId,
  loading,
  onTargetChange,
  onClose,
  onSubmit,
}: {
  source: StorageNode;
  nodes: StorageNode[];
  targetId: string;
  loading: boolean;
  onTargetChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const targets = nodes.filter((node) => node.id !== source.id && node.enabled);
  const target = targets.find((node) => String(node.id) === targetId);
  const disabled = loading || !targetId;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
      <div className="w-full max-w-lg rounded-lg border border-line bg-white p-5 shadow-panel">
        <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
              Storage migration
            </p>
            <h2 className="mt-2 text-xl font-extrabold">Migrate All Files</h2>
          </div>
          <Button variant="ghost" className="size-8 px-0" onClick={onClose} disabled={loading}>
            <X size={16} />
          </Button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            This will move every file stored on <strong>{source.name}</strong> to another MinIO node.
            Existing folders, links, and sharing permissions stay unchanged.
          </div>

          <div className="grid gap-3 rounded-lg border border-line p-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted">Source</span>
              <strong>{source.name}</strong>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">Data to move</span>
              <strong>{formatSize(source.usedBytes)}</strong>
            </div>
          </div>

          <label className="grid gap-1 text-xs font-semibold">
            Target node
            <select
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-moss focus:ring-2 focus:ring-moss/10"
              value={targetId}
              onChange={(event) => onTargetChange(event.target.value)}
              disabled={loading}
            >
              <option value="">Choose target MinIO</option>
              {targets.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name} - {formatSize(Math.max(0, node.capacityBytes - node.usedBytes))} available
                </option>
              ))}
            </select>
          </label>

          {target && target.capacityBytes > 0 && target.capacityBytes - target.usedBytes < source.usedBytes && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              The selected target may not have enough free storage for this migration.
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={disabled}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Start migration
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  action,
  busy,
  onClose,
  onConfirm,
}: {
  action: ConfirmAction;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
              Confirm action
            </p>
            <h2 className="mt-2 text-xl font-extrabold">{action.title}</h2>
          </div>
          <Button
            variant="ghost"
            className="size-8 px-0"
            onClick={onClose}
            disabled={busy}
            title="Close"
          >
            <X size={16} />
          </Button>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">{action.message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={action.danger ? "danger" : "default"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {action.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function toPayload(form: NodeForm, includeAccessKey = true, includeSecretKey = true) {
  const payload: Record<string, string | number | boolean> = {
    name: form.name.trim(),
    note: form.note.trim(),
    endpoint: form.endpoint.trim(),
    region: form.region.trim(),
    bucket: form.bucket.trim(),
    capacityBytes: Number(form.capacityGb) * gb,
    bandwidthLimitBytes: Number(form.bandwidthGb) * gb,
    priority: Number(form.priority),
    enabled: form.enabled,
  };
  if (includeAccessKey) {
    payload.accessKey = form.accessKey.trim();
  }
  if (includeSecretKey) {
    payload.secretKey = form.secretKey;
  }
  return payload;
}

function bytesToGb(bytes: number) {
  if (!bytes) return "0";
  return String(Number((bytes / gb).toFixed(2)));
}

function percent(value: number, limit: number) {
  if (!limit) return 0;
  return Math.min(100, (value / limit) * 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
