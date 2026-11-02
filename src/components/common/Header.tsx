import React, { useState, useRef, useEffect } from 'react';
import {
  Store,
  Bell,
  Volume2,
  VolumeX,
  HelpCircle,
  Menu,
  ShieldCheck,
  AlertTriangle,
  ShoppingBag,
  Bike,
  CreditCard,
  Info,
  Check,
  CheckCheck,
  ExternalLink,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { setStoreOnlineStatus } from '../../services/storeStatusService';
import { orderAlertAudio } from '../../utils/audioAlert';
import { type NotificationItem } from '../../types';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../services/notificationService';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenNotifications: () => void;
  onOpenSupport: () => void;
  onOpenAdminModal?: () => void;
  unreadNotificationsCount: number;
  activeOrdersCount: number;
  notifications?: NotificationItem[];
  onOpenOrder?: (orderId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenNotifications,
  onOpenSupport,
  onOpenAdminModal,
  unreadNotificationsCount,
  activeOrdersCount,
  notifications = [],
  onOpenOrder,
}) => {
  const { partnerProfile, currentUser } = useAuth();
  const [isMuted, setIsMuted] = useState(orderAlertAudio.getIsMuted());
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showOfflineConfirmModal, setShowOfflineConfirmModal] = useState(false);
  const [statusToast, setStatusToast] = useState<{ message: string; isOnline: boolean } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(orderAlertAudio.isAudioUnlocked());

  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellButtonRef = useRef<HTMLButtonElement>(null);

  const isOnline = !!partnerProfile?.isOnline;

  const showToast = (message: string, onlineState: boolean) => {
    setStatusToast({ message, isOnline: onlineState });
    setTimeout(() => {
      setStatusToast(null);
    }, 4500);
  };

  // Check audio unlock status
  useEffect(() => {
    const handleUserInteraction = () => {
      orderAlertAudio.unlockAudio();
      setAudioUnlocked(true);
    };

    window.addEventListener('click', handleUserInteraction, { once: true });
    window.addEventListener('keydown', handleUserInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        bellButtonRef.current &&
        !bellButtonRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleToggleSound = () => {
    orderAlertAudio.unlockAudio();
    setAudioUnlocked(true);
    const muted = orderAlertAudio.toggleMute();
    setIsMuted(muted);
  };

  const handleEnableAudioManual = () => {
    orderAlertAudio.unlockAudio();
    setAudioUnlocked(true);
  };

  const handleToggleStoreStatus = async () => {
    if (!currentUser) return;

    if (isOnline && activeOrdersCount > 0) {
      setShowOfflineConfirmModal(true);
      return;
    }

    try {
      setUpdatingStatus(true);
      const nextState = !isOnline;
      await setStoreOnlineStatus(currentUser.uid, nextState);
      if (nextState) {
        showToast('🟢 Shop is now ONLINE! Customers on Dooars Daily Basket can view products & place orders.', true);
      } else {
        showToast('🔴 Shop is now OFFLINE (Closed). Customers see store as closed; new orders are paused.', false);
      }
    } catch (err: any) {
      alert(`Could not update store status: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const confirmGoOffline = async () => {
    if (!currentUser) return;
    try {
      setUpdatingStatus(true);
      setShowOfflineConfirmModal(false);
      await setStoreOnlineStatus(currentUser.uid, false);
      showToast('🔴 Shop is now OFFLINE (Closed). Customers see store as closed; new orders are paused.', false);
    } catch (err: any) {
      alert(`Could not update store status: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    try {
      await markAllNotificationsAsRead(currentUser.uid);
    } catch (err: any) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.read) {
      await markNotificationAsRead(item.id);
    }
    if (item.orderId && onOpenOrder) {
      setShowDropdown(false);
      onOpenOrder(item.orderId);
    }
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <>
      {/* Real-time Status Change Toast Feedback */}
      {statusToast && (
        <div
          className={`px-4 py-2.5 text-xs font-bold flex items-center justify-between text-white shadow-md transition-all animate-in slide-in-from-top-2 duration-200 ${
            statusToast.isOnline
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700'
              : 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
            <span>{statusToast.message}</span>
          </div>
          <button
            onClick={() => setStatusToast(null)}
            className="p-1 hover:bg-white/20 rounded-md text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Autoplay unlock banner if not yet active and has pending orders */}
      {!audioUnlocked && unreadNotificationsCount > 0 && (
        <div className="bg-amber-500 text-slate-900 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 animate-bounce" />
            <span>Enable real-time audio chime for new customer orders</span>
          </div>
          <button
            type="button"
            onClick={handleEnableAudioManual}
            className="px-3 py-1 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-[11px] transition-colors cursor-pointer"
          >
            🔊 Enable Sound
          </button>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3 transition-all">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Mobile Menu & Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-xs">
                <Store className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <h1 className="font-black text-slate-900 text-sm sm:text-base leading-tight tracking-tight truncate max-w-[180px] sm:max-w-xs">
                    {partnerProfile?.shopName || 'Dooars Daily Basket'}
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> Market Partner
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 hidden sm:block truncate">
                  {partnerProfile?.villageTownCity ? `${partnerProfile.villageTownCity}, ${partnerProfile.district}` : 'Dooars Region Merchant'}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Controls (Status Switch, Audio Toggle, Notifications, Support) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Market Partner Online / Offline Switch Button */}
            <button
              type="button"
              onClick={handleToggleStoreStatus}
              disabled={updatingStatus}
              title={
                isOnline
                  ? 'Shop is ONLINE (Open). Customers on Dooars Daily Basket can place orders. Click to switch OFFLINE.'
                  : 'Shop is OFFLINE (Closed). Customers see store as closed. Click to switch ONLINE.'
              }
              className={`group flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer border select-none disabled:opacity-50 ${
                isOnline
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-emerald-600/25 active:scale-95'
                  : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 shadow-rose-600/25 active:scale-95'
              }`}
            >
              {/* Pulse status indicator */}
              <div className="relative flex items-center justify-center shrink-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isOnline ? 'bg-white' : 'bg-rose-200'
                  }`}
                />
                <span
                  className={`absolute w-4 h-4 rounded-full animate-ping opacity-75 ${
                    isOnline ? 'bg-emerald-300' : 'bg-rose-300'
                  }`}
                />
              </div>

              {/* Text Label & Switch Pill */}
              <div className="flex flex-col text-left leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="tracking-wider uppercase text-[11px] sm:text-xs">
                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                  {/* Sliding switch track visual */}
                  <span
                    className={`inline-flex w-7 h-3.5 rounded-full p-0.5 transition-colors ${
                      isOnline ? 'bg-emerald-900/60 justify-end' : 'bg-rose-950/60 justify-start'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
                  </span>
                </div>
                <span className="text-[9px] font-medium opacity-90 hidden md:inline">
                  {isOnline ? 'Shop Open (Orders Active)' : 'Shop Closed (Orders Paused)'}
                </span>
              </div>
            </button>

            {/* Audio Alert Toggle */}
            <button
              onClick={handleToggleSound}
              title={isMuted ? 'Order chime muted (Click to enable)' : 'Order chime active (Click to mute)'}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isMuted
                  ? 'border-slate-200 text-slate-400 hover:bg-slate-100'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Notifications Bell with Dropdown */}
            <div className="relative">
              <button
                ref={bellButtonRef}
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className={`relative p-2 rounded-xl border transition-colors cursor-pointer ${
                  showDropdown
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Notifications"
                aria-expanded={showDropdown}
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse shadow-xs">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {showDropdown && (
                <div
                  ref={dropdownRef}
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  {/* Dropdown Header */}
                  <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900">Notifications</h3>
                      {unreadNotificationsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          {unreadNotificationsCount} unread
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {unreadNotificationsCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <CheckCheck className="w-3 h-3" />
                          <span>Mark all read</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowDropdown(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Close"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Dropdown Notification List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {recentNotifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-medium text-slate-600">No new notifications</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Updates will appear here when orders are placed.
                        </p>
                      </div>
                    ) : (
                      recentNotifications.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`p-3.5 transition-colors ${
                            !item.read ? 'bg-emerald-50/50 hover:bg-emerald-50/80' : 'hover:bg-slate-50'
                          } ${item.orderId ? 'cursor-pointer' : ''}`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                              {item.type === 'NEW_ORDER' ? (
                                <ShoppingBag className="w-4 h-4 text-amber-600" />
                              ) : item.type === 'DELIVERY_ASSIGNED' ? (
                                <Bike className="w-4 h-4 text-blue-600" />
                              ) : item.type === 'PAYMENT_UPDATE' ? (
                                <CreditCard className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Info className="w-4 h-4 text-slate-600" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="font-bold text-xs text-slate-900 truncate">
                                  {item.title}
                                </h4>
                                {!item.read && (
                                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                                {item.message}
                              </p>
                              <div className="flex items-center justify-between gap-2 mt-1.5">
                                <span className="text-[10px] text-slate-400">
                                  {item.createdAt
                                    ? new Date(item.createdAt).toLocaleTimeString('en-IN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : 'Just now'}
                                </span>

                                <div className="flex items-center gap-1.5">
                                  {item.orderId && (
                                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                                      View Order <ExternalLink className="w-2.5 h-2.5" />
                                    </span>
                                  )}
                                  {!item.read && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markNotificationAsRead(item.id);
                                      }}
                                      className="p-1 text-slate-400 hover:text-emerald-700 cursor-pointer"
                                      title="Mark read"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDropdown(false);
                        onOpenNotifications();
                      }}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                    >
                      View All Notifications History →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Super Admin Service Areas Manager */}
            {onOpenAdminModal && (
              <button
                type="button"
                onClick={onOpenAdminModal}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 text-xs font-bold transition-colors cursor-pointer"
                title="Super Admin: Manage Service Areas & Applications"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Admin Areas</span>
              </button>
            )}

            {/* Support Helpdesk */}
            <button
              onClick={onOpenSupport}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              <span>Helpdesk</span>
            </button>
          </div>
        </div>
      </header>

      {/* Confirmation Modal when taking Store Offline with Active Orders */}
      {showOfflineConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Switch Store to OFFLINE?</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              When you go <strong className="text-rose-600">OFFLINE</strong>, customers on the Dooars Daily Basket app will see your shop as <strong className="text-rose-600">CLOSED</strong> and will not be able to place new orders.
            </p>
            {activeOrdersCount > 0 && (
              <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                ⚠️ You have <strong>{activeOrdersCount} ongoing order(s)</strong> in progress. You must complete and fulfill them even while offline.
              </div>
            )}
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowOfflineConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Keep Shop ONLINE
              </button>
              <button
                type="button"
                onClick={confirmGoOffline}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer transition-transform active:scale-95"
              >
                Yes, Go OFFLINE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
