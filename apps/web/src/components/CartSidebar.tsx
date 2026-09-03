import React from 'react';
import { Cart } from '../services/api';
import { ShoppingBag, X, Trash2, ArrowRight, ShieldCheck, Package } from 'lucide-react';

interface CartSidebarProps {
  cart: Cart | null;
  isOpen: boolean;
  onClose: () => void;
  onRemoveItem: (itemId: string) => void;
  onProceedToCheckout: () => void;
  onClearCart?: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
  cart, isOpen, onClose, onRemoveItem, onProceedToCheckout, onClearCart
}) => {
  if (!isOpen) return null;

  const items = cart?.items || [];
  const itemCount = cart?.itemCount || 0;
  const subtotal = cart?.subtotal || 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ position: 'fixed', right: 0, top: 0, bottom: 0, height: '100%', margin: 0, borderRadius: 0, width: '400px', maxWidth: '100%', display: 'flex', flexDirection: 'column', padding: 0 }}>
        
        {/* Header */}
        <div className="border-b flex items-center justify-between p-4" style={{ backgroundColor: '#FAF5F6' }}>
          <div className="flex items-center gap-3">
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--color-peach)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold m-0">Your Shopping Cart</h3>
              <p className="text-xs text-muted m-0">{itemCount} {itemCount === 1 ? 'item' : 'items'} selected</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && onClearCart && (
              <button onClick={onClearCart} className="text-xs font-bold btn-tertiary" style={{ color: '#d9534f', borderColor: '#d9534f', padding: '4px 8px' }}>
                Clear
              </button>
            )}
            <button onClick={onClose} className="btn-tertiary" style={{ padding: '6px', border: 'none' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3">
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', backgroundColor: '#FAF5F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <ShoppingBag size={32} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-primary m-0">Your cart is empty</h4>
                <p className="text-xs text-muted mt-1">
                  Tell the AI Assistant what you're looking for to discover matching products.
                </p>
              </div>
            </div>
          ) : (
            items.map((item) => <CartItemRow key={item.id} item={item} onRemove={onRemoveItem} />)
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-4 flex flex-col gap-3 bg-card">
            <div className="text-sm text-secondary flex flex-col gap-2">
              <div className="flex justify-between">
                <span>Cart Subtotal</span>
                <span className="font-semibold text-primary">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Security Gate</span>
                <span className="font-semibold flex items-center gap-1 text-sm" style={{ color: 'var(--color-sage)' }}>
                  <ShieldCheck size={14} /> Server Calculated
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-1 text-lg font-bold text-primary">
                <span>Total Payable</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button onClick={() => { onClose(); onProceedToCheckout(); }} className="btn-primary w-full flex items-center justify-center gap-2 font-bold py-3 text-sm">
              Proceed to Checkout
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const CartItemRow: React.FC<{ item: any; onRemove: (id: string) => void }> = ({ item, onRemove }) => {
  const [imgError, setImgError] = React.useState(false);
  return (
    <div className="card p-3 flex items-center gap-3">
      <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#FAF5F6', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
        {!imgError && item.imageUrl ? (
          <img src={item.imageUrl} alt={item.productName} onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Package size={24} style={{ opacity: 0.6 }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold m-0 truncate">{item.productName}</h4>
        <p className="text-xs text-muted m-0 mt-1">
          Qty: <strong>{item.quantity}</strong> × ₹{item.price.toLocaleString('en-IN')}
        </p>
      </div>
      <div className="text-right shrink-0 flex flex-col items-end gap-1">
        <span className="text-xs font-bold block">₹{item.subtotal.toLocaleString('en-IN')}</span>
        <button onClick={() => onRemove(item.id)} className="btn-tertiary" style={{ padding: '2px', border: 'none', color: '#d9534f' }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
