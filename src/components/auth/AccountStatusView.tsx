import React from 'react';
import {
  Clock,
  XCircle,
  AlertOctagon,
  LogOut,
  Phone,
  HelpCircle,
  ShieldAlert,
  Building,
  Store,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AccountStatusViewProps {
  onOpenSupport: () => void;
}

export const AccountStatusView: React.FC<AccountStatusViewProps> = ({ onOpenSupport }) => {
  const { partnerProfile, logout } = useAuth();

  if (!partnerProfile) return null;

  const partnerStatus = partnerProfile.status || (partnerProfile as any).approvalStatus || 'PENDING';
  const isPending = partnerStatus === 'PENDING' || partnerStatus === 'UNDER_REVIEW';
  const isRejected = partnerStatus === 'REJECTED';
  const isDisabled = partnerStatus === 'DISABLED';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto bg-white rounded-3xl p-8 shadow-xl border border-slate-200 text-center space-y-6">
        {/* Brand Logo */}
        <div className="flex justify-center">
          <img
            src="/logo.png"
            alt="Dooars Daily Basket"
            className="w-16 h-16 rounded-full object-contain shadow-sm border border-slate-100 p-0.5"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Status Icon */}
        <div className="flex justify-center">
          {isPending && (
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
          )}
          {isRejected && (
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <XCircle className="w-8 h-8" />
            </div>
          )}
          {isDisabled && (
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <AlertOctagon className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Title & Description */}
        <div>
          <h2 className="text-xl font-black text-slate-900">
            {isPending && 'Application Under Review'}
            {isRejected && 'Application Not Approved'}
            {isDisabled && 'Partner Account Inactive / Suspended'}
          </h2>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            {partnerProfile.shopName} • {partnerProfile.villageTownCity}, {partnerProfile.district}
          </div>
        </div>

        {/* Informative Box */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2 text-slate-700">
          {isPending && (
            <>
              <div className="font-bold text-slate-900">Verification in Progress</div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Thank you for applying to be a Market Partner on Dooars Daily Basket. Our regional operations team (serving Jalpaiguri, Darjeeling, Kalimpong, Alipurduar & Cooch Behar) is verifying your store details and documents.
              </p>
              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                You will be able to manage products, accept orders, and receive payouts as soon as approval is granted.
              </div>
            </>
          )}

          {isRejected && (
            <>
              <div className="font-bold text-rose-800">Rejection Reason:</div>
              <p className="text-xs text-rose-700 font-medium bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {partnerProfile.rejectionReason || 'Document or location verification could not be satisfied.'}
              </p>
              <p className="text-[11px] text-slate-600">
                Please contact merchant support with updated documentation to request a re-review of your store.
              </p>
            </>
          )}

          {isDisabled && (
            <>
              <div className="font-bold text-slate-900">Account Access Suspended</div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                This Market Partner account has been deactivated by administration. Store products are hidden from the customer app.
              </p>
              <p className="text-[11px] text-slate-600">
                If you believe this is in error, please connect with the Dooars Daily Basket Help Desk immediately.
              </p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={onOpenSupport}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Contact Merchant Support Desk</span>
          </button>

          <button
            onClick={logout}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
