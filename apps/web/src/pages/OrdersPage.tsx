import React, { useEffect, useState } from 'react';
import { Download, CheckCircle, XCircle, Clock, Package, RefreshCw } from 'lucide-react';
import { ApiService } from '../services/api';
import { downloadInvoice } from '../utils/invoice';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  subtotal: number;
  imageUrl?: string;
}

interface Order {
  id: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  items: OrderItem[];
  createdAt: string;
}

function formatDate(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

function isPaidOrder(order: Order) {
  const paymentStatus = order.paymentStatus?.toLowerCase();
  const orderStatus = order.status?.toLowerCase();
  return paymentStatus === 'captured' || paymentStatus === 'paid' || orderStatus === 'paid';
}

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    setError(null);
    // The order endpoint returns the complete order history when no status
    // filter is supplied, including paid, pending, and failed orders.
    ApiService.getOrders()
      .then((data) => {
        setOrders(data.orders || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();

    // Payment verification can finish while this page is already open.
    // Refresh when the browser returns here and briefly poll for the webhook result.
    const refreshOnReturn = () => fetchOrders();
    window.addEventListener('focus', refreshOnReturn);
    window.addEventListener('pageshow', refreshOnReturn);
    const refreshTimer = window.setInterval(fetchOrders, 15000);

    return () => {
      window.removeEventListener('focus', refreshOnReturn);
      window.removeEventListener('pageshow', refreshOnReturn);
      window.clearInterval(refreshTimer);
    };
  }, []);

  const handleDownloadInvoice = (order: Order) => {
    downloadInvoice({
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId,
      amount: order.amount,
      items: order.items,
      createdAt: order.createdAt,
      paymentStatus: order.paymentStatus || order.status
    });
  };

  const getStatusBadge = (order: Order) => {
    // Handle both 'captured' paymentStatus and 'paid' order status
    const paymentStatus = order.paymentStatus?.toLowerCase();
    const orderStatus = order.status?.toLowerCase();
    const isPaid = isPaidOrder(order);
    const isFailed = paymentStatus === 'failed' || orderStatus === 'failed' || orderStatus === 'cancelled';
    if (isPaid) {
      return (
        <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'20px', backgroundColor:'#dcfce7', color:'#166534' }}>
          <CheckCircle size={12} /> Paid / Successful
        </span>
      );
    }
    if (isFailed) {
      return (
        <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'20px', backgroundColor:'#fee2e2', color:'#D92D20' }}>
          <XCircle size={12} /> Failed
        </span>
      );
    }
    return (
      <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'20px', backgroundColor:'#FAF5F6', color:'#9D8189' }}>
        <Clock size={12} /> Pending
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2.5rem 1rem 4rem' }}>
      {/* Page Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.75rem' }}>
        <div>
          <h1 style={{ fontSize:'1.6rem', fontWeight:800, margin:0, letterSpacing:'-0.5px' }}>My Orders</h1>
          <p style={{ margin:'4px 0 0', color:'var(--text-muted)', fontSize:'0.875rem' }}>
            View your order history and download receipts
          </p>
        </div>
        <button onClick={fetchOrders} className="btn-tertiary" style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'13px' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding:'3rem 0', color:'var(--text-muted)', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
          <RefreshCw size={28} style={{ animation:'spin 1s linear infinite' }} />
          <span>Loading your orders…</span>
        </div>
      )}

      {!loading && error && (
        <div className="card" style={{ padding:'1.5rem', textAlign:'center', color:'#D92D20', backgroundColor:'#FDF2F2' }}>
          <XCircle size={32} style={{ margin:'0 auto 8px' }} />
          <p style={{ margin:0 }}>Could not load orders: {error}</p>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="card" style={{ padding:'3rem', textAlign:'center' }}>
          <Package size={48} style={{ color:'var(--text-muted)', margin:'0 auto 16px', opacity:0.5 }} />
          <h3 style={{ fontWeight:700, fontSize:'1.1rem', margin:'0 0 8px' }}>No orders yet</h3>
          <p style={{ color:'var(--text-muted)', margin:0, fontSize:'0.875rem' }}>
            Once you complete a checkout, your orders will appear here.
          </p>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {orders.map((order) => (
            <div key={order.id} className="card" style={{ padding:'1.25rem' }}>
              {/* Order Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', borderBottom:'1px solid var(--border-color)', paddingBottom:'1rem', marginBottom:'1rem', gap:'1rem' }}>
                <div>
                  <div style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'4px', display:'flex', alignItems:'center', gap:'6px' }}>
                    <Clock size={12} /> {formatDate(order.createdAt)}
                  </div>
                  <div style={{ fontWeight:700, fontSize:'0.95rem' }}>
                    Order <span style={{ color:'var(--color-mauve)' }}>#{order.id.slice(-6).toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px', fontFamily:'monospace' }}>
                    Ref: {order.razorpayOrderId}
                  </div>
                </div>

                <div style={{ textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'6px' }}>
                  <div style={{ fontWeight:800, fontSize:'1.15rem' }}>
                    ₹{order.amount.toLocaleString('en-IN')}
                  </div>
                  {getStatusBadge(order)}
                </div>
              </div>

              {/* Items List */}
              {order.items && order.items.length > 0 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginBottom:'1rem' }}>
                  {order.items.map((item, idx) => (
                    <div key={item.id || idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.875rem' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                        <div style={{ width: '40px', height: '40px', backgroundColor: '#FAF5F6', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Package size={16} /></div>
                          )}
                        </div>
                        <span style={{ color:'var(--text-secondary)' }}>
                          <strong>{item.quantity}×</strong> {item.productName}
                        </span>
                      </div>
                      <span style={{ fontWeight:600 }}>₹{item.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', margin:'0 0 1rem' }}>Item details not available.</p>
              )}

              {/* Actions */}
              <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:'0.75rem', borderTop:'1px solid var(--border-color)' }}>
                <button
                  onClick={() => handleDownloadInvoice(order)}
                  disabled={!isPaidOrder(order)}
                  className="btn-tertiary"
                  style={{
                    display:'flex', alignItems:'center', gap:'6px', fontSize:'13px',
                    opacity: isPaidOrder(order) ? 1 : 0.45,
                    cursor: isPaidOrder(order) ? 'pointer' : 'not-allowed'
                  }}
                  title={isPaidOrder(order) ? 'Download invoice' : 'Invoice unavailable until payment is successful'}
                >
                  <Download size={14} />
                  {isPaidOrder(order) ? 'Download Invoice' : 'Invoice Unavailable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
