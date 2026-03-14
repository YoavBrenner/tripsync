import React, { useState, useEffect } from 'react';
import { TripPayment, PaymentCategory, PaymentStatus } from '../types';
import { subscribePayments, addPayment, deletePayment } from '../services/tripService';
import { Plus, Wallet, Trash2 } from 'lucide-react';

interface Props {
  tripId: string;
}

const CATEGORY_OPTIONS: { value: PaymentCategory; label: string }[] = [
  { value: 'flight',     label: 'טיסות' },
  { value: 'hotel',      label: 'לינה' },
  { value: 'car',        label: 'רכב' },
  { value: 'insurance',  label: 'ביטוח' },
  { value: 'activities', label: 'אטרקציות' },
  { value: 'food',       label: 'אוכל' },
  { value: 'other',      label: 'אחר' },
];

const CATEGORY_DOT: Record<PaymentCategory, string> = {
  flight:     'bg-blue-500',
  hotel:      'bg-purple-500',
  car:        'bg-green-500',
  insurance:  'bg-yellow-500',
  activities: 'bg-orange-500',
  food:       'bg-red-500',
  other:      'bg-slate-400',
};

const CATEGORY_BG: Record<PaymentCategory, string> = {
  flight:     'bg-blue-100 text-blue-700',
  hotel:      'bg-purple-100 text-purple-700',
  car:        'bg-green-100 text-green-700',
  insurance:  'bg-yellow-100 text-yellow-700',
  activities: 'bg-orange-100 text-orange-700',
  food:       'bg-red-100 text-red-700',
  other:      'bg-slate-100 text-slate-600',
};

const STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'paid',    label: 'שולם' },
  { value: 'pending', label: 'ממתין' },
  { value: 'partial', label: 'חלקי' },
];

const STATUS_COLOR: Record<PaymentStatus, string> = {
  paid:    'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  partial: 'bg-orange-100 text-orange-700',
};

const CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP'];

// Exchange rates to ILS (rough)
const TO_ILS: Record<string, number> = { ILS: 1, USD: 3.7, EUR: 4.0, GBP: 4.7 };

const EMPTY_FORM = {
  category: 'other' as PaymentCategory,
  description: '',
  amount: '',
  currency: 'ILS',
  status: 'pending' as PaymentStatus,
  notes: '',
};

const TripBudget: React.FC<Props> = ({ tripId }) => {
  const [payments, setPayments] = useState<TripPayment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    return subscribePayments(tripId, setPayments);
  }, [tripId]);

  const f = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleAdd = async () => {
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      await addPayment(tripId, {
        category: form.category,
        description: form.description.trim(),
        amount: parseFloat(form.amount) || 0,
        currency: form.currency,
        status: form.status,
        notes: form.notes.trim(),
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deletePayment(tripId, id);
    setPendingDelete(null);
  };

  // Summary calculations (convert to ILS)
  const totalILS = payments.reduce((sum, p) => sum + p.amount * (TO_ILS[p.currency] ?? 1), 0);
  const paidILS  = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount * (TO_ILS[p.currency] ?? 1), 0);
  const leftILS  = totalILS - paidILS;
  const totalUSD = totalILS / TO_ILS.USD;
  const paidUSD  = paidILS  / TO_ILS.USD;
  const leftUSD  = leftILS  / TO_ILS.USD;

  // Category breakdown
  const byCategory = CATEGORY_OPTIONS.map(cat => {
    const items = payments.filter(p => p.category === cat.value);
    const total = items.reduce((sum, p) => sum + p.amount * (TO_ILS[p.currency] ?? 1), 0);
    return { ...cat, total, count: items.length };
  }).filter(c => c.count > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-slate-800 text-lg">תקציב</h2>
          <p className="text-slate-500 text-sm">{payments.length} תשלומים</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all shadow"
        >
          <Plus className="w-4 h-4" /> הוסף תשלום
        </button>
      </div>

      {/* Summary */}
      {payments.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">סה"כ</p>
              <p className="font-black text-slate-800 text-lg">₪{Math.round(totalILS).toLocaleString()}</p>
              <p className="text-xs text-slate-400">${Math.round(totalUSD).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">שולם</p>
              <p className="font-black text-green-600 text-lg">₪{Math.round(paidILS).toLocaleString()}</p>
              <p className="text-xs text-slate-400">${Math.round(paidUSD).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">נשאר</p>
              <p className="font-black text-orange-500 text-lg">₪{Math.round(leftILS).toLocaleString()}</p>
              <p className="text-xs text-slate-400">${Math.round(leftUSD).toLocaleString()}</p>
            </div>
          </div>

          {byCategory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              {byCategory.map(cat => (
                <div key={cat.value} className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${CATEGORY_DOT[cat.value]}`} />
                  <span className="text-xs text-slate-600 flex-1">{cat.label}</span>
                  <span className="text-xs font-bold text-slate-700">₪{Math.round(cat.total).toLocaleString()}</span>
                  {totalILS > 0 && (
                    <span className="text-[10px] text-slate-400 w-8 text-left">
                      {Math.round((cat.total / totalILS) * 100)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 space-y-4">
          <span className="font-bold text-slate-700 block">תשלום חדש</span>

          {/* Category dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">קטגוריה</label>
            <select
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
              value={form.category}
              onChange={e => f('category', e.target.value as PaymentCategory)}
            >
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full sm:col-span-2"
              placeholder="תיאור"
              value={form.description}
              onChange={e => f('description', e.target.value)}
            />
            <input
              type="number"
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
              placeholder="סכום"
              value={form.amount}
              onChange={e => f('amount', e.target.value)}
              min="0"
            />
            <select
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full"
              value={form.currency}
              onChange={e => f('currency', e.target.value)}
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Status toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-medium">סטטוס</label>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => f('status', opt.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                    form.status === opt.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 w-full resize-none"
            rows={2}
            placeholder="הערות (אופציונלי)"
            value={form.notes}
            onChange={e => f('notes', e.target.value)}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!form.description.trim() || saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-bold text-sm transition-all"
            >
              {saving ? 'שומר...' : 'הוסף תשלום'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {payments.length === 0 && !showForm && (
        <div className="text-center py-16 text-slate-400">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-medium">אין תשלומים עדיין</p>
          <p className="text-sm mt-1">לחצו על "הוסף תשלום" כדי להתחיל לעקוב</p>
        </div>
      )}

      {/* Payments list */}
      <div className="space-y-2">
        {payments.map(payment => (
          <div key={payment.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${CATEGORY_DOT[payment.category]}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${CATEGORY_BG[payment.category]}`}>
                      {CATEGORY_OPTIONS.find(c => c.value === payment.category)?.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLOR[payment.status]}`}>
                      {STATUS_OPTIONS.find(s => s.value === payment.status)?.label}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{payment.description}</p>
                  {payment.amount > 0 && (
                    <p className="text-sm text-slate-600 font-medium mt-0.5">
                      {payment.amount.toLocaleString()} {payment.currency}
                    </p>
                  )}
                  {payment.notes && (
                    <p className="text-xs text-slate-400 mt-0.5 italic">{payment.notes}</p>
                  )}
                </div>
              </div>

              {/* Delete */}
              <div className="flex-shrink-0">
                {pendingDelete === payment.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">בטוח?</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(payment.id)}
                      className="px-2 py-0.5 text-[11px] font-bold bg-red-500 text-white rounded-lg"
                    >
                      כן
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(null)}
                      className="px-2 py-0.5 text-[11px] font-bold bg-slate-200 text-slate-600 rounded-lg"
                    >
                      לא
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(payment.id)}
                    className="p-1.5 text-slate-300 hover:text-red-400 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TripBudget;
