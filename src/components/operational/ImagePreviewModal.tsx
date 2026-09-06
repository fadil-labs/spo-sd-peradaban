"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download, ZoomIn, ZoomOut, Maximize2, Loader2, AlertCircle } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface PaymentProof {
  id: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
}

interface ImagePreviewModalProps {
  open: boolean;
  proof: PaymentProof | null;
  onClose: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function formatFileSize(bytes: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImagePreviewModal({ open, proof, onClose }: ImagePreviewModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

  const fetchSignedUrl = useCallback(async () => {
    if (!proof) return;
    setImageLoading(true);
    setImageError(false);
    setSignedUrl(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    try {
      const res = await fetch(`/api/payment-proofs/${proof.id}/signed-url`);
      if (!res.ok) throw new Error("Failed to fetch image");
      const json = await res.json();
      setSignedUrl(json.signedUrl);
    } catch {
      setImageError(true);
    } finally {
      setImageLoading(false);
    }
  }, [proof]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open && proof) {
      fetchSignedUrl();
    }
  }, [open, proof, fetchSignedUrl]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => {
      const next = prev - e.deltaY * 0.001;
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({
      x: dragStart.current.panX + dx,
      y: dragStart.current.panY + dy,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDownload = async () => {
    if (!proof) return;
    window.open(`/api/payment-proofs/${proof.id}/download`, "_blank");
  };

  return (
    <AnimatePresence>
      {open && proof && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
           className="fixed inset-0 z-[70] flex items-center justify-center"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 flex flex-col w-full max-w-5xl mx-4 bg-surface rounded-xl border border-border shadow-xl overflow-hidden"
            style={{ maxHeight: "90vh" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-preview-title"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <h3 id="image-preview-title" className="text-sm font-semibold text-foreground truncate">
                  {proof.file_name || "Preview Bukti Pembayaran"}
                </h3>
                {signedUrl && (
                  <span className="text-xs text-muted shrink-0">
                    {Math.round(zoom * 100)}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= MIN_ZOOM}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted hover:bg-muted/10 hover:text-foreground transition-colors disabled:opacity-40"
                  aria-label="Zoom out"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= MAX_ZOOM}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted hover:bg-muted/10 hover:text-foreground transition-colors disabled:opacity-40"
                  aria-label="Zoom in"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={handleResetZoom}
                  disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted hover:bg-muted/10 hover:text-foreground transition-colors disabled:opacity-40"
                  aria-label="Reset zoom"
                  title="Reset Zoom"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <div className="w-px h-5 bg-border mx-1" />
                <button
                  onClick={handleDownload}
                  disabled={!signedUrl}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted hover:bg-muted/10 hover:text-foreground transition-colors disabled:opacity-40"
                  aria-label="Download"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={onClose}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted hover:bg-muted/10 hover:text-foreground transition-colors"
                  aria-label="Tutup"
                  title="Tutup"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              ref={imageContainerRef}
              className="relative flex-1 overflow-hidden bg-black/5 flex items-center justify-center min-h-[300px]"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {imageLoading && (
                <div className="flex flex-col items-center justify-center gap-3 text-muted">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm">Memuat gambar...</p>
                </div>
              )}

              {imageError && !imageLoading && (
                <div className="flex flex-col items-center justify-center gap-3 text-danger">
                  <AlertCircle className="h-8 w-8" />
                  <p className="text-sm">Gagal memuat gambar. Silakan coba lagi.</p>
                  <button
                    onClick={fetchSignedUrl}
                    className="text-xs text-primary hover:underline"
                  >
                    Coba lagi
                  </button>
                </div>
              )}

              {signedUrl && !imageError && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signedUrl}
                  alt={proof.file_name || "Payment proof"}
                  draggable={false}
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                  className={`max-w-full max-h-full object-contain select-none ${
                    zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                  }`}
                  style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
                />
              )}
            </div>

            <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/5">
              <div className="flex items-center gap-4 text-xs text-muted">
                <span className="truncate max-w-[200px] sm:max-w-xs" title={proof.file_name || "-"}>
                  {proof.file_name || "-"}
                </span>
                <span className="hidden sm:inline">{formatFileSize(proof.file_size)}</span>
                <span className="hidden sm:inline">
                  {proof.mime_type || "application/octet-stream"}
                </span>
              </div>
              <div className="text-xs text-muted">
                Scroll untuk zoom • Klik &amp; seret untuk geser
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
