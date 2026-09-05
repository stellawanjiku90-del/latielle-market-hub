import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, ImageIcon, Video, Download, Eye, Loader2 } from "lucide-react";

const isImage = (url) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
const isVideo = (url) => /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(url);
const isPdf = (url) => /\.pdf(\?|$)/i.test(url);

function fileName(url) {
  try {
    return decodeURIComponent(url.split("/").pop().split("?")[0]) || "file";
  } catch {
    return "file";
  }
}

async function fetchProtectedFile(url) {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error("Unable to access document");
  return res;
}

async function downloadFile(url) {
  try {
    const separator = url.includes("?") ? "&" : "?";
    const res = await fetchProtectedFile(`${url}${separator}download=1`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const disposition = res.headers.get("content-disposition") || "";
    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const plain = disposition.match(/filename="?([^";]+)"?/i);
    const downloadedName = encoded ? decodeURIComponent(encoded[1]) : (plain?.[1] || fileName(url));
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = downloadedName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    // Keep private-document errors inside the admin UI; never navigate the admin away from the review screen.
  }
}

export default function DocumentViewer({ documents = [] }) {
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const openPreview = async (url) => {
    setLoadingPreview(true);
    setPreview(url);
    try {
      const res = await fetchProtectedFile(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    } catch {
      setPreviewUrl(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreview(null);
    setPreviewUrl(null);
    setLoadingPreview(false);
  };

  if (!documents.length) {
    return <p className="text-xs text-muted-foreground italic">No documents uploaded.</p>;
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {documents.map((url, i) => {
          const img = isImage(url);
          const vid = isVideo(url);
          const Icon = vid ? Video : img ? ImageIcon : FileText;
          return (
            <div key={i} className="w-32 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => openPreview(url)}
                className="relative h-24 w-32 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center group hover:border-primary transition-colors"
              >
                {img ? (
                  <img src={url} alt={fileName(url)} className="h-full w-full object-cover" />
                ) : vid ? (
                  <video src={url} className="h-full w-full object-cover" muted />
                ) : (
                  <FileText className="h-8 w-8 text-primary" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="h-5 w-5 text-white" />
                </div>
              </button>
              <span className="text-[9px] text-muted-foreground truncate flex items-center gap-1">
                <Icon className="h-2.5 w-2.5 shrink-0" />{fileName(url)}
              </span>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="outline" className="h-6 text-[10px] flex-1 gap-1" onClick={() => openPreview(url)}>
                  <Eye className="h-2.5 w-2.5" />Preview
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-6 text-[10px] flex-1 gap-1" onClick={() => downloadFile(url)}>
                  <Download className="h-2.5 w-2.5" />Save
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!preview} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-3xl p-2">
          {preview && (
            <div className="flex flex-col gap-2">
              <div className="max-h-[75vh] overflow-auto flex items-center justify-center min-h-32">
                {loadingPreview ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                    <p className="text-sm">Loading secure preview…</p>
                  </div>
                ) : previewUrl && isImage(preview) ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-auto object-contain rounded-lg" />
                ) : previewUrl && isVideo(preview) ? (
                  <video src={previewUrl} controls autoPlay className="w-full max-h-[75vh] rounded-lg" />
                ) : previewUrl && isPdf(preview) ? (
                  <iframe src={previewUrl} title="PDF preview" className="w-full h-[75vh] rounded-lg border-0" />
                ) : (
                  <div className="py-12 text-center">
                    <FileText className="h-12 w-12 text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Preview is unavailable for this file. You can download it directly.</p>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-xs text-muted-foreground truncate">{fileName(preview)}</span>
                <Button size="sm" className="gap-1.5" onClick={() => downloadFile(preview)}>
                  <Download className="h-3.5 w-3.5" />Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
