import { Folder, FolderPlus, Loader2, Upload, X } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

export function LoadingState() {
  return (
    <div className="space-y-2 rounded-xl border border-line bg-white p-4">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="flex animate-pulse items-center gap-3 py-3">
          <div className="size-9 rounded-lg bg-line" />
          <div className="h-3 w-1/3 rounded bg-line" />
          <div className="ml-auto h-3 w-16 rounded bg-line" />
        </div>
      ))}
    </div>
  );
}

export function UploadProgressPanel({
  fileNames,
  status,
  onCancel,
}: {
  fileNames: string[];
  status: "uploading" | "creating" | "done";
  onCancel: () => void;
}) {
  const isDone = status === "done";
  const count = Math.max(fileNames.length, 1);
  const itemLabel = count === 1 ? "item" : "items";
  const primaryName = fileNames[0] ?? "";
  const label =
    status === "uploading"
      ? `Uploading ${count} ${itemLabel}`
      : status === "creating"
        ? "Creating folder"
        : "Done";
  const detail =
    status === "uploading"
      ? "Uploading to your workspace..."
      : status === "creating"
        ? "Saving folder to your workspace..."
        : "List updated";
  return (
    <div className="fixed bottom-5 right-5 z-40 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-white shadow-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <p className="text-sm font-bold">{label}</p>
          <p className="text-[11px] text-muted">{detail}</p>
        </div>
        {!isDone && (
          <Button
            variant="ghost"
            className="size-8 px-0"
            onClick={onCancel}
            title="Cancel"
          >
            <X size={16} />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3 p-4">
        <div
          className={`grid size-9 shrink-0 place-items-center rounded-lg ${isDone ? "bg-emerald-50 text-emerald-600" : "bg-soft text-moss"}`}
        >
          {isDone ? (
            <span className="text-sm font-bold">OK</span>
          ) : (
            <Loader2 className="size-5 animate-spin" />
          )}
        </div>
        <p className="min-w-0 flex-1 truncate text-xs font-medium">
          {count > 1 ? `${primaryName} + ${count - 1} more` : primaryName}
        </p>
      </div>
    </div>
  );
}

export function EmptyState({
  onUpload,
  onCreateFolder,
  searchActive,
}: {
  onUpload: () => void;
  onCreateFolder: () => void;
  searchActive: boolean;
}) {
  return (
    <Card className="border-dashed p-8 shadow-none sm:p-14">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-soft text-moss">
          <Folder size={27} />
        </div>
        <h2 className="mt-5 text-lg font-extrabold">
          {searchActive ? "No matching files" : "Your workspace is ready"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {searchActive
            ? "Try another search term or clear the search to see everything here."
            : "Start with a folder for structure, or upload your first file directly."}
        </p>
        {!searchActive && (
          <div className="mt-7 grid gap-3 text-left sm:grid-cols-2">
            <button
              className="rounded-xl border border-line bg-canvas p-4 transition hover:border-moss hover:bg-soft"
              onClick={onCreateFolder}
            >
              <FolderPlus className="size-5 text-moss" />
              <strong className="mt-3 block text-sm">Create a folder</strong>
              <span className="mt-1 block text-xs leading-5 text-muted">
                Keep related files together.
              </span>
            </button>
            <button
              className="rounded-xl border border-line bg-canvas p-4 transition hover:border-moss hover:bg-soft"
              onClick={onUpload}
            >
              <Upload className="size-5 text-moss" />
              <strong className="mt-3 block text-sm">Upload a file</strong>
              <span className="mt-1 block text-xs leading-5 text-muted">
                Add documents, images or media.
              </span>
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
