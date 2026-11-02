import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Store,
  Wallet,
  ReceiptText,
  Bell,
  HelpCircle,
  LogOut,
  X,
  Truck,
  IndianRupee,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { setStoreOnlineStatus } from '../../services/storeStatusService';

export type ActiveTab =
  | 'dashboard'
  | 'orders'
  | 'products'
  | 'store'
  | 'earnings'
  | 'payouts'
  | 'notifications'
  | 'support';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenAdminModal?: () => void;
  pendingOrdersCount: number;
  unreadNotificationsCount: number;
  shippingOrdersCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  onOpenAdminModal,
  onSelectTab: setActiveTab,
  pendingOrdersCount,
  unreadNotificationsCount,
  shippingOrdersCount,
}) => {
  const { partnerProfile, currentUser, logout } = useAuth();
  const [togglingStatus, setTogglingStatus] = React.useState(false);

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    onClose();
  };

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingBag,
      badge: pendingOrdersCount,
      badgeColor: 'bg-emerald-600 text-white',
    },
    { id: 'products', label: 'Products & Catalog', icon: Package },
    { id: 'store', label: 'Store Profile', icon: Store },
    { id: 'earnings', label: 'Earnings & Sales', icon: IndianRupee },
    { id: 'payouts', label: 'Payout Requests', icon: Wallet },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotificationsCount,
      badgeColor: 'bg-rose-500 text-white',
    },
    { id: 'support', label: 'Partner Support', icon: HelpCircle },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Banner */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Dooars Daily Basket Logo"
              className="w-11 h-11 rounded-full object-contain shadow-xs bg-white border border-slate-100 p-0.5"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="font-extrabold text-slate-900 text-base leading-tight tracking-tight">
                DOOARS DAILY
              </div>
              <div className="text-[11px] font-bold text-emerald-700 tracking-wider uppercase">
                Market Partner Web
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Partner Info Summary Card with Online / Offline Toggle */}
        <div className="p-3.5 mx-3 my-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2.5">
          <div className="flex items-center gap-3">
            {partnerProfile?.shopLogoUrl ? (
              <img
                src={partnerProfile.shopLogoUrl}
                alt="Shop Logo"
                className="w-10 h-10 rounded-xl object-cover border border-slate-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-base">
                {partnerProfile?.shopName?.charAt(0) || 'M'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                {partnerProfile?.shopName || 'Market Partner'}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {partnerProfile?.fullName || 'Seller Partner'}
              </div>
            </div>
          </div>

          {/* Quick Online / Offline Switcher */}
          <button
            type="button"
            disabled={togglingStatus}
            onClick={async () => {
              if (!currentUser?.uid) return;
              try {
                setTogglingStatus(true);
                await setStoreOnlineStatus(currentUser.uid, !partnerProfile?.isOnline);
              } catch (err: any) {
                alert('Could not update store status: ' + err.message);
              } finally {
                setTogglingStatus(false);
              }
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all cursor-pointer shadow-2xs select-none disabled:opacity-50 ${
              partnerProfile?.isOnline
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            }`}
            title="Click to toggle store Online / Offline status for customers"
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  partnerProfile?.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>{partnerProfile?.isOnline ? 'ONLINE • Shop Open' : 'OFFLINE • Shop Closed'}</span>
            </div>
            <span className="text-[10px] uppercase font-bold underline opacity-80">
              {togglingStatus ? '...' : 'Toggle'}
            </span>
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isActive ? 'bg-white text-emerald-700' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer: Dooars Regional Note & Sign Out */}
        <div className="p-4 border-t border-slate-100 space-y-2.5">
          {onOpenAdminModal && (
            <button
              onClick={() => {
                onClose();
                onOpenAdminModal();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Admin Service Areas</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700">Manage</span>
            </button>
          )}

          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Serving Jalpaiguri, Darjeeling, Kalimpong, Alipurduar & Cooch Behar</span>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to sign out of the Market Partner portal?')) {
                logout();
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200/80 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
