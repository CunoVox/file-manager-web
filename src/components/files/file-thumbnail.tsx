import { File, FileImage, FileText, Video } from "lucide-react";
import { authenticatedFileUrl } from "../../lib/api";
import type { FileItem } from "../../types/file";

export function FileThumbnail({ file, large = false }: { file: FileItem; large?: boolean }) {
  const className = large
    ? "mb-4 flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-soft text-moss"
    : "grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-soft text-moss";

  if (file.mimeType.startsWith("image/")) {
    return (
      <span className={className}>
        <img
          src={authenticatedFileUrl(`/api/v1/view/${file.id}`)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span className={className}>
      {fileIcon(file, large ? 28 : 18)}
    </span>
  );
}

function fileIcon(file: FileItem, size: number) {
  if (file.mimeType.startsWith("image/")) return <FileImage size={size} />;
  if (file.mimeType.startsWith("video/")) return <Video size={size} />;
  if (file.mimeType.includes("pdf")) return <FileText size={size} />;
  return <File size={size} />;
}
