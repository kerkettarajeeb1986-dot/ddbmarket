import React, { useState } from 'react';
import { X, Printer, FileText, CheckCircle2, Shield } from 'lucide-react';
import { type Order } from '../../types';
import { printOrderReceipt } from '../../utils/receiptPrinter';

interface OrderReceiptModalProps {
  order: Order | null;
  onClose: () => void;
}

export const OrderReceiptModal: React.FC<OrderReceiptModalProps> = ({ order, onClose }) => {
  const [printFormat, setPrintFormat] = useState<'thermal' | 'standard'>('thermal');

  if (!order) return null;

  const isShipping = order.orderType === 'COURIER_SHIPPING';

  const handlePrint = () => {
    printOrderReceipt(order, printFormat);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-700" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Order Receipt Preview
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="px-6 py-2.5 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-600">Print Format Layout:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPrintFormat('thermal')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                printFormat === 'thermal'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              80mm Thermal Slip
            </button>
            <button
              onClick={() => setPrintFormat('standard')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                printFormat === 'standard'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              Standard A4 Slip
            </button>
          </div>
        </div>

        {/* Receipt Content Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/40">
          <div className={`mx-auto bg-white p-6 shadow-sm border border-slate-200 rounded-xl font-mono text-xs text-slate-800 ${
            printFormat === 'thermal' ? 'max-w-[320px]' : 'max-w-md'
          }`}>
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <img
                src="/logo.png"
                alt="Dooars Daily Basket"
                className="w-12 h-12 rounded-full mx-auto mb-1.5 object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="font-black text-sm tracking-wider uppercase">DOOARS DAILY BASKET</div>
              <div className="text-[10px] text-slate-500">Fresh & Daily Essentials Network</div>
              <div className="font-bold text-xs mt-1 text-slate-900">{order.storeName || 'Market Partner'}</div>
              <div className="text-[10px] text-slate-400">Partner Ref: {order.partnerId.slice(0, 8)}</div>
            </div>

            {/* Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Order Ref:</span>
                <span className="font-bold">#{order.orderNumber || order.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Placed:</span>
                <span>{new Date(order.createdAt).toLocaleDateString('en-IN')} {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Channel:</span>
                <span className="font-bold text-emerald-700 uppercase">
                  {isShipping ? 'COURIER SHIPMENT' : 'LOCAL EXPRESS DELIVERY'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold">{order.orderStatus}</span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-0.5">
              <div className="font-bold text-slate-900">Delivery Address:</div>
              <div>{order.customerName} (Ph: {order.customerPhone})</div>
              <div className="text-slate-600 text-[10px]">
                {order.deliveryAddress.street}, {order.deliveryAddress.district} - {order.deliveryAddress.pincode}
              </div>
              {order.deliveryAddress.landmark && (
                <div className="text-[10px] text-slate-500">Landmark: {order.deliveryAddress.landmark}</div>
              )}
            </div>

            {/* Courier info if shipping */}
            {isShipping && order.courierDetails && (
              <div className="py-2 border-b border-dashed border-slate-300 text-[11px] space-y-0.5">
                <div className="font-bold text-slate-900">Logistics & Parcel:</div>
                <div>Provider: {order.courierDetails.provider || 'Assigned Logistics'}</div>
                {order.courierDetails.awbNumber && (
                  <div>AWB: <strong>{order.courierDetails.awbNumber}</strong></div>
                )}
                {order.courierDetails.packageWeightKg && (
                  <div>Weight: {order.courierDetails.packageWeightKg} kg</div>
                )}
              </div>
            )}

            {/* Items Table */}
            <div className="py-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold pb-1 text-[11px] border-b border-slate-200">
                <span>Items Ordered</span>
                <span>Amount</span>
              </div>
              <div className="space-y-1.5 pt-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[11px]">
                    <div>
                      <div className="font-medium text-slate-900">{item.productName}</div>
                      <div className="text-[10px] text-slate-500">
                        {item.quantity} {item.unit} x ₹{item.price}
                      </div>
                    </div>
                    <div className="font-bold text-slate-900">
                      ₹{(item.quantity * item.price).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill Breakdown */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery / Shipping Fee:</span>
                <span>₹{order.deliveryCharge.toFixed(2)}</span>
              </div>
              {order.packagingCharge > 0 && (
                <div className="flex justify-between">
                  <span>Packaging Charge:</span>
                  <span>₹{order.packagingCharge.toFixed(2)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span>-₹{order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-200">
                <span>Grand Total:</span>
                <span>₹{order.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment & Security */}
            <div className="pt-2 text-[10px] text-slate-500 space-y-1 text-center">
              <div>
                Payment: <strong className="text-slate-800">{order.paymentMethod}</strong> ({order.paymentStatus})
              </div>
              <div className="text-[9px] pt-1 text-slate-400">
                Authorized Merchant Slip • Dooars Daily Basket
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-transform active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print {printFormat === 'thermal' ? '80mm Thermal' : 'Standard'} Slip</span>
          </button>
        </div>
      </div>
    </div>
  );
};
