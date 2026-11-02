import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { type Order } from '../../types';

interface RejectOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReject: (reason: string) => Promise<void>;
}

const COMMON_REASONS = [
  'Items out of stock in store',
  'Store closing soon / power outage',
  'Cannot fulfill requested quantity',
  'Invalid delivery address within Dooars region',
  'Heavy rain / natural road disruption',
];

export const RejectOrderModal: React.FC<RejectOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onConfirmReject,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a specific reason for rejection.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirmReject(reason.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reject order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Decline Order</h3>
              <p className="text-xs text-slate-500">Order #{order.orderNumber || order.id.slice(0, 8)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-slate-600">
            Please select or specify the reason for declining this order. The customer will be informed immediately.
          </p>

          {/* Quick Reasons */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Quick Reasons:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_REASONS.map((r, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setReason(r)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border text-left transition-all ${
                    reason === r
                      ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Detailed Reason:
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Fresh stock not delivered from the farm today..."
              rows={3}
              required
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Declining...' : 'Confirm Decline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
