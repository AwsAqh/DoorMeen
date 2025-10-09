// src/pages/ScanPage.tsx
import { useCallback } from "react";

import { Scanner ,type IDetectedBarcode} from "@yudiel/react-qr-scanner";

export default function ScanPage() {
 

  type BarcodeLike = Partial<
  Record<"rawValue" | "displayValue" | "text" | "value", unknown>
>;
  const handleDecode = useCallback(() => {
    console.log("this is not empty...")
  }, [/* navigate */]);
  
  const extractText = (codes: IDetectedBarcode[]): string | null => {
    const keys = ["rawValue", "displayValue", "text", "value"] as const;
  
    for (const c of codes) {
      const b = c as BarcodeLike;
      for (const k of keys) {
        const v = b[k];
        if (typeof v === "string" && v.trim() !== "") return v;
      }
    }
    return null;
  };
  
  return (
    <Scanner
      onScan={(codes: IDetectedBarcode[]) => {
        const text = extractText(codes);
        if (text) handleDecode();
      }}
      onError={(e) => console.log(e)}
      constraints={{ facingMode: "environment" }}
    />
  );
}
