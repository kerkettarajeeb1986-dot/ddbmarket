import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  addDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  type Order,
  type OrderStatus,
  type ShippingStatus,
  type CourierDetails,
  type AssignedDeliveryPartner,
} from '../types';

export function subscribeToPartnerOrders(
  partnerId: string,
  onOrders: (orders: Order[]) => void,
  onError?: (err: Error) => void,
  localAreaId?: string
) {
  const ordersRef = collection(db, 'orders');
  const partnerOrdersMap = new Map<string, Order>();
  const areaOrdersMap = new Map<string, Order>();

  const emitCombined = () => {
    const combined = new Map<string, Order>();
    partnerOrdersMap.forEach((ord, id) => combined.set(id, ord));
    areaOrdersMap.forEach((ord, id) => {
      // Include local area orders assigned to this partner or open/unassigned in this local area
      if (!ord.partnerId || ord.partnerId === partnerId) {
        combined.set(id, ord);
      }
    });

    const ordersList = Array.from(combined.values());
    ordersList.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    onOrders(ordersList);
  };

  const q1 = query(ordersRef, where('partnerId', '==', partnerId));
  const unsub1 = onSnapshot(
    q1,
    (snapshot) => {
      partnerOrdersMap.clear();
      snapshot.forEach((d) => {
        partnerOrdersMap.set(d.id, { id: d.id, ...d.data() } as Order);
      });
      emitCombined();
    },
    (err) => {
      if (onError) onError(err);
      else console.error('Error fetching partner orders:', err);
    }
  );

  let unsub2 = () => {};
  if (localAreaId && localAreaId.trim()) {
    const q2 = query(ordersRef, where('localAreaId', '==', localAreaId.trim()));
    unsub2 = onSnapshot(
      q2,
      (snapshot) => {
        areaOrdersMap.clear();
        snapshot.forEach((d) => {
          areaOrdersMap.set(d.id, { id: d.id, ...d.data() } as Order);
        });
        emitCombined();
      },
      (err) => {
        console.warn('Local area orders subscription note:', err.message);
      }
    );
  }

  return () => {
    unsub1();
    unsub2();
  };
}

export async function acceptOrder(order: Order): Promise<void> {
  if (order.orderStatus !== 'PLACED') {
    throw new Error(`Cannot accept order with status '${order.orderStatus}'. Only 'PLACED' orders can be accepted.`);
  }

  const nowIso = new Date().toISOString();
  const orderRef = doc(db, 'orders', order.id);

  // Safe transaction to deduct stock and accept order
  await runTransaction(db, async (transaction) => {
    // 1. Check stock for each item
    for (const item of order.items) {
      if (item.productId) {
        const prodRef = doc(db, 'products', item.productId);
        const prodDoc = await transaction.get(prodRef);
        if (prodDoc.exists()) {
          const currentStock = prodDoc.data().stockQuantity ?? 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          transaction.update(prodRef, {
            stockQuantity: newStock,
            available: newStock > 0,
            updatedAt: nowIso,
          });
        }
      }
    }

    // 2. Update order status
    transaction.update(orderRef, {
      orderStatus: 'ACCEPTED' as OrderStatus,
      shippingStatus: (order.orderType === 'COURIER_SHIPPING' ? 'SHIPPING_CONFIRMED' : undefined) as ShippingStatus | undefined,
      acceptedAt: nowIso,
      updatedAt: nowIso,
      serverUpdatedAt: serverTimestamp(),
    });
  });

  // Notify customer
  try {
    await addDoc(collection(db, 'customer_notifications'), {
      customerId: order.customerId,
      orderId: order.id,
      title: 'Order Accepted!',
      message: `Your order #${order.orderNumber || order.id.slice(0, 8)} has been accepted by ${order.storeName || 'the store'}.`,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Customer notification failed:', err);
  }
}

export async function rejectOrder(orderId: string, customerId: string, reason: string): Promise<void> {
  if (!reason.trim()) {
    throw new Error('Please specify a reason for rejecting this order.');
  }

  const nowIso = new Date().toISOString();
  const orderRef = doc(db, 'orders', orderId);

  await updateDoc(orderRef, {
    orderStatus: 'REJECTED' as OrderStatus,
    rejectionReason: reason.trim(),
    updatedAt: nowIso,
    serverUpdatedAt: serverTimestamp(),
  });

  // Notify customer
  try {
    await addDoc(collection(db, 'customer_notifications'), {
      customerId,
      orderId,
      title: 'Order Update',
      message: `Your order was declined by the merchant. Reason: ${reason.trim()}`,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Failed to notify customer of rejection:', err);
  }
}

export async function setOrderPreparing(orderId: string): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);
  await updateDoc(orderRef, {
    orderStatus: 'PREPARING' as OrderStatus,
    updatedAt: new Date().toISOString(),
    serverUpdatedAt: serverTimestamp(),
  });
}

export async function setOrderReadyForPickup(orderId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  const orderRef = doc(db, 'orders', orderId);

  await updateDoc(orderRef, {
    orderStatus: 'READY_FOR_PICKUP' as OrderStatus,
    readyAt: nowIso,
    updatedAt: nowIso,
    serverUpdatedAt: serverTimestamp(),
  });
}

export async function assignDeliveryPartner(
  orderId: string,
  deliveryPartner: AssignedDeliveryPartner
): Promise<void> {
  const nowIso = new Date().toISOString();
  const orderRef = doc(db, 'orders', orderId);

  await updateDoc(orderRef, {
    orderStatus: 'ASSIGNED' as OrderStatus,
    assignedDeliveryPartner: {
      ...deliveryPartner,
      assignedAt: nowIso,
      status: 'ASSIGNED',
    },
    updatedAt: nowIso,
    serverUpdatedAt: serverTimestamp(),
  });

  // Notify delivery partner
  try {
    await addDoc(collection(db, 'delivery_notifications'), {
      deliveryPartnerId: deliveryPartner.id,
      orderId,
      title: 'New Delivery Task Assigned',
      message: `You have been assigned to pick up Order #${orderId.slice(0, 8)}.`,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Delivery partner notification failed:', err);
  }
}

export async function updateCourierShippingStatus(
  orderId: string,
  shippingStatus: ShippingStatus,
  courierDetails?: Partial<CourierDetails>
): Promise<void> {
  const nowIso = new Date().toISOString();
  const orderRef = doc(db, 'orders', orderId);

  const updates: any = {
    shippingStatus,
    updatedAt: nowIso,
    serverUpdatedAt: serverTimestamp(),
  };

  if (courierDetails) {
    updates.courierDetails = {
      ...courierDetails,
      ...(shippingStatus === 'READY_TO_SHIP' ? { readyToShipAt: nowIso } : {}),
      ...(shippingStatus === 'SHIPPED' ? { shippedAt: nowIso, handoverConfirmed: true } : {}),
    };
  }

  await updateDoc(orderRef, updates);
}

export async function setOrderOutForDelivery(orderId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  const orderRef = doc(db, 'orders', orderId);

  await updateDoc(orderRef, {
    orderStatus: 'OUT_FOR_DELIVERY' as OrderStatus,
    'assignedDeliveryPartner.status': 'OUT_FOR_DELIVERY',
    outForDeliveryAt: nowIso,
    updatedAt: nowIso,
    serverUpdatedAt: serverTimestamp(),
  });
}

export async function setOrderDelivered(orderId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  const orderRef = doc(db, 'orders', orderId);

  await updateDoc(orderRef, {
    orderStatus: 'DELIVERED' as OrderStatus,
    'assignedDeliveryPartner.status': 'DELIVERED',
    paymentStatus: 'PAID',
    deliveredAt: nowIso,
    updatedAt: nowIso,
    serverUpdatedAt: serverTimestamp(),
  });
}

export async function simulateTestCustomerOrder(
  partnerId: string,
  storeName?: string,
  localAreaId?: string,
  localAreaName?: string,
  district?: string,
  pincode?: string,
  villageTownCity?: string
): Promise<string> {
  const nowIso = new Date().toISOString();
  const orderNum = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  const ordersRef = collection(db, 'orders');

  const resolvedAreaName = localAreaName || villageTownCity || 'Birpara';
  const resolvedDistrict = district || 'Alipurduar';
  const resolvedPincode = pincode || '735204';

  const docRef = await addDoc(ordersRef, {
    orderNumber: orderNum,
    partnerId,
    storeName: storeName || 'Dooars Local Mart',
    localAreaId: localAreaId || '',
    localAreaName: resolvedAreaName,
    customerId: 'cust_test_' + Math.floor(1000 + Math.random() * 9000),
    customerName: 'Ananya Mukherjee (Local Resident)',
    customerPhone: '+91 98320 12345',
    deliveryAddress: {
      fullName: 'Ananya Mukherjee',
      phone: '+91 98320 12345',
      street: 'Hospital Road, Near Netaji Statue',
      villageTownCity: resolvedAreaName,
      district: resolvedDistrict,
      state: 'West Bengal',
      pincode: resolvedPincode,
      landmark: 'Opposite State Bank ATM',
    },
    items: [
      {
        productId: 'prod_demo_tea',
        productName: 'Makaibari Organic Darjeeling First Flush Tea (250g)',
        price: 380,
        quantity: 1,
        unit: 'packet',
        shippingEligible: true,
      },
      {
        productId: 'prod_demo_rice',
        productName: 'Tulaipanji Aromatic Rice (1kg)',
        price: 140,
        quantity: 2,
        unit: 'kg',
        shippingEligible: true,
      },
    ],
    subtotal: 660,
    deliveryCharge: 35,
    packagingCharge: 15,
    discount: 0,
    totalAmount: 710,
    paymentMethod: 'COD',
    paymentStatus: 'COD_PENDING',
    orderType: 'LOCAL_DELIVERY',
    orderStatus: 'PLACED' as OrderStatus,
    createdAt: nowIso,
    updatedAt: nowIso,
    serverCreatedAt: serverTimestamp(),
  });

  return docRef.id;
}
