import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Sparkles, BarChart3, LineChart, FileText, Bot, Package, ClipboardList } from 'lucide-react';

interface SidebarProps {
  cartItemCount: number;
  onOpenCart: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ cartItemCount, onOpenCart }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="sidebar">
      {/* Brand Logo */}
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px',
          backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Bot color="var(--color-plum)" size={24} />
        </div>
        <div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
            RazorRise
          </span>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-mint)' }}></span>
            Adaptive Commerce
          </div>
        </div>
      </Link>

      {/* Navigation Links */}
      <nav className="nav-links">
        <Link to="/shop" className={`nav-item ${isActive('/shop') ? 'active' : ''}`}>
          <Sparkles size={18} />
          AI Assistant
        </Link>
        <Link to="/orders" className={`nav-item ${isActive('/orders') ? 'active' : ''}`}>
          <ClipboardList size={18} />
          My Orders
        </Link>
        <Link to="/merchant" className={`nav-item ${isActive('/merchant') ? 'active' : ''}`}>
          <BarChart3 size={18} />
          Overview
        </Link>
        <Link to="/merchant/catalog" className={`nav-item ${isActive('/merchant/catalog') ? 'active' : ''}`}>
          <Package size={18} />
          Catalog
        </Link>
        <Link to="/merchant/insights" className={`nav-item ${isActive('/merchant/insights') ? 'active' : ''}`}>
          <LineChart size={18} />
          Insights
        </Link>
        <Link to="/merchant/audit" className={`nav-item ${isActive('/merchant/audit') ? 'active' : ''}`}>
          <FileText size={18} />
          Audit Trail
        </Link>
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button onClick={onOpenCart} className="relative" style={{ 
          width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
          backgroundColor: '#FFFFFF', color: 'var(--color-plum)', borderRadius: '12px', padding: '12px',
          fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'opacity 0.2s'
        }} onMouseEnter={e => e.currentTarget.style.opacity = '0.9'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
          <ShoppingBag size={18} />
          View Cart
          {cartItemCount > 0 && (
            <span style={{
              backgroundColor: 'var(--color-plum)', color: '#FFF',
              fontSize: '11px', fontWeight: 'bold', width: '20px', height: '20px',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginLeft: '4px'
            }}>
              {cartItemCount}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};
