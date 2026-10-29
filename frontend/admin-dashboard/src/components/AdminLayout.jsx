import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
      />
      <div className={`main-panel ${collapsed ? 'main-panel-wide' : ''}`}>
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="page-content"><Outlet /></main>
        <footer className="app-footer"><span>© 2026 TechSolde</span><span>Admin preview · Authentication is not configured</span></footer>
      </div>
    </div>
  );
}
