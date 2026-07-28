import { DM_Sans } from 'next/font/google';
import './prescription.css';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export default function PrescriptionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${dmSans.variable} rx-scope`} style={{ minHeight: '100%', background: 'var(--bg)' }}>
      {children}
    </div>
  );
}
