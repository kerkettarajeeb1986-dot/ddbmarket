import React, { useState } from 'react';
import {
  IndianRupee,
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  ShieldCheck,
  Plus,
  Loader2,
  X,
} from 'lucide-react';
import { type Order, type PayoutRequest } from '../../types';
import { submitPayoutRequest } from '../../services/payoutService';
import { useAuth } from '../../context/AuthContext';

interface EarningsAndPayoutsViewProps {
  orders: Order[];
  payouts: PayoutRequest[];
  loadingPayouts: boolean;
}

export const EarningsAndPayoutsView: React.FC<EarningsAndPayoutsViewProps> = ({
  orders,
  payouts,
  loadingPayouts,
}) => {
  const { partnerProfile, currentUser } = useAuth();

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [upiId, setUpiId] = useState(partnerProfile?.upiId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  React.useEffect(() => {
    if (partnerProfile?.upiId && !upiId) {
      setUpiId(partnerProfile.upiId);
    }
  }, [partnerProfile?.upiId]);

  // Financial Calculations from Real Orders
  const completedOrders = orders.filter((o) =>
    ['DELIVERED', 'COMPLETELY_DELIVERED'].includes(o.orderStatus)
  );

  const totalDeliveredSales = completedOrders.reduce((acc, curr) => acc + curr.totalAmount, 0);

  // Commission % (e.g. 5% default or partner's specific commission percentage)
  const commissionRate = partnerProfile?.commissionPercentage ?? 5;
  const totalCommissionDeducted = (totalDeliveredSales * commissionRate) / 100;

  // Paid out amounts from completed payout requests
  const totalPaidOut = payouts
    .filter((p) => p.status === 'PAID')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const pendingPayoutsAmount = payouts
    .filter((p) => ['PENDING', 'UNDER_REVIEW', 'PROCESSING', 'APPROVED'].includes(p.status))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netAvailablePayable = Math.max(
    0,
    totalDeliveredSales - totalCommissionDeducted - totalPaidOut - pendingPayoutsAmount
  );

  const handleOpenRequest = () => {
    setRequestAmount(netAvailablePayable > 0 ? String(netAvailablePayable.toFixed(2)) : '');
    setRequestModalOpen(true);
    setMessage(null);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !partnerProfile) return;

    const amt = Number(requestAmount);
    if (isNaN(amt) || amt <= 0) {
      setMessage({ text: 'Please enter a valid payout amount greater than ₹0.', type: 'error' });
      return;
    }
    if (amt > netAvailablePayable) {
      setMessage({
        text: `Requested amount exceeds your available balance of ₹${netAvailablePayable.toFixed(2)}.`,
        type: 'error',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage(null);
      await submitPayoutRequest(
        currentUser.uid,
        partnerProfile.fullName,
        partnerProfile.shopName,
        amt,
        upiId,
        partnerProfile.bankDetails
      );
      setMessage({
        text: 'Your weekly payout request has been successfully submitted to Admin for processing.',
        type: 'success',
      });
      setRequestModalOpen(false);
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to submit payout request.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Earnings & Settlements
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time accounting of completed customer sales, commissions, and weekly bank settlements.
          </p>
        </div>

        <button
          onClick={handleOpenRequest}
          disabled={netAvailablePayable <= 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span>Request Weekly Payout</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-3.5 border text-xs rounded-xl flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Balance */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-emerald-100 text-xs font-semibold">
            <span>Available Balance</span>
            <Wallet className="w-4 h-4 text-emerald-200" />
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight">
            ₹{netAvailablePayable.toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-100">Eligible for weekly settlement</div>
        </div>

        {/* Total Delivered Gross */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Delivered Sales ({completedOrders.length})</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            ₹{totalDeliveredSales.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500">Gross order revenue</div>
        </div>

        {/* Platform Commission */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Platform Commission ({commissionRate}%)</span>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            ₹{totalCommissionDeducted.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500">Service and gateway fee</div>
        </div>

        {/* Total Settled to Date */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Settled / Paid to Bank</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            ₹{totalPaidOut.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500">
            {pendingPayoutsAmount > 0 ? `₹${pendingPayoutsAmount.toFixed(2)} pending in review` : 'All requests processed'}
          </div>
        </div>
      </div>

      {/* Payout History & Settlement Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">Weekly Payout Request History</h3>
            <p className="text-xs text-slate-500">Official bank disbursements and UPI transfers.</p>
          </div>
        </div>

        {loadingPayouts ? (
          <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Loading payout records...</span>
          </div>
        ) : payouts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="font-bold text-slate-700">No payout requests submitted yet.</div>
            <p className="text-slate-500 mt-1 max-w-sm mx-auto">
              Once you fulfill orders and build an available balance, request your weekly payout here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Request Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Disbursement Target</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">UTR / Ref</th>
                  <th className="py-3 px-4">Admin Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 whitespace-nowrap">
                      {new Date(p.requestDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900 whitespace-nowrap">
                      ₹{p.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {p.upiId ? `UPI: ${p.upiId}` : p.bankDetails?.accountNumber ? `A/c: ****${p.bankDetails.accountNumber.slice(-4)}` : 'Bank Transfer'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          p.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : p.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {p.paymentReference || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {p.adminNote || 'Processed under standard merchant terms.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Requesting Payout */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Request Weekly Settlement</h3>
                  <p className="text-xs text-slate-500">Transferred directly to your verified account</p>
                </div>
              </div>
              <button
                onClick={() => setRequestModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-0.5">
                <div className="text-[11px] text-emerald-700 font-semibold">Available for Disbursement:</div>
                <div className="text-xl font-black">₹{netAvailablePayable.toFixed(2)}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Settlement Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={netAvailablePayable}
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Settlement UPI ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. merchant@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-slate-600 text-[11px]">
                <div className="font-bold text-slate-800">Bank Account on File:</div>
                <div>Account: {partnerProfile?.bankDetails?.accountNumber || 'Not provided'}</div>
                <div>IFSC: {partnerProfile?.bankDetails?.ifscCode || 'Not provided'}</div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
