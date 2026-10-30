import {
  Bell, Boxes, ChartNoAxesCombined, ChevronLeft, CreditCard, Grid2X2, Layers3, Megaphone,
  MessageSquareText, Package, Settings, ShoppingBag, Siren, TicketPercent, Users, X
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navigation = [
  { label: 'Overview', path: '/', icon: Grid2X2, active: true },
  { label: 'Users', path: '/users', icon: Users },
  { label: 'Products', path: '/products', icon: Package },
  { label: 'Categories', path: '/categories', icon: Layers3 },
  { label: 'Promotions', path: '/promotions', icon: Megaphone },
  { label: 'Coupons', path: '/coupons', icon: TicketPercent },
  { label: 'Alerts', path: '/alerts', icon: Siren },
  { label: 'Orders', path: '/orders', icon: ShoppingBag },
  { label: 'Payments', path: '/payments', icon: CreditCard },
  { label: 'Notifications', path: '/notifications', icon: Bell },
  { label: 'Reviews', path: '/reviews', icon: MessageSquareText },
  { label: 'Settings', path: '/settings', icon: Settings }
];

export const navigationItems = navigation;

export default function Sidebar({ open, onClose, collapsed, onToggleCollapsed }) {
  return (
    <>
      {open && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={onClose} />}
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${open ? 'sidebar-mobile-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><ChartNoAxesCombined size={21} strokeWidth={2.2} /></div>
          <div className="brand-copy"><strong>techsolde</strong><span>ADMIN STUDIO</span></div>
          <button className="icon-button mobile-close" onClick={onClose} aria-label="Close navigation"><X size={19} /></button>
        </div>
        <div className="workspace-pill"><span className="workspace-dot" /> Store workspace <ChevronLeft size={15} /></div>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="navigation" aria-label="Main navigation">
          {navigation.map(({ label, path, icon: Icon, active }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={onClose}
              title={collapsed ? label : undefined}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {active && <span className="nav-dot" />}
              {!['/', '/promotions', '/coupons', '/alerts'].includes(path) && <span className="coming-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-help-icon"><Boxes size={17} /></div>
          <div><strong>Built for your team</strong><span>One dashboard, every service.</span></div>
        </div>
        <button className="collapse-toggle" onClick={onToggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <ChevronLeft size={17} />
        </button>
      </aside>
    </>
  );
}
