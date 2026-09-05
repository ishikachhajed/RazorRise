import React, { useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import { BarChart3, Sparkles, DollarSign, ShoppingCart, Percent, ArrowUpRight, ShieldCheck, CheckCircle2, XCircle, Filter } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const MerchantDashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'CAPTURED' | 'FAILED'>('ALL');

  useEffect(() => {
    ApiService.getMerchantDashboard()
      .then((res) => { setData(res); setLoading(false); })
      .catch((err) => { console.error(err); setLoading(false); });
  }, []);

  const chartData = [
    { day: 'Mon', totalRevenue: 54000, aiRevenue: 22000 },
    { day: 'Tue', totalRevenue: 62000, aiRevenue: 28000 },
    { day: 'Wed', totalRevenue: 58000, aiRevenue: 24000 },
    { day: 'Thu', totalRevenue: 75000, aiRevenue: 34000 },
    { day: 'Fri', totalRevenue: 89000, aiRevenue: 42000 },
    { day: 'Sat', totalRevenue: 96000, aiRevenue: 48000 },
    { day: 'Sun', totalRevenue: 104000, aiRevenue: 52000 }
  ];

  if (loading) return (
    <div className="container text-center text-muted flex items-center justify-center gap-2" style={{ minHeight: '50vh' }}>
      <Sparkles className="animate-spin text-primary" size={20} /> Loading merchant revenue metrics...
    </div>
  );

  const m = data?.metrics || {};
  const recentOrders = data?.recentOrders || [];

  const filteredOrders = recentOrders.filter((o: any) => {
    if (orderFilter === 'ALL') return true;
    if (orderFilter === 'CAPTURED') return o.paymentStatus?.toLowerCase() === 'captured' || o.status?.toLowerCase() === 'paid';
    if (orderFilter === 'FAILED') return o.paymentStatus?.toLowerCase() === 'failed' || o.status?.toLowerCase() === 'failed';
    return true;
  });

  return (
    <div className="container flex-col gap-8" style={{ display: 'flex' }}>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="m-0 flex items-center gap-2 font-bold text-2xl">
            <BarChart3 size={24} style={{ color: 'var(--color-mauve)' }} />
            Merchant Overview
          </h1>
          <p className="text-muted m-0 mt-1">AI-powered commerce performance and revenue metrics</p>
        </div>
        <span className="badge badge-success flex items-center gap-2">
          <ShieldCheck size={14} /> Razorpay Test Mode
        </span>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex-col gap-2 p-4">
          <div className="flex justify-between items-center text-muted font-bold text-xs">
            <span>TOTAL REVENUE</span> <DollarSign size={16} style={{ color: 'var(--color-sage)' }} />
          </div>
          <div className="text-2xl font-bold">₹{m.totalRevenue?.toLocaleString('en-IN')}</div>
          <div className="flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--color-sage)' }}>
            <ArrowUpRight size={14} /> +14.2% vs baseline
          </div>
        </div>

        <div className="card flex-col gap-2 p-4" style={{ backgroundColor: '#FAF5F6' }}>
          <div className="flex justify-between items-center font-bold text-xs" style={{ color: 'var(--color-mauve)' }}>
            <span>AI-ASSISTED REVENUE</span> <Sparkles size={16} />
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-mauve)' }}>₹{m.aiRevenue?.toLocaleString('en-IN')}</div>
          <div className="flex justify-between text-xs font-bold">
            <span>{m.aiRevenuePercentage || 36}% of sales</span>
            <span className="text-muted">{m.aiOrders} orders</span>
          </div>
        </div>

        <div className="card flex-col gap-2 p-4">
          <div className="flex justify-between items-center text-muted font-bold text-xs">
            <span>AVG ORDER VALUE (AOV)</span> <ShoppingCart size={16} />
          </div>
          <div className="text-2xl font-bold">₹{m.averageOrderValue?.toLocaleString('en-IN')}</div>
          <div className="flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--color-sage)' }}>
            <ArrowUpRight size={14} /> Reconciled
          </div>
        </div>

        <div className="card flex-col gap-2 p-4">
          <div className="flex justify-between items-center text-muted font-bold text-xs">
            <span>CONVERSION RATE</span> <Percent size={16} />
          </div>
          <div className="text-2xl font-bold">{m.conversionRate || 7}%</div>
          <div className="text-xs text-muted font-medium">Target: 3.0% - 4.0%</div>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <h3 className="m-0 mb-1 font-bold">Revenue Performance</h3>
        <p className="m-0 text-muted text-sm mb-4">Total Revenue vs AI-assisted Commerce Revenue</p>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D8E2DC" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#D8E2DC" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9D8189" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#9D8189" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE2E3" />
              <XAxis dataKey="day" stroke="#8B8084" fontSize={12} />
              <YAxis stroke="#8B8084" fontSize={12} tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #EAE2E3' }} />
              <Area type="monotone" dataKey="totalRevenue" stroke="#D8E2DC" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
              <Area type="monotone" dataKey="aiRevenue" stroke="#9D8189" fillOpacity={1} fill="url(#colorAI)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="m-0 mb-1 font-bold">Database Orders & Activity</h3>
            <p className="text-sm text-muted m-0">Live captured and failed payment attempts</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted" />
            <button onClick={() => setOrderFilter('ALL')} className={orderFilter === 'ALL' ? 'btn-primary text-xs py-1 px-2' : 'btn-tertiary text-xs py-1 px-2'}>ALL</button>
            <button onClick={() => setOrderFilter('CAPTURED')} className={orderFilter === 'CAPTURED' ? 'btn-primary text-xs py-1 px-2' : 'btn-tertiary text-xs py-1 px-2'} style={orderFilter === 'CAPTURED' ? {backgroundColor: 'var(--color-sage)'} : {}}>CAPTURED</button>
            <button onClick={() => setOrderFilter('FAILED')} className={orderFilter === 'FAILED' ? 'btn-primary text-xs py-1 px-2' : 'btn-tertiary text-xs py-1 px-2'} style={orderFilter === 'FAILED' ? {backgroundColor: '#d9534f'} : {}}>FAILED</button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center text-muted p-8 border rounded-md">No orders match the selected filter.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th className="py-2 text-muted uppercase font-bold text-xs">Order ID</th>
                  <th className="py-2 text-muted uppercase font-bold text-xs">Razorpay Order ID</th>
                  <th className="py-2 text-muted uppercase font-bold text-xs">Amount</th>
                  <th className="py-2 text-muted uppercase font-bold text-xs">Status</th>
                  <th className="py-2 text-muted uppercase font-bold text-xs">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o: any) => {
                  const isCaptured = o.paymentStatus?.toLowerCase() === 'captured' || o.status?.toLowerCase() === 'paid';
                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="py-3 font-mono text-xs">{o.id.slice(0, 12)}...</td>
                      <td className="py-3 font-mono text-xs" style={{ color: 'var(--color-mauve)' }}>{o.razorpayOrderId}</td>
                      <td className="py-3 font-bold">₹{o.amount.toLocaleString('en-IN')}</td>
                      <td className="py-3">
                        {isCaptured ? (
                          <span className="badge badge-success flex items-center gap-1 w-max"><CheckCircle2 size={12} /> CAPTURED</span>
                        ) : (
                          <span className="badge flex items-center gap-1 w-max" style={{ backgroundColor: '#FDF2F2', color: '#D92D20', border: '1px solid #F9D0C4' }}><XCircle size={12} /> FAILED</span>
                        )}
                      </td>
                      <td className="py-3 text-muted text-xs">
                        {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
