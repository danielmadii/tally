"use client";

import { createPortal } from "react-dom";

/**
 * Dialog shell rendered at the document root. Portalling matters: a dialog
 * left inside a dimmed table row would inherit that row's opacity.
 */
export default function Modal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      {children}
    </div>,
    document.body
  );
}
