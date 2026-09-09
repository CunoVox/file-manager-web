import { useMemo, useState } from "react";
import { Download, File, FileImage, FileText, Loader2, X } from "lucide-react";
import { Button } from "../ui/button";
import { authenticatedFileUrl, downloadFileDirect } from "../../lib/api";
import { formatSize } from "../../lib/utils";
import type { FileItem } from "../../types/file";

export function FilePreviewDialog({
  file,
  onClose,
}: {
  file: FileItem;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [error, setError] = useState("");
  const previewKind = useMemo(() => getPreviewKind(file), [file]);
  const previewUrl = useMemo(
    () => authenticatedFileUrl(`/api/v1/view/${file.id}`),
    [file.id],
  );

  function downloadFile() {
    setDownloadLoading(true);
    downloadFileDirect(`/api/v1/download/${file.id}`, file.name);
    window.setTimeout(() => {
      setDownloadLoading(false);
    }, 800);
  }

  function handlePreviewError() {
    setLoading(false);
    setError("Could not load this preview. You can still download the file.");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-white/10 bg-white shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-soft text-moss">
            {previewIcon(file)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-extrabold">{file.name}</h2>
            <p className="truncate text-xs text-muted">
              {file.mimeType} - {formatSize(file.size)}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => downloadFile()}
            disabled={downloadLoading}
          >
            {downloadLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {downloadLoading ? "Downloading..." : "Download"}
          </Button>
          <Button variant="ghost" className="size-9 px-0" onClick={onClose} title="Close">
            <X size={17} />
          </Button>
        </header>

        <main className="relative min-h-[420px] flex-1 bg-ink">
          {loading && previewKind !== "unsupported" && !error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center text-white/70">
              <Loader2 className="size-6 animate-spin" />
            </div>
          )}
          {error ? (
            <PreviewMessage title="Preview failed" message={error} />
          ) : previewKind === "image" ? (
            <div className="flex h-[70vh] items-center justify-center p-4">
              <img
                src={previewUrl}
                alt={file.name}
                className="max-h-full max-w-full object-contain"
                onLoad={() => setLoading(false)}
                onError={handlePreviewError}
              />
            </div>
          ) : previewKind === "video" ? (
            <div className="flex h-[70vh] items-center justify-center bg-black">
              <video
                src={previewUrl}
                controls
                preload="metadata"
                className="max-h-full max-w-full"
                onLoadedMetadata={() => setLoading(false)}
                onError={handlePreviewError}
              />
            </div>
          ) : previewKind === "pdf" ? (
            <iframe
              src={previewUrl}
              title={file.name}
              className="h-[75vh] w-full bg-white"
              onLoad={() => setLoading(false)}
            />
          ) : (
            <PreviewMessage
              title="Preview is not available"
              message="This file type cannot be previewed here. You can still download it."
            />
          )}
        </main>
      </div>
    </div>
  );
}

function PreviewMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex h-[70vh] items-center justify-center p-6 text-center text-white">
      <div>
        <File className="mx-auto size-12 text-white/50" />
        <h3 className="mt-4 text-lg font-extrabold">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/65">{message}</p>
      </div>
    </div>
  );
}

function getPreviewKind(file: FileItem) {
  if (file.mimeType.startsWith("image/")) return "image";
  if (file.mimeType.startsWith("video/")) return "video";
  if (file.mimeType === "application/pdf" || file.mimeType.includes("pdf")) return "pdf";
  return "unsupported";
}

function previewIcon(file: FileItem) {
  if (file.mimeType.startsWith("image/")) return <FileImage size={18} />;
  if (file.mimeType.includes("pdf")) return <FileText size={18} />;
  return <File size={18} />;
}
