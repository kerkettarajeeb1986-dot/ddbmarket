import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, set, onDisconnect, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import { db, rtdb } from './firebase';

export async function setStoreOnlineStatus(partnerId: string, isOnline: boolean): Promise<void> {
  const nowIso = new Date().toISOString();

  // 1. Update Firestore
  const partnerDocRef = doc(db, 'market_partners', partnerId);
  await updateDoc(partnerDocRef, {
    isOnline,
    storeStatus: isOnline ? 'ONLINE' : 'OFFLINE',
    shopIsOpen: isOnline,
    statusText: isOnline ? 'Open Now (Accepting Orders)' : 'Closed (Offline)',
    lastSeen: nowIso,
    updatedAt: nowIso,
    serverUpdatedAt: serverTimestamp(),
  });

  // 2. Update Realtime Database presence if available
  if (rtdb) {
    try {
      const presenceRef = ref(rtdb, `store_presence/${partnerId}`);
      if (isOnline) {
        await set(presenceRef, {
          isOnline: true,
          status: 'ONLINE',
          lastSeen: rtdbServerTimestamp(),
          updatedAt: nowIso,
        });
        // Hook automatic disconnect detection
        onDisconnect(presenceRef).update({
          isOnline: false,
          status: 'OFFLINE',
          lastSeen: rtdbServerTimestamp(),
        });
      } else {
        await set(presenceRef, {
          isOnline: false,
          status: 'OFFLINE',
          lastSeen: rtdbServerTimestamp(),
          updatedAt: nowIso,
        });
      }
    } catch (err) {
      console.warn('Realtime Database presence update warning:', err);
    }
  }
}

export async function setAutoAcceptOrders(partnerId: string, autoAcceptOrders: boolean): Promise<void> {
  const nowIso = new Date().toISOString();
  const partnerDocRef = doc(db, 'market_partners', partnerId);
  await updateDoc(partnerDocRef, {
    autoAcceptOrders,
    updatedAt: nowIso,
    serverUpdatedAt: serverTimestamp(),
  });
}
