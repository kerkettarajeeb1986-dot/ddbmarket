import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { type PayoutRequest, type BankAccountDetails } from '../types';

export function subscribeToPartnerPayouts(
  partnerId: string,
  onPayouts: (payouts: PayoutRequest[]) => void,
  onError?: (err: Error) => void
) {
  const payoutsRef = collection(db, 'payout_requests');
  const q = query(payoutsRef, where('partnerId', '==', partnerId));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: PayoutRequest[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as PayoutRequest);
      });
      list.sort((a, b) => new Date(b.requestDate || 0).getTime() - new Date(a.requestDate || 0).getTime());
      onPayouts(list);
    },
    (err) => {
      if (onError) onError(err);
      else console.error('Error fetching payouts:', err);
    }
  );
}

export async function submitPayoutRequest(
  partnerId: string,
  partnerName: string,
  shopName: string,
  amount: number,
  upiId?: string,
  bankDetails?: BankAccountDetails
): Promise<string> {
  if (amount <= 0) {
    throw new Error('Payout request amount must be greater than ₹0.');
  }
  if (!upiId && (!bankDetails || !bankDetails.accountNumber || !bankDetails.ifscCode)) {
    throw new Error('Please provide either a valid UPI ID or complete Bank Details for payment transfer.');
  }

  // Check for any currently pending or under-review payout request to prevent duplicates
  const payoutsRef = collection(db, 'payout_requests');
  const pendingQuery = query(
    payoutsRef,
    where('partnerId', '==', partnerId),
    where('status', 'in', ['PENDING', 'UNDER_REVIEW', 'PROCESSING'])
  );
  const pendingSnapshot = await getDocs(pendingQuery);
  if (!pendingSnapshot.empty) {
    throw new Error(
      'You already have an active payout request currently in progress. Please wait until it is processed by the administrator.'
    );
  }

  const nowIso = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'payout_requests'), {
    partnerId,
    partnerName,
    shopName,
    amount,
    upiId: upiId?.trim() || '',
    bankDetails: bankDetails || null,
    status: 'PENDING',
    requestDate: nowIso,
    serverCreatedAt: serverTimestamp(),
  });

  // Notify admin of the payout request
  try {
    await addDoc(collection(db, 'admin_notifications'), {
      title: 'Weekly Payout Request Submitted',
      message: `${shopName} requested a payout of ₹${amount.toFixed(2)}.`,
      partnerId,
      payoutRequestId: docRef.id,
      type: 'PAYOUT_REQUEST',
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Admin notification for payout failed:', err);
  }

  return docRef.id;
}
