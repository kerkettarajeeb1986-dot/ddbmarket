import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { Sidebar, type ActiveTab } from './components/common/Sidebar';
import { SupportModal } from './components/common/SupportModal';
import { LoginView } from './components/auth/LoginView';
import { RegisterView } from './components/auth/RegisterView';
import { AccountStatusView } from './components/auth/AccountStatusView';
import { DashboardView } from './components/dashboard/DashboardView';
import { OrderManagement } from './components/orders/OrderManagement';
import { ProductManagement } from './components/products/ProductManagement';
import { StoreProfileView } from './components/store/StoreProfileView';
import { EarningsAndPayoutsView } from './components/earnings/EarningsAndPayoutsView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { NewOrderAudioBanner } from './components/orders/NewOrderAudioBanner';
import { DeliveryPartnerContinuousBellAlert } from './components/orders/DeliveryPartnerContinuousBellAlert';
import { orderAlertAudio } from './utils/audioAlert';
import { subscribeToPartnerOrders, acceptOrder } from './services/orderService';
import { subscribeToPartnerProducts } from './services/productService';
import { setStoreOnlineStatus } from './services/storeStatusService';
import {
  subscribeToPartnerNotifications,
  createOrderNotificationIfMissing,
} from './services/notificationService';
import { subscribeToPartnerPayouts } from './services/payoutService';
import { SuperAdminServiceAreaModal } from './components/admin/SuperAdminServiceAreaModal';
import { type Order, type Product, type NotificationItem, type PayoutRequest } from './types';
import { Store, Loader2 } from 'lucide-react';

function MarketPartnerApp() {
  const { currentUser, partnerProfile, loading: authLoading, isApproved } = useAuth();

  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Real-time data states initialized directly from Firestore
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);

  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingPayouts, setLoadingPayouts] = useState(false);

  const [unacknowledgedAlertOrders, setUnacknowledgedAlertOrders] = useState<Order[]>([]);

  // Setup Firestore real-time subscriptions when authorized
  useEffect(() => {
    if (!currentUser || !isApproved) {
      setOrders([]);
      setProducts([]);
      setPayouts([]);
      setNotifications([]);
      return;
    }

    setLoadingOrders(true);
    setLoadingProducts(true);
    setLoadingPayouts(true);

    const unsubOrders = subscribeToPartnerOrders(
      currentUser.uid,
      (liveOrders) => {
        setLoadingOrders(false);
        setOrders(liveOrders);

        // Detect new incoming 'PLACED' orders (triggers loud brass counter bell)
        const placedOrders = liveOrders.filter((o) => o.orderStatus === 'PLACED');
        if (placedOrders.length > 0) {
          setUnacknowledgedAlertOrders(placedOrders);
          orderAlertAudio.playMarketPartnerAlert();
          placedOrders.forEach((ord) => {
            createOrderNotificationIfMissing(currentUser.uid, ord).catch(() => {});
          });
        } else {
          setUnacknowledgedAlertOrders([]);
          orderAlertAudio.stopMarketPartnerAlert();
        }
      },
      (err) => {
        console.warn('Orders subscription note:', err);
        setLoadingOrders(false);
      },
      partnerProfile?.localAreaId
    );

    const unsubProducts = subscribeToPartnerProducts(
      currentUser.uid,
      (liveProducts) => {
        setLoadingProducts(false);
        setProducts(liveProducts);
      },
      (err) => {
        console.warn('Products subscription note:', err);
        setLoadingProducts(false);
      }
    );

    const unsubPayouts = subscribeToPartnerPayouts(
      currentUser.uid,
      (livePayouts) => {
        setLoadingPayouts(false);
        setPayouts(livePayouts);
      },
      (err) => {
        console.warn('Payouts subscription note:', err);
        setLoadingPayouts(false);
      }
    );

    const unsubNotifs = subscribeToPartnerNotifications(
      currentUser.uid,
      (liveNotifs) => {
        setNotifications(liveNotifs);
      }
    );

    return () => {
      unsubOrders();
      unsubProducts();
      unsubPayouts();
      unsubNotifs();
    };
  }, [currentUser, isApproved, partnerProfile?.localAreaId]);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <img
          src="/logo.png"
          alt="Dooars Daily Basket"
          className="w-20 h-20 rounded-full object-contain mb-4 shadow-xl shadow-emerald-500/20 bg-white p-1"
          referrerPolicy="no-referrer"
        />
        <h1 className="text-xl font-black tracking-tight text-white mb-2">Dooars Daily Basket</h1>
        <p className="text-xs text-slate-400 mb-6 font-medium">Market Partner Operations Portal</p>
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Synchronizing merchant terminal...</span>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!currentUser) {
    return (
      <div className="relative">
        {authView === 'login' ? (
          <LoginView
            onSwitchToRegister={() => setAuthView('register')}
            onOpenSupport={() => setIsSupportOpen(true)}
            onOpenAdminModal={() => setIsAdminModalOpen(true)}
          />
        ) : (
          <RegisterView
            onSwitchToLogin={() => setAuthView('login')}
            onOpenSupport={() => setIsSupportOpen(true)}
            onOpenAdminModal={() => setIsAdminModalOpen(true)}
          />
        )}

        <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
        <SuperAdminServiceAreaModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
        />
      </div>
    );
  }

  // Authenticated but partner status is NOT APPROVED (e.g. PENDING, REJECTED, DISABLED)
  if (currentUser && !isApproved) {
    return (
      <>
        <AccountStatusView onOpenSupport={() => setIsSupportOpen(true)} />
        <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
        <SuperAdminServiceAreaModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
        />
      </>
    );
  }

  // Approved Partner Terminal
  const pendingOrdersCount = orders.filter((o) => o.orderStatus === 'PLACED').length;
  const activeOrdersCount = orders.filter((o) =>
    ['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(
      o.orderStatus
    )
  ).length;
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  const shippingOrdersCount = orders.filter(
    (o) =>
      o.orderType === 'COURIER_SHIPPING' &&
      !['DELIVERED', 'COMPLETELY_DELIVERED', 'CANCELLED'].includes(o.orderStatus)
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Real-time Market Partner Order Audio Banner Alert (Loud Brass Bell) */}
      <NewOrderAudioBanner
        newOrders={unacknowledgedAlertOrders}
        onReviewOrder={(order) => {
          setActiveTab('orders');
          setUnacknowledgedAlertOrders([]);
          orderAlertAudio.stopMarketPartnerAlert();
        }}
        onAcceptOrder={async (order) => {
          await acceptOrder(order);
          orderAlertAudio.stopMarketPartnerAlert();
          setUnacknowledgedAlertOrders([]);
        }}
        onAcknowledgeAlert={() => {
          orderAlertAudio.stopMarketPartnerAlert();
          setUnacknowledgedAlertOrders([]);
        }}
        onUnlockSound={() => orderAlertAudio.unlockAudio()}
      />

      {/* Real-time Delivery Partner Continuous Loud Bell Alert (rings non-stop until received) */}
      <DeliveryPartnerContinuousBellAlert
        assignedOrders={orders}
        onDeliveryAccepted={() => {
          orderAlertAudio.stopDeliveryPartnerAlert();
        }}
      />

      {/* Main App Header */}
      <Header
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenNotifications={() => setActiveTab('notifications')}
        onOpenSupport={() => setIsSupportOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
        activeOrdersCount={activeOrdersCount}
        notifications={notifications}
        onOpenOrder={() => setActiveTab('orders')}
      />

      {/* Persistent Offline Alert Banner (Shop Closed Warning) */}
      {partnerProfile && partnerProfile.isOnline === false && (
        <div className="bg-gradient-to-r from-rose-800 via-rose-700 to-amber-800 text-white px-4 py-2 text-xs font-bold flex flex-wrap items-center justify-between gap-3 shadow-sm border-b border-rose-600/70 z-20">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-200 animate-ping shrink-0" />
            <span>
              🔴 Store is currently <strong>OFFLINE (Shop Closed)</strong> — Customers on Dooars Daily Basket cannot place new orders until you switch to ONLINE.
            </span>
          </div>
          <button
            onClick={async () => {
              if (currentUser?.uid) {
                await setStoreOnlineStatus(currentUser.uid, true);
              }
            }}
            className="px-3.5 py-1 bg-white text-rose-800 hover:bg-rose-50 font-black rounded-lg text-xs shadow-xs transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
          >
            🟢 Turn ONLINE (Open Shop)
          </button>
        </div>
      )}

      <div className="flex-1 flex">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (tab === 'support') {
              setIsSupportOpen(true);
            } else {
              setActiveTab(tab);
            }
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenAdminModal={() => setIsAdminModalOpen(true)}
          pendingOrdersCount={pendingOrdersCount}
          unreadNotificationsCount={unreadNotificationsCount}
          shippingOrdersCount={shippingOrdersCount}
        />

        {/* Primary Page Canvas */}
        <main className="flex-1 lg:ml-72 p-4 sm:p-6 lg:p-8 max-w-7xl w-full">
          {activeTab === 'dashboard' && (
            <DashboardView
              orders={orders}
              products={products}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'orders' && (
            <OrderManagement orders={orders} loading={loadingOrders} />
          )}

          {activeTab === 'products' && (
            <ProductManagement products={products} loading={loadingProducts} />
          )}

          {activeTab === 'store' && <StoreProfileView />}

          {(activeTab === 'earnings' || activeTab === 'payouts') && (
            <EarningsAndPayoutsView
              orders={orders}
              payouts={payouts}
              loadingPayouts={loadingPayouts}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onOpenOrder={() => setActiveTab('orders')}
            />
          )}
        </main>
      </div>

      {/* Support Modal */}
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />

      {/* Super Admin Service Area & Applications Manager Modal */}
      <SuperAdminServiceAreaModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MarketPartnerApp />
    </AuthProvider>
  );
}
