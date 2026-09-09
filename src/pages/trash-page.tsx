import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  File,
  FileImage,
  FileText,
  Folder,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { TrashBulkActions } from "../components/files/trash-bulk-actions";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { formatSize } from "../lib/utils";
import { useAuthStore } from "../store/auth-store";
import type { AuthUser, FileItem, FolderItem, PagedResponse, TrashPolicy } from "../types/file";

const PAGE_SIZE = 50;
const DEFAULT_TRASH_RETENTION_DAYS = 30;

export function TrashPage() {
  const client = useQueryClient();
  const updateUser = useAuthStore((state) => state.updateUser);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());

  const trashPolicy = useQuery({
    queryKey: ["settings", "trash-policy"],
    queryFn: async () => (await api.get<TrashPolicy>("/api/v1/settings/trash-policy")).data,
  });
  const files = useInfiniteQuery({
    queryKey: ["trash", "files"],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<PagedResponse<FileItem>>(
          `/api/v1/trash/files?page=${pageParam}&size=${PAGE_SIZE}`,
        )
      ).data,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.number + 1),
  });
  const folders = useInfiniteQuery({
    queryKey: ["trash", "folders"],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<PagedResponse<FolderItem>>(
          `/api/v1/trash/folders?page=${pageParam}&size=${PAGE_SIZE}`,
        )
      ).data,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.number + 1),
  });
  const restore = useMutation({
    mutationFn: ({ type, id }: { type: "file" | "folder"; id: string }) =>
      api.post(`/api/v1/${type === "file" ? "files" : "folders"}/${id}/restore`),
    onSuccess: async () => {
      toast.success("Item restored");
      await refreshTrashAndFiles();
    },
  });
  const purge = useMutation({
    mutationFn: ({ type, id }: { type: "file" | "folder"; id: string }) =>
      api.delete(`/api/v1/${type === "file" ? "files" : "folders"}/${id}/forever`),
    onSuccess: async () => {
      toast.success("Item deleted forever");
      await client.invalidateQueries({ queryKey: ["trash"] });
      await refreshCurrentUser();
    },
  });
  const bulkRestore = useMutation({
    mutationFn: async () => {
      await Promise.all([
        ...Array.from(selectedFiles).map((id) => api.post(`/api/v1/files/${id}/restore`)),
        ...Array.from(selectedFolders).map((id) => api.post(`/api/v1/folders/${id}/restore`)),
      ]);
    },
    onSuccess: async () => {
      toast.success("Selected items restored");
      clearSelection();
      await refreshTrashAndFiles();
    },
  });
  const bulkPurge = useMutation({
    mutationFn: async () => {
      await Promise.all([
        ...Array.from(selectedFiles).map((id) => api.delete(`/api/v1/files/${id}/forever`)),
        ...Array.from(selectedFolders).map((id) => api.delete(`/api/v1/folders/${id}/forever`)),
      ]);
    },
    onSuccess: async () => {
      toast.success("Selected items deleted forever");
      clearSelection();
      await client.invalidateQueries({ queryKey: ["trash"] });
      await refreshCurrentUser();
    },
  });

  const fileItems = files.data?.pages.flatMap((page) => page.content) ?? [];
  const folderItems = folders.data?.pages.flatMap((page) => page.content) ?? [];
  const total = fileItems.length + folderItems.length;
  const retentionDays = trashPolicy.data?.retentionDays ?? DEFAULT_TRASH_RETENTION_DAYS;
  const selectedCount = selectedFiles.size + selectedFolders.size;
  const selectedLoadedCount =
    fileItems.filter((file) => selectedFiles.has(file.id)).length +
    folderItems.filter((folder) => selectedFolders.has(folder.id)).length;
  const loading = files.isPending || folders.isPending;
  const mutating =
    restore.isPending || purge.isPending || bulkRestore.isPending || bulkPurge.isPending;

  async function refreshTrashAndFiles() {
    await client.invalidateQueries({ queryKey: ["trash"] });
    await client.invalidateQueries({ queryKey: ["files"] });
    await client.invalidateQueries({ queryKey: ["folders"] });
  }

  async function refreshCurrentUser() {
    try {
      const currentUser = (await api.get<AuthUser>("/api/v1/auth/me")).data;
      updateUser(currentUser);
    } catch {
      // Quota display can refresh on the next session update.
    }
  }

  function deleteForever(type: "file" | "folder", id: string, name: string) {
    if (window.confirm(`Delete ${name} forever? This cannot be undone.`)) {
      purge.mutate({ type, id });
    }
  }

  function clearSelection() {
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  }

  function toggleSelection(type: "file" | "folder", id: string) {
    if (type === "file") {
      setSelectedFiles((current) => toggleSetValue(current, id));
      return;
    }
    setSelectedFolders((current) => toggleSetValue(current, id));
  }

  function selectLoadedItems(checked: boolean) {
    if (!checked) {
      clearSelection();
      return;
    }
    setSelectedFiles(new Set(fileItems.map((file) => file.id)));
    setSelectedFolders(new Set(folderItems.map((folder) => folder.id)));
  }

  function deleteSelectedForever() {
    if (selectedCount === 0) return;
    if (window.confirm(`Delete ${selectedCount} selected items forever? This cannot be undone.`)) {
      bulkPurge.mutate();
    }
  }

  return (
    <section className="mx-auto max-w-6xl p-5 md:p-10">
      <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
        Workspace
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">Trash</h1>
      <p className="mt-2 text-sm text-muted">
        Restore items or permanently remove them.
      </p>
      <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Items in Trash are automatically deleted forever after {retentionDays} days.
        Restore anything you still need before that time.
      </div>

      {total > 0 && (
        <label className="mt-6 flex items-center gap-2 font-mono text-[11px] text-muted">
          <input
            type="checkbox"
            className="size-4 accent-moss"
            checked={selectedLoadedCount === total}
            onChange={(event) => selectLoadedItems(event.target.checked)}
          />
          <span>{total} items</span>
        </label>
      )}

      <TrashBulkActions
        selectedCount={selectedCount}
        loading={mutating}
        onRestore={() => bulkRestore.mutate()}
        onDeleteForever={deleteSelectedForever}
        onClear={clearSelection}
      />

      <div className="mt-8 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : total === 0 ? (
          <div className="p-12 text-center text-sm text-muted">Trash is empty.</div>
        ) : (
          <>
            {folderItems.map((folder) => (
              <TrashRow
                key={folder.id}
                icon={<Folder size={18} fill="currentColor" />}
                name={folder.name}
                detail="Folder"
                deletedAt={folder.deletedAt}
                retentionDays={retentionDays}
                checked={selectedFolders.has(folder.id)}
                onSelect={() => toggleSelection("folder", folder.id)}
                onRestore={() => restore.mutate({ type: "folder", id: folder.id })}
                onDeleteForever={() => deleteForever("folder", folder.id, folder.name)}
                loading={mutating}
              />
            ))}
            {fileItems.map((file) => (
              <TrashRow
                key={file.id}
                icon={fileIcon(file)}
                name={file.name}
                detail={`${file.mimeType} - ${formatSize(file.size)}`}
                deletedAt={file.deletedAt}
                retentionDays={retentionDays}
                checked={selectedFiles.has(file.id)}
                onSelect={() => toggleSelection("file", file.id)}
                onRestore={() => restore.mutate({ type: "file", id: file.id })}
                onDeleteForever={() => deleteForever("file", file.id, file.name)}
                loading={mutating}
              />
            ))}
          </>
        )}
      </div>
    </section>
  );
}

function TrashRow({
  icon,
  name,
  detail,
  deletedAt,
  retentionDays,
  loading,
  checked,
  onSelect,
  onRestore,
  onDeleteForever,
}: {
  icon: ReactNode;
  name: string;
  detail: string;
  deletedAt?: string | null;
  retentionDays: number;
  loading: boolean;
  checked: boolean;
  onSelect: () => void;
  onRestore: () => void;
  onDeleteForever: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-soft text-moss">
        {icon}
      </span>
      <input
        type="checkbox"
        className="size-4 shrink-0 accent-moss"
        checked={checked}
        onChange={onSelect}
        title="Select item"
      />
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm">{name}</strong>
        <small className="block text-xs text-muted">{detail}</small>
        <small className="block text-xs font-medium text-amber-700">
          {formatTrashExpiry(deletedAt, retentionDays)}
        </small>
      </span>
      <Button variant="outline" onClick={onRestore} disabled={loading}>
        <RotateCcw size={16} /> Restore
      </Button>
      <Button variant="danger" onClick={onDeleteForever} disabled={loading}>
        <Trash2 size={16} /> Delete forever
      </Button>
    </div>
  );
}

function formatTrashExpiry(deletedAt: string | null | undefined, retentionDays: number) {
  if (!deletedAt) {
    return `Auto-deletes after ${retentionDays} days in Trash`;
  }
  const deletedTime = new Date(deletedAt).getTime();
  if (Number.isNaN(deletedTime)) {
    return `Auto-deletes after ${retentionDays} days in Trash`;
  }
  const expiryTime = deletedTime + retentionDays * 24 * 60 * 60 * 1000;
  const remainingMs = expiryTime - Date.now();
  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  if (remainingDays <= 0) {
    return "Auto-delete is due soon";
  }
  if (remainingDays === 1) {
    return "Auto-deletes tomorrow";
  }
  return `Auto-deletes in ${remainingDays} days`;
}

function fileIcon(file: FileItem) {
  if (file.mimeType.startsWith("image/")) return <FileImage size={18} />;
  if (file.mimeType.includes("pdf")) return <FileText size={18} />;
  return <File size={18} />;
}

function toggleSetValue(values: Set<string>, value: string) {
  const next = new Set(values);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}
