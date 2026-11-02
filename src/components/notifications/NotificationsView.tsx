import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  ShoppingBag,
  Bike,
  CreditCard,
  ShieldAlert,
  Info,
  Calendar,
  Trash2,
  Check,
  RotateCcw,
  ExternalLink,
  Store,
  Filter,
} from 'lucide-react';
import { type NotificationItem } from '../../types';
import {
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';

type TabFilter = 'ALL' | 'UNREAD' | 'ORDERS' | 'PAYMENTS' | 'ADMIN' | 'SYSTEM';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  onOpenOrder?: (orderId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  onOpenOrder,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL');
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    try {
      await markAllNotificationsAsRead(currentUser.uid);
    } catch (err: any) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleToggleRead = async (item: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setActionInProgressId(item.id);
      if (item.read) {
        await markNotificationAsUnread(item.id);
      } else {
        await markNotificationAsRead(item.id);
      }
    } catch (err: any) {
      console.error('Error toggling read state:', err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleDelete = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setActionInProgressId(itemId);
      await deleteNotification(itemId);
    } catch (err: any) {
      console.error('Error deleting notification:', err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleOpenOrder = async (item: NotificationItem) => {
    if (!item.read) {
      await markNotificationAsRead(item.id);
    }
    if (item.orderId && onOpenOrder) {
      onOpenOrder(item.orderId);
    }
  };

  // Tab Filtering
  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'UNREAD') return !item.read;
    if (activeTab === 'ORDERS') {
      return (
        item.type === 'NEW_ORDER' ||
        item.type === 'ORDER_ACCEPTED' ||
        item.type === 'ORDER_REJECTED' ||
        item.type === 'CUSTOMER_CANCELLED' ||
        item.type === 'ORDER_CANCELLED' ||
        item.type === 'DELIVERY_ASSIGNED' ||
        item.type === 'DELIVERY_ACCEPTED' ||
        item.type === 'DELIVERY_PICKED_UP' ||
        item.type === 'PICKUP_UPDATE'
      );
    }
    if (activeTab === 'PAYMENTS') {
      return item.type === 'PAYMENT_UPDATE' || item.type === 'COD_UPDATE' || item.type === 'REFUND_UPDATE';
    }
    if (activeTab === 'ADMIN') {
      return item.type === 'ADMIN_MESSAGE' || item.type === 'ADMIN_ANNOUNCEMENT' || item.type === 'ACCOUNT_STATUS_UPDATE';
    }
    if (activeTab === 'SYSTEM') {
      return item.type === 'PRODUCT_UPDATE' || item.type === 'STORE_STATUS_UPDATE' || item.type === 'STATUS_CHANGE';
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIconForType = (type: string) => {
    switch (type) {
      case 'NEW_ORDER':
      case 'ORDER_ACCEPTED':
      case 'ORDER_REJECTED':
      case 'CUSTOMER_CANCELLED':
      case 'ORDER_CANCELLED':
        return <ShoppingBag className="w-5 h-5 text-amber-700" />;
      case 'DELIVERY_ASSIGNED':
      case 'DELIVERY_ACCEPTED':
      case 'DELIVERY_PICKED_UP':
      case 'PICKUP_UPDATE':
        return <Bike className="w-5 h-5 text-blue-700" />;
      case 'PAYMENT_UPDATE':
      case 'COD_UPDATE':
      case 'REFUND_UPDATE':
        return <CreditCard className="w-5 h-5 text-emerald-700" />;
      case 'ADMIN_MESSAGE':
      case 'ADMIN_ANNOUNCEMENT':
      case 'ACCOUNT_STATUS_UPDATE':
        return <ShieldAlert className="w-5 h-5 text-purple-700" />;
      case 'PRODUCT_UPDATE':
      case 'STORE_STATUS_UPDATE':
      case 'STATUS_CHANGE':
        return <Store className="w-5 h-5 text-indigo-700" />;
      default:
        return <Info className="w-5 h-5 text-slate-700" />;
    }
  };

  const getBadgeColorForType = (type: string) => {
    switch (type) {
      case 'NEW_ORDER':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DELIVERY_ASSIGNED':
      case 'DELIVERY_PICKED_UP':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PAYMENT_UPDATE':
      case 'COD_UPDATE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'ADMIN_MESSAGE':
      case 'ADMIN_ANNOUNCEMENT':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Notification Center & History
            </h2>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white animate-pulse">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time customer orders, dispatch handoffs, payments, and admin announcements for your store.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(
          [
            { id: 'ALL', label: 'All Notifications' },
            { id: 'UNREAD', label: `Unread (${unreadCount})` },
            { id: 'ORDERS', label: 'Orders & Dispatches' },
            { id: 'PAYMENTS', label: 'Payments & COD' },
            { id: 'ADMIN', label: 'Admin Messages' },
            { id: 'SYSTEM', label: 'System' },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No notifications found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {activeTab === 'UNREAD'
              ? 'All caught up! You have no unread notifications.'
              : 'There are no notifications matching the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden divide-y divide-slate-100">
          {filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.orderId) handleOpenOrder(item);
              }}
              className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start justify-between gap-4 transition-colors ${
                !item.read ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-slate-50/80'
              } ${item.orderId ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                  {getIconForType(item.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                      {item.title}
                    </h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${getBadgeColorForType(
                        item.type
                      )}`}
                    >
                      {item.type.replace(/_/g, ' ')}
                    </span>
                    {!item.read && (
                      <span className="w-2 h-2 rounded-full bg-rose-500" title="Unread" />
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed break-words">
                    {item.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : 'Just now'}
                    </span>
                    {item.orderId && (
                      <span className="font-mono text-emerald-700 font-bold">
                        Order #{item.orderNumber || item.orderId.slice(0, 8)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0"
                onClick={(e) => e.stopPropagation()}
              >
                {item.orderId && (
                  <button
                    type="button"
                    onClick={() => handleOpenOrder(item)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer transition-colors"
                  >
                    <span>View Order</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}

                <button
                  type="button"
                  title={item.read ? 'Mark as unread' : 'Mark as read'}
                  onClick={(e) => handleToggleRead(item, e)}
                  disabled={actionInProgressId === item.id}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {item.read ? (
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </button>

                <button
                  type="button"
                  title="Delete notification"
                  onClick={(e) => handleDelete(item.id, e)}
                  disabled={actionInProgressId === item.id}
                  className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
