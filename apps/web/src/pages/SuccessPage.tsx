import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ShieldCheck, FileText, ShoppingBag, ClipboardList } from 'lucide-react';

export const SuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') || 'ord_demo_101';
  const paymentId = searchParams.get('paymentId') || 'pay_demo_902';

  return (
    <div className="container mx-auto" style={{ maxWidth: '600px', textAlign: 'center', paddingTop: '4rem', paddingBottom: '4rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: 'var(--color-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '3px solid #b5c5bb' }}>
        <CheckCircle2 size={38} />
      </div>

      <div>
        <h1 className="font-bold text-3xl m-0">Payment Successful! 🎉</h1>
        <p className="text-muted mt-2 m-0">Your order has been confirmed and verified via Razorpay Test Mode</p>
      </div>

      <div className="card text-left flex flex-col gap-3">
        <div className="flex justify-between items-center border-b pb-3">
          <span className="text-muted font-medium">Payment Status</span>
          <span className="font-bold flex items-center gap-1" style={{ color: 'var(--color-sage)' }}>
            <ShieldCheck size={16} /> VERIFIED & CAPTURED
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted">Database Order ID</span>
          <code className="font-bold text-sm">#{orderId.slice(-6).toUpperCase()}</code>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted">Razorpay Payment ID</span>
          <code className="text-sm" style={{ color: 'var(--color-mauve)' }}>{paymentId}</code>
        </div>
        <div className="flex justify-between items-center border-t pt-3">
          <span className="text-muted">Verification Check</span>
          <span className="text-sm font-medium">HMAC-SHA256 Signature Passed</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
        <Link to="/orders" className="btn-primary flex items-center gap-2" style={{ textDecoration: 'none', padding: '10px 20px' }}>
          <ClipboardList size={16} /> View My Orders
        </Link>
        <Link to="/shop" className="btn-tertiary flex items-center gap-2" style={{ textDecoration: 'none', padding: '10px 20px' }}>
          <ShoppingBag size={16} /> Continue Shopping <ArrowRight size={16} />
        </Link>
        <Link to="/merchant/audit" className="btn-tertiary flex items-center gap-2" style={{ textDecoration: 'none', padding: '10px 20px' }}>
          <FileText size={16} /> Audit Trail
        </Link>
      </div>

    </div>
  );
};
