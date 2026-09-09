import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Database,
  Files,
  Gauge,
  HardDrive,
  Loader2,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { api } from "../lib/api";
import { formatSize } from "../lib/utils";
import type { AdminDashboard, AuditLog, MigrationJob, StorageNode } from "../types/file";

export function AdminDashboardPage() {
  const dashboard = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => (await api.get<AdminDashboard>("/api/v1/admin/dashboard")).data,
    refetchInterval: 30_000,
  });

  if (dashboard.isPending) {
    return (
      <section className="mx-auto max-w-6xl p-5 md:p-10">
        <div className="flex h-64 items-center justify-center text-muted">
          <Loader2 className="size-6 animate-spin" />
        </div>
      </section>
    );
  }

  if (!dashboard.data) {
    return (
      <section className="mx-auto max-w-6xl p-5 md:p-10">
        <div className="rounded-xl border border-line bg-white p-12 text-center text-sm text-muted">
          Dashboard data is not available.
        </div>
      </section>
    );
  }

  const data = dashboard.data;

  return (
    <section className="mx-auto max-w-6xl p-5 md:p-10">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">Dashboard</h1>
          <p className="mt-2 text-sm text-muted">
            System overview for users, files, storage nodes, migrations, and alerts.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm text-muted">
          <Activity size={16} />
          Auto refresh every 30s
        </div>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Users size={18} />} label="Users" value={data.totals.users} detail={`${data.totals.activeUsers} active`} />
        <Metric icon={<Files size={18} />} label="Files" value={data.totals.files} detail="Total file records" />
        <Metric icon={<HardDrive size={18} />} label="Storage" value={formatSize(data.totals.storageUsedBytes)} detail={`${formatSize(data.totals.storageCapacityBytes)} capacity`} />
        <Metric icon={<Database size={18} />} label="Nodes" value={`${data.totals.healthyNodes}/${data.totals.storageNodes}`} detail={`${data.totals.unreadAlerts} alerts`} />
      </div>

      {data.alerts.length > 0 && (
        <section className="mt-6 rounded-xl border border-line bg-white p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-600" />
            <h2 className="text-lg font-extrabold">Alerts</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {data.alerts.map((alert) => (
              <div
                key={`${alert.type}-${alert.targetId}`}
                className={
                  alert.severity === "danger"
                    ? "rounded-lg border border-red-200 bg-red-50 p-3"
                    : "rounded-lg border border-amber-200 bg-amber-50 p-3"
                }
              >
                <p className="text-sm font-extrabold">{alert.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{alert.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <Panel title="Storage By Node" icon={<Database size={18} />}>
          <div className="grid gap-3">
            {data.nodes.map((node) => (
              <NodeUsage key={node.id} node={node} />
            ))}
          </div>
        </Panel>

        <Panel title="Top Storage Users" icon={<Users size={18} />}>
          <div className="divide-y divide-line">
            {data.topUsers.map((user) => (
              <div key={user.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{user.fullName}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold">
                    {formatSize(user.storageUsedBytes)} /{" "}
                    {user.effectiveStorageQuotaBytes == null
                      ? "Unlimited"
                      : formatSize(user.effectiveStorageQuotaBytes)}
                  </span>
                </div>
                {user.effectiveStorageQuotaBytes != null && (
                  <UsageBar value={user.storageUsedBytes} limit={user.effectiveStorageQuotaBytes} />
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Recent Migrations" icon={<Gauge size={18} />}>
          <div className="divide-y divide-line">
            {data.recentMigrations.length === 0 ? (
              <EmptyLine>No migrations yet.</EmptyLine>
            ) : (
              data.recentMigrations.map((job) => <MigrationLine key={job.id} job={job} />)
            )}
          </div>
        </Panel>

        <Panel title="Recent Audit Activity" icon={<ClipboardList size={18} />}>
          <div className="divide-y divide-line">
            {data.recentAuditLogs.length === 0 ? (
              <EmptyLine>No audit activity yet.</EmptyLine>
            ) : (
              data.recentAuditLogs.map((log) => <AuditLine key={log.id} log={log} />)
            )}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: ReactNode; detail: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-soft text-moss">{icon}</span>
        <span className="text-right text-2xl font-extrabold tracking-[-.04em]">{value}</span>
      </div>
      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-moss">{icon}</span>
        <h2 className="text-lg font-extrabold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function NodeUsage({ node }: { node: StorageNode }) {
  const storagePercent = percent(node.usedBytes, node.capacityBytes);
  const bandwidthPercent = percent(node.bandwidthUsedBytes, node.bandwidthLimitBytes);
  const hasError = Boolean(node.lastError);
  return (
    <div className="rounded-lg border border-line bg-canvas p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">{node.name}</p>
          <p className="truncate text-xs text-muted">{node.endpoint}</p>
        </div>
        <span
          className={
            hasError
              ? "rounded-full bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700"
              : "rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700"
          }
        >
          {hasError ? "Error" : "Healthy"}
        </span>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <UsageStat label="Storage" value={node.usedBytes} limit={node.capacityBytes} percentValue={storagePercent} />
        <UsageStat label="Bandwidth" value={node.bandwidthUsedBytes} limit={node.bandwidthLimitBytes} percentValue={bandwidthPercent} />
      </div>
      {node.lastError && <p className="mt-2 line-clamp-2 text-xs text-red-600">{node.lastError}</p>}
    </div>
  );
}

function UsageStat({ label, value, limit, percentValue }: { label: string; value: number; limit: number; percentValue: number }) {
  return (
    <div>
      <div className="flex justify-between gap-2 text-xs">
        <span className="font-bold text-muted">{label}</span>
        <span className="font-bold">{formatSize(value)} / {limit <= 0 ? "Unlimited" : formatSize(limit)}</span>
      </div>
      {limit > 0 && <UsageBar value={value} limit={limit} />}
      {limit > 0 && <p className="mt-1 text-[11px] text-muted">{Math.round(percentValue)}%</p>}
    </div>
  );
}

function UsageBar({ value, limit }: { value: number; limit: number }) {
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-moss" style={{ width: `${Math.min(100, percent(value, limit))}%` }} />
    </div>
  );
}

function MigrationLine({ job }: { job: MigrationJob }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-bold">
          {job.sourceNodeName} <span className="text-muted">to</span> {job.targetNodeName}
        </p>
        <StatusBadge status={job.status} />
      </div>
      <p className="mt-1 text-xs text-muted">
        {job.migratedFiles}/{job.totalFiles} files - {formatSize(job.migratedBytes)} / {formatSize(job.totalBytes)}
      </p>
      {job.errorMessage && <p className="mt-1 line-clamp-2 text-xs text-red-600">{job.errorMessage}</p>}
    </div>
  );
}

function AuditLine({ log }: { log: AuditLog }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-bold">{log.message}</p>
        <span className="shrink-0 text-[11px] text-muted">{formatShortDate(log.createdAt)}</span>
      </div>
      <p className="mt-1 truncate text-xs text-muted">
        {log.actorEmail ?? "system"} - {formatAction(log.action)}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: MigrationJob["status"] }) {
  const className =
    status === "COMPLETED"
      ? "bg-emerald-50 text-emerald-700"
      : status === "FAILED"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";
  return <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${className}`}>{status}</span>;
}

function EmptyLine({ children }: { children: ReactNode }) {
  return <div className="py-8 text-center text-sm text-muted">{children}</div>;
}

function percent(value: number, limit: number) {
  if (limit <= 0) return 0;
  return (value / limit) * 100;
}

function formatAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
