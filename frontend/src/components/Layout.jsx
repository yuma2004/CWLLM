import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, Settings, Search, Bell, HelpCircle, Menu } from 'lucide-react';

export default function Layout({ user }) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const isActive = (path) => location.pathname === path;
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <>
      <nav className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="brand-logo">ChatSync Summary</div>
        </div>
        <div className="sidebar-menu">
          
          <Link to="/companies" className={`menu-item ${isActive('/companies') ? 'active' : ''}`}>
            <span className="menu-icon">
              <Home size={20} />
            </span>
            顧客一覧
          </Link>
          
          {user?.role === 'admin' && (
            <Link to="/admin/rooms" className={`menu-item ${isActive('/admin/rooms') ? 'active' : ''}`}>
              <span className="menu-icon">
                <Settings size={20} />
              </span>
              管理設定
            </Link>
          )}
        </div>
      </nav>

      <div className={`main-wrapper ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <header className="top-header">
          <div className="header-left">
            <div className="hamburger" onClick={toggleSidebar}>
              <Menu size={24} />
            </div>
          </div>
          <div className="header-right">
            <div className="user-profile">
              <span style={{ marginRight: '8px', fontSize: '0.9rem', fontWeight: '500' }}>
                {user?.name || 'User'}
              </span>
              <div className="user-avatar-circle">
                {user?.name?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </header>

        <main className="content-container">
          <Outlet />
        </main>
      </div>
    </>
  );
}
