'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore, useState } from 'react';
import { LayoutDashboard, GitBranch, TrendingUp, FlaskConical, Route, Scissors, BookOpen, Sun, Moon, Menu, X, Binary, ShieldCheck, PanelLeftClose } from 'lucide-react';
import { Button } from './ui/button';
import { metadata, warning } from '@/lib/data';
const routes = [
  { href: '/', label: 'Tổng quan', en: 'Overview', icon: LayoutDashboard },
  { href: '/classification', label: 'Phòng phân loại', en: 'Classification Lab', icon: GitBranch },
  { href: '/regression', label: 'Phòng hồi quy', en: 'Regression Lab', icon: TrendingUp },
  { href: '/prediction', label: 'Dự đoán trực tiếp', en: 'Live Prediction', icon: FlaskConical },
  { href: '/decision-path', label: 'Khám phá đường đi', en: 'Decision Path', icon: Route },
  { href: '/pruning', label: 'Thí nghiệm cắt tỉa', en: 'Pruning Experiment', icon: Scissors },
  { href: '/algorithm', label: 'Hiểu thuật toán', en: 'Algorithm Explainer', icon: BookOpen },
];
const subscribe = (cb: () => void) => { window.addEventListener('cart-theme', cb); return () => window.removeEventListener('cart-theme', cb); };
const getTheme = () => localStorage.getItem('cart-theme') || 'dark';
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'dark');
  const [open, setOpen] = useState(false);
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('cart-theme', next); document.documentElement.dataset.theme = next;
    window.dispatchEvent(new Event('cart-theme'));
  }
  const current = routes.find(r => r.href === pathname) || routes[0];
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
    {open && <button className="mobile-backdrop" aria-label="Đóng menu điều hướng" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`} aria-label="Điều hướng chính">
      <Link href="/" className="brand" onClick={() => setOpen(false)}><span className="brand-icon"><GitBranch size={23} /></span><span>CART<span className="brand-sub">DECISION LAB</span></span></Link>
      <Button className="mobile-close" variant="ghost" size="icon" aria-label="Đóng menu" onClick={() => setOpen(false)}><X size={20} /></Button>
      <p className="nav-label">KHÔNG GIAN NGHIÊN CỨU</p>
      <nav>{routes.map((r, i) => <Link key={r.href} href={r.href} className={`nav-item ${pathname === r.href ? 'nav-active' : ''}`} aria-current={pathname === r.href ? 'page' : undefined} onClick={() => setOpen(false)}><r.icon size={19} /><span>{r.label}</span><span className="nav-number">0{i + 1}</span></Link>)}</nav>
      <div className="sidebar-bottom"><div className="research-card"><Binary size={20} /><strong>Học từ dữ liệu.<br />Hiểu từng quyết định.</strong><p>Hệ hỗ trợ quyết định<br />Decision Support Systems</p></div><div className="version"><ShieldCheck size={15} /><span>{metadata.version}</span></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumbs"><Button variant="ghost" size="icon" className="mobile-menu" aria-label="Mở menu điều hướng" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={21} /></Button><PanelLeftClose size={18} className="desktop-only muted" /><span className="muted desktop-only">Không gian nghiên cứu</span><span className="separator desktop-only">/</span><span>{current.en}</span></div><div className="topbar-actions"><span className="research-badge">ACADEMIC PROJECT</span><Button variant="ghost" size="icon" aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'} onClick={toggleTheme}>{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</Button><span className="avatar" aria-label="CART Decision Lab">CL</span></div></header>
      <main id="main-content" tabIndex={-1}>{children}</main>
      <footer className="footer"><ShieldCheck size={17} /><p>{warning}</p><span className="footer-label">RESEARCH USE ONLY</span></footer>
    </div>
  </div>;
}
