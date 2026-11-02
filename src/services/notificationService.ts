import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  updateDoc,
  writeBatch,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { type NotificationItem, type Order } from '../types';

export function subscribeToPartnerNotifications(
  partnerId: string,
  onNotifications: (notifications: NotificationItem[]) => void,
  onError?: (err: Error) => void
) {
  const notifRef = collection(db, 'market_partner_notifications');
  const q = query(notifRef, where('partnerId', '==', partnerId));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: NotificationItem[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as NotificationItem);
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onNotifications(list);
    },
    (err) => {
      if (onError) onError(err);
      else console.error('Error fetching partner notifications:', err);
    }
  );
}

export async function createOrderNotificationIfMissing(partnerId: string, order: Order): Promise<void> {
  const deterministicId = `order_${order.id}`;
  const notifRef = doc(db, 'market_partner_notifications', deterministicId);

  const existing = await getDoc(notifRef);
  if (existing.exists()) {
    return; // Already recorded, avoid duplicate notifications
  }

  const itemsSummary = (order.items || [])
    .map((item) => `${item.productName} × ${item.quantity}`)
    .join(', ');

  const orderNum = order.orderNumber || order.id.slice(0, 8);

  const notifData: Partial<NotificationItem> & Record<string, any> = {
    id: deterministicId,
    partnerId,
    recipientPartnerId: partnerId,
    recipientUserId: partnerId,
    type: 'NEW_ORDER',
    title: `🔔 New Order #${orderNum}`,
    message: `Order #${orderNum} from ${order.customerName || 'Customer'} • ₹${order.totalAmount} (${itemsSummary || 'Items ordered'})`,
    orderId: order.id,
    orderNumber: orderNum,
    customerName: order.customerName,
    itemSummary: itemsSummary,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    read: false,
    isRead: false,
    createdAt: new Date().toISOString(),
    serverCreatedAt: serverTimestamp(),
  };

  await setDoc(notifRef, notifData);
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const notifRef = doc(db, 'market_partner_notifications', notificationId);
  await updateDoc(notifRef, { read: true, isRead: true });
}

export async function markNotificationAsUnread(notificationId: string): Promise<void> {
  const notifRef = doc(db, 'market_partner_notifications', notificationId);
  await updateDoc(notifRef, { read: false, isRead: false });
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const notifRef = doc(db, 'market_partner_notifications', notificationId);
  await deleteDoc(notifRef);
}

export async function markAllNotificationsAsRead(partnerId: string): Promise<void> {
  const notifRef = collection(db, 'market_partner_notifications');
  const q = query(notifRef, where('partnerId', '==', partnerId), where('read', '==', false));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);
  snapshot.forEach((d) => {
    batch.update(d.ref, { read: true, isRead: true });
  });

  await batch.commit();
}
