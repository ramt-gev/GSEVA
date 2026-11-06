import { useEffect, useRef } from 'react';

const MIN_LENGTH = 10;
const RESET_MS = 100; // gap between keystrokes that resets the buffer — hardware scanners type far faster than a human

// Ports the Canteen prototype's keyboard-buffer listener for USB/BT HID
// barcode scanners: they "type" the scanned value followed by Enter, faster
// than any human. Ignores keystrokes while focus is inside a real input so
// normal typing (e.g. the manual-search box) never gets misread as a scan.
export function useHardwareScannerInput(onScan: (value: string) => void, active: boolean) {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!active) return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      const now = Date.now();
      if (now - lastKeyTimeRef.current > RESET_MS) {
        bufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= MIN_LENGTH) {
          onScanRef.current(bufferRef.current);
        }
        bufferRef.current = '';
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active]);
}
