import { useState, useRef } from "react";
import { api } from "@/api/apiClient";
import { Upload, X, Loader2, FileIcon, Video, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const isImageFile = (file) => file.type.startsWith("image/");
const MAX_FILE_SIZE = 50 * 1024 * 1024;


const enhanceImage = (file) => new Promise((resolve) => {
  const img = new window.Image();
  const objectUrl = URL.createObjectURL(file);
  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(file);
  };
  img.onload = () => {
    // Cap at 1000px — fast processing + smaller upload
    const maxDim = 1000;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(objectUrl);
    canvas.toBlob((blob) => {
      resolve(new window.File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
    }, "image/jpeg", 0.82);
  };
  img.src = objectUrl;
});

const isImage = (url) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
const isVideo = (url) => /\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(url);

export default function FileUploader({ label, accept, multiple = false, value = [], onChange, hint }) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    setStatus("Preparing...");
    const uploaded = [];
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`${file.name} is larger than 50 MB. Please choose a smaller file.`);
        }
        let fileToUpload = file;
        if (isImageFile(file)) {
          setStatus("Preparing photo...");
          fileToUpload = await enhanceImage(file);
        }
        setStatus(`Uploading ${uploaded.length + 1} of ${files.length}...`);
        const result = await api.integrations.Core.UploadFile({ file: fileToUpload });
        if (!result?.file_url) throw new Error("The server did not return a file address.");
        uploaded.push(result.file_url);
      }
      onChange(multiple ? [...value, ...uploaded] : [uploaded[0]]);
      toast.success(`${uploaded.length} file(s) uploaded`);
    } catch (error) {
      console.error("File upload failed", error);
      toast.error(error?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setStatus("");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (url) => onChange(value.filter(u => u !== url));

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium leading-none">{label}</p>}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, i) => (
            <div key={i} className="relative group">
              {isImage(url) ? (
                <div className="relative cursor-pointer" onClick={() => setPreview(url)}>
                  <img src={url} alt="" className="h-24 w-24 object-cover rounded-lg border border-border" />
                  <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="h-5 w-5 text-white" />
                  </div>
                </div>
              ) : isVideo(url) ? (
                <video src={url} className="h-24 w-24 object-cover rounded-lg border border-border bg-muted" />
              ) : (
                <div className="h-24 w-28 flex flex-col items-center justify-center gap-1 bg-muted rounded-lg border border-border px-2">
                  <FileIcon className="h-6 w-6 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground text-center line-clamp-2 break-all">{url.split("/").pop()?.slice(0, 30)}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(url)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground font-body",
          "hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors w-full justify-center",
          uploading && "opacity-60 cursor-not-allowed"
        )}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {uploading ? status || "Processing..." : `Upload ${multiple ? "files" : "file"}`}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-3xl p-2">
          <img src={preview} alt="Preview" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />
        </DialogContent>
      </Dialog>
    </div>
  );
}