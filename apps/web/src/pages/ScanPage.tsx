import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { motion } from "framer-motion";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { toast, Toaster } from "sonner";

import Header from "../components/Header";
import Footer from "../components/Footer";

type BarcodeLike = Partial<
  Record<"rawValue" | "displayValue" | "text" | "value", unknown>
>;

export default function ScanPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const navigatingRef = useRef(false);
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
          toast.error(t('scan.noLink'), { id, duration: 3000 });
          navigatingRef.current = false;
        }
      } catch {
        toast.error(t('scan.failedToOpen'), { id, duration: 3000 });
        navigatingRef.current = false;
      }
    },
    [navigate, t]
  );

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(135deg, var(--dm-bg-primary) 0%, var(--dm-bg-secondary) 100%)',
      }}
    >
      <Header />
      <Toaster position="top-center" offset={16} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <motion.div
          className="w-full max-w-md space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Title */}
          <div className="text-center">
            <h1
              className="text-2xl font-bold mb-2"
              style={{ color: 'var(--dm-accent)' }}
            >
              {t('scan.title')}
            </h1>
            <p style={{ color: 'var(--dm-text-muted)' }}>
              {t('scan.instructions') || 'Point your camera at a QR code'}
            </p>
          </div>

          {/* Scanner Container */}
          <motion.div
            className="glass-card p-4 rounded-2xl overflow-hidden"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="rounded-xl overflow-hidden"
              style={{
                border: '2px solid var(--dm-accent)',
              }}
            >
              <Scanner
                onScan={(codes) => {
                  const text = extractText(codes);
                  if (text) handleDecode(text);
                }}
                onError={(e) => {
                  console.error(e);
                  if (!loaderIdRef.current) {
                    loaderIdRef.current = toast.error(t('scan.cameraError'));
                  }
                }}
                constraints={{ facingMode: "environment" }}
                styles={{
                  container: {
                    width: "100%",
                    borderRadius: '0.75rem',
                  }
                }}
              />
            </div>
          </motion.div>

          {/* Help Text */}
          <p
            className="text-center text-sm"
            style={{ color: 'var(--dm-text-muted)' }}
          >
            {t('scan.helpText') || 'Make sure the QR code is well-lit and in focus'}
          </p>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
