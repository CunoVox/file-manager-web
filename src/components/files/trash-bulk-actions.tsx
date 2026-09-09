import { RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "../ui/button";

export function TrashBulkActions({
  selectedCount,
  loading,
  onRestore,
  onDeleteForever,
  onClear,
}: {
  selectedCount: number;
  loading: boolean;
  onRestore: () => void;
  onDeleteForever: () => void;
  onClear: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-xl border border-line bg-white px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-extrabold">{selectedCount} selected</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onRestore} disabled={loading}>
          <RotateCcw size={16} /> Restore
        </Button>
        <Button variant="danger" onClick={onDeleteForever} disabled={loading}>
          <Trash2 size={16} /> Delete forever
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
