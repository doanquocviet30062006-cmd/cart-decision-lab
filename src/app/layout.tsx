import type { Metadata } from 'next';
import { Shell } from '@/components/shell';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'CART Decision Lab', template: '%s | CART Decision Lab' },
  description: 'Phòng thí nghiệm CART: phân loại, hồi quy, cắt tỉa và giải thích đường đi của cây quyết định.',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="vi" suppressHydrationWarning><body><script dangerouslySetInnerHTML={{ __html: "try { document.documentElement.dataset.theme = localStorage.getItem('cart-theme') || 'dark' } catch {}" }} /><Shell>{children}</Shell></body></html>;
}
