import { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { motion } from "framer-motion";
import QRCodeSVG from "react-qr-code";
import QRCode from "qrcode";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';

type Props = {
  queueId: number;
  size?: number;
};

export default function QueueQrCard({ queueId, size = 180 }: Props) {
  const { t } = useTranslation();
  const url = useMemo(() => `${window.location.origin}/queue/${queueId}`, [queueId]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPng = async () => {
    setBusy(true);
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 1024, margin: 1 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `queue-${queueId}.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: t('queue.joinQueue'), url });
      } catch {
        return;
      }
    } else {
      await copyLink();
    }
  };

  return (
    <motion.div
      className="glass-card w-full max-w-md mx-auto text-center p-6 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* QR Code Container */}
      <motion.div
        className="inline-block rounded-xl bg-white p-4 shadow-lg"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <QRCodeSVG value={url} size={size} />
      </motion.div>

      {/* URL Display */}
      <p
        className="text-xs break-all px-4"
        style={{ color: 'var(--dm-text-muted)' }}
      >
        {url}
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-3">
        <motion.button
          onClick={copyLink}
          className="btn-outline flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <ContentCopyIcon fontSize="small" />
          {copied ? t('common.copied') || 'Copied!' : t('queue.copyLink') || 'Copy link'}
        </motion.button>

        <motion.button
          onClick={downloadPng}
          disabled={busy}
          className="btn-outline flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <DownloadIcon fontSize="small" />
          {busy ? t('common.preparing') || 'Preparing…' : t('queue.downloadPng') || 'Download PNG'}
        </motion.button>

        <motion.button
          onClick={share}
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <ShareIcon fontSize="small" />
          {t('queue.share') || 'Share'}
        </motion.button>
      </div>
    </motion.div>
  );
}
