import { useMemo, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  ClipboardList,
  Columns3,
  Database,
  FileText,
  Loader2,
  Search,
  Share2,
  UserRound,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import type { AuditLog, PagedResponse } from "../types/file";

const PAGE_SIZE = 25;
type TimeFilter = "all" | "today" | "7d" | "30d" | "custom";
type ColumnKey = "time" | "actor" | "action" | "target" | "message" | "client";
type VisibleColumns = Record<ColumnKey, boolean>;
type ColumnWidths = Record<ColumnKey, number>;

const columnDefinitions: Array<{ key: ColumnKey; label: string; width: number }> = [
  { key: "time", label: "Time", width: 140 },
  { key: "actor", label: "Actor", width: 280 },
  { key: "action", label: "Action", width: 220 },
  { key: "target", label: "Target", width: 300 },
  { key: "message", label: "Message", width: 300 },
  { key: "client", label: "Client", width: 440 },
];

const defaultVisibleColumns: VisibleColumns = {
  time: true,
  actor: true,
  action: true,
  target: true,
  message: true,
  client: true,
};

const defaultColumnWidths = columnDefinitions.reduce((widths, column) => {
  widths[column.key] = column.width;
  return widths;
}, {} as ColumnWidths);

const actions = [
  "FILE_UPLOADED",
  "FILE_MOVED_TO_TRASH",
  "FILE_DELETED_FOREVER",
  "FILE_SHARED",
  "FILE_SHARE_REVOKED",
  "USER_CREATED",
  "USER_LOCKED",
  "USER_UNLOCKED",
  "USER_ROLE_CHANGED",
  "USER_QUOTA_CHANGED",
  "STORAGE_NODE_CREATED",
  "STORAGE_NODE_UPDATED",
  "STORAGE_NODE_DISABLED",
  "STORAGE_MIGRATION_STARTED",
  "STORAGE_MIGRATION_COMPLETED",
  "STORAGE_MIGRATION_FAILED",
];

export function AuditLogsPage() {
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [action, setAction] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>(defaultVisibleColumns);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(defaultColumnWidths);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(PAGE_SIZE),
    });
    if (keyword.trim()) params.set("keyword", keyword.trim());
    if (action) params.set("action", action);
    const range = resolveTimeRange(timeFilter, customFrom, customTo);
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    return params.toString();
  }, [action, customFrom, customTo, keyword, page, timeFilter]);

  const logs = useQuery({
    queryKey: ["audit-logs", query],
    queryFn: async () =>
      (await api.get<PagedResponse<AuditLog>>(`/api/v1/admin/audit-logs?${query}`)).data,
  });
  const activeColumns = columnDefinitions.filter((column) => visibleColumns[column.key]);
  const tableMinWidth = activeColumns.reduce((total, column) => total + columnWidths[column.key], 0);

  function updateKeyword(value: string) {
    setKeyword(value);
    setPage(0);
  }

  function updateAction(value: string) {
    setAction(value);
    setPage(0);
  }

  function updateTimeFilter(value: TimeFilter) {
    setTimeFilter(value);
    setPage(0);
  }

  function toggleColumn(key: ColumnKey) {
    setVisibleColumns((current) => {
      const visibleCount = Object.values(current).filter(Boolean).length;
      if (current[key] && visibleCount === 1) return current;
      return { ...current, [key]: !current[key] };
    });
  }

  function startColumnResize(key: ColumnKey, event: ReactMouseEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = columnWidths[key];

    function handleMove(moveEvent: MouseEvent) {
      const nextWidth = Math.max(90, startWidth + moveEvent.clientX - startX);
      setColumnWidths((current) => ({ ...current, [key]: nextWidth }));
    }

    function handleUp() {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }

  return (
    <section className="mx-auto max-w-6xl p-5 md:p-10">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">Audit Logs</h1>
          <p className="mt-2 text-sm text-muted">
            Track important file, sharing, user, and storage actions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm text-muted">
            <ClipboardList size={16} />
            {logs.data?.totalElements ?? 0} records
          </div>
          <div className="relative">
            <Button variant="outline" onClick={() => setColumnsOpen((open) => !open)}>
              <Columns3 size={16} /> Columns
            </Button>
            {columnsOpen && (
              <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-line bg-white p-2 shadow-panel">
                {columnDefinitions.map((column) => (
                  <label
                    key={column.key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-canvas"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-moss"
                      checked={visibleColumns[column.key]}
                      onChange={() => toggleColumn(column.key)}
                    />
                    {column.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-[1fr_240px_200px]">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            className="pl-9"
            value={keyword}
            onChange={(event) => updateKeyword(event.target.value)}
            placeholder="Search by actor, target, or message"
          />
        </label>
        <select
          className="h-11 rounded-lg border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-moss focus:ring-2 focus:ring-moss/10"
          value={action}
          onChange={(event) => updateAction(event.target.value)}
        >
          <option value="">All actions</option>
          {actions.map((item) => (
            <option key={item} value={item}>
              {formatAction(item)}
            </option>
          ))}
        </select>
        <select
          className="h-11 rounded-lg border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-moss focus:ring-2 focus:ring-moss/10"
          value={timeFilter}
          onChange={(event) => updateTimeFilter(event.target.value as TimeFilter)}
        >
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="custom">Custom range</option>
        </select>
      </div>

      {timeFilter === "custom" && (
        <div className="mt-3 grid gap-3 rounded-xl border border-line bg-white p-4 md:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
              From
            </span>
            <Input
              type="date"
              value={customFrom}
              onChange={(event) => {
                setCustomFrom(event.target.value);
                setPage(0);
              }}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
              To
            </span>
            <Input
              type="date"
              value={customTo}
              onChange={(event) => {
                setCustomTo(event.target.value);
                setPage(0);
              }}
            />
          </label>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-line bg-white">
        {logs.isPending ? (
          <div className="flex h-32 items-center justify-center text-muted">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : !logs.data?.content.length ? (
          <div className="p-12 text-center text-sm text-muted">No audit logs found.</div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <table className="text-left text-sm" style={{ minWidth: tableMinWidth }}>
              <colgroup>
                {activeColumns.map((column) => (
                  <col key={column.key} style={{ width: columnWidths[column.key] }} />
                ))}
              </colgroup>
              <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
                <tr>
                  {activeColumns.map((column) => (
                    <th key={column.key} className="relative px-4 py-3">
                      <span className="block truncate pr-2">{column.label}</span>
                      <span
                        className="absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none transition hover:bg-moss/20"
                        onMouseDown={(event) => startColumnResize(column.key, event)}
                        title={`Resize ${column.label} column`}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {logs.data.content.map((log) => (
                  <AuditLogRow key={log.id} log={log} visibleColumns={visibleColumns} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Page {(logs.data?.number ?? page) + 1} of {Math.max(logs.data?.totalPages ?? 1, 1)}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0 || logs.isPending}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage((current) => current + 1)}
            disabled={logs.isPending || Boolean(logs.data?.last)}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}

function AuditLogRow({
  log,
  visibleColumns,
}: {
  log: AuditLog;
  visibleColumns: VisibleColumns;
}) {
  return (
    <tr className="align-top transition hover:bg-canvas/70">
      {visibleColumns.time && (
        <td className="whitespace-nowrap px-4 py-4 text-xs text-muted">
          {formatDateTime(log.createdAt)}
        </td>
      )}
      {visibleColumns.actor && (
        <td className="px-4 py-4">
          <p className="truncate font-bold" title={log.actorEmail ?? "system"}>
            {log.actorEmail ?? "system"}
          </p>
          {log.actorUserId && (
            <p className="mt-1 truncate font-mono text-[11px] text-muted" title={log.actorUserId}>
              {log.actorUserId}
            </p>
          )}
        </td>
      )}
      {visibleColumns.action && (
        <td className="px-4 py-4">
          <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-soft px-3 py-1 text-xs font-bold text-moss">
            <span className="shrink-0">
              {actionIcon(log.action)}
            </span>
            <span className="truncate" title={formatAction(log.action)}>
              {formatAction(log.action)}
            </span>
          </span>
        </td>
      )}
      {visibleColumns.target && (
        <td className="px-4 py-4">
          <p className="line-clamp-2 font-bold" title={log.targetName ?? log.targetId ?? "-"}>
            {log.targetName ?? log.targetId ?? "-"}
          </p>
          <p className="mt-1 text-xs text-muted">{log.targetType}</p>
        </td>
      )}
      {visibleColumns.message && (
        <td className="px-4 py-4">
          <p className="line-clamp-2 text-sm" title={log.message}>
            {log.message}
          </p>
          {log.metadataJson && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer font-bold text-moss">Details</summary>
              <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-canvas p-3 font-mono text-[11px] leading-5 text-muted">
                {formatMetadata(log.metadataJson)}
              </pre>
            </details>
          )}
        </td>
      )}
      {visibleColumns.client && (
        <td className="px-4 py-4 text-xs text-muted">
          <p className="truncate font-bold text-ink" title={log.ipAddress ?? "No IP"}>
            {log.ipAddress ?? "No IP"}
          </p>
          <p className="mt-1 line-clamp-2 break-words" title={log.userAgent ?? "No user agent"}>
            {log.userAgent ?? "No user agent"}
          </p>
        </td>
      )}
    </tr>
  );
}

function actionIcon(action: string) {
  if (action.startsWith("FILE_") || action.startsWith("FOLDER_")) return <FileText size={17} />;
  if (action.includes("SHARE")) return <Share2 size={17} />;
  if (action.startsWith("USER_")) return <UserRound size={17} />;
  if (action.startsWith("STORAGE_")) return <Database size={17} />;
  return <ClipboardList size={17} />;
}

function formatAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMetadata(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function resolveTimeRange(filter: TimeFilter, customFrom: string, customTo: string) {
  const now = new Date();
  if (filter === "all") return {};
  if (filter === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  if (filter === "7d" || filter === "30d") {
    const start = new Date(now);
    start.setDate(start.getDate() - (filter === "7d" ? 7 : 30));
    return { from: start.toISOString(), to: now.toISOString() };
  }
  return {
    from: customFrom ? startOfDay(customFrom).toISOString() : undefined,
    to: customTo ? endOfDay(customTo).toISOString() : undefined,
  };
}

function startOfDay(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function endOfDay(dateValue: string) {
  const date = new Date(`${dateValue}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}
