import { Loader2, X } from "lucide-react";
import type { FileItem, FileShare, FolderItem } from "../../types/file";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export type RenameTarget =
  | { type: "file"; id: string; name: string }
  | { type: "folder"; id: string; name: string };

export type MoveTarget = {
  type: "file" | "folder";
  id: string;
  name: string;
  parentId?: string | null;
  blockedFolderIds?: string[];
  skipUnchangedCheck?: boolean;
};

export type DeleteTarget = {
  type: "file" | "folder";
  id: string;
  name: string;
};

export function FolderDialog({
  value,
  loading,
  onChange,
  onClose,
  onSubmit,
}: {
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
              New item
            </p>
            <h2 className="mt-2 text-xl font-extrabold">Create a folder</h2>
          </div>
          <Button
            variant="ghost"
            className="size-8 px-0"
            onClick={onClose}
            disabled={loading}
            title="Close"
          >
            <X size={17} />
          </Button>
        </div>
        <label className="grid gap-2 text-xs font-semibold">
          Folder name
          <Input
            autoFocus
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onSubmit()}
            placeholder="e.g. Course assets"
          />
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!value.trim() || loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Creating..." : "Create folder"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RenameDialog({
  target,
  loading,
  onChange,
  onClose,
  onSubmit,
}: {
  target: RenameTarget;
  loading: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const label = target.type === "file" ? "File name" : "Folder name";
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
              Rename item
            </p>
            <h2 className="mt-2 text-xl font-extrabold">
              Rename {target.type}
            </h2>
          </div>
          <Button
            variant="ghost"
            className="size-8 px-0"
            onClick={onClose}
            disabled={loading}
            title="Close"
          >
            <X size={17} />
          </Button>
        </div>
        <label className="grid gap-2 text-xs font-semibold">
          {label}
          <Input
            autoFocus
            value={target.name}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onSubmit()}
            placeholder={label}
          />
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!target.name.trim() || loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Renaming..." : "Rename"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MoveDialog({
  target,
  folders,
  loading,
  loadingFolders,
  destinationId,
  onDestinationChange,
  onClose,
  onSubmit,
}: {
  target: MoveTarget;
  folders: FolderItem[];
  loading: boolean;
  loadingFolders: boolean;
  destinationId: string;
  onDestinationChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const blockedIds =
    target.type === "folder"
      ? getBlockedFolderIds(folders, target.blockedFolderIds ?? [target.id])
      : new Set<string>();
  const availableFolders = folders.filter((folder) => !blockedIds.has(folder.id));
  const unchanged = !target.skipUnchangedCheck && (target.parentId ?? "") === destinationId;
  const isBulk = target.id === "bulk-selection";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
              Move item
            </p>
            <h2 className="mt-2 text-xl font-extrabold">
              {isBulk ? "Move selected items" : `Move ${target.type}`}
            </h2>
          </div>
          <Button
            variant="ghost"
            className="size-8 px-0"
            onClick={onClose}
            disabled={loading}
            title="Close"
          >
            <X size={17} />
          </Button>
        </div>
        <div className="mb-4 rounded-lg border border-line bg-canvas px-3 py-2">
          <p className="truncate text-sm font-semibold">{target.name}</p>
          <p className="text-xs text-muted">
            Choose where this {target.type} should live.
          </p>
        </div>
        <label className="grid gap-2 text-xs font-semibold">
          Destination folder
          <select
            className="h-11 rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-moss focus:ring-2 focus:ring-soft"
            value={destinationId}
            onChange={(event) => onDestinationChange(event.target.value)}
            disabled={loading || loadingFolders}
          >
            <option value="">My Files</option>
            {availableFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={loading || loadingFolders || unchanged}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Moving..." : "Move"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DeleteDialog({
  target,
  loading,
  onClose,
  onConfirm,
}: {
  target: DeleteTarget;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isFolder = target.type === "folder";
  const isBulk = target.id === "bulk-selection";
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-red-500">
              Confirm delete
            </p>
            <h2 className="mt-2 text-xl font-extrabold">
              {isBulk ? "Delete selected items?" : `Delete ${target.type}?`}
            </h2>
          </div>
          <Button
            variant="ghost"
            className="size-8 px-0"
            onClick={onClose}
            disabled={loading}
            title="Close"
          >
            <X size={17} />
          </Button>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-3">
          <p className="truncate text-sm font-semibold text-red-800">
            {target.name}
          </p>
          <p className="mt-1 text-xs leading-5 text-red-700">
            {isBulk
              ? isFolder
                ? "These items will be permanently removed. Selected folders include everything inside them."
                : "These selected files will be permanently removed."
              : isFolder
              ? "This folder and everything inside it will be permanently removed."
              : "This file will be permanently removed."}
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ShareDialog({
  file,
  shares,
  publicLink,
  email,
  error,
  loading,
  shareLoading,
  onEmailChange,
  onVisibilityChange,
  onAddShare,
  onRevoke,
  onCopyLink,
  onClose,
}: {
  file: FileItem;
  shares: FileShare[];
  publicLink: string;
  email: string;
  error?: string;
  loading: boolean;
  shareLoading: boolean;
  onEmailChange: (value: string) => void;
  onVisibilityChange: (visibility: "PUBLIC" | "PRIVATE") => void;
  onAddShare: () => void;
  onRevoke: (userId: string) => void;
  onCopyLink: () => void;
  onClose: () => void;
}) {
  const isPublic = file.visibility === "PUBLIC";
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
              Share file
            </p>
            <h2 className="mt-2 truncate text-xl font-extrabold">{file.name}</h2>
          </div>
          <Button
            variant="ghost"
            className="size-8 px-0"
            onClick={onClose}
            disabled={loading || shareLoading}
            title="Close"
          >
            <X size={17} />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-canvas p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">Public link</p>
                <p className="text-xs text-muted">
                  {isPublic ? "Anyone with this link can open the file." : "Only invited users can open the file."}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold">
                <input
                  type="checkbox"
                  className="size-4 accent-moss"
                  checked={isPublic}
                  disabled={loading}
                  onChange={(event) =>
                    onVisibilityChange(event.target.checked ? "PUBLIC" : "PRIVATE")
                  }
                />
                Public
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={publicLink} readOnly />
              <Button variant="outline" onClick={onCopyLink} disabled={!isPublic}>
                Copy
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-line p-3">
            <p className="text-sm font-bold">Share with a user</p>
            <div className="mt-3 flex gap-2">
              <Input
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="user@example.com"
              />
              <Button onClick={onAddShare} disabled={!email.trim() || shareLoading}>
                {shareLoading && <Loader2 className="size-4 animate-spin" />}
                {shareLoading ? "Sharing..." : "Add"}
              </Button>
            </div>
            {error && (
              <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {error}
              </p>
            )}
            <div className="mt-4 divide-y divide-line">
              {shares.length === 0 ? (
                <p className="py-3 text-xs text-muted">No users added yet.</p>
              ) : (
                shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{share.fullName}</p>
                      <p className="truncate text-xs text-muted">{share.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => onRevoke(share.userId)}
                      disabled={shareLoading}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getBlockedFolderIds(folders: FolderItem[], folderIds: string[]) {
  const blocked = new Set<string>(folderIds);
  const visit = (parentId: string) => {
    folders
      .filter((folder) => folder.parentId === parentId)
      .forEach((folder) => {
        blocked.add(folder.id);
        visit(folder.id);
      });
  };
  folderIds.forEach(visit);
  return blocked;
}
