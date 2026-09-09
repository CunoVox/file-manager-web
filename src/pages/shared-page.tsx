import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { FilePreviewDialog } from "../components/files/file-preview-dialog";
import { FileThumbnail } from "../components/files/file-thumbnail";
import { Button } from "../components/ui/button";
import { api, downloadFileDirect } from "../lib/api";
import { formatSize } from "../lib/utils";
import type { FileItem } from "../types/file";

export function SharedPage() {
  const [previewTarget, setPreviewTarget] = useState<FileItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const files = useQuery({
    queryKey: ["shared", "files"],
    queryFn: async () => (await api.get<FileItem[]>("/api/v1/shared/files")).data,
  });

  function openFile(file: FileItem) {
    setPreviewTarget(file);
  }

  function downloadFile(file: FileItem) {
    setDownloadingId(file.id);
    downloadFileDirect(`/api/v1/download/${file.id}`, file.name);
    window.setTimeout(() => {
      setDownloadingId(null);
    }, 800);
  }

  return (
    <>
      <section className="mx-auto max-w-6xl p-5 md:p-10">
        <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">Workspace</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">Shared With Me</h1>
        <p className="mt-2 text-sm text-muted">Files other users shared with your account.</p>

      <div className="mt-8 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
        {files.isPending ? (
          <div className="flex h-32 items-center justify-center text-muted">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : !files.data?.length ? (
          <div className="p-12 text-center text-sm text-muted">No shared files yet.</div>
        ) : (
          files.data.map((file) => (
            <div key={file.id} className="flex items-center gap-3 px-4 py-4">
              <FileThumbnail file={file} />
              <span className="min-w-0 flex-1">
                <button
                  className="block max-w-full truncate text-left text-sm font-bold hover:text-moss hover:underline"
                  onClick={() => openFile(file)}
                  title={file.name}
                >
                  {file.name}
                </button>
                <small className="block text-xs text-muted">
                  {file.mimeType} - {formatSize(file.size)}
                </small>
                <small className="block truncate text-xs font-medium text-moss">
                  Shared by {formatOwner(file)}
                </small>
              </span>
              <Button variant="outline" onClick={() => openFile(file)}>
                <ExternalLink size={16} /> Open
              </Button>
              <Button
                variant="outline"
                onClick={() => downloadFile(file)}
                disabled={downloadingId === file.id}
              >
                {downloadingId === file.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                {downloadingId === file.id ? "Downloading..." : "Download"}
              </Button>
            </div>
          ))
        )}
        </div>
      </section>
      {previewTarget && (
        <FilePreviewDialog
          file={previewTarget}
          onClose={() => setPreviewTarget(null)}
        />
      )}
    </>
  );
}

function formatOwner(file: FileItem) {
  if (file.ownerName && file.ownerEmail) {
    return `${file.ownerName} <${file.ownerEmail}>`;
  }
  return file.ownerName ?? file.ownerEmail ?? "another user";
}
