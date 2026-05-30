import React, { useState } from 'react';
import { Send, Bell, Users, Store, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { sendPushNotification } from '../services/api';

interface NotificationForm {
  target: 'all' | number;
  title: string;
  body: string;
}

interface SentNotification {
  id: number;
  target: string;
  title: string;
  body: string;
  sentAt: string;
  status: 'success' | 'error';
}

export const NotificationCenter: React.FC = () => {
  const { restaurants, showToast } = useAdmin();
  const [form, setForm] = useState<NotificationForm>({ target: 'all', title: '', body: '' });
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<SentNotification[]>([]);
  const [fcmNote, setFcmNote] = useState<string | null>(null);

  const QUICK_TEMPLATES = [
    { label: '🎉 Eid Offer', title: 'Eid Special — 20% Off!', body: 'Celebrate Eid with us! Get 20% off all orders today. Use code EID24. Order now!' },
    { label: '🚀 New Dish', title: 'New on the Menu!', body: 'We just added exciting new items to our menu. Check them out and order fresh today!' },
    { label: '⏰ Closing Soon', title: 'We Close in 1 Hour', body: 'Place your order before we close! Kitchen closes at 11 PM. Order now.' },
    { label: '💎 Loyalty Bonus', title: 'Double Points This Weekend', body: 'Earn 2x loyalty points on every order this weekend only. Don\'t miss out!' },
  ];

  const applyTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    setForm(f => ({ ...f, title: template.title, body: template.body }));
  };

  const getTargetLabel = () => {
    if (form.target === 'all') return 'All App Users';
    const r = restaurants.find(r => r.id === form.target);
    return r ? `${r.name} Customers` : 'Selected Restaurant';
  };

  const handleSend = async () => {
    if (!form.title.trim()) { showToast('Please enter a notification title', 'error'); return; }
    if (!form.body.trim()) { showToast('Please enter a message body', 'error'); return; }

    setSending(true);
    setFcmNote(null);

    try {
      const result = await sendPushNotification({
        title: form.title,
        body: form.body,
        target: form.target,
      });

      if (result.status === 'not_configured') {
        setFcmNote('FCM_SERVER_KEY not configured on Render yet — notification queued locally.');
        showToast('FCM not configured — add FCM_SERVER_KEY to Render env', 'info');
      } else {
        showToast(`Notification sent to ${getTargetLabel()} ✅`, 'success');
      }

      setHistory(prev => [{
        id: Date.now(),
        target: getTargetLabel(),
        title: form.title,
        body: form.body,
        sentAt: new Date().toLocaleTimeString(),
        status: result.status === 'not_configured' ? 'error' : 'success',
      }, ...prev].slice(0, 20));

      setForm(f => ({ ...f, title: '', body: '' }));
    } catch (err: any) {
      showToast(err.message || 'Failed to send notification', 'error');
      setHistory(prev => [{
        id: Date.now(),
        target: getTargetLabel(),
        title: form.title,
        body: form.body,
        sentAt: new Date().toLocaleTimeString(),
        status: 'error',
      }, ...prev].slice(0, 20));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
          <Bell className="text-blue-400" size={28} />
          Notification Center
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Send Firebase push notifications to all users or restaurant-specific audiences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Panel */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-bold text-white">Compose Notification</h2>

            {/* FCM warning */}
            {fcmNote && (
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <Info size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-amber-300 text-sm">{fcmNote}</p>
              </div>
            )}

            {/* Target Audience */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Target Audience
              </label>
              <select
                id="notif-target"
                value={form.target}
                onChange={e => setForm(f => ({
                  ...f,
                  target: e.target.value === 'all' ? 'all' : Number(e.target.value)
                }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition"
              >
                <option value="all">
                  🌐 All App Users
                </option>
                {restaurants.filter(r => r.is_active).map(r => (
                  <option key={r.id} value={r.id}>
                    🏪 {r.name} Customers Only
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1.5">
                FCM Topic: {form.target === 'all' ? '/topics/all_users' : `/topics/restaurant_${form.target}`}
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Notification Title
              </label>
              <input
                id="notif-title"
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Eid Special Offer! 🎉"
                maxLength={100}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
              />
              <p className="text-xs text-slate-600 mt-1">{form.title.length}/100</p>
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Message Body
              </label>
              <textarea
                id="notif-body"
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                rows={4}
                maxLength={500}
                placeholder="Get 20% off on all orders today only. Order now and earn double loyalty points!"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 transition resize-none"
              />
              <p className="text-xs text-slate-600 mt-1">{form.body.length}/500</p>
            </div>

            {/* Send Button */}
            <button
              id="notif-send-btn"
              onClick={handleSend}
              disabled={sending || !form.title || !form.body}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:cursor-not-allowed"
            >
              <Send size={16} />
              {sending ? 'Sending...' : `Send to ${getTargetLabel()}`}
            </button>
          </div>

          {/* Quick Templates */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Quick Templates</h3>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_TEMPLATES.map((tmpl, i) => (
                <button
                  key={i}
                  onClick={() => applyTemplate(tmpl)}
                  className="text-left p-3 bg-slate-900 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/50 rounded-xl transition-all group"
                >
                  <p className="text-sm font-semibold text-slate-200 group-hover:text-white">{tmpl.label}</p>
                  <p className="text-xs text-slate-500 mt-1 truncate">{tmpl.title}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats + History Panel */}
        <div className="space-y-5">
          {/* Stats */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Audience Size</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Users size={14} />
                  All Users
                </div>
                <span className="text-white font-bold">—</span>
              </div>
              {restaurants.filter(r => r.is_active).map(r => (
                <div key={r.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Store size={14} />
                    {r.name}
                  </div>
                  <span className="text-slate-300 font-semibold text-sm">—</span>
                </div>
              ))}
              <p className="text-xs text-slate-600 mt-2">
                * Audience counts available after FCM device registration is implemented in the mobile app.
              </p>
            </div>
          </div>

          {/* Sent History */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
              Session History ({history.length})
            </h3>
            {history.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-6">No notifications sent this session</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {history.map(n => (
                  <div
                    key={n.id}
                    className="p-3 bg-slate-900 rounded-xl border border-slate-700/60"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-300 truncate">{n.title}</span>
                      {n.status === 'success'
                        ? <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
                        : <AlertCircle size={12} className="text-amber-400 flex-shrink-0" />
                      }
                    </div>
                    <p className="text-xs text-slate-500 truncate">{n.body}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-slate-600">→ {n.target}</span>
                      <span className="text-[10px] text-slate-600">{n.sentAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
