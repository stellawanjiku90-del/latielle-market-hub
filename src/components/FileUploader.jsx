import { useEffect, useRef, useState } from "react";
import { api } from "@/api/apiClient";
import { Upload, X, Loader2, FileIcon, ZoomIn, Play, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const isImageFile = (file) => file.type.startsWith("image/");
const isImageUrl = (url) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
const isVideoUrl = (url) => /\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(url);
const isPdf = (url) => /\.pdf(\?|$)/i.test(url);

const enhanceImage = (file) => new Promise((resolve) => {
  const img = new window.Image();
  const objectUrl = URL.createObjectURL(file);
  img.onload = () => {
    const maxDim = 1400;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(objectUrl);
    canvas.toBlob((blob) => {
      resolve(blob ? new window.File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }) : file);
    }, "image/jpeg", 0.84);
  };
  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(file);
  };
  img.src = objectUrl;
});

function fileNameFromUrl(url) {
  try { return decodeURIComponent(new URL(url, window.location.origin).pathname.split("/").pop() || "Document"); }
  catch { return String(url).split("/").pop() || "Document"; }
}

export default function FileUploader({ label, accept, multiple = false, value = [], onChange, hint, onUploadingChange, kind = "document" }) {
  const [uploading, setUploading] = useState(0);
  const [uploadingUrls, setUploadingUrls] = useState({});
  const [preview, setPreview] = useState(null);
  const [previews, setPreviews] = useState({});
  const inputRef = useRef(null);
  const valuesRef = useRef(Array.isArray(value) ? value : []);
  const previewMetaRef = useRef({});
  const previewsRef = useRef({});
  const activeUploads = useRef(0);

  const setUploadState = (delta) => {
    activeUploads.current = Math.max(0, activeUploads.current + delta);
    setUploading(activeUploads.current);
    onUploadingChange?.(activeUploads.current > 0);
  };

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => () => {
    Object.values(previewsRef.current).forEach((url) => {
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    });
  }, []);

  const emitValues = (next) => {
    valuesRef.current = next;
    onChange(next);
  };

  useEffect(() => {
    valuesRef.current = Array.isArray(value) ? value : [];
  }, [value]);

  const replaceValue = (oldValue, newValue) => {
    emitValues(valuesRef.current.map((item) => item === oldValue ? newValue : item));
  };

  const remove = (url) => {
    const local = previews[url];
    if (local?.startsWith("blob:")) URL.revokeObjectURL(local);
    setPreviews((current) => {
      const next = { ...current };
      delete next[url];
      return next;
    });
    emitValues(valuesRef.current.filter((item) => item !== url));
  };

  const uploadOne = async (file, localUrl) => {
    setUploadState(1);
    setUploadingUrls((current) => ({ ...current, [localUrl]: true }));
    try {
      let fileToUpload = file;
      if (isImageFile(file)) fileToUpload = await enhanceImage(file);
      const { file_url } = await api.integrations.Core.UploadFile({ file: fileToUpload, kind });
      if (!file_url) throw new Error("The server did not return a file URL.");
      previewMetaRef.current[file_url] = { type: file.type, name: file.name };
      if (!valuesRef.current.includes(localUrl)) return true;
      replaceValue(localUrl, file_url);
      URL.revokeObjectURL(localUrl);
      setPreviews((current) => {
        const next = { ...current };
        delete next[localUrl];
        return next;
      });
      return true;
    } catch (error) {
      remove(localUrl);
      toast.error(error?.message || "The file could not be uploaded. Please try again.");
      return false;
    } finally {
      setUploadingUrls((current) => { const next = { ...current }; delete next[localUrl]; return next; });
      setUploadState(-1);
    }
  };

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const selected = multiple ? files : files.slice(0, 1);
    if (!multiple && value.length) {
      value.forEach((url) => remove(url));
    }

    const localEntries = selected.map((file) => ({
      file,
      localUrl: URL.createObjectURL(file),
    }));

    // Put the local previews into the form immediately. The user does not have to
    // wait for a network round-trip before moving to the next section.
    const nextValues = multiple ? [...value, ...localEntries.map((entry) => entry.localUrl)] : [localEntries[0]?.localUrl].filter(Boolean);
    const previewMap = {};
    localEntries.forEach(({ file, localUrl }) => {
      previewMap[localUrl] = localUrl;
      previewMetaRef.current[localUrl] = { type: file.type, name: file.name };
    });
    setPreviews((current) => ({ ...current, ...previewMap }));
    emitValues(nextValues);

    await Promise.all(localEntries.map(({ file, localUrl }) => uploadOne(file, localUrl)));
  };

  const getDisplayUrl = (url) => previews[url] || url;
  const items = Array.isArray(value) ? value : [];

  return (
    <div className="space-y-2.5">
      {label && <p className="text-sm font-medium leading-none">{label}</p>}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((url, index) => {
            const displayUrl = getDisplayUrl(url);
            const localType = previewMetaRef.current[url]?.type || "";
            const image = isImageUrl(url) || localType.startsWith("image/");
            const video = isVideoUrl(url) || localType.startsWith("video/");
            const pdf = isPdf(url) || localType === "application/pdf";
            return (
              <div key={`${url}-${index}`} className="relative overflow-hidden rounded-xl border border-border bg-card group">
                {image ? (
                  <button type="button" className="block w-full text-left" onClick={() => setPreview({ type: "image", url: displayUrl })}>
                    <img src={displayUrl} alt={`Uploaded ${label || "image"} ${index + 1}`} className="h-32 w-full object-cover" />
                    <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><ZoomIn className="h-5 w-5 text-white" /></span>
                  </button>
                ) : video ? (
                  <button type="button" className="block w-full text-left" onClick={() => setPreview({ type: "video", url: displayUrl })}>
                    <video src={displayUrl} className="h-32 w-full object-cover bg-muted" muted playsInline preload="metadata" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/20"><span className="h-10 w-10 rounded-full bg-white/90 flex items-center justify-center shadow"><Play className="h-4 w-4 text-foreground fill-current ml-0.5" /></span></span>
                  </button>
                ) : (
                  <button type="button" className="flex h-32 w-full flex-col items-center justify-center gap-2 px-3 text-center" onClick={() => setPreview({ type: pdf ? "pdf" : "file", url: displayUrl })}>
                    {pdf ? <FileText className="h-8 w-8 text-primary" /> : <FileIcon className="h-8 w-8 text-muted-foreground" />}
                    <span className="text-xs font-medium text-foreground line-clamp-2 break-all">{fileNameFromUrl(url)}</span>
                    {previews[url]?.startsWith("blob:") && <span className="text-[11px] text-muted-foreground">Ready to upload</span>}
                  </button>
                )}
                <div className="absolute left-2 bottom-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-sm">
                  {uploadingUrls[url] ? "Uploading…" : previews[url]?.startsWith("blob:") ? "Preview ready" : "Uploaded"}
                </div>
                <button type="button" onClick={() => remove(url)} aria-label={`Remove ${label || "file"}`} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/95 text-foreground shadow flex items-center justify-center hover:bg-destructive hover:text-white transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground font-body",
          "hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors w-full justify-center"
        )}
      >
        {uploading > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {uploading > 0 ? `Uploading in the background — add ${multiple ? "more files" : "another file"}` : `Add ${multiple ? "files" : "file"}`}
      </button>

      <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-4xl p-3">
          {preview?.type === "image" && <img src={preview.url} alt="Preview" className="w-full max-h-[80vh] object-contain rounded-lg" />}
          {preview?.type === "video" && <video src={preview.url} controls autoPlay className="w-full max-h-[80vh] rounded-lg" />}
          {preview?.type === "pdf" && <iframe src={preview.url} title="Document preview" className="w-full h-[75vh] rounded-lg border border-border" />}
          {preview?.type === "file" && <a href={preview?.url} target="_blank" rel="noreferrer" className="p-8 block text-center text-primary hover:underline">Open document</a>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
