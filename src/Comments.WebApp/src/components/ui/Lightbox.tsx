"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface LightboxProps {
  src: string;
  alt?: string;
  isTextFile?: boolean;
  onClose: () => void;
}

export default function Lightbox({
  src,
  alt,
  isTextFile,
  onClose,
}: LightboxProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [closing, setClosing] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const fadeDuration = 300;

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, fadeDuration);
  }, [onClose]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    },
    [handleClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  useEffect(() => {
    if (isTextFile) {
      setLoading(true);
      fetch(src)
        .then((res) => res.text())
        .then((text) => {
          setTextContent(text);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load text file:", err);
          setTextContent("Failed to load file content.");
          setLoading(false);
        });
    }
  }, [src, isTextFile]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        animation: closing
          ? `lightbox-fade-out ${fadeDuration}ms ease-in forwards`
          : `lightbox-fade-in ${fadeDuration}ms ease-out forwards`,
      }}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" />

      {/* Content */}
      <div
        className="relative z-10 flex flex-col items-center max-w-[90vw] max-h-[90vh]"
        style={{
          animation: closing
            ? `lightbox-scale-out ${fadeDuration}ms ease-in forwards`
            : `lightbox-scale-in ${fadeDuration}ms ease-out forwards`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute -top-10 right-0 p-1 text-white/80 hover:text-white transition-colors"
          title="Close (Esc)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {isTextFile ? (
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl max-h-[80vh] overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                {textContent}
              </pre>
            )}
            {/* Caption for text file */}
            {alt && (
              <div className="mt-3 pt-3 border-t border-gray-200 text-center text-xs text-gray-500">
                {alt}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Loading spinner */}
            {!imageLoaded && (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              </div>
            )}
            {/* Image */}
            <img
              src={src}
              alt={alt || "Full size image"}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              style={{
                display: imageLoaded ? "block" : "none",
                animation: imageLoaded
                  ? `lightbox-image-fade ${fadeDuration}ms ease-out forwards`
                  : "none",
              }}
              onLoad={() => setImageLoaded(true)}
            />
            {/* Caption */}
            {alt && imageLoaded && (
              <div className="mt-3 px-4 py-2 text-center text-sm text-white/90 bg-black/40 rounded-md">
                {alt}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}