import { type Order } from '../types';

export function printOrderReceipt(order: Order, type: 'thermal' | 'standard' = 'thermal') {
  const printWindow = window.open('', '_blank', 'width=450,height=700');
  if (!printWindow) {
    // If popups are blocked in iframe, print directly via window.print() after rendering print-only container
    window.print();
    return;
  }

  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 4px 0; text-align: left; vertical-align: top;">
        <div style="font-weight: 600;">${item.productName}</div>
        <div style="font-size: 11px; color: #555;">${item.quantity} ${item.unit} x ₹${item.price}</div>
      </td>
      <td style="padding: 4px 0; text-align: right; vertical-align: top; font-weight: 600;">
        ₹${(item.quantity * item.price).toFixed(2)}
      </td>
    </tr>
  `
    )
    .join('');

  const isShipping = order.orderType === 'COURIER_SHIPPING';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt #${order.orderNumber || order.id.slice(0, 8)} - Dooars Daily Basket</title>
        <style>
          @page {
            margin: ${type === 'thermal' ? '3mm' : '10mm'};
            size: ${type === 'thermal' ? '80mm auto' : 'auto'};
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: ${type === 'thermal' ? '12px' : '14px'};
            line-height: 1.35;
            color: #111;
            margin: 0;
            padding: 10px;
            background: #fff;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .divider { border-top: 1px dashed #444; margin: 8px 0; }
          .bold { font-weight: bold; }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border: 1px solid #111;
            font-size: 10px;
            text-transform: uppercase;
            font-weight: bold;
          }
          table { width: 100%; border-collapse: collapse; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <img src="/logo.png" alt="Dooars Daily Basket" style="width: 48px; height: 48px; border-radius: 50%; margin: 0 auto 6px auto; display: block;" />
          <div style="font-size: 16px; font-weight: 900; letter-spacing: 0.5px;">DOOARS DAILY BASKET</div>
          <div style="font-size: 11px;">Fresh & Daily Essentials</div>
          <div class="divider"></div>
          <div class="bold" style="font-size: 13px;">${order.storeName || 'Market Partner Store'}</div>
          <div style="font-size: 10px; color: #444;">Partner ID: ${order.partnerId.slice(0, 10)}</div>
        </div>

        <div class="divider"></div>

        <div>
          <div><strong>Order:</strong> #${order.orderNumber || order.id.slice(0, 8)}</div>
          <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
          <div><strong>Type:</strong> <span class="badge">${isShipping ? 'COURIER SHIPPING' : 'LOCAL DELIVERY'}</span></div>
          <div><strong>Status:</strong> ${order.orderStatus}</div>
        </div>

        <div class="divider"></div>

        <div>
          <div class="bold">Customer:</div>
          <div>${order.customerName}</div>
          <div>Ph: ${order.customerPhone}</div>
          <div style="font-size: 11px; color: #333;">
            ${order.deliveryAddress.street}, ${order.deliveryAddress.district || ''} - ${order.deliveryAddress.pincode}
          </div>
          ${order.deliveryAddress.landmark ? `<div style="font-size: 10px; color: #555;">Landmark: ${order.deliveryAddress.landmark}</div>` : ''}
        </div>

        ${
          isShipping && order.courierDetails
            ? `
          <div class="divider"></div>
          <div>
            <div class="bold">Logistics & Courier:</div>
            <div>Provider: ${order.courierDetails.provider || 'Assigned Logistics'}</div>
            ${order.courierDetails.awbNumber ? `<div>AWB / Tracking: <strong>${order.courierDetails.awbNumber}</strong></div>` : ''}
            ${order.courierDetails.packageWeightKg ? `<div>Weight: ${order.courierDetails.packageWeightKg} kg</div>` : ''}
          </div>
        `
            : ''
        }

        <div class="divider"></div>

        <table>
          <thead>
            <tr style="border-bottom: 1px solid #444;">
              <th style="text-align: left; padding-bottom: 4px;">Item</th>
              <th style="text-align: right; padding-bottom: 4px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider"></div>

        <table>
          <tr>
            <td>Subtotal:</td>
            <td class="text-right">₹${order.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Delivery / Shipping:</td>
            <td class="text-right">₹${order.deliveryCharge.toFixed(2)}</td>
          </tr>
          ${
            order.packagingCharge > 0
              ? `<tr>
                  <td>Packaging:</td>
                  <td class="text-right">₹${order.packagingCharge.toFixed(2)}</td>
                </tr>`
              : ''
          }
          ${
            order.discount > 0
              ? `<tr>
                  <td>Discount:</td>
                  <td class="text-right">-₹${order.discount.toFixed(2)}</td>
                </tr>`
              : ''
          }
          <tr style="font-size: 14px; font-weight: bold; border-top: 1px solid #333;">
            <td style="padding-top: 4px;">Grand Total:</td>
            <td class="text-right" style="padding-top: 4px;">₹${order.totalAmount.toFixed(2)}</td>
          </tr>
        </table>

        <div class="divider"></div>

        <div>
          <div><strong>Payment Method:</strong> ${order.paymentMethod}</div>
          <div><strong>Payment Status:</strong> ${order.paymentStatus}</div>
        </div>

        <div class="divider"></div>
        <div class="text-center" style="font-size: 10px; color: #555; margin-top: 10px;">
          <div>Thank you for supporting local businesses!</div>
          <div>Dooars Daily Basket Support: support@dooarsdailybasket.com</div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
