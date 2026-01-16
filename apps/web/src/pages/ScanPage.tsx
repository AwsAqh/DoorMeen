
import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { toast } from "sonner";

type BarcodeLike = Partial<
  Record<"rawValue" | "displayValue" | "text" | "value", unknown>
>;

export default function ScanPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const navigatingRef = useRef(false);          // prevent multiple navigations
  const loaderIdRef = useRef<string | number>(null); 

  const extractText = (codes: IDetectedBarcode[]): string | null => {
    const keys = ["rawValue", "displayValue", "text", "value"] as const;
    for (const c of codes) {
      const b = c as BarcodeLike;
      for (const k of keys) {
        const v = b[k];
        if (typeof v === "string" && v.trim() !== "") return v.trim();
      }
    }
    return null;
  };

  const handleDecode = useCallback(
    async (text: string) => {
      if (navigatingRef.current) return;
      navigatingRef.current = true;

      // show a spinner while we decide where to go
      const id = toast.loading(t('scan.opening'), { duration: Infinity });
      loaderIdRef.current = id;

      try {
        // Full external URL?
        if (/^https?:\/\//i.test(text)) {
        
          toast.success(t('scan.scannedURL'), { description: text, duration: 1000, id });
         
          setTimeout(() => window.location.assign(text), 250);
          return;
        }

        // App-relative path?
        if (text.startsWith("/")) {
          toast.success(t('scan.navigating'), { description: text, duration: 800, id });
          setTimeout(() => navigate(text, { replace: true }), 200);
          return;
        }

        // Try to coerce to URL relative to current origin
        try {
          const url = new URL(text, window.location.origin);
          toast.success(t('scan.openingLink'), { description: url.toString(), duration: 800, id });
          setTimeout(() => {
            if (url.origin === window.location.origin) {
              navigate(url.pathname + url.search + url.hash, { replace: true });
            } else {
              window.location.assign(url.toString());
            }
          }, 200);
        } catch {
          // Not a URL or path
          toast.error(t('scan.noLink'), { id, duration: 3000 });
          navigatingRef.current = false;
        }
      } catch  {
        toast.error(t('scan.failedToOpen'), { id, duration: 3000 });
        navigatingRef.current = false;
      }
    },
    [navigate]
  );

  return (
    <div className="p-4 space-y-3">
      <p className="text-sm opacity-80">{t('scan.title')}</p>

      <Scanner
        onScan={(codes) => {
          const text = extractText(codes);
          if (text) handleDecode(text);
        }}
        onError={(e) => {
          console.error(e);
          // show an error once if the camera fails
          if (!loaderIdRef.current) {
            loaderIdRef.current = toast.error(t('scan.cameraError'));
          }
        }}
        constraints={{ facingMode: "environment" }}
        styles={{ container: { width: "100%" } }}
      />
    </div>
  );
}
