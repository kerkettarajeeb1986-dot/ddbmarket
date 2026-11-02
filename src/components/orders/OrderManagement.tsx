import React, { useState } from 'react';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Printer,
  Bike,
  Truck,
  Package,
  MapPin,
  Phone,
  Calendar,
  AlertCircle,
  Check,
  ChevronDown,
  ExternalLink,
  BellRing,
  PlusCircle,
  Volume2,
} from 'lucide-react';
import {
  type Order,
  type OrderStatus,
  type ShippingStatus,
  type AssignedDeliveryPartner,
  type CourierDetails,
} from '../../types';
import {
  acceptOrder,
  rejectOrder,
  setOrderPreparing,
  setOrderReadyForPickup,
  assignDeliveryPartner,
  updateCourierShippingStatus,
  setOrderOutForDelivery,
  setOrderDelivered,
} from '../../services/orderService';
import { acceptDeliveryAssignment } from '../../services/deliveryService';
import { orderAlertAudio } from '../../utils/audioAlert';
import { useAuth } from '../../context/AuthContext';
import { OrderReceiptModal } from './OrderReceiptModal';
import { RejectOrderModal } from './RejectOrderModal';
import { DeliveryPartnerAssignModal } from './DeliveryPartnerAssignModal';
import { CourierUpdateModal } from './CourierUpdateModal';

interface OrderManagementProps {
  orders: Order[];
  loading: boolean;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({ orders, loading }) => {
  const [selectedTab, setSelectedTab] = useState<
    'ALL' | 'PLACED' | 'PREPARING' | 'READY' | 'ACTIVE' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<Order | null>(null);
  const [rejectOrderTarget, setRejectOrderTarget] = useState<Order | null>(null);
  const [assignRiderTarget, setAssignRiderTarget] = useState<Order | null>(null);
  const [courierModalTarget, setCourierModalTarget] = useState<Order | null>(null);
  const { currentUser, partnerProfile } = useAuth();
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleReceiveDelivery = async (order: Order) => {
    try {
      setActionInProgressId(order.id);
      setErrorMessage(null);
      await acceptDeliveryAssignment(order.id, order.assignedDeliveryPartner, order.partnerId);
      orderAlertAudio.stopDeliveryPartnerAlert();
    } catch (err: any) {
      setErrorMessage('Could not accept delivery assignment: ' + err.message);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleMarkOutForDelivery = async (order: Order) => {
    try {
      setActionInProgressId(order.id);
      setErrorMessage(null);
      await setOrderOutForDelivery(order.id);
    } catch (err: any) {
      setErrorMessage('Could not update status: ' + err.message);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleMarkDelivered = async (order: Order) => {
    try {
      setActionInProgressId(order.id);
      setErrorMessage(null);
      await setOrderDelivered(order.id);
    } catch (err: any) {
      setErrorMessage('Could not mark delivered: ' + err.message);
    } finally {
      setActionInProgressId(null);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    // Tab filter
    if (selectedTab === 'PLACED' && order.orderStatus !== 'PLACED') return false;
    if (selectedTab === 'PREPARING' && !['ACCEPTED', 'PREPARING'].includes(order.orderStatus)) return false;
    if (selectedTab === 'READY' && order.orderStatus !== 'READY_FOR_PICKUP') return false;
    if (selectedTab === 'ACTIVE' && !['ASSIGNED', 'DELIVERY_ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(order.orderStatus)) return false;
    if (selectedTab === 'SHIPPING' && order.orderType !== 'COURIER_SHIPPING') return false;
    if (selectedTab === 'COMPLETED' && !['DELIVERED', 'COMPLETELY_DELIVERED'].includes(order.orderStatus)) return false;
    if (selectedTab === 'CANCELLED' && !['CANCELLED', 'REJECTED', 'REFUNDED'].includes(order.orderStatus)) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = order.id.toLowerCase().includes(q) || (order.orderNumber && order.orderNumber.toLowerCase().includes(q));
      const matchCustomer = order.customerName.toLowerCase().includes(q) || order.customerPhone.includes(q);
      const matchItem = order.items.some((i) => i.productName.toLowerCase().includes(q));
      return matchId || matchCustomer || matchItem;
    }

    return true;
  });

  const handleAccept = async (order: Order) => {
    try {
      setActionInProgressId(order.id);
      setErrorMessage(null);
      await acceptOrder(order);
    } catch (err: any) {
      setErrorMessage('Could not accept order: ' + err.message);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleStartPreparing = async (order: Order) => {
    try {
      setActionInProgressId(order.id);
      setErrorMessage(null);
      await setOrderPreparing(order.id);
    } catch (err: any) {
      setErrorMessage('Could not update preparation: ' + err.message);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleMarkReady = async (order: Order) => {
    try {
      setActionInProgressId(order.id);
      setErrorMessage(null);
      await setOrderReadyForPickup(order.id);
    } catch (err: any) {
      setErrorMessage('Could not mark ready: ' + err.message);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectOrderTarget) return;
    try {
      setActionInProgressId(rejectOrderTarget.id);
      setErrorMessage(null);
      await rejectOrder(rejectOrderTarget.id, rejectOrderTarget.customerId, reason);
    } catch (err: any) {
      setErrorMessage('Could not reject order: ' + err.message);
    } finally {
      setActionInProgressId(null);
      setRejectOrderTarget(null);
    }
  };

  const handleConfirmAssignRider = async (rider: AssignedDeliveryPartner) => {
    if (!assignRiderTarget) return;
    try {
      setActionInProgressId(assignRiderTarget.id);
      setErrorMessage(null);
      await assignDeliveryPartner(assignRiderTarget.id, rider);
    } catch (err: any) {
      setErrorMessage('Could not assign rider: ' + err.message);
    } finally {
      setActionInProgressId(null);
      setAssignRiderTarget(null);
    }
  };

  const handleSaveCourierDetails = async (status: ShippingStatus, details?: Partial<CourierDetails>) => {
    if (!courierModalTarget) return;
    try {
      setActionInProgressId(courierModalTarget.id);
      setErrorMessage(null);
      await updateCourierShippingStatus(courierModalTarget.id, status, details);
    } catch (err: any) {
      setErrorMessage('Could not update courier status: ' + err.message);
    } finally {
      setActionInProgressId(null);
      setCourierModalTarget(null);
    }
  };

  const placedCount = orders.filter((o) => o.orderStatus === 'PLACED').length;
  const preparingCount = orders.filter((o) => ['ACCEPTED', 'PREPARING'].includes(o.orderStatus)).length;
  const readyCount = orders.filter((o) => o.orderStatus === 'READY_FOR_PICKUP').length;
  const shippingCount = orders.filter((o) => o.orderType === 'COURIER_SHIPPING' && !['DELIVERED', 'COMPLETELY_DELIVERED', 'CANCELLED'].includes(o.orderStatus)).length;

  return (
    <div className="space-y-6">
      {/* Local Area Routing Zone Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white p-4 rounded-2xl border border-emerald-700/50 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Registered Store Local Area
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500 text-slate-950">
                LOCAL ORDERS ACTIVE
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-white">
              {partnerProfile?.localAreaName || partnerProfile?.villageTownCity || 'Dooars Region'}
              {partnerProfile?.district ? ` • ${partnerProfile.district}` : ''}
              {partnerProfile?.pincode ? ` (PIN: ${partnerProfile.pincode})` : ''}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Registration ke samay select kiye gaye is local area ke sabhi customer orders yahan real-time me receive honge.
            </p>
          </div>
        </div>
      </div>

      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Order Management</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time fulfillment, kitchen preparation, rider dispatch, and courier logistics.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Order ID, customer, item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Error Alert if any */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        {[
          { id: 'ALL', label: 'All Orders', count: orders.length },
          { id: 'PLACED', label: 'New / Placed', count: placedCount, highlight: placedCount > 0 },
          { id: 'PREPARING', label: 'Preparing', count: preparingCount },
          { id: 'READY', label: 'Ready for Pickup', count: readyCount },
          { id: 'SHIPPING', label: 'Courier Shipping', count: shippingCount },
          { id: 'ACTIVE', label: 'Out for Delivery' },
          { id: 'COMPLETED', label: 'Completed' },
          { id: 'CANCELLED', label: 'Cancelled / Rejected' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedTab === tab.id
                ? 'bg-white text-emerald-800 border-t-2 border-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  tab.highlight
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders List / Empty State */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-slate-200/60 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No orders available yet.</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? 'No orders match your search criteria. Try a different keyword.'
              : selectedTab === 'ALL'
              ? 'New orders placed by customers across Dooars will appear here in real time.'
              : `There are currently no orders in the '${selectedTab}' stage.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isShipping = order.orderType === 'COURIER_SHIPPING';
            const isPlaced = order.orderStatus === 'PLACED';
            const isAccepted = order.orderStatus === 'ACCEPTED';
            const isPreparing = order.orderStatus === 'PREPARING';
            const isReady = order.orderStatus === 'READY_FOR_PICKUP';
            const isBusy = actionInProgressId === order.id;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border transition-all overflow-hidden shadow-xs hover:shadow-md ${
                  isPlaced
                    ? 'border-amber-300 ring-2 ring-amber-400/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Order Card Header */}
                <div className="p-4 sm:p-5 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                        isShipping
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isShipping ? <Truck className="w-4 h-4" /> : <Bike className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm sm:text-base text-slate-900">
                          #{order.orderNumber || order.id.slice(0, 8)}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            isShipping
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isShipping ? 'Courier Shipping' : 'Local Delivery'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-800 border border-slate-300">
                          <MapPin className="w-2.5 h-2.5 text-emerald-700" />
                          <span>{order.localAreaName || order.deliveryAddress.villageTownCity || partnerProfile?.localAreaName || 'Local Area'}</span>
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                        order.orderStatus === 'PLACED'
                          ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                          : order.orderStatus === 'ACCEPTED' || order.orderStatus === 'PREPARING'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : order.orderStatus === 'READY_FOR_PICKUP'
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : order.orderStatus === 'DELIVERED' || order.orderStatus === 'COMPLETELY_DELIVERED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {order.orderStatus.replace(/_/g, ' ')}
                    </span>

                    {/* Print Receipt Button */}
                    <button
                      onClick={() => setSelectedOrderForReceipt(order)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Print order slip"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Slip</span>
                    </button>
                  </div>
                </div>

                {/* Order Details Body */}
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Left: Items List */}
                  <div className="md:col-span-2 space-y-3">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Ordered Products ({order.items.length})
                    </div>
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.productName}
                                className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                                {item.productName.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-900">{item.productName}</div>
                              <div className="text-[11px] text-slate-500">
                                {item.quantity} {item.unit} x ₹{item.price}
                              </div>
                            </div>
                          </div>
                          <div className="font-extrabold text-slate-900">
                            ₹{(item.quantity * item.price).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Financial Breakdown */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                      <div className="flex items-center gap-3">
                        <span>Subtotal: <strong>₹{order.subtotal.toFixed(2)}</strong></span>
                        <span>Delivery: <strong>₹{order.deliveryCharge.toFixed(2)}</strong></span>
                        {order.packagingCharge > 0 && (
                          <span>Packaging: <strong>₹{order.packagingCharge.toFixed(2)}</strong></span>
                        )}
                      </div>
                      <div className="text-sm font-black text-slate-900">
                        Total Amount: ₹{order.totalAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Right: Customer & Delivery Info */}
                  <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Customer & Address:
                      </div>
                      <div className="font-bold text-slate-900">{order.customerName}</div>
                      <div className="flex items-center gap-1.5 text-slate-600 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{order.customerPhone}</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-slate-600 mt-1">
                        <MapPin className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-[11px]">
                          {order.deliveryAddress.street}, {order.deliveryAddress.district} - {order.deliveryAddress.pincode}
                        </span>
                      </div>
                      <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        <Check className="w-3 h-3 text-emerald-700 stroke-[3]" />
                        <span>Area Match: {order.localAreaName || order.deliveryAddress.villageTownCity || partnerProfile?.localAreaName || 'Local Zone'}</span>
                      </div>
                    </div>

                    {/* Logistics / Rider Info */}
                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Fulfillment Route:
                      </div>
                      {isShipping ? (
                        <div className="space-y-1">
                          <div className="font-semibold text-blue-800 flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5" />
                            <span>Courier Service ({order.shippingStatus || 'PENDING'})</span>
                          </div>
                          {order.courierDetails?.provider && (
                            <div className="text-[11px] text-slate-600">
                              Carrier: {order.courierDetails.provider}
                            </div>
                          )}
                          {order.courierDetails?.awbNumber && (
                            <div className="text-[11px] font-mono text-slate-800">
                              AWB: {order.courierDetails.awbNumber}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          {order.assignedDeliveryPartner ? (
                            <div className="space-y-1">
                              <div className="font-semibold text-emerald-800 flex items-center gap-1">
                                <Bike className="w-3.5 h-3.5" />
                                <span>Assigned Rider: {order.assignedDeliveryPartner.name}</span>
                              </div>
                              <div className="text-[11px] text-slate-600">
                                Contact: {order.assignedDeliveryPartner.phone}
                              </div>
                              {order.assignedDeliveryPartner.status === 'ACCEPTED' || order.orderStatus === 'DELIVERY_ACCEPTED' ? (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                                  <span>Rider Received & Accepted Task</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-xs animate-pulse">
                                  <BellRing className="w-3 h-3 animate-bounce" />
                                  <span>Loud Bell Ringing (Waiting for Rider to Receive)</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-[11px] text-amber-700 font-medium">
                              No Delivery Rider assigned yet.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Payment Info */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Payment:</span>
                      <span className="font-bold text-slate-800">
                        {order.paymentMethod} • {order.paymentStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="p-3 sm:px-5 bg-white border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                  {/* If PLACED: Accept or Reject */}
                  {isPlaced && (
                    <>
                      <button
                        onClick={() => setRejectOrderTarget(order)}
                        disabled={isBusy}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
                      >
                        Decline Order
                      </button>
                      <button
                        onClick={() => handleAccept(order)}
                        disabled={isBusy}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-transform active:scale-95 disabled:opacity-50"
                      >
                        {isBusy ? 'Processing...' : 'Accept Order'}
                      </button>
                    </>
                  )}

                  {/* If ACCEPTED: Start Preparing */}
                  {isAccepted && (
                    <button
                      onClick={() => handleStartPreparing(order)}
                      disabled={isBusy}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-transform active:scale-95"
                    >
                      Start Kitchen / Store Preparation
                    </button>
                  )}

                  {/* If PREPARING: Mark Ready For Pickup */}
                  {isPreparing && (
                    <button
                      onClick={() => handleMarkReady(order)}
                      disabled={isBusy}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-transform active:scale-95"
                    >
                      Mark Ready for Pickup
                    </button>
                  )}

                  {/* If Received (ACCEPTED, PREPARING, or READY): Can Assign Delivery Partner */}
                  {(isAccepted || isPreparing || isReady) && !isShipping && !order.assignedDeliveryPartner && (
                    <button
                      onClick={() => setAssignRiderTarget(order)}
                      disabled={isBusy}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                    >
                      <Bike className="w-3.5 h-3.5" />
                      <span>Assign Delivery Partner</span>
                    </button>
                  )}

                  {/* If ASSIGNED and Rider has not accepted: Receive & Accept Order button (silences continuous loud bell) */}
                  {order.orderStatus === 'ASSIGNED' && order.assignedDeliveryPartner && order.assignedDeliveryPartner.status !== 'ACCEPTED' && (
                    <button
                      onClick={() => handleReceiveDelivery(order)}
                      disabled={isBusy}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md flex items-center gap-1.5 animate-pulse cursor-pointer transition-transform active:scale-95"
                      title="Receive & Accept Delivery Order (Stops the continuous loud bell)"
                    >
                      <BellRing className="w-3.5 h-3.5 text-white animate-bounce" />
                      <span>Rider: Receive & Accept Order (Stop Bell)</span>
                    </button>
                  )}

                  {/* If DELIVERY_ACCEPTED: Can mark Out for Delivery */}
                  {order.orderStatus === 'DELIVERY_ACCEPTED' && (
                    <button
                      onClick={() => handleMarkOutForDelivery(order)}
                      disabled={isBusy}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
                    >
                      <Bike className="w-3.5 h-3.5" />
                      <span>Dispatch / Out for Delivery</span>
                    </button>
                  )}

                  {/* If OUT_FOR_DELIVERY: Can mark Delivered */}
                  {order.orderStatus === 'OUT_FOR_DELIVERY' && (
                    <button
                      onClick={() => handleMarkDelivered(order)}
                      disabled={isBusy}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Mark Delivered</span>
                    </button>
                  )}

                  {/* If Courier Shipping: Update Courier Packing */}
                  {isShipping && !['DELIVERED', 'COMPLETELY_DELIVERED', 'CANCELLED'].includes(order.orderStatus) && (
                    <button
                      onClick={() => setCourierModalTarget(order)}
                      disabled={isBusy}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Update Courier Logistics</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <OrderReceiptModal
        order={selectedOrderForReceipt}
        onClose={() => setSelectedOrderForReceipt(null)}
      />

      <RejectOrderModal
        order={rejectOrderTarget}
        isOpen={!!rejectOrderTarget}
        onClose={() => setRejectOrderTarget(null)}
        onConfirmReject={handleConfirmReject}
      />

      <DeliveryPartnerAssignModal
        order={assignRiderTarget}
        isOpen={!!assignRiderTarget}
        onClose={() => setAssignRiderTarget(null)}
        onAssign={handleConfirmAssignRider}
      />

      <CourierUpdateModal
        order={courierModalTarget}
        isOpen={!!courierModalTarget}
        onClose={() => setCourierModalTarget(null)}
        onUpdateShipping={handleSaveCourierDetails}
      />
    </div>
  );
};
