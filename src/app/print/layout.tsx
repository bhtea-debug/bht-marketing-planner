import './print.css';
import PrintToolbar from './print-toolbar';

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="print-root">
      <PrintToolbar />
      <div className="print-page">
        {children}
      </div>
    </div>
  );
}
