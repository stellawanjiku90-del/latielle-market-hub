import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, ImageIcon, Video, Download, Eye } from "lucide-react";

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

async function downloadFile(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName(url);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    // Fallback: trigger a normal download if fetch is blocked
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName(url);
    a.click();
  }
}

export default function DocumentViewer({ documents = [] }) {
  const [preview, setPreview] = useState(null);

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
                onClick={() => setPreview(url)}
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
                <Button type="button" size="sm" variant="outline" className="h-6 text-[10px] flex-1 gap-1" onClick={() => setPreview(url)}>
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

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-3xl p-2">
          {preview && (
            <div className="flex flex-col gap-2">
              <div className="max-h-[75vh] overflow-auto flex items-center justify-center">
                {isImage(preview) ? (
                  <img src={preview} alt="Preview" className="w-full h-auto object-contain rounded-lg" />
                ) : isVideo(preview) ? (
                  <video src={preview} controls autoPlay className="w-full max-h-[75vh] rounded-lg" />
                ) : isPdf(preview) ? (
                  <iframe src={preview} title="PDF preview" className="w-full h-[75vh] rounded-lg border-0" />
                ) : (
                  <div className="py-12 text-center">
                    <FileText className="h-12 w-12 text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
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