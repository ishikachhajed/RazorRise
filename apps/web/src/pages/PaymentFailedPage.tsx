import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AlertCircle, RefreshCw, ShoppingBag, ShieldCheck } from 'lucide-react';

export const PaymentFailedPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason') || 'Transaction declined by bank or user cancelation';

  return (
    <div className="container mx-auto" style={{ maxWidth: '600px', textAlign: 'center', paddingTop: '4rem', paddingBottom: '4rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#FDF2F2', border: '1px solid #F9D0C4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: '#D92D20' }}>
        <AlertCircle size={36} />
      </div>

      <div>
        <h1 className="font-bold text-3xl m-0">Payment Couldn't Be Completed</h1>
        <p className="text-muted mt-2 m-0">The transaction was declined or canceled during Razorpay checkout</p>
      </div>

      <div className="badge badge-success flex items-center gap-2 justify-center p-3" style={{ textTransform: 'none', fontWeight: 600 }}>
        <ShieldCheck size={16} />
        Your cart is 100% safe. No items were removed from your session.
      </div>

      <div className="card text-left flex flex-col gap-2">
        <span className="text-xs text-muted uppercase font-bold tracking-wider">Decline Reason</span>
        <code className="bg-card border rounded-md p-3 text-sm block" style={{ backgroundColor: '#FDFBFB' }}>
          {reason}
        </code>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
        <Link to="/shop" className="btn-primary flex items-center gap-2" style={{ textDecoration: 'none', padding: '10px 20px' }}>
          <RefreshCw size={16} /> Try Payment Again
        </Link>
        <Link to="/shop" className="btn-tertiary flex items-center gap-2" style={{ textDecoration: 'none', padding: '10px 20px' }}>
          <ShoppingBag size={16} /> Back to Shopping
        </Link>
      </div>

    </div>
  );
};
