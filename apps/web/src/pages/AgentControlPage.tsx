import React, { useEffect, useState } from 'react';
import { ApiService, AuditEvent } from '../services/api';
import { Bot, Settings, PauseCircle, PlayCircle, ShieldAlert, CreditCard, Activity, ArrowUpCircle, RefreshCw, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';

export const AgentControlPage: React.FC = () => {
  const [config, setConfig] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [confRes, auditRes] = await Promise.all([
        fetch('/api/agent/config').then(r => r.json()),
        ApiService.getMerchantAuditTrail()
      ]);
      setConfig(confRes);
      setRecentEvents(auditRes.auditEvents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };



  const handleUpdate = async (updates: any) => {
    setSaving(true);
    try {
      const res = await fetch('/api/agent/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update agent config');
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="container text-center text-muted flex items-center justify-center gap-2" style={{ minHeight: '50vh' }}>
      <Settings className="animate-spin text-primary" size={20} /> Loading Agent Control Center...
    </div>
  );

  if (!config) return <div className="container">Failed to load configuration.</div>;

  const remainingLimit = Math.max(0, config.monthlySpendingLimit - config.currentMonthlySpend);

  return (
    <div className="container flex-col gap-8" style={{ display: 'flex' }}>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="m-0 flex items-center gap-2 font-bold text-2xl">
            <Bot size={24} style={{ color: 'var(--color-plum)' }} />
            Agent Control Center
          </h1>
          <p className="text-muted m-0 mt-1">Manage AI autonomy, spending limits, and approval policies</p>
        </div>
        <button 
          onClick={() => handleUpdate({ isActive: !config.isActive })}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-white transition-opacity ${config.isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
          disabled={saving}
          style={config.isActive ? { backgroundColor: '#D92D20' } : { backgroundColor: 'var(--color-sage)' }}
        >
          {config.isActive ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
          {config.isActive ? 'Pause Agent' : 'Activate Agent'}
        </button>
      </div>

      {!config.isActive && (
        <div className="card p-4 flex items-center gap-3" style={{ backgroundColor: '#FDF2F2', color: '#D92D20', border: '1px solid #F9D0C4' }}>
          <ShieldAlert size={20} />
          <strong>Agent is currently paused.</strong> All autonomous actions are suspended.
        </div>
      )}

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex-col gap-2 p-4">
          <div className="flex justify-between items-center text-muted font-bold text-xs">
            <span>MONTHLY SPENDING LIMIT</span> <CreditCard size={16} />
          </div>
          <div className="text-2xl font-bold">₹{config.monthlySpendingLimit.toLocaleString('en-IN')}</div>
        </div>

        <div className="card flex-col gap-2 p-4" style={{ backgroundColor: '#FAF5F6' }}>
          <div className="flex justify-between items-center font-bold text-xs" style={{ color: 'var(--color-mauve)' }}>
            <span>CURRENT MONTHLY SPEND</span> <Activity size={16} />
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-mauve)' }}>₹{config.currentMonthlySpend.toLocaleString('en-IN')}</div>
        </div>

        <div className="card flex-col gap-2 p-4">
          <div className="flex justify-between items-center text-muted font-bold text-xs">
            <span>REMAINING LIMIT</span> <CreditCard size={16} style={{ color: 'var(--color-sage)' }} />
          </div>
          <div className="text-2xl font-bold">₹{remainingLimit.toLocaleString('en-IN')}</div>
        </div>
        
        <div className="card flex-col gap-2 p-4">
          <div className="flex justify-between items-center text-muted font-bold text-xs">
            <span>MAX TRANSACTION LIMIT</span> <ArrowUpCircle size={16} style={{ color: '#D92D20' }} />
          </div>
          <div className="text-2xl font-bold">₹{config.requireApprovalMax.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Policies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card flex-col gap-4">
          <h3 className="m-0 font-bold flex items-center gap-2 border-b pb-3">
            <ShieldAlert size={18} className="text-muted" /> Approval Policies
          </h3>
          
          <div className="flex-col gap-2">
            <label className="text-sm font-bold text-muted">Monthly Spending Limit (₹)</label>
            <p className="text-xs text-muted m-0 mb-2">Total budget the agent is allowed to spend per month.</p>
            <div className="flex gap-2">
              <input 
                type="number" 
                className="input-field flex-1" 
                defaultValue={config.monthlySpendingLimit} 
                onBlur={(e) => handleUpdate({ monthlySpendingLimit: Number(e.target.value) })}
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex-col gap-2 mt-4">
            <label className="text-sm font-bold text-muted">Auto-Approve Threshold (₹)</label>
            <p className="text-xs text-muted m-0 mb-2">Purchases below this amount do not require explicit user confirmation.</p>
            <div className="flex gap-2">
              <input 
                type="number" 
                className="input-field flex-1" 
                defaultValue={config.autoApproveThreshold} 
                onBlur={(e) => handleUpdate({ autoApproveThreshold: Number(e.target.value) })}
                disabled={saving}
              />
            </div>
          </div>
          
          <div className="flex-col gap-2 mt-4">
            <label className="text-sm font-bold text-muted">Maximum Transaction Limit (₹)</label>
            <p className="text-xs text-muted m-0 mb-2">Purchases above this amount are entirely blocked, even with approval.</p>
            <div className="flex gap-2">
              <input 
                type="number" 
                className="input-field flex-1" 
                defaultValue={config.requireApprovalMax} 
                onBlur={(e) => handleUpdate({ requireApprovalMax: Number(e.target.value) })}
                disabled={saving}
              />
            </div>
          </div>

        </div>

        <div className="card flex-col gap-4">
           <h3 className="m-0 font-bold flex items-center gap-2 border-b pb-3">
            <CreditCard size={18} className="text-muted" /> Spending Visualizer
          </h3>
          
          <div className="mt-4">
            <div className="flex justify-between text-xs font-bold text-muted mb-2">
              <span>₹0</span>
              <span>₹{config.monthlySpendingLimit.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ width: '100%', height: '12px', backgroundColor: '#EAE2E3', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
               <div style={{ height: '100%', backgroundColor: 'var(--color-plum)', width: `${Math.min(100, (config.currentMonthlySpend / config.monthlySpendingLimit) * 100)}%` }}></div>
            </div>
            <p className="text-xs text-center text-muted mt-2 font-medium">
               {Math.round((config.currentMonthlySpend / config.monthlySpendingLimit) * 100)}% of monthly budget utilized
            </p>
          </div>
          
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--color-sage)' }}></span>
              <span className="text-sm font-medium flex-1">Auto-Approve Zone</span>
              <span className="text-sm font-bold">₹0 - ₹{config.autoApproveThreshold.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center gap-3">
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#F5A623' }}></span>
              <span className="text-sm font-medium flex-1">Approval Required</span>
              <span className="text-sm font-bold">₹{config.autoApproveThreshold.toLocaleString('en-IN')} - ₹{config.requireApprovalMax.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center gap-3">
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#D92D20' }}></span>
              <span className="text-sm font-medium flex-1">Blocked Transactions</span>
              <span className="text-sm font-bold">Above ₹{config.requireApprovalMax.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Decision Flow Visualizer */}
      <div className="card flex-col gap-4 mt-4">
        <h3 className="m-0 font-bold flex items-center gap-2 border-b pb-3">
          <Activity size={18} className="text-muted" /> Live Agent Decision Flow
        </h3>
        <p className="text-xs text-muted m-0">Real-time visualization of the most recent agent transaction flow.</p>
        
        <div className="flex flex-col gap-4 mt-2 p-4" style={{ backgroundColor: '#FDFBFB', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          {recentEvents.length === 0 ? (
            <div className="text-center text-muted text-sm py-4">No recent transactions found.</div>
          ) : (
            (() => {
              // Reconstruct flow from recent events
              const userReq = recentEvents.find(e => e.eventType === 'USER_REQUEST');
              const intent = recentEvents.find(e => e.eventType === 'INTENT_EXTRACTED');
              const cartConf = recentEvents.find(e => e.eventType === 'CHECKOUT_CONFIRMATION' && e.actor === 'ai');
              const approvalReq = recentEvents.find(e => e.eventType === 'GATED_CONFIRMATION_REQUIRED');
              const blocked = recentEvents.find(e => e.eventType === 'MONEY_ACTION_BLOCKED');
              const rzpOrder = recentEvents.find(e => e.eventType === 'RAZORPAY_ORDER_CREATED');
              const payment = recentEvents.find(e => e.eventType === 'PAYMENT_SUCCESS' || e.eventType === 'PAYMENT_FAILED' || e.eventType === 'PAYMENT_CAPTURED');

              return (
                <div className="flex flex-col gap-2 relative">
                  <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" style={{ zIndex: 0 }}></div>
                  
                  {/* Step 1 */}
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${userReq ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>1</div>
                    <div className="flex-1 text-sm font-medium">User Request {userReq && <span className="text-xs text-muted font-normal ml-2">({userReq.input?.substring(0, 30)}...)</span>}</div>
                  </div>
                  
                  {/* Step 2 */}
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${cartConf || intent ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>2</div>
                    <div className="flex-1 text-sm font-medium">Cart Generated {cartConf && <span className="text-xs text-muted font-normal ml-2">(Total: ₹{cartConf.metadata?.subtotal?.toLocaleString('en-IN')})</span>}</div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${(blocked || approvalReq || rzpOrder) ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>3</div>
                    <div className="flex-1 text-sm font-medium">
                      Spending Policy Check
                      {(blocked || approvalReq || rzpOrder) && (
                        <div className="text-xs text-muted font-normal mt-1 p-2 bg-white rounded border">
                           Decision: {blocked ? <span className="text-red-500 font-bold">BLOCKED</span> : approvalReq ? <span className="text-orange-500 font-bold">APPROVAL REQUIRED</span> : <span className="text-green-500 font-bold">AUTO-APPROVED</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 4 */}
                  {approvalReq && (
                    <div className="flex items-center gap-3 relative z-10">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${rzpOrder ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>4</div>
                      <div className="flex-1 text-sm font-medium">User Explicit Approval {rzpOrder && <span className="text-xs text-green-600 font-bold ml-2">Granted</span>}</div>
                    </div>
                  )}

                  {/* Step 5 */}
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${payment ? (payment.eventType === 'PAYMENT_FAILED' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600') : 'bg-gray-100 text-gray-400'}`}>*</div>
                    <div className="flex-1 text-sm font-medium">Payment & Order {payment && <span className={`text-xs font-bold ml-2 ${payment.eventType === 'PAYMENT_FAILED' ? 'text-red-600' : 'text-green-600'}`}>{payment.eventType === 'PAYMENT_FAILED' ? 'FAILED' : 'SUCCESS'}</span>}</div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
      
    </div>
  );
};
