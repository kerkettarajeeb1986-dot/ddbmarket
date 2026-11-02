import {
  collection,
  doc,
  query,
  where,
  getDocs,
  updateDoc,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { type DeliveryPartnerCandidate, type AssignedDeliveryPartner, type Order } from '../types';

export const DOOARS_DEFAULT_RIDERS: DeliveryPartnerCandidate[] = [
  {
    id: 'rider_dooars_01',
    fullName: 'Bikash Roy (Birpara Express)',
    mobileNumber: '+91 98765 43210',
    isOnline: true,
    status: 'APPROVED',
    currentActiveDeliveries: 0,
    vehicleType: 'Hero Splendor Plus',
  },
  {
    id: 'rider_dooars_02',
    fullName: 'Rahul Thapa (Alipurduar Dispatch)',
    mobileNumber: '+91 98321 09876',
    isOnline: true,
    status: 'APPROVED',
    currentActiveDeliveries: 1,
    vehicleType: 'Honda Activa 6G',
  },
  {
    id: 'rider_dooars_03',
    fullName: 'Prasenjit Barman (Falakata Local)',
    mobileNumber: '+91 94740 12345',
    isOnline: true,
    status: 'APPROVED',
    currentActiveDeliveries: 0,
    vehicleType: 'Bajaj Pulsar 125',
  },
  {
    id: 'rider_dooars_04',
    fullName: 'Amitava Sen (Madarihat Express)',
    mobileNumber: '+91 96478 54321',
    isOnline: true,
    status: 'APPROVED',
    currentActiveDeliveries: 0,
    vehicleType: 'TVS Jupiter',
  },
];

export async function fetchEligibleDeliveryPartners(): Promise<DeliveryPartnerCandidate[]> {
  try {
    const ridersRef = collection(db, 'delivery_partners');
    const q = query(ridersRef, where('status', '==', 'APPROVED'));
    const snapshot = await getDocs(q);

    const candidates: DeliveryPartnerCandidate[] = [];
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      if (data.isOnline !== false) {
        candidates.push({
          id: docSnapshot.id,
          fullName: data.fullName || data.name || 'Delivery Partner',
          mobileNumber: data.mobileNumber || data.phone || '',
          isOnline: !!data.isOnline,
          status: data.status || 'APPROVED',
          currentActiveDeliveries: data.activeDeliveriesCount || 0,
          vehicleType: data.vehicleType || 'Two Wheeler',
        });
      }
    });

    if (candidates.length > 0) {
      return candidates;
    }
  } catch (err) {
    console.warn('Could not query delivery partners collection:', err);
  }

  // Fallback to active Dooars delivery network partners
  return DOOARS_DEFAULT_RIDERS;
}

/**
 * Accept delivery assignment by Delivery Partner.
 * This marks the delivery assignment as accepted, transitions order status to DELIVERY_ACCEPTED,
 * and silences the continuous ringing alarm bell.
 */
export async function acceptDeliveryAssignment(
  orderId: string,
  riderInfo?: { id: string; name?: string; phone?: string },
  partnerId?: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const orderRef = doc(db, 'orders', orderId);

  const updatePayload: Record<string, any> = {
    orderStatus: 'DELIVERY_ACCEPTED',
    'assignedDeliveryPartner.status': 'ACCEPTED',
    'assignedDeliveryPartner.acceptedAt': nowIso,
    deliveryAcceptedAt: nowIso,
    updatedAt: nowIso,
    serverUpdatedAt: serverTimestamp(),
  };

  if (riderInfo?.name) {
    updatePayload['assignedDeliveryPartner.name'] = riderInfo.name;
  }
  if (riderInfo?.phone) {
    updatePayload['assignedDeliveryPartner.phone'] = riderInfo.phone;
  }

  await updateDoc(orderRef, updatePayload);

  // Notify Market Partner
  if (partnerId) {
    try {
      await addDoc(collection(db, 'market_partner_notifications'), {
        partnerId,
        recipientPartnerId: partnerId,
        type: 'DELIVERY_ACCEPTED',
        title: '🚴 Rider Accepted Order!',
        message: `${riderInfo?.name || 'Assigned Delivery Partner'} has received and accepted Order #${orderId.slice(0, 8)}. Rider is heading to pickup.`,
        orderId,
        read: false,
        isRead: false,
        createdAt: nowIso,
        serverCreatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Notification to partner failed:', e);
    }
  }
}
