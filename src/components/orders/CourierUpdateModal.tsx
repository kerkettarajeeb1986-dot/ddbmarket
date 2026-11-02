import React, { useState } from 'react';
import { X, PackageCheck, Truck, Scale, Check, AlertCircle } from 'lucide-react';
import { type Order, type ShippingStatus, type CourierDetails } from '../../types';

interface CourierUpdateModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateShipping: (status: ShippingStatus, details?: Partial<CourierDetails>) => Promise<void>;
}

export const CourierUpdateModal: React.FC<CourierUpdateModalProps> = ({
  order,
  isOpen,
  onClose,
  onUpdateShipping,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<ShippingStatus>(
    order?.shippingStatus || 'PACKING'
  );
  const [provider, setProvider] = useState(order?.courierDetails?.provider || '');
  const [awbNumber, setAwbNumber] = useState(order?.courierDetails?.awbNumber || '');
  const [weightKg, setWeightKg] = useState<string>(
    order?.courierDetails?.packageWeightKg ? String(order.courierDetails.packageWeightKg) : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const details: Partial<CourierDetails> = {};
      if (provider.trim()) details.provider = provider.trim();
      if (awbNumber.trim()) details.awbNumber = awbNumber.trim();
      if (weightKg && Number(weightKg) > 0) details.packageWeightKg = Number(weightKg);

      await onUpdateShipping(selectedStatus, details);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update courier shipment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Courier Packing & Logistics</h3>
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
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Update Shipment Packing Stage:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'PACKING', label: '1. Packing Items' },
                { id: 'READY_TO_SHIP', label: '2. Ready to Ship (Box Sealed)' },
                { id: 'SHIPPED', label: '3. Handed to Courier Agent' },
                { id: 'IN_TRANSIT', label: '4. In Transit' },
              ].map((stage) => (
                <button
                  type="button"
                  key={stage.id}
                  onClick={() => setSelectedStatus(stage.id as ShippingStatus)}
                  className={`p-2.5 rounded-xl border text-xs text-left font-bold transition-all ${
                    selectedStatus === stage.id
                      ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {stage.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Logistics Partner / Courier:
              </label>
              <input
                type="text"
                placeholder="e.g. Delhivery, Bluedart, Speed Post"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Actual Parcel Weight (kg):
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 1.25"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Courier Waybill / AWB Number (if received):
            </label>
            <input
              type="text"
              placeholder="e.g. 142385930219"
              value={awbNumber}
              onChange={(e) => setAwbNumber(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Only enter the verified AWB tracking number handed over by the logistics representative.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
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
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Save Logistics Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
