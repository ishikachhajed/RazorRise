import React, { useEffect, useState } from 'react';
import { ApiService, AuditEvent } from '../services/api';
import { sanitizeText } from '../utils/sanitize';
import { FileText, Filter, ChevronDown, ChevronUp, Code, CheckCircle2, XCircle, AlertTriangle, User, Bot, Server, Search, ShieldCheck, RefreshCw, Zap } from 'lucide-react';

export const AuditTrailPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchEvents(); }, [selectedFilter]);

  const fetchEvents = () => {
    setLoading(true);
    ApiService.getMerchantAuditTrail(selectedFilter)
      .then((res) => { setEvents(res.auditEvents || []); setLoading(false); })
      .catch((err) => { console.error(err); setLoading(false); });
  };

  const filteredEvents = events.filter((evt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return evt.eventType.toLowerCase().includes(q) || evt.action.toLowerCase().includes(q) || evt.actor.toLowerCase().includes(q) || (evt.reason && sanitizeText(evt.reason).toLowerCase().includes(q));
  });

  const totalEvents = events.length;
  const aiEvents = events.filter((e) => e.actor === 'ai').length;
  const gatedConfirmations = events.filter((e) => e.eventType === 'CHECKOUT_CONFIRMATION' || e.eventType === 'RAZORPAY_ORDER_CREATED').length;
  const paymentCaptured = events.filter((e) => e.eventType === 'PAYMENT_SUCCESS').length;

  const getActorBadge = (actor: string) => {
    switch (actor.toLowerCase()) {
      case 'user': return <span className="badge flex items-center gap-1 w-max" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8' }}><User size={12} /> USER</span>;
      case 'ai': return <span className="badge badge-ai flex items-center gap-1 w-max"><Bot size={12} /> AI AGENT</span>;
      default: return <span className="badge flex items-center gap-1 w-max" style={{ backgroundColor: '#FAF5F6', border: '1px solid var(--border-color)', color: 'var(--color-mauve)' }}><Server size={12} /> SYSTEM</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success': return <span className="badge badge-success flex items-center gap-1 w-max"><CheckCircle2 size={12} /> SUCCESS</span>;
      case 'failed': return <span className="badge flex items-center gap-1 w-max" style={{ backgroundColor: '#FDF2F2', border: '1px solid #F9D0C4', color: '#D92D20' }}><XCircle size={12} /> FAILED</span>;
      case 'blocked': return <span className="badge flex items-center gap-1 w-max" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', color: '#D97706' }}><AlertTriangle size={12} /> BLOCKED</span>;
      default: return <span className="text-muted text-xs">{status}</span>;
    }
  };

  return (
    <div className="container flex-col gap-6" style={{ display: 'flex' }}>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--color-peach)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={20} />
          </div>
          <div>
            <h1 className="m-0 font-bold text-2xl">AI & Financial Audit Trail</h1>
            <p className="m-0 text-muted text-sm">Verifiable event log for AI tool executions & gated payment operations</p>
          </div>
        </div>
        <button onClick={fetchEvents} className="btn-tertiary flex items-center gap-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh Ledger
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex-col gap-1 p-4">
          <span className="text-xs text-muted font-medium">TOTAL EVENTS</span>
          <div className="text-2xl font-bold">{totalEvents}</div>
          <span className="text-xs text-muted">Database Ledger</span>
        </div>
        <div className="card flex-col gap-1 p-4" style={{ backgroundColor: '#FAF5F6' }}>
          <span className="text-xs font-bold flex items-center gap-1" style={{ color: 'var(--color-mauve)' }}><Zap size={14} /> AI TOOL EXECUTIONS</span>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-mauve)' }}>{aiEvents}</div>
          <span className="text-xs text-muted">Bounded Operations</span>
        </div>
        <div className="card flex-col gap-1 p-4" style={{ backgroundColor: '#FAF5F6' }}>
          <span className="text-xs font-bold flex items-center gap-1"><ShieldCheck size={14} /> GATED CONFIRMATIONS</span>
          <div className="text-2xl font-bold">{gatedConfirmations}</div>
          <span className="text-xs text-muted">User Financial Approvals</span>
        </div>
        <div className="card flex-col gap-1 p-4" style={{ backgroundColor: 'var(--color-sage)', borderColor: '#b5c5bb' }}>
          <span className="text-xs font-bold flex items-center gap-1"><CheckCircle2 size={14} /> CAPTURED PAYMENTS</span>
          <div className="text-2xl font-bold">{paymentCaptured}</div>
          <span className="text-xs text-muted">HMAC Verified</span>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="card flex flex-col md:flex-row gap-4 items-center justify-between" style={{ backgroundColor: '#FAF5F6' }}>
        <div className="relative" style={{ width: '100%', maxWidth: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Filter by keyword, actor, or reason..." style={{ paddingLeft: '36px' }} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted" />
          <select value={selectedFilter} onChange={(e) => setSelectedFilter(e.target.value)} style={{ width: '220px' }}>
            <option value="ALL">All Event Categories</option>
            <option value="USER_REQUEST">User Requests</option>
            <option value="INTENT_EXTRACTED">Intent Extraction</option>
            <option value="CATALOG_SEARCH">Catalog Searches</option>
            <option value="RECOMMENDATION">Recommendations</option>
            <option value="UPSELL_SUGGESTION">Upsell Engine</option>
            <option value="CHECKOUT_CONFIRMATION">Gated Confirmations</option>
            <option value="RAZORPAY_ORDER_CREATED">Razorpay Orders</option>
            <option value="PAYMENT_CAPTURED">Payment Captures</option>
            <option value="PAYMENT_FAILED">Payment Failures</option>
            <option value="MONEY_ACTION_BLOCKED">Blocked Actions</option>
          </select>
        </div>
      </div>

      {/* Event Log */}
      <div className="card p-0" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div className="p-12 text-center text-muted flex items-center justify-center gap-2">
            <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading audit log...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-muted">No audit events match current filter.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredEvents.map((evt) => {
              const isExpanded = expandedEventId === evt.id;
              const cleanReason = sanitizeText(evt.reason);

              return (
                <div key={evt.id} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3" style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ flexShrink: 0 }}>{getActorBadge(evt.actor)}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="badge" style={{ backgroundColor: '#FAF5F6', border: '1px solid var(--border-color)', fontFamily: 'monospace', color: 'var(--color-mauve)', fontSize: '11px' }}>
                            {evt.eventType}
                          </span>
                          <span className="font-bold text-sm truncate">{evt.action}</span>
                        </div>
                        {cleanReason && (
                          <p className="text-xs text-muted mt-1 m-0" style={{ display: isExpanded ? 'block' : '-webkit-box', WebkitLineClamp: isExpanded ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: isExpanded ? 'visible' : 'hidden' }}>
                            {cleanReason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        {getStatusBadge(evt.status)}
                        <span className="text-xs text-muted font-mono block mt-1">
                          {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <button onClick={() => setExpandedEventId(isExpanded ? null : evt.id)} className={isExpanded ? 'btn-primary flex items-center gap-1 text-xs' : 'btn-tertiary flex items-center gap-1 text-xs'} style={{ padding: '6px 10px' }}>
                        <Code size={12} />
                        {isExpanded ? 'Hide' : 'Details'}
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 p-4 rounded-md border flex flex-col gap-3" style={{ backgroundColor: '#FDFBFB' }}>
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1"><FileText size={14} /> Transaction Context & Payload</span>
                        <span className="text-xs text-muted font-mono">Event ID: {evt.id}</span>
                      </div>
                      
                      {/* Rich Context Section for AI Actions */}
                      {evt.actor === 'ai' && (
                        <div className="bg-white p-3 rounded border mb-2">
                           <h4 className="m-0 text-sm font-bold mb-3 flex items-center gap-2">
                             <Bot size={14} className="text-purple-600" /> AI AGENT DECISION
                           </h4>
                           <div className="grid grid-cols-2 gap-4 text-sm">
                             <div>
                               <span className="text-xs text-muted block mb-1">Trigger / Reason</span>
                               <span className="font-medium text-gray-800">{sanitizeText(evt.reason) || 'Analyzed user intent'}</span>
                             </div>
                             <div>
                               <span className="text-xs text-muted block mb-1">Result / Status</span>
                               <span className="font-bold text-gray-800">{evt.status.toUpperCase()}</span>
                             </div>
                           </div>
                           <div className="mt-3 p-2 bg-purple-50 rounded border border-purple-100 text-xs">
                             <span className="font-bold text-purple-700">Chronological Flow:</span> User request → Intent extracted → AI executed {evt.action} → Context updated.
                           </div>
                        </div>
                      )}

                      {/* Rich Context Section for Financial Events */}
                      {evt.metadata && evt.metadata.amount !== undefined && (
                        <div className="bg-white p-3 rounded border mb-2">
                           <h4 className="m-0 text-sm font-bold mb-3 flex items-center gap-2">
                             {evt.eventType === 'MONEY_ACTION_BLOCKED' && <span className="text-red-500"><AlertTriangle size={14} /> BLOCKED</span>}
                             {evt.eventType === 'GATED_CONFIRMATION_REQUIRED' && <span className="text-orange-500"><AlertTriangle size={14} /> APPROVAL REQUIRED</span>}
                             {evt.eventType === 'RAZORPAY_ORDER_CREATED' && <span className="text-blue-500"><CheckCircle2 size={14} /> AUTO-APPROVED / INITIATED</span>}
                             {evt.eventType === 'PAYMENT_SUCCESS' && <span className="text-green-500"><CheckCircle2 size={14} /> PAYMENT SUCCESS</span>}
                             {evt.eventType === 'PAYMENT_FAILED' && <span className="text-red-500"><XCircle size={14} /> PAYMENT FAILED</span>}
                           </h4>
                           
                           <div className="grid grid-cols-2 gap-4 text-sm">
                             <div>
                               <span className="text-xs text-muted block mb-1">Transaction Amount</span>
                               <span className="font-bold">₹{evt.metadata.amount?.toLocaleString('en-IN') || 0}</span>
                             </div>
                             
                             {evt.metadata.currentSpend !== undefined && (
                               <div>
                                 <span className="text-xs text-muted block mb-1">Current Spending</span>
                                 <span className="font-medium">₹{evt.metadata.currentSpend?.toLocaleString('en-IN')} / ₹{evt.metadata.spendingLimit?.toLocaleString('en-IN')}</span>
                               </div>
                             )}

                             {evt.eventType === 'GATED_CONFIRMATION_REQUIRED' && (
                               <>
                                 <div>
                                   <span className="text-xs text-muted block mb-1">Policy Decision</span>
                                   <span className="font-bold text-orange-600">APPROVAL REQUIRED</span>
                                 </div>
                                 <div>
                                   <span className="text-xs text-muted block mb-1">Applicable Threshold</span>
                                   <span className="font-medium text-gray-700">₹{evt.metadata.autoApproveThreshold?.toLocaleString('en-IN')} (Auto-Approve)</span>
                                 </div>
                               </>
                             )}

                             {evt.eventType === 'MONEY_ACTION_BLOCKED' && (
                               <>
                                 <div>
                                   <span className="text-xs text-muted block mb-1">Policy Decision</span>
                                   <span className="font-bold text-red-600">BLOCKED</span>
                                 </div>
                                 <div>
                                   <span className="text-xs text-muted block mb-1">Applicable Limit</span>
                                   <span className="font-medium text-gray-700">₹{evt.metadata.requireApprovalMax?.toLocaleString('en-IN')} (Max Txn Limit)</span>
                                 </div>
                               </>
                             )}

                             {(evt.eventType === 'PAYMENT_FAILED' || evt.eventType === 'PAYMENT_SUCCESS') && (
                               <div>
                                 <span className="text-xs text-muted block mb-1">Final Outcome</span>
                                 {evt.eventType === 'PAYMENT_FAILED' ? (
                                   <span className="text-red-600 font-bold">Failed. Cart Preserved.</span>
                                 ) : (
                                   <span className="text-green-600 font-bold">Success. Order Created.</span>
                                 )}
                               </div>
                             )}

                             {evt.metadata.razorpayOrderId && (
                               <div>
                                 <span className="text-xs text-muted block mb-1">Razorpay Order ID</span>
                                 <span className="font-mono text-xs">{evt.metadata.razorpayOrderId}</span>
                               </div>
                             )}

                             {evt.metadata.razorpayPaymentId && (
                               <div>
                                 <span className="text-xs text-muted block mb-1">Razorpay Payment ID</span>
                                 <span className="font-mono text-xs">{evt.metadata.razorpayPaymentId}</span>
                               </div>
                             )}
                           </div>
                           
                           {evt.eventType === 'MONEY_ACTION_BLOCKED' && (
                             <div className="mt-3 p-2 bg-red-50 rounded border border-red-100 text-xs">
                               <span className="font-bold text-red-700">Chronological Flow:</span> Policy checked → Transaction blocked → No Razorpay payment initiated.
                             </div>
                           )}
                           
                           {evt.eventType === 'GATED_CONFIRMATION_REQUIRED' && (
                             <div className="mt-3 p-2 bg-orange-50 rounded border border-orange-100 text-xs">
                               <span className="font-bold text-orange-700">Chronological Flow:</span> Policy checked → Approval requested → User pending → Payment on hold.
                             </div>
                           )}
                           
                           {evt.eventType === 'PAYMENT_FAILED' && (
                             <div className="mt-3 p-2 bg-red-50 rounded border border-red-100 text-xs">
                               <span className="font-bold text-red-700">Chronological Flow:</span> Razorpay order created → Payment attempted → Payment failed → Retry available.
                             </div>
                           )}

                           {evt.eventType === 'PAYMENT_SUCCESS' && (
                             <div className="mt-3 p-2 bg-green-50 rounded border border-green-100 text-xs">
                               <span className="font-bold text-green-700">Chronological Flow:</span> Payment attempted → Payment success → Order created.
                             </div>
                           )}
                        </div>
                      )}

                      {/* Technical Payload Details */}
                      <details>
                        <summary className="text-xs font-bold text-muted cursor-pointer hover:text-black">View Raw Technical Payload</summary>
                        <div className="mt-2 space-y-3">
                          {evt.input && (
                            <div>
                              <span className="text-xs font-bold text-muted block mb-1">Input / Trigger:</span>
                              <pre className="bg-card border rounded-md p-3 text-xs m-0 overflow-auto max-h-40 whitespace-pre-wrap">{sanitizeText(evt.input)}</pre>
                            </div>
                          )}
                          {evt.output && (
                            <div>
                              <span className="text-xs font-bold text-muted block mb-1">Result / Output:</span>
                              <pre className="bg-card border rounded-md p-3 text-xs m-0 overflow-auto max-h-48 whitespace-pre-wrap" style={{ color: 'var(--color-mauve)' }}>{sanitizeText(evt.output)}</pre>
                            </div>
                          )}
                          {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                            <div>
                              <span className="text-xs font-bold text-muted block mb-1">JSON Context:</span>
                              <pre className="bg-card border rounded-md p-3 text-xs m-0 overflow-auto max-h-48">{JSON.stringify(evt.metadata, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
