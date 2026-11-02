import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { type ServiceArea, type AreaChangeRequest } from '../types';

/**
 * SINGLE SOURCE OF TRUTH:
 * Official Firestore collection managed exclusively by the Super Admin.
 */
export const LOCAL_AREAS_COLLECTION = 'localAreas';

// Clean legacy localStorage keys to ensure old hardcoded/demo areas never persist in browser
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    window.localStorage.removeItem('dooars_active_service_areas_v2');
    window.localStorage.removeItem('dooars_active_service_areas');
  } catch (e) {
    // Ignore storage errors in restricted browser contexts
  }
}

/**
 * Maps a Firestore document from `localAreas` into the application's ServiceArea type.
 * Supports existing fields used in Firestore:
 * - name (or areaName)
 * - status ('active' | 'disabled' | 'archived')
 * - enabled (boolean)
 * - district, state, pinCodes, notes, deliveryAvailable, shippingAvailable
 */
export function mapFirestoreDocToServiceArea(docId: string, data: Record<string, any>): ServiceArea {
  const areaName = (data.name || data.areaName || '').trim();
  const rawStatus = (data.status || '').toLowerCase().trim();

  // Condition 1: Document must be active
  // If status is present, it must be 'active' (not 'disabled' or 'archived')
  // If enabled is present, it must not be false
  const isStatusActive = rawStatus ? rawStatus === 'active' : true;
  const isNotDisabledOrArchived = rawStatus !== 'disabled' && rawStatus !== 'archived';
  const isEnabledFlag = data.enabled !== false;
  const isFullyActive = isStatusActive && isNotDisabledOrArchived && isEnabledFlag;

  let pinCodes: string[] = [];
  if (Array.isArray(data.pinCodes)) {
    pinCodes = data.pinCodes.map(String).map((p: string) => p.trim()).filter(Boolean);
  } else if (typeof data.pinCodes === 'string') {
    pinCodes = data.pinCodes.split(',').map((p: string) => p.trim()).filter(Boolean);
  }

  const createdAt = data.createdAt?.toDate
    ? data.createdAt.toDate().toISOString()
    : typeof data.createdAt === 'string'
    ? data.createdAt
    : new Date().toISOString();

  const updatedAt = data.updatedAt?.toDate
    ? data.updatedAt.toDate().toISOString()
    : typeof data.updatedAt === 'string'
    ? data.updatedAt
    : createdAt;

  return {
    id: docId,
    areaId: data.areaId || docId,
    areaName,
    name: data.name || areaName,
    city: data.city || areaName,
    district: data.district || '',
    state: data.state || 'West Bengal',
    pinCodes,
    latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
    longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
    radiusKm: typeof data.radiusKm === 'number' ? data.radiusKm : 10,
    enabled: isFullyActive,
    status: rawStatus || (isFullyActive ? 'active' : 'disabled'),
    notes: data.notes || '',
    deliveryAvailable: data.deliveryAvailable !== false,
    shippingAvailable: data.shippingAvailable !== false,
    createdAt,
    updatedAt,
  };
}

/**
 * Real-time subscription to active/enabled local areas from Firestore collection "localAreas".
 * Used for Market Partner and Delivery Partner registration dropdowns.
 * 
 * Rules:
 * - NO hardcoded fallback arrays
 * - NO demo/preset areas
 * - Only documents that exist in Firestore "localAreas" AND are enabled/active are returned.
 */
export function subscribeToActiveServiceAreas(
  onAreas: (areas: ServiceArea[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, LOCAL_AREAS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const activeList: ServiceArea[] = [];
        snapshot.forEach((docSnap) => {
          const area = mapFirestoreDocToServiceArea(docSnap.id, docSnap.data());
          if (area.enabled && area.areaName) {
            activeList.push(area);
          }
        });

        // Sort alphabetically by area name
        activeList.sort((a, b) => a.areaName.localeCompare(b.areaName));
        onAreas(activeList);
      },
      (err) => {
        console.error('Firestore subscription error in localAreas:', err);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    console.error('Failed to initialize subscription to localAreas:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * One-off fetch for active service areas directly from Firestore collection "localAreas".
 */
export async function fetchActiveServiceAreas(): Promise<ServiceArea[]> {
  const colRef = collection(db, LOCAL_AREAS_COLLECTION);
  const snapshot = await getDocs(colRef);
  const activeList: ServiceArea[] = [];
  snapshot.forEach((docSnap) => {
    const area = mapFirestoreDocToServiceArea(docSnap.id, docSnap.data());
    if (area.enabled && area.areaName) {
      activeList.push(area);
    }
  });
  activeList.sort((a, b) => a.areaName.localeCompare(b.areaName));
  return activeList;
}

/**
 * Authoritative backend check before partner registration.
 * Ensures the area document exists in Firestore and is currently enabled/active.
 */
export async function validateServiceAreaForRegistration(
  areaDocId: string
): Promise<{ valid: boolean; area?: ServiceArea; error?: string }> {
  if (!areaDocId || !areaDocId.trim()) {
    return { valid: false, error: 'Please select an official local area from the dropdown.' };
  }

  const cleanId = areaDocId.trim();

  try {
    // 1. Check by Firestore document ID
    const areaRef = doc(db, LOCAL_AREAS_COLLECTION, cleanId);
    const areaSnap = await getDoc(areaRef);

    if (areaSnap.exists()) {
      const area = mapFirestoreDocToServiceArea(areaSnap.id, areaSnap.data());
      if (!area.enabled) {
        return {
          valid: false,
          error: `The area "${area.areaName}" is currently disabled or not available for new registrations.`,
        };
      }
      return { valid: true, area };
    }

    // 2. Fallback check by 'areaId' field if distinct from doc ID
    const q = query(collection(db, LOCAL_AREAS_COLLECTION), where('areaId', '==', cleanId));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      const firstDoc = querySnap.docs[0];
      const area = mapFirestoreDocToServiceArea(firstDoc.id, firstDoc.data());
      if (!area.enabled) {
        return {
          valid: false,
          error: `The area "${area.areaName}" is currently disabled or not available for new registrations.`,
        };
      }
      return { valid: true, area };
    }

    return {
      valid: false,
      error: 'The selected local area is not recognized in the Super Admin registry. Please select an active area.',
    };
  } catch (err: any) {
    console.error('Validation error checking localAreas:', err);
    return {
      valid: false,
      error: `Could not verify local area with Firestore: ${err.message || 'Network error'}`,
    };
  }
}

/**
 * Super Admin: Real-time subscription to ALL local areas (active, disabled, archived).
 */
export function subscribeToAllServiceAreas(
  onAreas: (areas: ServiceArea[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, LOCAL_AREAS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const allList: ServiceArea[] = [];
        snapshot.forEach((docSnap) => {
          allList.push(mapFirestoreDocToServiceArea(docSnap.id, docSnap.data()));
        });
        allList.sort((a, b) => a.areaName.localeCompare(b.areaName));
        onAreas(allList);
      },
      (err) => {
        console.error('Super Admin subscription error for localAreas:', err);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    console.error('Failed to subscribe to all local areas:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Super Admin: Create or update a Local Area in Firestore.
 */
export async function saveServiceArea(
  input: {
    areaId?: string;
    id?: string;
    areaName: string;
    name?: string;
    city?: string;
    district?: string;
    state?: string;
    pinCodes: string[] | string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    enabled?: boolean;
    status?: string;
    notes?: string;
    deliveryAvailable?: boolean;
    shippingAvailable?: boolean;
    createdBy?: string;
  }
): Promise<string> {
  const cleanName = (input.areaName || input.name || '').trim();
  if (!cleanName) throw new Error('Area Name is required.');

  const targetDocId = input.id?.trim() || input.areaId?.trim() || undefined;

  const pinArray = Array.isArray(input.pinCodes)
    ? input.pinCodes.map(String).map((p) => p.trim()).filter(Boolean)
    : (input.pinCodes || '')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

  const isEnabled = input.enabled !== false && input.status !== 'disabled' && input.status !== 'archived';
  const statusStr = input.status || (isEnabled ? 'active' : 'disabled');

  const payload: Record<string, any> = {
    name: cleanName,
    areaName: cleanName,
    city: input.city?.trim() || cleanName,
    district: input.district?.trim() || 'Jalpaiguri',
    state: input.state?.trim() || 'West Bengal',
    pinCodes: pinArray,
    status: statusStr,
    enabled: isEnabled,
    deliveryAvailable: input.deliveryAvailable !== false,
    shippingAvailable: input.shippingAvailable !== false,
    notes: input.notes || '',
    updatedAt: serverTimestamp(),
  };

  if (typeof input.latitude === 'number' && !isNaN(input.latitude)) {
    payload.latitude = input.latitude;
  }
  if (typeof input.longitude === 'number' && !isNaN(input.longitude)) {
    payload.longitude = input.longitude;
  }
  if (typeof input.radiusKm === 'number' && !isNaN(input.radiusKm)) {
    payload.radiusKm = input.radiusKm;
  }
  if (input.createdBy) {
    payload.createdBy = input.createdBy;
  }

  if (targetDocId) {
    payload.areaId = targetDocId;
    const docRef = doc(db, LOCAL_AREAS_COLLECTION, targetDocId);
    await updateDoc(docRef, payload);
    return targetDocId;
  } else {
    payload.createdAt = serverTimestamp();
    const docRef = await addDoc(collection(db, LOCAL_AREAS_COLLECTION), payload);
    await updateDoc(docRef, { areaId: docRef.id });
    return docRef.id;
  }
}

/**
 * Super Admin: Toggle enabled/disabled status in Firestore.
 */
export async function toggleServiceAreaEnabled(
  areaDocId: string,
  enabled: boolean
): Promise<void> {
  const docRef = doc(db, LOCAL_AREAS_COLLECTION, areaDocId);
  await updateDoc(docRef, {
    enabled,
    status: enabled ? 'active' : 'disabled',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Super Admin: Archive an area in Firestore.
 */
export async function archiveServiceArea(areaDocId: string): Promise<void> {
  const docRef = doc(db, LOCAL_AREAS_COLLECTION, areaDocId);
  await updateDoc(docRef, {
    enabled: false,
    status: 'archived',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Super Admin: Delete an area document from Firestore.
 */
export async function deleteServiceArea(areaDocId: string): Promise<void> {
  const docRef = doc(db, LOCAL_AREAS_COLLECTION, areaDocId);
  await deleteDoc(docRef);
}

export interface AreaChangeRequestPayload {
  partnerId: string;
  partnerName: string;
  shopName: string;
  currentAreaId: string;
  currentAreaName: string;
  requestedAreaId: string;
  requestedAreaName: string;
  reason: string;
}

/**
 * Market Partner: Request an Area Change.
 */
export async function submitAreaChangeRequest(
  arg1: string | AreaChangeRequestPayload,
  partnerName?: string,
  shopName?: string,
  currentAreaId?: string,
  currentAreaName?: string,
  requestedAreaId?: string,
  requestedAreaName?: string,
  reason?: string
): Promise<string> {
  let pId = '';
  let pName = '';
  let sName = '';
  let cAreaId = '';
  let cAreaName = '';
  let rAreaId = '';
  let rAreaName = '';
  let rReason = '';

  if (typeof arg1 === 'string') {
    pId = arg1;
    pName = partnerName || '';
    sName = shopName || '';
    cAreaId = currentAreaId || '';
    cAreaName = currentAreaName || '';
    rAreaId = requestedAreaId || '';
    rAreaName = requestedAreaName || '';
    rReason = reason || '';
  } else if (arg1) {
    pId = arg1.partnerId;
    pName = arg1.partnerName;
    sName = arg1.shopName;
    cAreaId = arg1.currentAreaId;
    cAreaName = arg1.currentAreaName;
    rAreaId = arg1.requestedAreaId;
    rAreaName = arg1.requestedAreaName;
    rReason = arg1.reason;
  }

  const reqRef = await addDoc(collection(db, 'area_change_requests'), {
    partnerId: pId,
    partnerName: pName,
    shopName: sName,
    currentAreaId: cAreaId,
    currentAreaName: cAreaName,
    requestedAreaId: rAreaId,
    requestedAreaName: rAreaName,
    reason: rReason.trim(),
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    serverCreatedAt: serverTimestamp(),
  });

  try {
    await addDoc(collection(db, 'admin_notifications'), {
      title: 'Local Area Change Request',
      message: `${sName} requested to change area from ${cAreaName || 'None'} to ${rAreaName}. Reason: ${rReason}`,
      partnerId: pId,
      requestId: reqRef.id,
      type: 'AREA_CHANGE_REQUEST',
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Could not post admin notification:', err);
  }

  return reqRef.id;
}

/**
 * Real-time subscription to Area Change Requests.
 */
export function subscribeToAreaChangeRequests(
  onRequest: (requests: AreaChangeRequest[]) => void
): () => void {
  const q = query(
    collection(db, 'area_change_requests'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: AreaChangeRequest[] = [];
      snapshot.forEach((snap) => {
        const d = snap.data();
        list.push({
          id: snap.id,
          partnerId: d.partnerId || '',
          partnerName: d.partnerName || '',
          shopName: d.shopName || '',
          currentAreaId: d.currentAreaId || '',
          currentAreaName: d.currentAreaName || '',
          requestedAreaId: d.requestedAreaId || '',
          requestedAreaName: d.requestedAreaName || '',
          reason: d.reason || '',
          status: d.status || 'PENDING',
          createdAt: d.createdAt || '',
          reviewedAt: d.reviewedAt,
          adminRemarks: d.adminRemarks,
        });
      });
      onRequest(list);
    },
    (err) => {
      console.warn('Area change requests listener note:', err);
    }
  );
}

/**
 * Super Admin: Approve or Reject an Area Change Request.
 */
export async function reviewAreaChangeRequest(
  requestId: string,
  approved: boolean,
  targetArea?: ServiceArea,
  adminRemarks?: string
): Promise<void> {
  const reqRef = doc(db, 'area_change_requests', requestId);
  const snap = await getDoc(reqRef);
  if (!snap.exists()) throw new Error('Request not found');

  const data = snap.data();
  const now = new Date().toISOString();

  await updateDoc(reqRef, {
    status: approved ? 'APPROVED' : 'REJECTED',
    reviewedAt: now,
    adminRemarks: adminRemarks || '',
    serverUpdatedAt: serverTimestamp(),
  });

  if (approved && targetArea && data.partnerId) {
    const partnerRef = doc(db, 'market_partners', data.partnerId);
    await updateDoc(partnerRef, {
      localAreaId: targetArea.areaId,
      areaId: targetArea.areaId,
      localAreaName: targetArea.areaName,
      updatedAt: now,
      serverUpdatedAt: serverTimestamp(),
    });
  }
}
