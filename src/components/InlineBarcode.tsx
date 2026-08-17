"use client";

import { memo, useEffect, useRef } from "react";

/**
 * Small barcode rendered in a table cell — recognisable at a glance and
 * scannable straight off the screen.
 */
function InlineBarcode({ value, onClick }: { value: string; onClick?: () => void }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const JsBarcode = (await import("jsbarcode")).default;
      if (cancelled || !svgRef.current) return;
      const opts = {
        height: 26,
        width: 1.1,
        margin: 0,
        fontSize: 10,
        textMargin: 1,
        background: "transparent",
        lineColor: "#0f172a",
      };
      try {
        JsBarcode(svgRef.current, value, {
          ...opts,
          format: /^\d{13}$/.test(value) ? "EAN13" : "CODE128",
        });
      } catch {
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
    <button
      type="button"
      onClick={onClick}
      title="Show full size"
      className="block rounded p-0.5 hover:bg-slate-100"
    >
      <svg ref={svgRef} />
    </button>
  );
}

export default memo(InlineBarcode);
