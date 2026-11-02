import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  addDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  ALLOWED_CATEGORIES,
  normalizeCategoryId,
  getCategoryNames,
  type CategoryDef,
} from '../data/categories';
import { type GlobalCategoryConfig } from '../types';

export const CATEGORIES_CONFIG_COLLECTION = 'categories_config';
export const MASTER_CONFIG_DOC = 'master';

/**
 * Subscribes to the Super Admin global category configuration in real-time.
 * If a category ID is in `disabledCategoryIds`, it is restricted platform-wide.
 */
export function subscribeToGlobalCategoryConfig(
  onUpdate: (config: GlobalCategoryConfig) => void,
  onError?: (err: Error) => void
) {
  const docRef = doc(db, CATEGORIES_CONFIG_COLLECTION, MASTER_CONFIG_DOC);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const disabled = Array.isArray(data.disabledCategoryIds)
          ? data.disabledCategoryIds.map(normalizeCategoryId).filter(Boolean)
          : [];
        onUpdate({
          id: snapshot.id,
          disabledCategoryIds: disabled,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        });
      } else {
        // Document doesn't exist yet -> All 14 categories are enabled by default
        onUpdate({
          id: MASTER_CONFIG_DOC,
          disabledCategoryIds: [],
        });
      }
    },
    (err) => {
      console.warn('Global category config listener note:', err.message);
      // Fallback with all categories enabled
      onUpdate({
        id: MASTER_CONFIG_DOC,
        disabledCategoryIds: [],
      });
      if (onError) onError(err);
    }
  );
}

/**
 * Fetches the current list of globally disabled category IDs.
 */
export async function fetchGlobalDisabledCategoryIds(): Promise<string[]> {
  try {
    const docRef = doc(db, CATEGORIES_CONFIG_COLLECTION, MASTER_CONFIG_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return Array.isArray(data.disabledCategoryIds)
        ? data.disabledCategoryIds.map(normalizeCategoryId).filter(Boolean)
        : [];
    }
    return [];
  } catch (err) {
    console.warn('Could not fetch global category config:', err);
    return [];
  }
}

/**
 * Super Admin toggle to enable or disable a category globally across Dooars Daily Basket.
 */
export async function toggleGlobalCategoryStatus(
  categoryId: string,
  enable: boolean,
  adminIdentifier: string = 'SuperAdmin'
): Promise<void> {
  const normId = normalizeCategoryId(categoryId);
  if (!normId) return;

  const currentDisabled = await fetchGlobalDisabledCategoryIds();
  let updatedDisabled: string[];

  if (enable) {
    // Remove from disabled list
    updatedDisabled = currentDisabled.filter((id) => id !== normId);
  } else {
    // Add to disabled list
    if (!currentDisabled.includes(normId)) {
      updatedDisabled = [...currentDisabled, normId];
    } else {
      updatedDisabled = currentDisabled;
    }
  }

  const docRef = doc(db, CATEGORIES_CONFIG_COLLECTION, MASTER_CONFIG_DOC);
  await setDoc(
    docRef,
    {
      disabledCategoryIds: updatedDisabled,
      updatedAt: new Date().toISOString(),
      updatedBy: adminIdentifier,
      serverUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Updates a Market Partner's selected categories in both `market_partners` and `users` collections.
 * - Requires at least 1 valid category ID.
 * - Stores stable category IDs in `businessCategories` array.
 * - Preserves `businessCategory` as a comma-separated display snapshot for 100% backward compatibility.
 * - Completely preserves existing products and historical orders without deletion!
 */
export async function updatePartnerCategoryPreferences(
  partnerUid: string,
  categoryIds: string[],
  shopName: string = 'Market Partner'
): Promise<{ success: boolean; categories: string[]; displayString: string }> {
  if (!partnerUid) {
    throw new Error('Partner UID is required to update category preferences.');
  }

  const normalized = Array.from(
    new Set(
      categoryIds
        .map(normalizeCategoryId)
        .filter((id) => ALLOWED_CATEGORIES.some((c) => c.id === id))
    )
  );

  if (normalized.length === 0) {
    throw new Error('At least one valid business category must be selected.');
  }

  const names = getCategoryNames(normalized);
  const displayStr = names.join(', ');
  const now = new Date().toISOString();

  // 1. Update market_partners collection
  const partnerRef = doc(db, 'market_partners', partnerUid);
  await updateDoc(partnerRef, {
    businessCategories: normalized,
    businessCategoryNames: names,
    businessCategory: displayStr,
    updatedAt: now,
    serverUpdatedAt: serverTimestamp(),
  });

  // 2. Sync to users collection
  const userRef = doc(db, 'users', partnerUid);
  try {
    await updateDoc(userRef, {
      businessCategories: normalized,
      businessCategoryNames: names,
      businessCategory: displayStr,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Could not sync categories to users collection:', err);
  }

  // 3. Post audit notification to Admin
  try {
    await addDoc(collection(db, 'admin_notifications'), {
      title: 'Partner Categories Updated',
      message: `${shopName} updated their category preferences to: ${displayStr}.`,
      partnerId: partnerUid,
      type: 'CATEGORY_UPDATE',
      businessCategories: normalized,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Could not post admin notification for category update:', err);
  }

  return {
    success: true,
    categories: normalized,
    displayString: displayStr,
  };
}
