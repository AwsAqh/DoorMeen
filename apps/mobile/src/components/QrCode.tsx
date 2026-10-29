/**
 * QrCode — dependency-free QR renderer (pure JS via `qrcode-generator`).
 * Renders the module matrix as run-length merged rows of Views so we get the
 * same crisp QR the web shows (QueueQrCard → QRCodeSVG) without adding any
 * native dependency (react-native-svg is not installed in this app).
 */
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import qrcode from 'qrcode-generator';

type Props = {
  /** The value encoded in the QR (queue URL). */
  value: string;
  /** Rendered size in dp (web default: 180). */
  size?: number;
  /** Dark-module colour (web QR is black on white). */
  color?: string;
};

export default function QrCode({ value, size = 180, color = '#000000' }: Props) {
  const modules = useMemo(() => {
    // typeNumber 0 = auto-detect version (qrcode-generator v2); fall back to
    // explicit versions 1..10 in case auto-detection cannot encode the value.
    const TYPE_NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
    for (const typeNumber of TYPE_NUMBERS) {
      try {
        const qr = qrcode(typeNumber, 'M');
        qr.addData(value);
        qr.make();
        const count = qr.getModuleCount();
        const cells: boolean[][] = [];
        for (let r = 0; r < count; r++) {
          const row: boolean[] = [];
          for (let c = 0; c < count; c++) row.push(qr.isDark(r, c));
          cells.push(row);
        }
        return cells;
      } catch {
        // try the next type number
      }
    }
    throw new Error('QR: unable to generate matrix');
  }, [value]);

  const count = modules.length;
  // QR readers require a quiet zone (at least four modules) around the code.
  // Keep it inside the requested size so the rendered card stays predictable.
  const quietZone = 4;
  const cell = size / (count + quietZone * 2);
  const dim = size;

  return (
    <View
      style={[styles.grid, { width: dim, height: dim, padding: quietZone * cell }]}
      pointerEvents="none"
      accessibilityRole="image"
      accessibilityLabel="Queue QR code"
    >
      {modules.map((row, r) => {
        // run-length encode dark cells so we render far fewer subviews
        const segments: { start: number; len: number }[] = [];
        let i = 0;
        while (i < row.length) {
          if (row[i]) {
            let j = i;
            while (j < row.length && row[j]) j++;
            segments.push({ start: i, len: j - i });
            i = j;
          } else {
            i++;
          }
        }
        return (
          <View key={r} style={{ width: count * cell, height: cell, position: 'relative' }}>
            {segments.map((s, k) => (
              <View
                key={k}
                style={{
                  position: 'absolute',
                  left: s.start * cell,
                  width: s.len * cell,
                  height: cell,
                  backgroundColor: color,
                }}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { backgroundColor: 'transparent' },
});
