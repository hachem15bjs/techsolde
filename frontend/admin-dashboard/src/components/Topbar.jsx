import { Bell, ChevronDown, Menu, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { navigationItems } from './Sidebar.jsx';

function getTitle(pathname) {
  if (pathname === '/') return 'Overview';
  const segment = pathname.split('/').filter(Boolean)[0];
  return segment ? segment[0].toUpperCase() + segment.slice(1) : 'Overview';
}

export default function Topbar({ onMenuClick }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const matches = useMemo(() => query
    ? navigationItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    : [], [query]);

  function choose(path) {
    navigate(path);
    setQuery('');
  }

  return (
    <header className="topbar">
      <div className="topbar-title">
        <button className="icon-button mobile-menu" onClick={onMenuClick} aria-label="Open navigation"><Menu size={21} /></button>
        <div><span className="breadcrumb">Workspace <span>/</span></span><h1>{getTitle(pathname)}</h1></div>
      </div>
      <div className="topbar-actions">
        <div className="global-search">
          <Search size={17} />
          <input
            aria-label="Search dashboard sections"
            placeholder="Search pages..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && matches[0]) choose(matches[0].path);
              if (event.key === 'Escape') setQuery('');
            }}
          />
          {matches.length > 0 && (
            <div className="search-results">
              {matches.map((item) => <button key={item.path} onClick={() => choose(item.path)}>{item.label}</button>)}
            </div>
          )}
        </div>
        <button className="icon-button notification-button" aria-label="Notifications" onClick={() => navigate('/notifications')}><Bell size={19} /><span /></button>
        <div className="topbar-divider" />
        <button className="profile-button" aria-label="Admin preview profile">
          <span className="avatar">A</span>
          <span className="profile-copy"><strong>Admin</strong><small>Workspace owner</small></span>
          <ChevronDown size={16} />
        </button>
      </div>
    </header>
  );
}
