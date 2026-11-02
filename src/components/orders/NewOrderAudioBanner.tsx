import React, { useState } from 'react';
import { BellRing, Volume2, VolumeX, ArrowRight, Check, X, Loader2 } from 'lucide-react';
import { type Order } from '../../types';
import { orderAlertAudio } from '../../utils/audioAlert';

interface NewOrderAudioBannerProps {
  newOrders: Order[];
  onReviewOrder: (order: Order) => void;
  onAcceptOrder?: (order: Order) => Promise<void>;
  onAcknowledgeAlert: () => void;
  onUnlockSound: () => void;
}

export const NewOrderAudioBanner: React.FC<NewOrderAudioBannerProps> = ({
  newOrders,
  onReviewOrder,
  onAcceptOrder,
  onAcknowledgeAlert,
  onUnlockSound,
}) => {
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(orderAlertAudio.getIsMuted());

  if (!newOrders.length) return null;

  const latestOrder = newOrders[0];

  const handleQuickAccept = async () => {
    if (!onAcceptOrder) {
      onReviewOrder(latestOrder);
      return;
    }
    try {
      setAcceptingId(latestOrder.id);
      await onAcceptOrder(latestOrder);
      orderAlertAudio.stopMarketPartnerAlert();
      onAcknowledgeAlert();
    } catch (err) {
      console.error('Quick accept failed:', err);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleToggleMute = () => {
    const muted = orderAlertAudio.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-900 text-white shadow-xl border-b-2 border-emerald-400 animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-white text-emerald-800 flex items-center justify-center animate-bounce shadow-lg">
                <BellRing className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base tracking-tight">
                  🔔 New Order Received! ({newOrders.length})
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase tracking-wide">
                  Loud Bell Ringing
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5 font-medium">
                Order #{latestOrder.orderNumber || latestOrder.id.slice(0, 8)} from {latestOrder.customerName || 'Customer'} • ₹{latestOrder.totalAmount.toFixed(2)} • {latestOrder.paymentMethod} ({latestOrder.paymentStatus})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleToggleMute}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute Loud Bell' : 'Mute Loud Bell'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-300" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />}
              <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Loud Bell'}</span>
            </button>

            {onAcceptOrder && (
              <button
                onClick={handleQuickAccept}
                disabled={acceptingId === latestOrder.id}
                className="px-4 py-1.5 rounded-lg text-xs font-black bg-amber-400 text-slate-950 hover:bg-amber-300 flex items-center gap-1.5 shadow-md transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {acceptingId === latestOrder.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                )}
                <span>Receive / Accept Order</span>
              </button>
            )}

            <button
              onClick={() => {
                onReviewOrder(latestOrder);
                orderAlertAudio.stopMarketPartnerAlert();
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-950 hover:bg-emerald-50 flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <span>Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                orderAlertAudio.stopMarketPartnerAlert();
                onAcknowledgeAlert();
              }}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Acknowledge Alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
