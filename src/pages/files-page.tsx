import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import {
  Download,
  Edit3,
  ExternalLink,
  Folder,
  FolderPlus,
  Grid2X2,
  List,
  Loader2,
  MoreVertical,
  MoveRight,
  Search,
  Share2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api, downloadFileDirect } from "../lib/api";
import { formatSize } from "../lib/utils";
import { ActionMenu, MenuButton, MenuLink } from "../components/files/action-menu";
import { BulkActions } from "../components/files/bulk-actions";
import { FilePreviewDialog } from "../components/files/file-preview-dialog";
import { FileThumbnail } from "../components/files/file-thumbnail";
import {
  DeleteDialog,
  FolderDialog,
  MoveDialog,
  RenameDialog,
  ShareDialog,
  type DeleteTarget,
  type MoveTarget,
  type RenameTarget,
} from "../components/files/file-dialogs";
import {
  EmptyState,
  LoadingState,
  UploadProgressPanel,
} from "../components/files/file-states";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useAuthStore } from "../store/auth-store";
import type { AuthUser, FileItem, FileShare, FolderItem, PagedResponse } from "../types/file";

const PAGE_SIZE = 50;

export function FilesPage() {
  const updateUser = useAuthStore((state) => state.updateUser);
  const [parentId, setParentId] = useState<string>();
  const [folderLabel, setFolderLabel] = useState("My Files");
  const [keyword, setKeyword] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [shareTarget, setShareTarget] = useState<FileItem | null>(null);
  const [previewTarget, setPreviewTarget] = useState<FileItem | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [mutationError, setMutationError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadNames, setUploadNames] = useState<string[]>([]);
  const [operationStatus, setOperationStatus] = useState<
    "uploading" | "creating" | "done" | null
  >(null);
  const input = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const dragDepth = useRef(0);
  const uploadController = useRef<AbortController | null>(null);
  const client = useQueryClient();

  const files = useInfiniteQuery({
    queryKey: ["files", parentId, keyword],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<PagedResponse<FileItem>>(
          `/api/v1/files?${buildListParams({
            parentId,
            keyword,
            page: pageParam,
            size: PAGE_SIZE,
          })}`,
        )
      ).data,
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.number + 1,
  });
  const folders = useInfiniteQuery({
    queryKey: ["folders", parentId],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<PagedResponse<FolderItem>>(
          `/api/v1/folders?${buildListParams({
            parentId,
            page: pageParam,
            size: PAGE_SIZE,
          })}`,
        )
      ).data,
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.number + 1,
  });
  const allFolders = useQuery({
    queryKey: ["folders", "all"],
    queryFn: async () => (await api.get<FolderItem[]>("/api/v1/folders/all")).data,
    enabled: Boolean(moveTarget),
  });
  const shares = useQuery({
    queryKey: ["file-shares", shareTarget?.id],
    queryFn: async () =>
      (await api.get<FileShare[]>(`/api/v1/files/${shareTarget?.id}/shares`)).data,
    enabled: Boolean(shareTarget),
  });
  const upload = useMutation({
    mutationFn: async ({
      files,
      signal,
    }: {
      files: File[];
      signal: AbortSignal;
    }) => {
      const responses = [];
      for (const file of files) {
          const body = new FormData();
          body.append("file", file);
          if (parentId) body.append("parentId", parentId);
          responses.push(await api.post("/api/v1/files", body, { signal }));
      }
      return responses;
    },
    onSuccess: async (_, variables) => {
      setOperationStatus("done");
      const count = variables.files.length;
      toast.success(count === 1 ? "File uploaded" : "Files uploaded", {
        description:
          count === 1
            ? `${variables.files[0].name} is now in ${folderLabel}.`
            : `${count} files are now in ${folderLabel}.`,
      });
      await client.invalidateQueries({ queryKey: ["files"] });
      try {
        const currentUser = (await api.get<AuthUser>("/api/v1/auth/me")).data;
        updateUser(currentUser);
      } catch {
        // The uploaded files are already saved; quota display can refresh on the next session update.
      }
      await new Promise((resolve) => setTimeout(resolve, 800));
    },
    onError: (error) => {
      if (axios.isCancel(error)) return;
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
          ? error.response.data.message
          : "We couldn't upload this file. Please try again in a moment.";
      setMutationError(message);
      toast.error("Upload failed", {
        description: message,
      });
    },
    onSettled: () => {
      uploadController.current = null;
      setUploadNames([]);
      setOperationStatus(null);
    },
  });
  const createFolder = useMutation({
    mutationFn: () =>
      api.post("/api/v1/folders", { name: folderName.trim(), parentId }),
    onMutate: () => {
      setOperationStatus("creating");
      setUploadNames([folderName.trim()]);
    },
    onSuccess: async () => {
      setOperationStatus("done");
      setFolderName("");
      setFolderDialogOpen(false);
      toast.success("Folder created", {
        description: "Your new folder is ready.",
      });
      await client.invalidateQueries({ queryKey: ["folders"] });
      await new Promise((resolve) => setTimeout(resolve, 800));
    },
    onError: () => {
      setMutationError("Could not create the folder. Please try again.");
      toast.error("Folder creation failed");
    },
    onSettled: () => {
      setUploadNames([]);
      setOperationStatus(null);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/files/${id}`),
    onSuccess: () => {
      toast.success("File deleted");
      setDeleteTarget(null);
      void client.invalidateQueries({ queryKey: ["files"] });
      void client.invalidateQueries({ queryKey: ["trash"] });
    },
    onError: () => {
      setMutationError("Could not delete this file. Please try again.");
      toast.error("File deletion failed");
    },
  });
  const removeFolder = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/folders/${id}`),
    onSuccess: () => {
      toast.success("Folder deleted", {
        description: "The folder and its contents were removed.",
      });
      setDeleteTarget(null);
      void client.invalidateQueries({ queryKey: ["folders"] });
      void client.invalidateQueries({ queryKey: ["trash"] });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ??
        "Could not delete this folder and its contents.";
      setMutationError(message);
      toast.error("Folder deletion failed", { description: message });
    },
  });
  const rename = useMutation({
    mutationFn: (target: RenameTarget) => {
      const path =
        target.type === "file"
          ? `/api/v1/files/${target.id}`
          : `/api/v1/folders/${target.id}`;
      return api.patch(path, { name: target.name.trim() });
    },
    onSuccess: async (_, target) => {
      toast.success(target.type === "file" ? "File renamed" : "Folder renamed");
      setRenameTarget(null);
      await client.invalidateQueries({ queryKey: ["files"] });
      await client.invalidateQueries({ queryKey: ["folders"] });
    },
    onError: () => {
      setMutationError("Could not rename this item. Please try again.");
      toast.error("Rename failed");
    },
  });
  const move = useMutation({
    mutationFn: ({
      target,
      parentId,
    }: {
      target: MoveTarget;
      parentId: string;
    }) => {
      const path =
        target.type === "file"
          ? `/api/v1/files/${target.id}/move`
          : `/api/v1/folders/${target.id}/move`;
      return api.patch(path, { parentId: parentId || null });
    },
    onSuccess: async (_, variables) => {
      toast.success(variables.target.type === "file" ? "File moved" : "Folder moved");
      setMoveTarget(null);
      setDestinationId("");
      await client.invalidateQueries({ queryKey: ["files"] });
      await client.invalidateQueries({ queryKey: ["folders"] });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ?? "Could not move this item. Please try again.";
      setMutationError(message);
      toast.error("Move failed", { description: message });
    },
  });
  const bulkMove = useMutation({
    mutationFn: async (parentId: string) => {
      const destination = parentId || null;
      await Promise.all([
        ...Array.from(selectedFiles).map((id) =>
          api.patch(`/api/v1/files/${id}/move`, { parentId: destination }),
        ),
        ...Array.from(selectedFolders).map((id) =>
          api.patch(`/api/v1/folders/${id}/move`, { parentId: destination }),
        ),
      ]);
    },
    onSuccess: async () => {
      toast.success("Selected items moved");
      clearSelection();
      setMoveTarget(null);
      setDestinationId("");
      await client.invalidateQueries({ queryKey: ["files"] });
      await client.invalidateQueries({ queryKey: ["folders"] });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ?? "Could not move the selected items.";
      setMutationError(message);
      toast.error("Move failed", { description: message });
    },
  });
  const bulkDelete = useMutation({
    mutationFn: async () => {
      await Promise.all([
        ...Array.from(selectedFiles).map((id) => api.delete(`/api/v1/files/${id}`)),
        ...Array.from(selectedFolders).map((id) => api.delete(`/api/v1/folders/${id}`)),
      ]);
    },
    onSuccess: async () => {
      toast.success("Selected items deleted");
      clearSelection();
      setDeleteTarget(null);
      await client.invalidateQueries({ queryKey: ["files"] });
      await client.invalidateQueries({ queryKey: ["folders"] });
      await client.invalidateQueries({ queryKey: ["trash"] });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ?? "Could not delete the selected items.";
      setMutationError(message);
      toast.error("Delete failed", { description: message });
    },
  });
  const bulkDownload = useMutation({
    mutationFn: async () => {
      const response = await api.post(
        "/api/v1/files/download-zip",
        { fileIds: Array.from(selectedFiles) },
        { responseType: "blob" },
      );
      return response.data as Blob;
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "haobox-files.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    },
    onError: () => {
      setMutationError("Could not download the selected files.");
      toast.error("Download failed");
    },
  });
  const visibility = useMutation({
    mutationFn: ({
      id,
      visibility,
    }: {
      id: string;
      visibility: "PUBLIC" | "PRIVATE";
    }) => api.patch<FileItem>(`/api/v1/files/${id}/visibility`, { visibility }),
    onSuccess: async (response) => {
      setShareTarget(response.data);
      await client.invalidateQueries({ queryKey: ["files"] });
      toast.success("Sharing updated");
    },
    onError: () => {
      setMutationError("Could not update sharing for this file.");
      toast.error("Sharing update failed");
    },
  });
  const addShare = useMutation({
    onMutate: () => {
      setShareError("");
      toast.loading("Sharing file and sending email...", {
        id: "share-file-email",
      });
    },
    mutationFn: () =>
      api.post(`/api/v1/files/${shareTarget?.id}/shares`, {
        email: shareEmail.trim(),
        permission: "VIEW",
      }),
    onSuccess: async () => {
      setShareEmail("");
      setShareError("");
      await shares.refetch();
      toast.success("File shared", {
        id: "share-file-email",
        description: "They can now access this file. An email notification is being sent.",
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message ?? "Could not share this file.";
      setShareError(message);
      toast.error("Could not share file", {
        id: "share-file-email",
        description: message,
      });
    },
  });
  const revokeShare = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/api/v1/files/${shareTarget?.id}/shares/${userId}`),
    onSuccess: async () => {
      await shares.refetch();
      toast.success("Access removed");
    },
    onError: () => {
      setMutationError("Could not remove this user's access.");
      toast.error("Remove access failed");
    },
  });
  const folderItems = folders.data?.pages.flatMap((page) => page.content) ?? [];
  const fileItems = files.data?.pages.flatMap((page) => page.content) ?? [];
  const selectedFileCount = selectedFiles.size;
  const selectedFolderCount = selectedFolders.size;
  const selectedCount = selectedFileCount + selectedFolderCount;
  const loadedItems = folderItems.length + fileItems.length;
  const selectedLoadedCount =
    fileItems.filter((item) => selectedFiles.has(item.id)).length +
    folderItems.filter((folder) => selectedFolders.has(folder.id)).length;
  const totalItems =
    (folders.data?.pages[0]?.totalElements ?? 0) +
    (files.data?.pages[0]?.totalElements ?? 0);
  const isMutating =
    upload.isPending ||
    createFolder.isPending ||
    remove.isPending ||
    removeFolder.isPending ||
    rename.isPending ||
    move.isPending ||
    bulkMove.isPending ||
    bulkDelete.isPending ||
    bulkDownload.isPending ||
    visibility.isPending ||
    addShare.isPending ||
    revokeShare.isPending;
  const hasQueryError = files.isError || folders.isError;
  const hasMoreItems = Boolean(files.hasNextPage || folders.hasNextPage);
  const isLoadingMore = files.isFetchingNextPage || folders.isFetchingNextPage;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        if (files.hasNextPage && !files.isFetchingNextPage) {
          void files.fetchNextPage();
        }
        if (folders.hasNextPage && !folders.isFetchingNextPage) {
          void folders.fetchNextPage();
        }
      },
      { rootMargin: "280px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [
    files.hasNextPage,
    files.isFetchingNextPage,
    files.fetchNextPage,
    folders.hasNextPage,
    folders.isFetchingNextPage,
    folders.fetchNextPage,
  ]);

  function chooseFiles(fileList: FileList | null) {
    const selectedFiles = Array.from(fileList ?? []);
    if (selectedFiles.length === 0) return;
    setMutationError("");
    uploadController.current?.abort();
    uploadController.current = new AbortController();
    setUploadNames(selectedFiles.map((file) => file.name));
    setOperationStatus("uploading");
    upload.mutate({ files: selectedFiles, signal: uploadController.current.signal });
    if (input.current) input.current.value = "";
  }

  function handleDragEnter(event: DragEvent<HTMLElement>) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDragActive(true);
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setDragActive(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    chooseFiles(event.dataTransfer.files);
  }

  function cancelUpload() {
    uploadController.current?.abort();
    upload.reset();
    setUploadNames([]);
    setOperationStatus(null);
    toast.info("Upload cancelled");
  }

  function openFolder(folder: FolderItem) {
    setOpenActionMenu(null);
    setParentId(folder.id);
    setFolderLabel(folder.name);
    setKeyword("");
    clearSelection();
  }

  function goHome() {
    setParentId(undefined);
    setFolderLabel("My Files");
    setKeyword("");
    clearSelection();
  }

  function clearSelection() {
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  }

  function toggleSelection(kind: "file" | "folder", id: string) {
    if (kind === "file") {
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
    setSelectedFiles(new Set(fileItems.map((item) => item.id)));
    setSelectedFolders(new Set(folderItems.map((folder) => folder.id)));
  }

  function openBulkMoveDialog() {
    if (selectedCount === 0) return;
    setDestinationId("");
    setMoveTarget({
      type: selectedFolderCount > 0 ? "folder" : "file",
      id: "bulk-selection",
      name: `${selectedCount} selected items`,
      blockedFolderIds: Array.from(selectedFolders),
      skipUnchangedCheck: true,
    });
  }

  function openBulkDeleteDialog() {
    if (selectedCount === 0) return;
    setDeleteTarget({
      type: selectedFolderCount > 0 ? "folder" : "file",
      id: "bulk-selection",
      name: `${selectedCount} selected items`,
    });
  }

  function openFile(file: FileItem) {
    setMutationError("");
    setOpenActionMenu(null);
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
      <section
        className="relative mx-auto max-w-6xl p-5 md:p-10"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dragActive && (
          <div className="pointer-events-none fixed inset-x-4 bottom-4 top-20 z-40 grid place-items-center rounded-xl border-2 border-dashed border-moss bg-emerald-50/95 text-moss shadow-panel md:left-[19rem] md:right-8">
            <div className="text-center">
              <Upload className="mx-auto size-10" />
              <p className="mt-3 text-lg font-extrabold">Drop files to upload</p>
              <p className="mt-1 text-sm text-muted">
                Files will be uploaded to {folderLabel}.
              </p>
            </div>
          </div>
        )}
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
              Workspace
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">
              {folderLabel}
            </h1>
            <button
              className="mt-2 text-xs font-semibold text-moss hover:underline"
              onClick={goHome}
            >
              My Files{parentId && ` / ${folderLabel}`}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setMutationError("");
                setFolderDialogOpen(true);
              }}
              disabled={isMutating}
            >
              <FolderPlus size={16} /> New Folder
            </Button>
            <Button
              onClick={() => input.current?.click()}
              disabled={isMutating}
            >
              <Upload size={16} />{" "}
              {upload.isPending ? "Uploading..." : "Upload File"}
            </Button>
            <input
              ref={input}
              hidden
              type="file"
              multiple
              onChange={(event) => chooseFiles(event.target.files)}
            />
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              className="pl-9"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Search files and folders"
            />
          </div>
          <div className="flex gap-1 rounded-lg bg-line/60 p-1">
            <Button
              variant={view === "list" ? "outline" : "ghost"}
              className="size-8 px-0"
              onClick={() => setView("list")}
              title="List view"
            >
              <List size={16} />
            </Button>
            <Button
              variant={view === "grid" ? "outline" : "ghost"}
              className="size-8 px-0"
              onClick={() => setView("grid")}
              title="Grid view"
            >
              <Grid2X2 size={16} />
            </Button>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <label className="flex items-center gap-2 font-mono text-[11px] text-muted">
            {loadedItems > 0 && (
              <input
                type="checkbox"
                className="size-4 accent-moss"
                checked={selectedLoadedCount === loadedItems}
                onChange={(event) => selectLoadedItems(event.target.checked)}
              />
            )}
            <span>
              {loadedItems}
              {totalItems > loadedItems ? ` of ${totalItems}` : ""} items
            </span>
          </label>
          {hasQueryError && (
            <button
              className="text-xs font-semibold text-red-600 hover:underline"
              onClick={() => {
                void files.refetch();
                void folders.refetch();
              }}
            >
              Retry loading
            </button>
          )}
        </div>
        {mutationError && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <span>{mutationError}</span>
            <button onClick={() => setMutationError("")}>
              <X size={15} />
            </button>
          </div>
        )}
        <BulkActions
          selectedCount={selectedCount}
          selectedFileCount={selectedFileCount}
          loading={isMutating}
          onMove={openBulkMoveDialog}
          onDelete={openBulkDeleteDialog}
          onDownload={() => bulkDownload.mutate()}
          onClear={clearSelection}
        />

        {files.isPending || folders.isPending ? (
          <LoadingState />
        ) : loadedItems === 0 ? (
          <EmptyState
            onUpload={() => input.current?.click()}
            onCreateFolder={() => setFolderDialogOpen(true)}
            searchActive={Boolean(keyword)}
          />
        ) : (
          <div
            className={
              view === "grid"
                ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                : "divide-y divide-line overflow-visible rounded-xl border border-line bg-white"
            }
          >
            {folderItems.map((folder) => (
              <div
                key={folder.id}
                className={
                  view === "grid"
                    ? "group relative rounded-xl border border-line bg-white p-5 pt-12 text-left shadow-panel transition hover:-translate-y-0.5"
                    : "group relative flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-canvas"
                }
              >
                <span
                  className={
                    view === "grid"
                      ? "mb-4 grid aspect-video w-full place-items-center rounded-lg bg-amber-50 text-amber-600"
                      : "grid size-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600"
                  }
                >
                  <Folder size={18} fill="currentColor" />
                </span>
                <input
                  type="checkbox"
                  className={
                    view === "grid"
                      ? "absolute left-5 top-5 size-4 accent-moss"
                      : "size-4 shrink-0 accent-moss"
                  }
                  checked={selectedFolders.has(folder.id)}
                  onChange={() => toggleSelection("folder", folder.id)}
                  title="Select folder"
                />
                <span className="min-w-0 flex-1">
                  <button
                    className="block max-w-full truncate text-left text-sm font-bold hover:text-moss hover:underline"
                    onClick={() => openFolder(folder)}
                    title={folder.name}
                  >
                    {folder.name}
                  </button>
                  <small className="text-xs text-muted">Folder</small>
                </span>
                <Button
                  variant="ghost"
                  className={
                    view === "grid"
                      ? "absolute right-4 top-4 size-8 shrink-0 px-0"
                      : "size-8 shrink-0 px-0"
                  }
                  title="Folder actions"
                  disabled={isMutating}
                  onClick={() =>
                    setOpenActionMenu((current) =>
                      current === `folder-${folder.id}` ? null : `folder-${folder.id}`,
                    )
                  }
                >
                  <MoreVertical size={16} />
                </Button>
                {openActionMenu === `folder-${folder.id}` && (
                  <ActionMenu>
                    <MenuButton
                      icon={<Folder size={15} />}
                      label="Open"
                      onClick={() => openFolder(folder)}
                    />
                    <MenuButton
                      icon={<MoveRight size={15} />}
                      label="Move"
                      onClick={() => {
                        setOpenActionMenu(null);
                        setDestinationId(folder.parentId ?? "");
                        setMoveTarget({
                          type: "folder",
                          id: folder.id,
                          name: folder.name,
                          parentId: folder.parentId,
                        });
                      }}
                    />
                    <MenuButton
                      icon={<Edit3 size={15} />}
                      label="Rename"
                      onClick={() => {
                        setOpenActionMenu(null);
                        setRenameTarget({
                          type: "folder",
                          id: folder.id,
                          name: folder.name,
                        });
                      }}
                    />
                    <MenuButton
                      danger
                      icon={
                        removeFolder.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )
                      }
                      label="Delete"
                      onClick={() => {
                        setOpenActionMenu(null);
                        setDeleteTarget({
                          type: "folder",
                          id: folder.id,
                          name: folder.name,
                        });
                      }}
                    />
                  </ActionMenu>
                )}
              </div>
            ))}
            {fileItems.map((item) => (
              <div
                key={item.id}
                className={
                  view === "grid"
                    ? "relative rounded-xl border border-line bg-white p-5 pt-12 shadow-panel transition hover:-translate-y-0.5 hover:bg-canvas"
                    : "relative flex items-center gap-3 px-4 py-4 transition hover:bg-canvas"
                }
              >
                <FileThumbnail file={item} large={view === "grid"} />
                <input
                  type="checkbox"
                  className={
                    view === "grid"
                      ? "absolute left-5 top-5 size-4 accent-moss"
                      : "size-4 shrink-0 accent-moss"
                  }
                  checked={selectedFiles.has(item.id)}
                  onChange={() => toggleSelection("file", item.id)}
                  title="Select file"
                />
                <span className="min-w-0 flex-1">
                  <button
                    className="block max-w-full truncate text-left text-sm font-bold hover:text-moss hover:underline"
                    onClick={() => void openFile(item)}
                    title={item.name}
                  >
                    {item.name}
                  </button>
                  <small className="text-xs text-muted">
                    {item.mimeType} · {formatSize(item.size)}
                  </small>
                </span>
                <Button
                  variant="ghost"
                  className={
                    view === "grid"
                      ? "absolute right-4 top-4 size-8 shrink-0 px-0"
                      : "size-8 shrink-0 px-0"
                  }
                  title="File actions"
                  disabled={isMutating}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenActionMenu((current) =>
                      current === `file-${item.id}` ? null : `file-${item.id}`,
                    );
                  }}
                >
                  <MoreVertical size={16} />
                </Button>
                {openActionMenu === `file-${item.id}` && (
                  <ActionMenu>
                    <MenuLink
                      href="#"
                      icon={<ExternalLink size={15} />}
                      label="Open"
                      onClick={(event) => {
                        event.preventDefault();
                        setOpenActionMenu(null);
                        void openFile(item);
                      }}
                    />
                    <MenuLink
                      href="#"
                      icon={
                        downloadingId === item.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Download size={15} />
                        )
                      }
                      label={downloadingId === item.id ? "Downloading..." : "Download"}
                      onClick={(event) => {
                        event.preventDefault();
                        setOpenActionMenu(null);
                        if (downloadingId !== item.id) {
                          downloadFile(item);
                        }
                      }}
                    />
                    <MenuButton
                      icon={<Share2 size={15} />}
                      label="Share"
                      onClick={() => {
                        setOpenActionMenu(null);
                        setShareTarget(item);
                        setShareEmail("");
                      }}
                    />
                    <MenuButton
                      icon={<MoveRight size={15} />}
                      label="Move"
                      onClick={() => {
                        setOpenActionMenu(null);
                        setDestinationId(item.parentId ?? "");
                        setMoveTarget({
                          type: "file",
                          id: item.id,
                          name: item.name,
                          parentId: item.parentId,
                        });
                      }}
                    />
                    <MenuButton
                      icon={<Edit3 size={15} />}
                      label="Rename"
                      onClick={() => {
                        setOpenActionMenu(null);
                        setRenameTarget({
                          type: "file",
                          id: item.id,
                          name: item.name,
                        });
                      }}
                    />
                    <MenuButton
                      danger
                      icon={
                        remove.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )
                      }
                      label="Delete"
                      onClick={() => {
                        setOpenActionMenu(null);
                        setDeleteTarget({
                          type: "file",
                          id: item.id,
                          name: item.name,
                        });
                      }}
                    />
                  </ActionMenu>
                )}
              </div>
            ))}
          </div>
        )}
        {loadedItems > 0 && (
          <div
            ref={loadMoreRef}
            className="flex h-14 items-center justify-center text-xs font-semibold text-muted"
          >
            {isLoadingMore
              ? "Loading more..."
              : hasMoreItems
                ? "Scroll to load more"
                : "End of folder"}
          </div>
        )}

        {folderDialogOpen && (
          <FolderDialog
            value={folderName}
            loading={createFolder.isPending}
            onChange={setFolderName}
            onClose={() => {
              if (!createFolder.isPending) setFolderDialogOpen(false);
            }}
            onSubmit={() => {
              setMutationError("");
              createFolder.mutate();
            }}
          />
        )}
        {renameTarget && (
          <RenameDialog
            target={renameTarget}
            loading={rename.isPending}
            onChange={(name) =>
              setRenameTarget((current) =>
                current ? { ...current, name } : current,
              )
            }
            onClose={() => {
              if (!rename.isPending) setRenameTarget(null);
            }}
            onSubmit={() => {
              if (!renameTarget.name.trim()) return;
              setMutationError("");
              rename.mutate(renameTarget);
            }}
          />
        )}
        {moveTarget && (
          <MoveDialog
            target={moveTarget}
            folders={allFolders.data ?? []}
            loading={move.isPending || bulkMove.isPending}
            loadingFolders={allFolders.isPending}
            destinationId={destinationId}
            onDestinationChange={setDestinationId}
            onClose={() => {
              if (!move.isPending && !bulkMove.isPending) {
                setMoveTarget(null);
                setDestinationId("");
              }
            }}
            onSubmit={() => {
              setMutationError("");
              if (moveTarget.id === "bulk-selection") {
                bulkMove.mutate(destinationId);
              } else {
                move.mutate({ target: moveTarget, parentId: destinationId });
              }
            }}
          />
        )}
        {deleteTarget && (
          <DeleteDialog
            target={deleteTarget}
            loading={
              deleteTarget.id === "bulk-selection"
                ? bulkDelete.isPending
                : deleteTarget.type === "file"
                ? remove.isPending
                : removeFolder.isPending
            }
            onClose={() => {
              if (!remove.isPending && !removeFolder.isPending && !bulkDelete.isPending) {
                setDeleteTarget(null);
              }
            }}
            onConfirm={() => {
              setMutationError("");
              if (deleteTarget.id === "bulk-selection") {
                bulkDelete.mutate();
              } else if (deleteTarget.type === "file") {
                remove.mutate(deleteTarget.id);
              } else {
                removeFolder.mutate(deleteTarget.id);
              }
            }}
          />
        )}
        {shareTarget && (
          <ShareDialog
            file={shareTarget}
            shares={shares.data ?? []}
            publicLink={shareTarget.viewUrl}
            email={shareEmail}
            error={shareError}
            loading={visibility.isPending}
            shareLoading={addShare.isPending || revokeShare.isPending || shares.isFetching}
            onEmailChange={(value) => {
              setShareEmail(value);
              if (shareError) {
                setShareError("");
              }
            }}
            onVisibilityChange={(nextVisibility) =>
              visibility.mutate({ id: shareTarget.id, visibility: nextVisibility })
            }
            onAddShare={() => addShare.mutate()}
            onRevoke={(userId) => revokeShare.mutate(userId)}
            onCopyLink={() => {
              void navigator.clipboard.writeText(shareTarget.viewUrl);
              toast.success("Link copied");
            }}
            onClose={() => {
              if (!visibility.isPending && !addShare.isPending && !revokeShare.isPending) {
                setShareTarget(null);
                setShareEmail("");
                setShareError("");
              }
            }}
          />
        )}
        {previewTarget && (
          <FilePreviewDialog
            file={previewTarget}
            onClose={() => setPreviewTarget(null)}
          />
        )}
      </section>
      {operationStatus !== null && (
        <UploadProgressPanel
          fileNames={uploadNames}
          status={operationStatus}
          onCancel={cancelUpload}
        />
      )}
    </>
  );
}

function buildListParams({
  parentId,
  keyword,
  page,
  size,
}: {
  parentId?: string;
  keyword?: string;
  page: number;
  size: number;
}) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  if (parentId) params.set("parentId", parentId);
  if (keyword?.trim()) params.set("keyword", keyword.trim());
  return params.toString();
}

function hasDraggedFiles(event: DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.types).includes("Files");
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

