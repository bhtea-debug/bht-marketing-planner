// @ts-nocheck
import './print.css';

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="print-root">
      <div className="print-toolbar no-print">
        <button onClick={() => window.print()} className="print-btn">🖨 Drukuj / Zapisz PDF</button>
        <button onClick={() => window.close()} className="print-btn print-btn-secondary">✕ Zamknij</button>
      </div>
      <div className="print-page">
        {children}
      </div>
    </div>
  );
}
