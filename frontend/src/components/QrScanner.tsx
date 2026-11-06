import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  active: boolean;
  onScan: (decodedText: string) => void;
  onError?: (message: string) => void;
  elementId?: string;
}

const COOLDOWN_MS = 2000;

// Wraps Html5Qrcode with the Canteen prototype's exact working config
// (facingMode 'environment', fps 12, 220px qrbox, 2s decode-cooldown so one
// physical QR code doesn't fire twice while held under the camera). Shared
// by Canteen (porting already-working code) and Gate (net-new capability).
export function QrScanner({ active, onScan, onError, elementId = 'qr-reader' }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!active) return;

    const scanner = new Html5Qrcode(elementId);
    scannerRef.current = scanner;

    const startPromise = scanner.start(
      { facingMode: 'environment' },
      { fps: 12, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
      (decodedText) => {
        const now = Date.now();
        if (now - lastScanRef.current < COOLDOWN_MS) return;
        lastScanRef.current = now;
        onScanRef.current(decodedText);
      },
      undefined
    );
    startPromise.catch((err) => {
      console.error('QR scanner failed to start:', err);
      onErrorRef.current?.('Camera unavailable — use manual entry');
    });

    return () => {
      scannerRef.current = null;
      // Chain off the start promise (settled either way) so stop() never
      // races a start() still in flight — React 19 StrictMode double-invokes
      // effects in dev, which would otherwise call stop() before start()
      // resolves and throw inside html5-qrcode.
      startPromise
        .catch(() => {})
        .then(() => scanner.stop())
        .then(() => scanner.clear())
        .catch(() => {});
    };
  }, [active, elementId]);

  return <div id={elementId} style={{ width: '100%' }} />;
}
