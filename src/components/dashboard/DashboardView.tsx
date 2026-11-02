import React from 'react';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package,
  TrendingUp,
  Store,
  Bike,
  Plus,
  ArrowRight,
  IndianRupee,
  Bell,
  Truck,
  Flame,
  Layers,
} from 'lucide-react';
import { type Order, type Product } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getPartnerCategoryNames, getPartnerCategoryIds } from '../../data/categories';
import { setStoreOnlineStatus, setAutoAcceptOrders } from '../../services/storeStatusService';

interface DashboardViewProps {
  orders: Order[];
  products: Product[];
  onNavigate: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ orders, products, onNavigate }) => {
  const { partnerProfile, currentUser } = useAuth();
  const [togglingStore, setTogglingStore] = React.useState(false);
  const [togglingAutoAccept, setTogglingAutoAccept] = React.useState(false);

  const isStoreOpen = !!partnerProfile?.isOnline;
  const isAutoAccept = !!partnerProfile?.autoAcceptOrders;

  const handleToggleStoreOpen = async () => {
    if (!currentUser) return;
    try {
      setTogglingStore(true);
      await setStoreOnlineStatus(currentUser.uid, !isStoreOpen);
    } catch (err: any) {
      alert(`Could not update store status: ${err.message}`);
    } finally {
      setTogglingStore(false);
    }
  };

  const handleToggleAutoAccept = async () => {
    if (!currentUser) return;
    try {
      setTogglingAutoAccept(true);
      await setAutoAcceptOrders(currentUser.uid, !isAutoAccept);
    } catch (err: any) {
      alert(`Could not update auto-accept setting: ${err.message}`);
    } finally {
      setTogglingAutoAccept(false);
    }
  };

  const now = new Date();
  const todayOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  });

  const pendingOrders = orders.filter((o) => o.orderStatus === 'PLACED');
  const preparingOrders = orders.filter((o) => ['ACCEPTED', 'PREPARING'].includes(o.orderStatus));
  const readyOrders = orders.filter((o) => o.orderStatus === 'READY_FOR_PICKUP');
  const outForDeliveryOrders = orders.filter((o) =>
    ['ASSIGNED', 'DELIVERY_ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(o.orderStatus)
  );
  const completedOrders = orders.filter((o) =>
    ['DELIVERED', 'COMPLETELY_DELIVERED'].includes(o.orderStatus)
  );

  const todayCompleted = todayOrders.filter((o) =>
    ['DELIVERED', 'COMPLETELY_DELIVERED'].includes(o.orderStatus)
  );
  const todaySales = todayCompleted.reduce((acc, curr) => acc + curr.totalAmount, 0);

  const outOfStockProducts = products.filter((p) => p.stockQuantity <= 0 || !p.available);
  const activeProducts = products.filter((p) => p.available && p.stockQuantity > 0);

  return (
    <div className="space-y-6">
      {/* Alert banner if new pending orders */}
      {pendingOrders.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500 text-slate-950 font-bold shadow-md flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/30 flex items-center justify-center">
              <Bell className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="text-sm font-extrabold">
                {pendingOrders.length} New Order{pendingOrders.length > 1 ? 's' : ''} Awaiting Acceptance!
              </div>
              <div className="text-xs text-slate-900 font-medium">
                Customer baskets placed in Dooars require immediate merchant confirmation.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('orders')}
            className="px-4 py-2 bg-slate-950 text-amber-400 hover:bg-slate-900 text-xs font-black rounded-xl shadow-xs shrink-0"
          >
            Review Orders
          </button>
        </div>
      )}

      {/* Welcome & Quick Store Operations Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2">
            <Store className="w-3.5 h-3.5" />
            <span>Market Partner Terminal</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {partnerProfile?.shopName || 'Market Partner Store'}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm text-slate-300 mt-2">
            <span className="inline-flex items-center gap-1 font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
              📍 Local Area: {partnerProfile?.localAreaName || partnerProfile?.villageTownCity || 'Dooars Region'}
            </span>
            <span className="text-slate-400">
              {partnerProfile?.district}, {partnerProfile?.state || 'West Bengal'}
            </span>
          </div>

          {/* Multi-Category Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Categories ({getPartnerCategoryNames(partnerProfile).length}):</span>
            </span>
            {getPartnerCategoryNames(partnerProfile).map((catName) => (
              <span
                key={catName}
                className="px-2 py-0.5 rounded-md bg-white/15 text-white border border-white/20 text-[11px] font-bold backdrop-blur-xs"
              >
                {catName}
              </span>
            ))}
            <button
              onClick={() => onNavigate('store')}
              className="text-[10px] text-emerald-300 hover:text-emerald-200 underline font-semibold ml-1 cursor-pointer"
            >
              Manage Categories
            </button>
          </div>
        </div>

        {/* Quick Toggles */}
        <div className="flex flex-wrap items-center gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-xs border border-white/15">
          {/* Store Online / Offline Toggle Button */}
          <div className="flex items-center gap-2 pr-3 border-r border-white/20">
            <button
              onClick={handleToggleStoreOpen}
              disabled={togglingStore}
              title={
                isStoreOpen
                  ? 'Shop is ONLINE (Open). Customers can place orders. Click to switch OFFLINE.'
                  : 'Shop is OFFLINE (Closed). Customers see store closed. Click to switch ONLINE.'
              }
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 shadow-md cursor-pointer disabled:opacity-60 active:scale-95 ${
                isStoreOpen
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
              }`}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isStoreOpen ? 'bg-emerald-200' : 'bg-rose-200'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isStoreOpen ? 'bg-white' : 'bg-rose-100'
                  }`}
                />
              </span>
              <div className="flex flex-col text-left leading-tight">
                <span className="uppercase tracking-wider">
                  {isStoreOpen ? '🟢 ONLINE (Shop Open)' : '🔴 OFFLINE (Shop Closed)'}
                </span>
                <span className="text-[10px] font-medium opacity-90">
                  {isStoreOpen ? 'Customers can order' : 'Customers see closed'}
                </span>
              </div>
            </button>
          </div>

          {/* Auto Accept */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-300 font-semibold">Auto-Accept:</span>
            <button
              onClick={handleToggleAutoAccept}
              disabled={togglingAutoAccept}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer ${
                isAutoAccept
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {isAutoAccept ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Core Workflow Stages Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Placed */}
        <div
          onClick={() => onNavigate('orders')}
          className="cursor-pointer bg-white p-4 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all space-y-1"
        >
          <div className="flex items-center justify-between text-amber-600 text-xs font-bold">
            <span>New Placed</span>
            <Bell className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{pendingOrders.length}</div>
          <div className="text-[11px] text-slate-500">Need Accept/Decline</div>
        </div>

        {/* Preparing */}
        <div
          onClick={() => onNavigate('orders')}
          className="cursor-pointer bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all space-y-1"
        >
          <div className="flex items-center justify-between text-blue-600 text-xs font-bold">
            <span>Preparing</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{preparingOrders.length}</div>
          <div className="text-[11px] text-slate-500">In Kitchen / Store</div>
        </div>

        {/* Ready */}
        <div
          onClick={() => onNavigate('orders')}
          className="cursor-pointer bg-white p-4 rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all space-y-1"
        >
          <div className="flex items-center justify-between text-teal-600 text-xs font-bold">
            <span>Ready / Packed</span>
            <Package className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{readyOrders.length}</div>
          <div className="text-[11px] text-slate-500">Ready for Handover</div>
        </div>

        {/* Out for Delivery */}
        <div
          onClick={() => onNavigate('orders')}
          className="cursor-pointer bg-white p-4 rounded-2xl border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all space-y-1"
        >
          <div className="flex items-center justify-between text-purple-600 text-xs font-bold">
            <span>Out for Delivery</span>
            <Bike className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{outForDeliveryOrders.length}</div>
          <div className="text-[11px] text-slate-500">Riders en route</div>
        </div>

        {/* Today's Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-emerald-600 text-xs font-bold">
            <span>Today's Sales</span>
            <IndianRupee className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">₹{todaySales.toFixed(0)}</div>
          <div className="text-[11px] text-slate-500">{todayCompleted.length} delivered today</div>
        </div>

        {/* Total Today's Orders */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-600 text-xs font-bold">
            <span>Today's Orders</span>
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{todayOrders.length}</div>
          <div className="text-[11px] text-slate-500">Total volume today</div>
        </div>
      </div>

      {/* Inventory & Quick Actions Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Inventory Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Catalog & Stock Status</span>
            </h3>
            <button
              onClick={() => onNavigate('products')}
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-semibold text-slate-700">Active Listings</span>
              <span className="font-black text-emerald-700 text-sm">{activeProducts.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 border border-rose-100">
              <span className="font-semibold text-rose-800">Out of Stock / Inactive</span>
              <span className="font-black text-rose-700 text-sm">{outOfStockProducts.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-semibold text-slate-700">Total Store Items</span>
              <span className="font-black text-slate-900 text-sm">{products.length}</span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('products')}
            className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Add New Product Listing</span>
          </button>
        </div>

        {/* Recent Urgent Orders */}
        <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span>Active Orders Requiring Action</span>
            </h3>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {pendingOrders.length === 0 && preparingOrders.length === 0 && readyOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <div className="font-bold text-slate-700">All current orders are fulfilled!</div>
              <p className="text-slate-500 mt-0.5">
                New incoming orders will trigger audio alerts and appear here immediately.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {[...pendingOrders, ...preparingOrders, ...readyOrders].slice(0, 4).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        order.orderStatus === 'PLACED'
                          ? 'bg-amber-100 text-amber-900 animate-pulse'
                          : 'bg-blue-100 text-blue-900'
                      }`}
                    >
                      {order.orderType === 'COURIER_SHIPPING' ? (
                        <Truck className="w-4 h-4" />
                      ) : (
                        <Bike className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        #{order.orderNumber || order.id.slice(0, 8)} • {order.customerName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {order.items.length} items • ₹{order.totalAmount.toFixed(2)} • {order.deliveryAddress.villageTownCity || order.deliveryAddress.district}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        order.orderStatus === 'PLACED'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-blue-100 text-blue-900'
                      }`}
                    >
                      {order.orderStatus.replace(/_/g, ' ')}
                    </span>
                    <button
                      onClick={() => onNavigate('orders')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
