import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  ShoppingBag,
  Bike,
  Truck,
  IndianRupee,
  CheckCircle,
  Clock,
  Star,
  Package,
} from 'lucide-react';
import { type Order, type Product } from '../../types';

interface AnalyticsViewProps {
  orders: Order[];
  products: Product[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ orders, products }) => {
  const [timeRange, setTimeRange] = useState<'TODAY' | '7_DAYS' | '30_DAYS' | 'ALL'>('30_DAYS');

  const now = new Date();
  const filteredOrders = orders.filter((order) => {
    const orderDate = new Date(order.createdAt);
    if (timeRange === 'TODAY') {
      return (
        orderDate.getDate() === now.getDate() &&
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear()
      );
    }
    if (timeRange === '7_DAYS') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return orderDate >= sevenDaysAgo;
    }
    if (timeRange === '30_DAYS') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return orderDate >= thirtyDaysAgo;
    }
    return true;
  });

  const completed = filteredOrders.filter((o) =>
    ['DELIVERED', 'COMPLETELY_DELIVERED'].includes(o.orderStatus)
  );

  const totalRevenue = completed.reduce((sum, o) => sum + o.totalAmount, 0);
  const avgOrderValue = completed.length > 0 ? totalRevenue / completed.length : 0;
  const localOrdersCount = filteredOrders.filter((o) => o.orderType === 'LOCAL_DELIVERY').length;
  const shippingOrdersCount = filteredOrders.filter((o) => o.orderType === 'COURIER_SHIPPING').length;

  // Item frequency
  const itemMap: Record<string, { count: number; revenue: number }> = {};
  completed.forEach((o) => {
    o.items.forEach((item) => {
      if (!itemMap[item.productName]) {
        itemMap[item.productName] = { count: 0, revenue: 0 };
      }
      itemMap[item.productName].count += item.quantity;
      itemMap[item.productName].revenue += item.quantity * item.price;
    });
  });

  const topItems = Object.entries(itemMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Store Performance & Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Real order metrics, fulfillment trends, and customer purchase insights in Dooars.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'TODAY', label: 'Today' },
            { id: '7_DAYS', label: '7 Days' },
            { id: '30_DAYS', label: '30 Days' },
            { id: 'ALL', label: 'All Time' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setTimeRange(r.id as any)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                timeRange === r.id
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Delivered Revenue</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">₹{totalRevenue.toFixed(2)}</div>
          <div className="text-[11px] text-slate-500">{completed.length} completed transactions</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Average Order Value</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">₹{avgOrderValue.toFixed(2)}</div>
          <div className="text-[11px] text-slate-500">Per completed basket</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Orders Placed</span>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{filteredOrders.length}</div>
          <div className="text-[11px] text-slate-500">Across selected timeframe</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Delivery Channel Ratio</span>
            <Bike className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-bold text-slate-900">
            {localOrdersCount} Local / {shippingOrdersCount} Courier
          </div>
          <div className="text-[11px] text-slate-500">Fleet vs Courier logistics</div>
        </div>
      </div>

      {/* Top Selling Products */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-600" />
          <span>Top Performing Products</span>
        </h3>

        {topItems.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No completed sales data in this time range.
          </div>
        ) : (
          <div className="space-y-2.5">
            {topItems.map(([name, data], idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{name}</div>
                    <div className="text-[11px] text-slate-500">{data.count} units sold</div>
                  </div>
                </div>
                <div className="font-extrabold text-slate-900">₹{data.revenue.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
