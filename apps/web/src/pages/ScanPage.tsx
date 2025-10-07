// src/pages/ScanPage.tsx
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scanner ,type IDetectedBarcode} from "@yudiel/react-qr-scanner";

export default function ScanPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false); // prevent multiple navigations

  const handleDecode = useCallback((decoded: string) => {
    // parse id from decoded and navigate(`/q/${id}`)
  }, [/* navigate */]);
  
  const extractText = (codes: IDetectedBarcode[]): string | null => {
    // different engines expose different fields
    for (const c of codes) {
      const t =
        (c as any)?.rawValue ??
        (c as any)?.displayValue ??
        (c as any)?.text ??
        (c as any)?.value;
      if (typeof t === "string" && t.trim()) return t;
    }
    return null;
  };
  
  return (
    <Scanner
      onScan={(codes: IDetectedBarcode[]) => {
        const text = extractText(codes);
        if (text) handleDecode(text);
      }}
      onError={(e) => console.log(e)}
      constraints={{ facingMode: "environment" }}
    />
  );
}
