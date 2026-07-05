"use client";

// Triggers the browser's print dialog, from which the tutor can save a PDF.
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn btn-primary btn-sm print:hidden"
    >
      Print / Save as PDF
    </button>
  );
}
