import React, { useEffect, useState } from 'react';
import { X, Bike, Check, Loader2, UserCheck, AlertCircle } from 'lucide-react';
import { type Order, type DeliveryPartnerCandidate, type AssignedDeliveryPartner } from '../../types';
import { fetchEligibleDeliveryPartners } from '../../services/deliveryService';

interface DeliveryPartnerAssignModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onAssign: (partner: AssignedDeliveryPartner) => Promise<void>;
}

export const DeliveryPartnerAssignModal: React.FC<DeliveryPartnerAssignModalProps> = ({
  order,
  isOpen,
  onClose,
  onAssign,
}) => {
  const [candidates, setCandidates] = useState<DeliveryPartnerCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadRiders();
    }
  }, [isOpen]);

  const loadRiders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEligibleDeliveryPartners();
      setCandidates(data);
    } catch (err: any) {
      setError('Failed to fetch available delivery riders: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !order) return null;

  const handleAssignRider = async (rider: DeliveryPartnerCandidate) => {
    try {
      setAssigningId(rider.id);
      setError(null);
      await onAssign({
        id: rider.id,
        name: rider.fullName,
        phone: rider.mobileNumber,
      });
      onClose();
    } catch (err: any) {
      setError('Assignment failed: ' + err.message);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Assign Delivery Partner</h3>
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

        <div className="mt-4">
          <p className="text-xs text-slate-600 mb-3">
            The following registered delivery partners are currently <strong>approved and online</strong> in the Dooars delivery network:
          </p>

          {error && (
            <div className="mb-3 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span>Scanning available delivery riders...</span>
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 rounded-xl p-4 border border-dashed border-slate-200">
              <Bike className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-700">No Online Delivery Partners Available Right Now</div>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                All approved riders are either offline or handling deliveries. You can mark the order as Prepared/Ready for Pickup or contact the Dispatch Desk.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {candidates.map((rider) => (
                <div
                  key={rider.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                      {rider.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{rider.fullName}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Ph: {rider.mobileNumber} • {rider.vehicleType}
                      </div>
                      {rider.currentActiveDeliveries !== undefined && (
                        <div className="text-[10px] text-slate-400">
                          Active tasks: {rider.currentActiveDeliveries}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAssignRider(rider)}
                    disabled={assigningId === rider.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50"
                  >
                    {assigningId === rider.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5" />
                    )}
                    <span>Assign</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
