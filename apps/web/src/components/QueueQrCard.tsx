
import React, { useMemo, useState } from "react"
import QRCodeSVG from "react-qr-code"
import QRCode from "qrcode"

type Props = {
  queueId: number
  size?: number // px, default 224
}

export default function QueueQrCard({ queueId, size = 224 }: Props) {
  const url = useMemo(() => `${window.location.origin}/queue/${queueId}`, [queueId])
  const [busy, setBusy] = useState(false)

  const copyLink = async () => {
    await navigator.clipboard.writeText(url)
  }

  const downloadPng = async () => {
    setBusy(true)
    try {
     
      const dataUrl = await QRCode.toDataURL(url, { width: 1024, margin: 1 })
      const a = document.createElement("a")
      a.href = dataUrl
      a.download = `queue-${queueId}.png`
      a.click()
    } finally {
      setBusy(false)
    }
  }

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Join my queue", url }) } catch {}
    } else {
      await copyLink()
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto text-center space-y-4">
      {/* Keep a white box behind the QR for best scan reliability */}
      <div className="inline-block rounded-2xl bg-white p-3 shadow">
        <QRCodeSVG value={url} size={size} />
      </div>

      <p className="text-xs text-gray-600 break-all">{url}</p>

      <div className="flex justify-center gap-2">
        <button className="rounded-xl border px-4 py-2 cursor-pointer" onClick={copyLink}>
          Copy link
        </button>
        <button
          className="rounded-xl border px-4 py-2 cursor-pointer"
          onClick={downloadPng}
          disabled={busy}
        >
          {busy ? "Preparing…" : "Download PNG"}
        </button>
        <button className="rounded-xl bg-gray-900 text-white px-4 py-2 cursor-pointer" onClick={share}>
          Share
        </button>
      </div>
    </div>
  )
}
