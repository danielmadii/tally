"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import Modal from "@/components/Modal";

/**
 * Renders a scannable barcode on screen — EAN-13 when the number qualifies,
 * Code-128 otherwise. Useful for testing the phone scanner without physical
 * products, and as the source for printed labels later.
 */
export default function BarcodeView({
  value,
  name,
  onClose,
}: {
  value: string;
  name: string;
  onClose: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const JsBarcode = (await import("jsbarcode")).default;
      if (cancelled || !svgRef.current) return;
      const opts = {
        height: 110,
        width: 2.4,
        margin: 16,
        fontSize: 18,
        background: "#ffffff",
        lineColor: "#0f172a",
      };
      try {
        JsBarcode(svgRef.current, value, {
          ...opts,
          format: /^\d{13}$/.test(value) ? "EAN13" : "CODE128",
        });
      } catch {
        // EAN-13 check digit didn't validate — fall back to Code-128.
        try {
          JsBarcode(svgRef.current, value, { ...opts, format: "CODE128" });
        } catch {
          /* unrenderable value */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <Modal onClose={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <p className="pr-4 text-left text-sm font-semibold text-slate-900">{name}</p>
          <button onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex justify-center overflow-x-auto rounded-lg border border-slate-100 bg-white py-2">
          <svg ref={svgRef} />
        </div>
      </div>
    </Modal>
  );
}
