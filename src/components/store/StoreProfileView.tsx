import React, { useState } from 'react';
import {
  Store,
  MapPin,
  Clock,
  Upload,
  Save,
  X,
  Compass,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building,
  CreditCard,
  Image as ImageIcon,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ALLOWED_CATEGORIES, getPartnerCategoryIds, getCategoryNames } from '../../data/categories';
import { MultiCategorySelector } from '../common/MultiCategorySelector';
import { uploadPartnerFile } from '../../services/storageService';
import {
  subscribeToActiveServiceAreas,
  submitAreaChangeRequest,
} from '../../services/serviceAreaService';
import {
  subscribeToGlobalCategoryConfig,
  updatePartnerCategoryPreferences,
} from '../../services/categoryService';
import { setStoreOnlineStatus } from '../../services/storeStatusService';
import { type MarketPartnerProfile, type ServiceArea } from '../../types';

export const StoreProfileView: React.FC = () => {
  const { partnerProfile, updateProfile, currentUser } = useAuth();
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [shopName, setShopName] = useState(partnerProfile?.shopName || '');
  const [fullName, setFullName] = useState(partnerProfile?.fullName || '');
  const [mobileNumber, setMobileNumber] = useState(partnerProfile?.mobileNumber || '');
  const [shopAddress, setShopAddress] = useState(partnerProfile?.shopAddress || '');
  const [villageTownCity, setVillageTownCity] = useState(partnerProfile?.villageTownCity || '');
  const [district, setDistrict] = useState(partnerProfile?.district || 'Alipurduar');
  const [state, setState] = useState(partnerProfile?.state || 'West Bengal');
  const [pincode, setPincode] = useState(partnerProfile?.pincode || '735122');
  const [businessCategory, setBusinessCategory] = useState(
    partnerProfile?.businessCategory || ALLOWED_CATEGORIES[0].name
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    getPartnerCategoryIds(partnerProfile)
  );
  const [disabledCategoryIds, setDisabledCategoryIds] = useState<string[]>([]);
  const [savingCategories, setSavingCategories] = useState(false);
  const [categoryFeedback, setCategoryFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Subscribe to Super Admin global category restrictions
  React.useEffect(() => {
    const unsub = subscribeToGlobalCategoryConfig((config) => {
      setDisabledCategoryIds(config.disabledCategoryIds || []);
    });
    return () => unsub();
  }, []);
  const [openingHours, setOpeningHours] = useState(partnerProfile?.openingHours || '08:00');
  const [closingHours, setClosingHours] = useState(partnerProfile?.closingHours || '20:30');
  const [weeklyHoliday, setWeeklyHoliday] = useState(partnerProfile?.weeklyHoliday || 'None');
  const [minimumOrder, setMinimumOrder] = useState<string>(
    partnerProfile?.minimumOrder !== undefined ? String(partnerProfile.minimumOrder) : '0'
  );
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<string>(
    partnerProfile?.preparationTimeMinutes !== undefined
      ? String(partnerProfile.preparationTimeMinutes)
      : '20'
  );
  const [storeDescription, setStoreDescription] = useState(
    partnerProfile?.storeDescription || ''
  );
  const [upiId, setUpiId] = useState(partnerProfile?.upiId || '');

  // Bank
  const [accountHolderName, setAccountHolderName] = useState(
    partnerProfile?.bankDetails?.accountHolderName || ''
  );
  const [accountNumber, setAccountNumber] = useState(
    partnerProfile?.bankDetails?.accountNumber || ''
  );
  const [ifscCode, setIfscCode] = useState(partnerProfile?.bankDetails?.ifscCode || '');
  const [bankName, setBankName] = useState(partnerProfile?.bankDetails?.bankName || '');

  // Media
  const [shopLogoUrl, setShopLogoUrl] = useState(partnerProfile?.shopLogoUrl || '');
  const [shopPhotoUrl, setShopPhotoUrl] = useState(partnerProfile?.shopPhotoUrl || '');

  // GPS
  const [gpsLocation, setGpsLocation] = useState(partnerProfile?.gpsLocation);

  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Area Change Request State
  const [showAreaChangeModal, setShowAreaChangeModal] = useState(false);
  const [activeAreas, setActiveAreas] = useState<ServiceArea[]>([]);
  const [loadingActiveAreas, setLoadingActiveAreas] = useState(false);
  const [selectedNewAreaId, setSelectedNewAreaId] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [submittingChangeReq, setSubmittingChangeReq] = useState(false);
  const [changeReqSuccess, setChangeReqSuccess] = useState<string | null>(null);
  const [changeReqError, setChangeReqError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!showAreaChangeModal) return;
    setLoadingActiveAreas(true);
    const unsub = subscribeToActiveServiceAreas(
      (areas) => {
        setActiveAreas(areas);
        setLoadingActiveAreas(false);
      },
      () => {
        setLoadingActiveAreas(false);
      }
    );
    return () => unsub();
  }, [showAreaChangeModal]);

  const handleSubmitAreaChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerProfile || !currentUser) return;
    if (!selectedNewAreaId) {
      setChangeReqError('Please select the new target local area.');
      return;
    }
    if (!changeReason.trim()) {
      setChangeReqError('Please provide a reason for the requested area change.');
      return;
    }

    const targetArea = activeAreas.find((a) => (a.areaId || a.id) === selectedNewAreaId);
    if (!targetArea) {
      setChangeReqError('Selected area is no longer available.');
      return;
    }

    try {
      setSubmittingChangeReq(true);
      setChangeReqError(null);
      await submitAreaChangeRequest({
        partnerId: currentUser.uid,
        partnerName: partnerProfile.fullName,
        shopName: partnerProfile.shopName,
        currentAreaId: partnerProfile.localAreaId || '',
        currentAreaName: partnerProfile.localAreaName || partnerProfile.villageTownCity || 'None',
        requestedAreaId: targetArea.areaId || targetArea.id,
        requestedAreaName: targetArea.areaName,
        reason: changeReason.trim(),
      });
      setChangeReqSuccess('Area change request submitted successfully for Super Admin review.');
      setTimeout(() => {
        setShowAreaChangeModal(false);
        setChangeReqSuccess(null);
        setSelectedNewAreaId('');
        setChangeReason('');
      }, 2500);
    } catch (err: any) {
      setChangeReqError(err.message || 'Could not submit area change request.');
    } finally {
      setSubmittingChangeReq(false);
    }
  };

  React.useEffect(() => {
    if (partnerProfile && !isEditing) {
      setShopName(partnerProfile.shopName || '');
      setFullName(partnerProfile.fullName || '');
      setMobileNumber(partnerProfile.mobileNumber || '');
      setShopAddress(partnerProfile.shopAddress || '');
      setVillageTownCity(partnerProfile.villageTownCity || '');
      setDistrict(partnerProfile.district || 'Alipurduar');
      setState(partnerProfile.state || 'West Bengal');
      setPincode(partnerProfile.pincode || '735122');
      setBusinessCategory(partnerProfile.businessCategory || ALLOWED_CATEGORIES[0].name);
      setSelectedCategoryIds(getPartnerCategoryIds(partnerProfile));
      setOpeningHours(partnerProfile.openingHours || '08:00');
      setClosingHours(partnerProfile.closingHours || '20:30');
      setWeeklyHoliday(partnerProfile.weeklyHoliday || 'None');
      setMinimumOrder(partnerProfile.minimumOrder !== undefined ? String(partnerProfile.minimumOrder) : '0');
      setPrepTimeMinutes(partnerProfile.preparationTimeMinutes !== undefined ? String(partnerProfile.preparationTimeMinutes) : '20');
      setStoreDescription(partnerProfile.storeDescription || '');
      setUpiId(partnerProfile.upiId || '');
      setAccountHolderName(partnerProfile.bankDetails?.accountHolderName || '');
      setAccountNumber(partnerProfile.bankDetails?.accountNumber || '');
      setIfscCode(partnerProfile.bankDetails?.ifscCode || '');
      setBankName(partnerProfile.bankDetails?.bankName || '');
      setShopLogoUrl(partnerProfile.shopLogoUrl || '');
      setShopPhotoUrl(partnerProfile.shopPhotoUrl || '');
      setGpsLocation(partnerProfile.gpsLocation);
    }
  }, [partnerProfile, isEditing]);

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);
    setErrorMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: `${villageTownCity}, ${district}`,
        });
        setDetectingGps(false);
      },
      (err) => {
        setErrorMessage('Could not acquire GPS: ' + err.message);
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    try {
      setUploadingLogo(true);
      setErrorMessage(null);
      const url = await uploadPartnerFile(file, currentUser.uid, 'store');
      setShopLogoUrl(url);
    } catch (err: any) {
      setErrorMessage('Logo upload failed: ' + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    try {
      setUploadingPhoto(true);
      setErrorMessage(null);
      const url = await uploadPartnerFile(file, currentUser.uid, 'store');
      setShopPhotoUrl(url);
    } catch (err: any) {
      setErrorMessage('Store photo upload failed: ' + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!shopName.trim()) {
      setErrorMessage('Shop Name is required.');
      return;
    }
    if (!mobileNumber.trim()) {
      setErrorMessage('Mobile Number is required.');
      return;
    }

    try {
      setSaving(true);
      const catNames = getCategoryNames(selectedCategoryIds);
      const updates: Partial<MarketPartnerProfile> = {
        shopName: shopName.trim(),
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        shopAddress: shopAddress.trim(),
        villageTownCity: villageTownCity.trim(),
        district: district.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        businessCategory: catNames.length > 0 ? catNames.join(', ') : businessCategory,
        businessCategories: selectedCategoryIds,
        businessCategoryNames: catNames,
        openingHours,
        closingHours,
        weeklyHoliday,
        minimumOrder: Number(minimumOrder) || 0,
        preparationTimeMinutes: Number(prepTimeMinutes) || 20,
        storeDescription: storeDescription.trim(),
        upiId: upiId.trim(),
        shopLogoUrl,
        shopPhotoUrl,
        gpsLocation,
        bankDetails: accountNumber.trim()
          ? {
              accountHolderName: accountHolderName.trim() || fullName.trim(),
              accountNumber: accountNumber.trim(),
              ifscCode: ifscCode.trim().toUpperCase(),
              bankName: bankName.trim(),
            }
          : undefined,
      };

      await updateProfile(updates);
      setSuccessMessage('Store profile saved and updated in Firebase successfully.');
      setIsEditing(false);
    } catch (err: any) {
      setErrorMessage('Failed to save store profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrorMessage(null);
    // Reset fields back to partnerProfile values
    if (partnerProfile) {
      setShopName(partnerProfile.shopName || '');
      setFullName(partnerProfile.fullName || '');
      setMobileNumber(partnerProfile.mobileNumber || '');
      setShopAddress(partnerProfile.shopAddress || '');
      setVillageTownCity(partnerProfile.villageTownCity || '');
      setDistrict(partnerProfile.district || '');
      setState(partnerProfile.state || '');
      setPincode(partnerProfile.pincode || '');
      setBusinessCategory(partnerProfile.businessCategory || ALLOWED_CATEGORIES[0].name);
      setOpeningHours(partnerProfile.openingHours || '08:00');
      setClosingHours(partnerProfile.closingHours || '20:30');
      setWeeklyHoliday(partnerProfile.weeklyHoliday || 'None');
      setMinimumOrder(String(partnerProfile.minimumOrder ?? 0));
      setPrepTimeMinutes(String(partnerProfile.preparationTimeMinutes ?? 20));
      setStoreDescription(partnerProfile.storeDescription || '');
      setUpiId(partnerProfile.upiId || '');
      setShopLogoUrl(partnerProfile.shopLogoUrl || '');
      setShopPhotoUrl(partnerProfile.shopPhotoUrl || '');
      setGpsLocation(partnerProfile.gpsLocation);
      setSelectedCategoryIds(getPartnerCategoryIds(partnerProfile));
    }
  };

  const handleSaveCategoriesOnly = async () => {
    if (!currentUser) return;
    if (selectedCategoryIds.length === 0) {
      setCategoryFeedback({ type: 'error', text: 'Please select at least one business category.' });
      return;
    }
    try {
      setSavingCategories(true);
      setCategoryFeedback(null);
      await updatePartnerCategoryPreferences(
        currentUser.uid,
        selectedCategoryIds,
        shopName || partnerProfile?.shopName || 'Store'
      );
      setCategoryFeedback({
        type: 'success',
        text: 'Store categories updated and saved in Firebase in real time! All 14 authorized categories supported.',
      });
      setTimeout(() => setCategoryFeedback(null), 5000);
    } catch (err: any) {
      setCategoryFeedback({ type: 'error', text: 'Failed to update categories: ' + err.message });
    } finally {
      setSavingCategories(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Store Profile & Operations
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Keep your business details, operating hours, and location accurate for Dooars customers.
          </p>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-transform active:scale-95"
          >
            <span>Edit Store Profile</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </div>

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-700 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Live Store Availability Card */}
      <div
        className={`p-5 rounded-2xl border transition-all shadow-xs ${
          partnerProfile?.isOnline
            ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-300'
            : 'bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-rose-300'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                partnerProfile?.isOnline ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-slate-900">
                  Customer Status: {partnerProfile?.isOnline ? '🟢 ONLINE (Shop Open)' : '🔴 OFFLINE (Shop Closed)'}
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    partnerProfile?.isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {partnerProfile?.isOnline ? 'Live on App' : 'Store Paused'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {partnerProfile?.isOnline
                  ? 'Customers on Dooars Daily Basket can browse your catalog, see your products, and place orders.'
                  : 'Customers will see your store marked as "Closed / Offline" on the app. No new orders can be placed.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              disabled={togglingAvailability}
              onClick={async () => {
                if (!currentUser?.uid) return;
                try {
                  setTogglingAvailability(true);
                  await setStoreOnlineStatus(currentUser.uid, !partnerProfile?.isOnline);
                } catch (err: any) {
                  alert('Error updating status: ' + err.message);
                } finally {
                  setTogglingAvailability(false);
                }
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50 ${
                partnerProfile?.isOnline
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  partnerProfile?.isOnline ? 'bg-rose-200' : 'bg-emerald-200 animate-ping'
                }`}
              />
              <span>
                {togglingAvailability
                  ? 'Updating...'
                  : partnerProfile?.isOnline
                  ? 'Switch to OFFLINE (Close Shop)'
                  : 'Switch to ONLINE (Open Shop)'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Form / Cards */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
        {/* Left Column: Visual Assets & Location */}
        <div className="space-y-6">
          {/* Store Photo & Logo Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              <span>Shop Photos & Branding</span>
            </h3>

            {/* Shop Photo Banner */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                Shop Front Photograph
              </label>
              <div className="relative h-32 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                {shopPhotoUrl ? (
                  <img src={shopPhotoUrl} alt="Store front" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-slate-400 text-center p-3">
                    <Store className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                    <span>No store photo uploaded</span>
                  </div>
                )}
              </div>
              {isEditing && (
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:bg-emerald-50 file:text-emerald-700"
                  />
                  {uploadingPhoto && <div className="text-[10px] text-emerald-600 mt-1">Uploading...</div>}
                </div>
              )}
            </div>

            {/* Shop Logo */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                {shopLogoUrl ? (
                  <img src={shopLogoUrl} alt="Store logo" className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 text-[11px]">Merchant Logo / Emblem</div>
                <div className="text-[10px] text-slate-400">Displayed on customer receipts</div>
                {isEditing && (
                  <div className="mt-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="text-[11px] text-slate-500 file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:bg-emerald-50 file:text-emerald-700"
                    />
                    {uploadingLogo && <div className="text-[10px] text-emerald-600 mt-1">Uploading...</div>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Location & GPS Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Location & GPS Coordinates</span>
            </h3>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Latitude:</span>
                <span className="font-mono font-bold text-slate-800">
                  {gpsLocation?.lat ? gpsLocation.lat.toFixed(6) : 'Not recorded'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Longitude:</span>
                <span className="font-mono font-bold text-slate-800">
                  {gpsLocation?.lng ? gpsLocation.lng.toFixed(6) : 'Not recorded'}
                </span>
              </div>
            </div>

            {isEditing && (
              <button
                type="button"
                onClick={handleCaptureGps}
                disabled={detectingGps}
                className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-800 font-bold transition-colors"
              >
                {detectingGps ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                ) : (
                  <Compass className="w-4 h-4 text-emerald-600" />
                )}
                <span>{detectingGps ? 'Reading Device GPS...' : 'Capture Precise GPS Location'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Middle & Right: Business Details & Operating Hours */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Info */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>Business Registration & Identity</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Shop / Business Name *</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Proprietor / Owner Name *</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Phone / Mobile *</label>
                <input
                  type="tel"
                  disabled={!isEditing}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Active Categories ({selectedCategoryIds.length})
                </label>
                <div className="p-2.5 rounded-xl border border-slate-200 bg-white font-medium min-h-[44px] flex flex-wrap items-center gap-1.5">
                  {selectedCategoryIds.length === 0 ? (
                    <span className="text-xs text-slate-400">No categories selected</span>
                  ) : (
                    getCategoryNames(selectedCategoryIds).map((name) => (
                      <span
                        key={name}
                        className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold"
                      >
                        {name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Shop Full Address *</label>
              <input
                type="text"
                disabled={!isEditing}
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Town / Village</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={villageTownCity}
                  onChange={(e) => setVillageTownCity(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">District</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">PIN Code</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Local Area Display & Change Request */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Assigned Local Area
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                    Active Service Zone
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-base sm:text-lg font-black text-slate-900">
                    {partnerProfile?.localAreaName || partnerProfile?.villageTownCity || 'Dooars Region'}
                  </h4>
                  {partnerProfile?.localAreaId && (
                    <span className="text-[11px] font-mono text-slate-400">
                      (ID: {partnerProfile.localAreaId})
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Master Local Area controlled and managed by Super Admin.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAreaChangeModal(true)}
                className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs self-start sm:self-auto shrink-0"
              >
                <span>Request Area Change</span>
              </button>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Store Description</label>
              <textarea
                rows={2}
                disabled={!isEditing}
                value={storeDescription}
                onChange={(e) => setStoreDescription(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50 resize-none"
              />
            </div>
          </div>

          {/* Manage My Categories (Flexible Multi-Category Selection) */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-600" />
                  <span>Manage My Categories (Flexible Multi-Category)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select any combination of the 14 authorized market categories you sell under your Partner ID.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveCategoriesOnly}
                disabled={savingCategories || selectedCategoryIds.length === 0}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer self-start sm:self-auto transition-transform active:scale-95"
              >
                {savingCategories ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{savingCategories ? 'Saving...' : 'Save Categories to Firebase'}</span>
              </button>
            </div>

            {categoryFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  categoryFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {categoryFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{categoryFeedback.text}</span>
              </div>
            )}

            <MultiCategorySelector
              selectedCategoryIds={selectedCategoryIds}
              onChange={(ids) => setSelectedCategoryIds(ids)}
              disabledCategoryIds={disabledCategoryIds}
              title="Select Store Product Categories"
              description="Check or uncheck categories for your store. Real-time updates apply to your store profile and customer browsing."
            />

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px] text-slate-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Data Safety Guarantee:</strong> Removing a category prevents new product listings in that category until re-selected. Existing products and completed orders are never deleted or affected.
              </span>
            </div>
          </div>

          {/* Operating Hours & Dispatch Settings */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Operating Hours & Order Preparation</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Opening Time</label>
                <input
                  type="time"
                  disabled={!isEditing}
                  value={openingHours}
                  onChange={(e) => setOpeningHours(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Closing Time</label>
                <input
                  type="time"
                  disabled={!isEditing}
                  value={closingHours}
                  onChange={(e) => setClosingHours(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Weekly Holiday</label>
                <select
                  disabled={!isEditing}
                  value={weeklyHoliday}
                  onChange={(e) => setWeeklyHoliday(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50"
                >
                  <option value="None">None (Open 7 Days)</option>
                  <option value="Sunday">Sunday</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Avg Prep Time (Mins)</label>
                <input
                  type="number"
                  disabled={!isEditing}
                  value={prepTimeMinutes}
                  onChange={(e) => setPrepTimeMinutes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50"
                />
              </div>
            </div>
          </div>

          {/* Payout & Financial Accounts */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Payout Settlement Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Direct Settlement UPI ID</label>
                <input
                  type="text"
                  placeholder="e.g. yourstore@okaxis"
                  disabled={!isEditing}
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Bank Account Number</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Bank IFSC Code</label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50 font-mono uppercase"
                />
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Request Area Change Modal */}
      {showAreaChangeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Request Local Area Change
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Submit a formal change request to Dooars Daily Basket Super Admin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAreaChangeModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {changeReqSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{changeReqSuccess}</span>
              </div>
            )}

            {changeReqError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{changeReqError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAreaChange} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Current Local Area
                </span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {partnerProfile?.localAreaName || partnerProfile?.villageTownCity || 'Not Assigned'}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Requested New Local Area <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  disabled={loadingActiveAreas || activeAreas.length === 0}
                  value={selectedNewAreaId}
                  onChange={(e) => setSelectedNewAreaId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer disabled:bg-slate-100"
                >
                  <option value="">
                    {loadingActiveAreas ? 'Loading active local areas…' : 'Select Target Local Area'}
                  </option>
                  {activeAreas
                    .filter((a) => (a.areaId || a.id) !== partnerProfile?.localAreaId)
                    .map((area) => (
                      <option key={area.areaId || area.id} value={area.areaId || area.id}>
                        {area.areaName} ({area.city || area.district}) - {area.district}
                        {area.pinCodes && area.pinCodes.length > 0 ? ` [${area.pinCodes.join(', ')}]` : ''}
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Only active areas currently authorized by Super Admin can be requested.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reason for Area Change <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Shop relocated to a new market, opened a new primary outlet, or delivery boundary shifted..."
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800">
                <strong>Policy Notice:</strong> Market Partners cannot arbitrarily modify master platform areas. Area changes require verification and Super Admin approval before order dispatch boundaries are updated.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAreaChangeModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingChangeReq}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingChangeReq ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Submit Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
