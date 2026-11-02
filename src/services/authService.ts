import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { type MarketPartnerProfile, type PartnerApplicationStatus } from '../types';
import {
  normalizeCategoryId,
  getCategoryNames,
  getPartnerCategoryIds,
  getPartnerCategoryNames,
} from '../data/categories';

export interface RegistrationInput {
  fullName: string;
  email: string;
  mobileNumber: string;
  shopName: string;
  shopAddress: string;
  villageTownCity: string;
  district: string;
  state: string;
  pincode: string;
  localAreaId: string;
  localAreaName: string;
  gpsLocation?: { lat: number; lng: number; address?: string };
  businessCategory: string;
  businessCategories?: string[];
  businessCategoryNames?: string[];
  fssaiNumber?: string;
  fssaiCertUrl?: string;
  foodLicenseUrl?: string;
  tradeLicenseNumber?: string;
  tradeLicenseUrl?: string;
  identityDocNumber?: string;
  identityDocUrl?: string;
  identityProofUrl?: string;
  shopPhotoUrl?: string;
  storePhotoUrl?: string;
  shopLogoUrl?: string;
  upiQrUrl?: string;
  bankPassbookUrl?: string;
  bankDetails?: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName?: string;
  };
  upiId?: string;
  password: string;
}

export async function registerMarketPartner(input: RegistrationInput): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  const user = userCredential.user;

  const nowIso = new Date().toISOString();

  // Normalize categories
  const selectedCategories = input.businessCategories && input.businessCategories.length > 0
    ? input.businessCategories.map(normalizeCategoryId).filter(Boolean)
    : (input.businessCategory ? [normalizeCategoryId(input.businessCategory)] : ['grocery']);

  const selectedCategoryNames = getCategoryNames(selectedCategories);
  const displayCategoryStr = selectedCategoryNames.join(', ');

  const partnerProfile: MarketPartnerProfile = {
    uid: user.uid,
    email: input.email.trim().toLowerCase(),
    fullName: input.fullName.trim(),
    mobileNumber: input.mobileNumber.trim(),
    shopName: input.shopName.trim(),
    shopAddress: input.shopAddress.trim(),
    villageTownCity: input.villageTownCity.trim(),
    district: input.district.trim(),
    state: input.state.trim(),
    pincode: input.pincode.trim(),
    localAreaId: input.localAreaId.trim(),
    areaId: input.localAreaId.trim(),
    localAreaName: input.localAreaName.trim(),
    gpsLocation: input.gpsLocation,
    businessCategory: displayCategoryStr,
    businessCategories: selectedCategories,
    businessCategoryNames: selectedCategoryNames,
    fssaiNumber: input.fssaiNumber?.trim() || '',
    fssaiCertUrl: input.fssaiCertUrl || input.foodLicenseUrl || '',
    foodLicenseUrl: input.foodLicenseUrl || input.fssaiCertUrl || '',
    tradeLicenseNumber: input.tradeLicenseNumber?.trim() || '',
    tradeLicenseUrl: input.tradeLicenseUrl || '',
    identityDocNumber: input.identityDocNumber?.trim() || '',
    identityDocUrl: input.identityDocUrl || input.identityProofUrl || '',
    identityProofUrl: input.identityProofUrl || input.identityDocUrl || '',
    shopPhotoUrl: input.shopPhotoUrl || input.storePhotoUrl || '',
    storePhotoUrl: input.storePhotoUrl || input.shopPhotoUrl || '',
    shopLogoUrl: input.shopLogoUrl || '',
    bankDetails: input.bankDetails,
    upiId: input.upiId?.trim() || '',
    openingHours: '09:00',
    closingHours: '20:00',
    weeklyHoliday: 'None',
    minimumOrder: 0,
    preparationTimeMinutes: 20,
    storeDescription: `${input.shopName} - Quality daily essentials and fresh market items in Dooars.`,
    isOnline: false,
    status: 'PENDING',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // Save to both 'users' and 'market_partners'
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: input.email.trim().toLowerCase(),
    fullName: input.fullName.trim(),
    role: 'market_partner',
    status: 'PENDING',
    localAreaId: input.localAreaId.trim(),
    areaId: input.localAreaId.trim(),
    localAreaName: input.localAreaName.trim(),
    businessCategory: displayCategoryStr,
    businessCategories: selectedCategories,
    businessCategoryNames: selectedCategoryNames,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'market_partners', user.uid), {
    ...partnerProfile,
    serverCreatedAt: serverTimestamp(),
    serverUpdatedAt: serverTimestamp(),
  });

  // Notify Super Admin
  try {
    await addDoc(collection(db, 'admin_notifications'), {
      title: 'New Market Partner Registration',
      message: `${input.shopName} (${input.fullName}) from Local Area: ${input.localAreaName || input.villageTownCity}, ${input.district} registered and is awaiting approval.`,
      partnerId: user.uid,
      localAreaId: input.localAreaId.trim(),
      localAreaName: input.localAreaName.trim(),
      type: 'PARTNER_REGISTRATION',
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Could not post admin notification:', err);
  }

  // Send verification email
  try {
    await sendEmailVerification(user);
  } catch (err) {
    console.warn('Could not trigger verification email:', err);
  }

  return user;
}

export async function loginMarketPartner(email: string, pass: string): Promise<{ user: User; profile: MarketPartnerProfile }> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
  const user = credential.user;

  // Verify role
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data();

  if (userData && userData.role && userData.role !== 'market_partner') {
    await fbSignOut(auth);
    throw new Error('Access denied. This portal is strictly for authorized Dooars Daily Basket Market Partners.');
  }

  // Fetch or ensure market_partners profile
  const partnerDoc = await getDoc(doc(db, 'market_partners', user.uid));
  if (!partnerDoc.exists()) {
    // If user was created in users without market_partners doc
    const catIds = getPartnerCategoryIds(userData);
    const resolvedCatIds = catIds.length > 0 ? catIds : ['grocery'];
    const fallbackProfile: MarketPartnerProfile = {
      uid: user.uid,
      email: user.email || '',
      fullName: userData?.fullName || user.displayName || 'Market Partner',
      mobileNumber: userData?.phone || userData?.mobileNumber || '',
      shopName: userData?.shopName || 'Market Partner Store',
      shopAddress: userData?.address || '',
      villageTownCity: userData?.city || '',
      district: userData?.district || 'Alipurduar',
      state: userData?.state || 'West Bengal',
      pincode: userData?.pincode || '735122',
      businessCategory: userData?.businessCategory || userData?.category || 'Grocery',
      businessCategories: resolvedCatIds,
      businessCategoryNames: getCategoryNames(resolvedCatIds),
      isOnline: false,
      status: (userData?.status as PartnerApplicationStatus) || 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'market_partners', user.uid), fallbackProfile);
    return { user, profile: fallbackProfile };
  }

  const rawData = partnerDoc.data() as MarketPartnerProfile;
  const catIds = getPartnerCategoryIds(rawData);
  const profile: MarketPartnerProfile = {
    ...rawData,
    businessCategories: catIds,
    businessCategoryNames: getCategoryNames(catIds),
  };

  return { user, profile };
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function resendVerification(): Promise<void> {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
  }
}

export async function logout(): Promise<void> {
  await fbSignOut(auth);
}

export function subscribeToPartnerProfile(
  uid: string,
  onProfile: (profile: MarketPartnerProfile | null) => void,
  onError?: (err: Error) => void
) {
  const partnerRef = doc(db, 'market_partners', uid);
  return onSnapshot(
    partnerRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const raw = snapshot.data() as MarketPartnerProfile;
        const catIds = getPartnerCategoryIds(raw);
        onProfile({
          ...raw,
          businessCategories: catIds,
          businessCategoryNames: getCategoryNames(catIds),
        });
      } else {
        onProfile(null);
      }
    },
    (err) => {
      if (onError) onError(err);
      else console.error('Error fetching partner profile:', err);
    }
  );
}

export async function updatePartnerProfile(
  uid: string,
  updates: Partial<MarketPartnerProfile>
): Promise<void> {
  const partnerRef = doc(db, 'market_partners', uid);
  const now = new Date().toISOString();

  await updateDoc(partnerRef, {
    ...updates,
    updatedAt: now,
    serverUpdatedAt: serverTimestamp(),
  });
}

export async function resubmitApplication(
  uid: string,
  updates: Partial<MarketPartnerProfile>
): Promise<void> {
  const partnerRef = doc(db, 'market_partners', uid);
  const userRef = doc(db, 'users', uid);
  const now = new Date().toISOString();

  const payload = {
    ...updates,
    status: 'PENDING' as PartnerApplicationStatus,
    rejectionReason: '',
    updatedAt: now,
    serverUpdatedAt: serverTimestamp(),
  };

  await updateDoc(partnerRef, payload);
  await updateDoc(userRef, {
    status: 'PENDING',
    updatedAt: serverTimestamp(),
  });

  try {
    await addDoc(collection(db, 'admin_notifications'), {
      title: 'Market Partner Re-application',
      message: `Partner ${updates.shopName || uid} resubmitted their application for review.`,
      partnerId: uid,
      type: 'PARTNER_RESUBMIT',
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Could not post resubmit notification:', err);
  }
}

export const signInPartner = loginMarketPartner;
export const sendPasswordResetEmailToPartner = resetPassword;
export const registerPartnerAccount = registerMarketPartner;
