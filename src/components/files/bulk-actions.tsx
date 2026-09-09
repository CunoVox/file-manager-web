import { Download, MoveRight, Trash2, X } from "lucide-react";
import { Button } from "../ui/button";

export function BulkActions({
  selectedCount,
  selectedFileCount,
  loading,
  onMove,
  onDelete,
  onDownload,
  onClear,
}: {
  selectedCount: number;
  selectedFileCount: number;
  loading: boolean;
  onMove: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onClear: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-line bg-white px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-extrabold">{selectedCount} selected</p>
        <p className="text-xs text-muted">
          {selectedFileCount} files available for download
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onMove} disabled={loading}>
          <MoveRight size={16} /> Move
        </Button>
        <Button
          variant="outline"
          onClick={onDownload}
          disabled={loading || selectedFileCount === 0}
        >
          <Download size={16} /> Download
        </Button>
        <Button variant="danger" onClick={onDelete} disabled={loading}>
          <Trash2 size={16} /> Delete
        </Button>
        <Button
          variant="ghost"
          className="size-10 px-0"
          onClick={onClear}
          disabled={loading}
          title="Clear selection"
        >
          <X size={16} />
        </Button>
      </div>
    </div>
  );
}
