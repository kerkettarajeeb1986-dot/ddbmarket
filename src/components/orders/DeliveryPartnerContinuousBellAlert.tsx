import React, { useEffect, useState } from 'react';
import {
  BellRing,
  Bike,
  Volume2,
  VolumeX,
  CheckCircle,
  MapPin,
  Store,
  Phone,
  AlertTriangle,
  Loader2,
  Check,
} from 'lucide-react';
import { type Order } from '../../types';
import { orderAlertAudio } from '../../utils/audioAlert';
import { acceptDeliveryAssignment } from '../../services/deliveryService';

interface DeliveryPartnerContinuousBellAlertProps {
  assignedOrders: Order[];
  onDeliveryAccepted?: (orderId: string) => void;
}

export const DeliveryPartnerContinuousBellAlert: React.FC<DeliveryPartnerContinuousBellAlertProps> = ({
  assignedOrders,
  onDeliveryAccepted,
}) => {
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(orderAlertAudio.getIsMuted());

  // Pending unaccepted assignments for delivery partner
  const pendingRiderOrders = assignedOrders.filter(
    (o) =>
      o.orderStatus === 'ASSIGNED' &&
      o.assignedDeliveryPartner &&
      o.assignedDeliveryPartner.status !== 'ACCEPTED'
  );

  useEffect(() => {
    if (pendingRiderOrders.length > 0) {
      // Continuous bell rings non-stop in loud sound until received!
      orderAlertAudio.playDeliveryPartnerContinuousBell();
    } else {
      orderAlertAudio.stopDeliveryPartnerAlert();
    }

    return () => {
      orderAlertAudio.stopDeliveryPartnerAlert();
    };
  }, [pendingRiderOrders.length]);

  if (pendingRiderOrders.length === 0) return null;

  const currentOrder = pendingRiderOrders[0];
  const rider = currentOrder.assignedDeliveryPartner;

  const handleReceiveOrder = async (order: Order) => {
    try {
      setAcceptingId(order.id);
      await acceptDeliveryAssignment(
        order.id,
        order.assignedDeliveryPartner,
        order.partnerId
      );
      // Immediately stop the continuous loud bell
      orderAlertAudio.stopDeliveryPartnerAlert();
      if (onDeliveryAccepted) {
        onDeliveryAccepted(order.id);
      }
    } catch (err) {
      console.error('Error accepting delivery assignment:', err);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleToggleMute = () => {
    const muted = orderAlertAudio.toggleMute();
    setIsMuted(muted);
  };

  return (
    <aside
      aria-label="Delivery Partner Alert"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-lg z-50 bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700 text-white rounded-2xl shadow-2xl p-4 sm:p-5 border-2 border-amber-300 animate-in slide-in-from-bottom duration-300 ring-4 ring-orange-500/30"
    >
      {/* Header with animated ringing bell */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-white text-orange-600 flex items-center justify-center shadow-lg animate-bounce">
              <BellRing className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border border-white"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white text-rose-800 uppercase tracking-wider">
                LOUD BELL RINGING
              </span>
              {pendingRiderOrders.length > 1 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-900/60 text-amber-200">
                  +{pendingRiderOrders.length - 1} more
                </span>
              )}
            </div>
            <h3 className="font-black text-base sm:text-lg leading-tight mt-0.5 text-white">
              🚴 Delivery Partner Task Assigned!
            </h3>
            <p className="text-xs text-amber-100 font-medium">
              Continuous alarm bell ringing until received by rider
            </p>
          </div>
        </div>

        {/* Audio controls */}
        <button
          onClick={handleToggleMute}
          className="p-2 rounded-xl bg-black/20 hover:bg-black/40 text-amber-100 transition-colors"
          title={isMuted ? 'Unmute Bell' : 'Mute Bell'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
        </button>
      </div>

      {/* Order & Assigned Rider Details */}
      <div className="mt-3.5 bg-black/20 backdrop-blur-xs rounded-xl p-3 border border-white/10 space-y-2 text-xs">
        <div className="flex items-center justify-between font-bold text-amber-100 pb-1.5 border-b border-white/10">
          <span>Order #{currentOrder.orderNumber || currentOrder.id.slice(0, 8)}</span>
          <span className="text-white font-black text-sm">₹{currentOrder.totalAmount.toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-amber-50">
            <Store className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="truncate">Store: <strong>{currentOrder.storeName || 'Merchant Store'}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-50">
            <Bike className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span className="truncate">Rider: <strong>{rider?.name || 'Assigned Rider'}</strong></span>
          </div>
        </div>

        <div className="flex items-start gap-1.5 text-[11px] text-amber-100 pt-1 border-t border-white/10">
          <MapPin className="w-3.5 h-3.5 text-rose-300 shrink-0 mt-0.5" />
          <span className="line-clamp-1">
            Deliver to: {currentOrder.customerName} • {currentOrder.deliveryAddress?.street || currentOrder.deliveryAddress?.district}
          </span>
        </div>
      </div>

      {/* Prominent Action Button: Receive & Stop Loud Bell */}
      <div className="mt-3.5 flex flex-col sm:flex-row items-center gap-2">
        <button
          onClick={() => handleReceiveOrder(currentOrder)}
          disabled={acceptingId === currentOrder.id}
          className="w-full py-3 px-4 rounded-xl bg-white hover:bg-emerald-50 text-slate-900 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl transition-all active:scale-98 cursor-pointer disabled:opacity-75"
        >
          {acceptingId === currentOrder.id ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Receiving Delivery Order…</span>
            </>
          ) : (
            <>
              <Check className="w-5 h-5 text-emerald-600 stroke-[3]" />
              <span>Receive & Accept Delivery Order (Stop Bell)</span>
            </>
          )}
        </button>
      </div>

      {/* Explanatory footer */}
      <p className="text-[10px] text-amber-200 text-center mt-2 font-medium">
        🔔 Continuous loud bell rings non-stop until the delivery partner clicks Receive & Accept.
      </p>
    </aside>
  );
};
