import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, ShieldCheck, Sparkles, BarChart3, LineChart, FileText, Bot, Package, ClipboardList } from 'lucide-react';

interface NavbarProps {
  cartItemCount: number;
  onOpenCart: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ cartItemCount, onOpenCart }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="navbar">
      <div className="flex items-center gap-4">
        {/* Brand Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            backgroundColor: '#283618', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Bot color="#F0EFEB" size={24} />
          </div>
          <div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              RazorRise
            </span>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-sage)' }}></span>
              Adaptive Commerce
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="nav-links">
        <Link to="/shop" className={`nav-item ${isActive('/shop') ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={16} />
          AI Assistant
        </Link>
        <Link to="/orders" className={`nav-item ${isActive('/orders') ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ClipboardList size={16} />
          My Orders
        </Link>
        <Link to="/merchant" className={`nav-item ${isActive('/merchant') ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <BarChart3 size={16} />
          Overview
        </Link>
        <Link to="/merchant/catalog" className={`nav-item ${isActive('/merchant/catalog') ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Package size={16} />
          Catalog
        </Link>
        <Link to="/merchant/insights" className={`nav-item ${isActive('/merchant/insights') ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <LineChart size={16} />
          Insights
        </Link>
        <Link to="/merchant/audit" className={`nav-item ${isActive('/merchant/audit') ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileText size={16} />
          Audit Trail
        </Link>
      </nav>

      {/* Right Section: Test Mode Banner & Cart Button */}
      <div className="flex items-center gap-4">
        <div className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ShieldCheck size={14} />
          Test Mode
        </div>

        <button onClick={onOpenCart} className="btn-tertiary relative" title="Open Shopping Cart" style={{ padding: '0.5rem' }}>
          <ShoppingBag size={20} />
          {cartItemCount > 0 && (
            <span style={{
              position: 'absolute', top: '-6px', right: '-6px',
              backgroundColor: '#283618', color: '#F0EFEB',
              fontSize: '11px', fontWeight: 'bold', width: '20px', height: '20px',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {cartItemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
