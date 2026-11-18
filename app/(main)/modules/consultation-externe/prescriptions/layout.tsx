import localFont from 'next/font/local';
import './prescription.css';

// Police hébergée dans le projet (voir app/layout.tsx).
const dmSans = localFont({
  src: '../../../../fonts/dm-sans-latin.woff2',
  variable: '--font-dm-sans',
  weight: '300 700',
  display: 'swap',
});

export default function PrescriptionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${dmSans.variable} rx-scope`} style={{ minHeight: '100%', background: 'var(--bg)' }}>
      {children}
    </div>
  );
}
