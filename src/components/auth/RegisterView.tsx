import React, { useState, useEffect } from 'react';
import {
  Store,
  Building,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  FileText,
  ShieldCheck,
  CreditCard,
  Trash2,
  FileCheck,
  Check,
  X,
} from 'lucide-react';
import { ALLOWED_CATEGORIES, getCategoryNames } from '../../data/categories';
import { registerPartnerAccount } from '../../services/authService';
import { uploadPartnerFile } from '../../services/storageService';
import {
  subscribeToActiveServiceAreas,
  fetchActiveServiceAreas,
  validateServiceAreaForRegistration,
} from '../../services/serviceAreaService';
import { subscribeToGlobalCategoryConfig } from '../../services/categoryService';
import { type ServiceArea } from '../../types';
import { LocalAreaDropdown } from './LocalAreaDropdown';
import { MultiCategorySelector } from '../common/MultiCategorySelector';

interface RegisterViewProps {
  onSwitchToLogin: () => void;
  onOpenSupport: () => void;
  onOpenAdminModal?: () => void;
}

interface UploadedDocState {
  file: File | null;
  url: string;
  fileName: string;
  fileSize: string;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
}

const INITIAL_DOC_STATE: UploadedDocState = {
  file: null,
  url: '',
  fileName: '',
  fileSize: '',
  isUploading: false,
  uploadProgress: 0,
  error: null,
};

export const RegisterView: React.FC<RegisterViewProps> = ({
  onSwitchToLogin,
  onOpenSupport,
  onOpenAdminModal,
}) => {
  // SECTION 1: PERSONAL INFORMATION
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // SECTION 2: BUSINESS INFORMATION
  const [shopName, setShopName] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [disabledCategoryIds, setDisabledCategoryIds] = useState<string[]>([]);
  const [shopAddress, setShopAddress] = useState('');
  const [villageTownCity, setVillageTownCity] = useState('');
  const [district, setDistrict] = useState('Alipurduar');
  const [state] = useState('West Bengal');
  const [pincode, setPincode] = useState('');
  // Local Area (Admin-controlled Firebase collection)
  const [localAreaId, setLocalAreaId] = useState('');
  const [localAreaName, setLocalAreaName] = useState('');
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [areasError, setAreasError] = useState<string | null>(null);

  // SECTION 3: BUSINESS DOCUMENTS
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [tradeLicenseNumber, setTradeLicenseNumber] = useState('');
  const [identityDocNumber, setIdentityDocNumber] = useState('');

  const [fssaiDoc, setFssaiDoc] = useState<UploadedDocState>(INITIAL_DOC_STATE);
  const [tradeDoc, setTradeDoc] = useState<UploadedDocState>(INITIAL_DOC_STATE);
  const [identityDoc, setIdentityDoc] = useState<UploadedDocState>(INITIAL_DOC_STATE);
  const [shopPhotoDoc, setShopPhotoDoc] = useState<UploadedDocState>(INITIAL_DOC_STATE);
  const [shopLogoDoc, setShopLogoDoc] = useState<UploadedDocState>(INITIAL_DOC_STATE);

  // SECTION 4: PAYMENT INFORMATION
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  // SECTION 5: SECURITY AND AGREEMENT
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  // Form State
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Password strength calculation
  const passwordStrength = React.useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };
    let s = 0;
    if (password.length >= 6) s += 1;
    if (password.length >= 8) s += 1;
    if (/[A-Z]/.test(password)) s += 1;
    if (/[0-9]/.test(password)) s += 1;
    if (/[^A-Za-z0-9]/.test(password)) s += 1;

    if (s <= 2) return { score: 1, label: 'Weak (min 6 chars, add digits/symbols)', color: 'bg-rose-500 text-rose-600' };
    if (s <= 3) return { score: 2, label: 'Fair (add capital letters and symbols)', color: 'bg-amber-500 text-amber-600' };
    return { score: 3, label: 'Strong password', color: 'bg-emerald-500 text-emerald-600' };
  }, [password]);

  // Subscribe in real-time to active admin-managed service areas
  useEffect(() => {
    setLoadingAreas(true);
    setAreasError(null);

    const unsubscribe = subscribeToActiveServiceAreas(
      (areas) => {
        setServiceAreas(areas || []);
        setLoadingAreas(false);
        setAreasError(null);

        // If a previously selected area was disabled or deleted, clear selection
        setLocalAreaId((currentId) => {
          if (currentId && !(areas || []).some((a) => (a.areaId || a.id) === currentId)) {
            return '';
          }
          return currentId;
        });
      },
      (err) => {
        console.error('Note on loading active local areas:', err);
        setAreasError('Failed to load local areas from Firebase. Please check your internet connection and try again.');
        setLoadingAreas(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Subscribe to Super Admin global category configurations
  useEffect(() => {
    const unsubscribe = subscribeToGlobalCategoryConfig((config) => {
      const disabled = config.disabledCategoryIds || [];
      setDisabledCategoryIds(disabled);
      // Automatically deselect any category if disabled by Admin
      setSelectedCategoryIds((prev) => prev.filter((id) => !disabled.includes(id)));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleRetryAreas = async () => {
    setLoadingAreas(true);
    setAreasError(null);
    try {
      const areas = await fetchActiveServiceAreas();
      setServiceAreas(areas || []);
      setLoadingAreas(false);
    } catch (err: any) {
      console.error('Retry loading areas error:', err);
      setAreasError('Could not connect to Firebase localAreas collection. Please try again.');
      setLoadingAreas(false);
    }
  };

  // Dedicated Document Upload Handler
  const handleDocUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: string,
    stateSetter: React.Dispatch<React.SetStateAction<UploadedDocState>>,
    folder: 'docs' | 'store' = 'docs'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      stateSetter((prev) => ({
        ...prev,
        error: 'File exceeds 5MB limit. Please upload a smaller file.',
      }));
      return;
    }

    // Format size for UI
    const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    stateSetter({
      file,
      url: '',
      fileName: file.name,
      fileSize: sizeStr,
      isUploading: true,
      uploadProgress: 25,
      error: null,
    });

    try {
      const prefix = email ? email.replace(/[^a-zA-Z0-9]/g, '_') : 'onboarding_partner';
      const downloadUrl = await uploadPartnerFile(file, prefix, folder);

      stateSetter({
        file,
        url: downloadUrl,
        fileName: file.name,
        fileSize: sizeStr,
        isUploading: false,
        uploadProgress: 100,
        error: null,
      });
    } catch (err: any) {
      stateSetter((prev) => ({
        ...prev,
        isUploading: false,
        uploadProgress: 0,
        error: err.message || `Failed to upload ${docType}.`,
      }));
    }
  };

  const handleRemoveDoc = (
    stateSetter: React.Dispatch<React.SetStateAction<UploadedDocState>>
  ) => {
    stateSetter(INITIAL_DOC_STATE);
  };

  // Comprehensive Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // 1. Full Name
    if (!fullName.trim()) {
      errors.fullName = 'Full Name is required.';
    } else if (fullName.trim().length < 3) {
      errors.fullName = 'Please enter proprietor full name (at least 3 characters).';
    }

    // 2. Email
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    // 3. Mobile Number (Exactly 10 digits Indian mobile)
    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (!cleanMobile) {
      errors.mobileNumber = 'Mobile phone number is required.';
    } else if (cleanMobile.length !== 10) {
      errors.mobileNumber = 'Mobile number must be exactly 10 digits.';
    } else if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      errors.mobileNumber = 'Please enter a valid Indian mobile number starting with 6-9.';
    }

    // 4. Password
    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    // 5. Confirm Password
    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm Password is required.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match. Please re-enter.';
    }

    // 6. Shop Name
    if (!shopName.trim()) {
      errors.shopName = 'Shop / Business Name is required.';
    }

    // 7. Business Category (At least one category required)
    if (!selectedCategoryIds || selectedCategoryIds.length === 0) {
      errors.businessCategory = 'Please select at least one business category for your shop.';
    }

    // 8. Shop Street Address
    if (!shopAddress.trim()) {
      errors.shopAddress = 'Shop street address is required.';
    }

    // 9. Village / Town / City
    if (!villageTownCity.trim()) {
      errors.villageTownCity = 'Village, Town or City name is required.';
    }

    // 10. District
    if (!district.trim()) {
      errors.district = 'District is required.';
    }

    // 11. State
    if (!state.trim()) {
      errors.state = 'State is required.';
    }

    // 12. PIN Code (Exactly 6 digits)
    const cleanPin = pincode.replace(/\D/g, '');
    if (!cleanPin) {
      errors.pincode = 'PIN Code is required.';
    } else if (cleanPin.length !== 6) {
      errors.pincode = 'PIN Code must be exactly 6 digits.';
    }

    // 13. Local Area (Mandatory)
    if (!localAreaId || !localAreaId.trim()) {
      errors.localAreaId = 'Please select your local area.';
    }

    // Bank Details Validation (if provided)
    if (ifscCode.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.trim().toUpperCase())) {
      errors.ifscCode = 'Invalid IFSC code format (e.g. SBIN0001234).';
    }

    // Terms & Conditions
    if (!acceptedTerms) {
      errors.acceptedTerms = 'You must agree to the Dooars Daily Basket Merchant Agreement.';
    }

    if (!acceptedPrivacy) {
      errors.acceptedPrivacy = 'You must agree to the Privacy Policy to submit your application.';
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      setGeneralError(firstError);
      return false;
    }

    setGeneralError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    // Prevent submission while file uploads are active
    if (
      fssaiDoc.isUploading ||
      tradeDoc.isUploading ||
      identityDoc.isUploading ||
      shopPhotoDoc.isUploading ||
      shopLogoDoc.isUploading
    ) {
      setGeneralError('Please wait for document uploads to complete before submitting.');
      return;
    }

    if (!validateForm()) {
      // Scroll smoothly to top error
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }

    try {
      setIsSubmitting(true);

      // Authoritative backend check: verify selected area exists and is enabled
      const areaCheck = await validateServiceAreaForRegistration(localAreaId);
      if (!areaCheck.valid) {
        setFieldErrors((prev) => ({
          ...prev,
          localAreaId: areaCheck.error || 'Please select an active local area.',
        }));
        setGeneralError(areaCheck.error || 'Please select an active local area.');
        setIsSubmitting(false);
        return;
      }

      const categoryNames = getCategoryNames(selectedCategoryIds);

      await registerPartnerAccount({
        fullName: fullName.trim(),
        email: email.trim(),
        mobileNumber: mobileNumber.replace(/\D/g, ''),
        password,
        shopName: shopName.trim(),
        businessCategory: categoryNames.join(', '),
        businessCategories: selectedCategoryIds,
        businessCategoryNames: categoryNames,
        shopAddress: shopAddress.trim(),
        villageTownCity: villageTownCity.trim(),
        district: district.trim(),
        state: state.trim(),
        pincode: pincode.replace(/\D/g, ''),
        localAreaId: localAreaId.trim(),
        localAreaName: areaCheck.area?.areaName || localAreaName.trim() || 'Dooars Region',
        fssaiNumber: fssaiNumber.trim() || undefined,
        fssaiCertUrl: fssaiDoc.url || undefined,
        foodLicenseUrl: fssaiDoc.url || undefined,
        tradeLicenseNumber: tradeLicenseNumber.trim() || undefined,
        tradeLicenseUrl: tradeDoc.url || undefined,
        identityDocNumber: identityDocNumber.trim() || undefined,
        identityDocUrl: identityDoc.url || undefined,
        identityProofUrl: identityDoc.url || undefined,
        shopPhotoUrl: shopPhotoDoc.url || undefined,
        storePhotoUrl: shopPhotoDoc.url || undefined,
        shopLogoUrl: shopLogoDoc.url || undefined,
        bankDetails: accountHolderName.trim() && accountNumber.trim() && ifscCode.trim() ? {
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
        } : undefined,
        upiId: upiId.trim() || undefined,
      });

      setRegistrationSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Registration failed:', err);
      let msg = err.message || 'Registration failed. Please review your details and try again.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email address already exists. Please sign in instead.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'The email address entered is not valid.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'The password is too weak. Please use at least 6 characters.';
      }
      setGeneralError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success State Confirmation Screen
  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-12 box-border">
        <div className="bg-white max-w-lg w-full p-6 sm:p-10 rounded-3xl shadow-xl border border-slate-200 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
              Application Status: PENDING APPROVAL
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Application Submitted Successfully!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Your Market Partner registration for <strong>{shopName}</strong> has been logged in the Dooars Daily Basket system with status <span className="font-bold text-amber-700">PENDING</span>.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2.5 text-slate-700">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>What happens next?</span>
            </div>
            <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-slate-600">
              <li>Our merchant verification team in Dooars will review your details and documents.</li>
              <li>You will receive an update once approved.</li>
              <li>Upon approval, your store will become visible to customers and you can begin receiving orders.</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={onSwitchToLogin}
            className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-transform active:scale-95 cursor-pointer"
          >
            Go to Partner Login Terminal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-10 px-3 sm:px-6 lg:px-8 box-border pb-16 sm:pb-12">
      <div className="max-w-3xl mx-auto w-full box-border">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
            <span>Back to Login</span>
          </button>

          <button
            type="button"
            onClick={onOpenSupport}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer"
          >
            Help & Guidelines
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white shadow-xl border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-10 box-border overflow-hidden">
          {/* Header Banner */}
          <div className="mb-6 sm:mb-8 pb-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <img
              src="/logo.png"
              alt="Dooars Daily Basket"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-contain shadow-md bg-white border border-slate-200 p-1 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                <span>Merchant Onboarding Portal</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                Register as a Market Partner
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                Join Dooars Daily Basket to sell groceries, fresh meat, dairy, produce, and daily staples to households across the Dooars region.
              </p>
            </div>
          </div>

          {/* General Top Alert */}
          {generalError && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm rounded-xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">{generalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-8 text-xs sm:text-sm">
            {/* ================================================================ */}
            {/* SECTION 1: PERSONAL INFORMATION                                  */}
            {/* ================================================================ */}
            <section aria-labelledby="section-personal-info" className="space-y-4">
              <div className="pb-2 border-b border-slate-100">
                <h2
                  id="section-personal-info"
                  className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>PERSONAL INFORMATION</span>
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Proprietor identity and account login credentials.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Full Name */}
                <div className="sm:col-span-2">
                  <label htmlFor="reg-fullName" className="block font-bold text-slate-800 mb-1.5 text-xs">
                    Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="reg-fullName"
                    type="text"
                    required
                    placeholder="e.g. Subir Karmakar"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: '' }));
                    }}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border font-medium text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 ${
                      fieldErrors.fullName
                        ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200'
                        : 'border-slate-300 bg-white focus:border-emerald-600 focus:ring-emerald-500/20'
                    }`}
                  />
                  {fieldErrors.fullName && (
                    <p className="text-rose-600 text-[11px] mt-1 font-medium">{fieldErrors.fullName}</p>
                  )}
                </div>

                {/* 2. Email Address */}
                <div>
                  <label htmlFor="reg-email" className="block font-bold text-slate-800 mb-1.5 text-xs">
                    Email Address <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="reg-email"
                      type="email"
                      required
                      placeholder="partner@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                      }}
                      className={`w-full p-2.5 sm:p-3 pr-10 rounded-xl border font-medium text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 ${
                        fieldErrors.email
                          ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200'
                          : 'border-slate-300 bg-white focus:border-emerald-600 focus:ring-emerald-500/20'
                      }`}
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-rose-600 text-[11px] mt-1 font-medium">{fieldErrors.email}</p>
                  )}
                </div>

                {/* 3. Mobile Phone Number */}
                <div>
                  <label htmlFor="reg-mobile" className="block font-bold text-slate-800 mb-1.5 text-xs">
                    Mobile Phone Number (10 digits) <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="reg-mobile"
                      type="tel"
                      inputMode="numeric"
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      value={mobileNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setMobileNumber(val);
                        if (fieldErrors.mobileNumber) setFieldErrors((prev) => ({ ...prev, mobileNumber: '' }));
                      }}
                      className={`w-full p-2.5 sm:p-3 pr-10 rounded-xl border font-mono font-medium text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 ${
                        fieldErrors.mobileNumber
                          ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200'
                          : 'border-slate-300 bg-white focus:border-emerald-600 focus:ring-emerald-500/20'
                      }`}
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                  </div>
                  {fieldErrors.mobileNumber ? (
                    <p className="text-rose-600 text-[11px] mt-1 font-medium">{fieldErrors.mobileNumber}</p>
                  ) : (
                    <p className="text-slate-400 text-[10px] mt-1">Indian 10-digit mobile number for order SMS/alerts</p>
                  )}
                </div>

                {/* 4. Password */}
                <div>
                  <label htmlFor="reg-password" className="block font-bold text-slate-800 mb-1.5 text-xs">
                    Password (min 6 characters) <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                      }}
                      className={`w-full p-2.5 sm:p-3 pr-10 rounded-xl border text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 ${
                        fieldErrors.password
                          ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200'
                          : 'border-slate-300 bg-white focus:border-emerald-600 focus:ring-emerald-500/20'
                      }`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-rose-600 text-[11px] mt-1 font-medium">{fieldErrors.password}</p>
                  )}
                  {password && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-1">
                        <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 1 ? passwordStrength.color.split(' ')[0] : 'bg-slate-200'}`} />
                        <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 2 ? passwordStrength.color.split(' ')[0] : 'bg-slate-200'}`} />
                        <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 3 ? passwordStrength.color.split(' ')[0] : 'bg-slate-200'}`} />
                      </div>
                      <span className={`text-[10px] font-bold ${passwordStrength.color.split(' ')[1]}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* 5. Confirm Password */}
                <div>
                  <label htmlFor="reg-confirmPassword" className="block font-bold text-slate-800 mb-1.5 text-xs">
                    Confirm Password <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="reg-confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }}
                      className={`w-full p-2.5 sm:p-3 pr-10 rounded-xl border text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 ${
                        fieldErrors.confirmPassword
                          ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200'
                          : 'border-slate-300 bg-white focus:border-emerald-600 focus:ring-emerald-500/20'
                      }`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-rose-600 text-[11px] mt-1 font-medium">{fieldErrors.confirmPassword}</p>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <p className="text-emerald-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Passwords match
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ================================================================ */}
            {/* SECTION 2: BUSINESS INFORMATION                                  */}
            {/* ================================================================ */}
            <section aria-labelledby="section-business-info" className="space-y-4 pt-4 border-t border-slate-100">
              <div className="pb-2 border-b border-slate-100">
                <h2
                  id="section-business-info"
                  className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2"
                >
                  <Building className="w-4 h-4 text-emerald-600" />
                  <span>BUSINESS INFORMATION</span>
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Store name, category, physical address, and local area in the Dooars region.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 6. Shop/Business Name */}
                <div className="sm:col-span-2">
                  <label htmlFor="reg-shopName" className="block font-bold text-slate-800 mb-1.5 text-xs">
                    Shop / Business Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="reg-shopName"
                    type="text"
                    required
                    placeholder="e.g. Maa Tara Fresh Mart"
                    value={shopName}
                    onChange={(e) => {
                      setShopName(e.target.value);
                      if (fieldErrors.shopName) setFieldErrors((prev) => ({ ...prev, shopName: '' }));
                    }}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border font-bold text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 ${
                      fieldErrors.shopName
                        ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200'
                        : 'border-slate-300 bg-white focus:border-emerald-600 focus:ring-emerald-500/20'
                    }`}
                  />
                  {fieldErrors.shopName && (
                    <p className="text-rose-600 text-[11px] mt-1 font-medium">{fieldErrors.shopName}</p>
                  )}
                </div>

                {/* 7. Business Categories (Flexible Multi-Select from 14 Authorized Categories) */}
                <div className="sm:col-span-2">
                  <MultiCategorySelector
                    selectedCategoryIds={selectedCategoryIds}
                    onChange={(ids) => {
                      setSelectedCategoryIds(ids);
                      if (fieldErrors.businessCategory && ids.length > 0) {
                        setFieldErrors((prev) => ({ ...prev, businessCategory: '' }));
                      }
                    }}
                    disabledCategoryIds={disabledCategoryIds}
                    error={fieldErrors.businessCategory}
                    title="Select Store Categories *"
                    description="Choose one or more categories that your store will sell (e.g. Grocery, Meat, Chicken & Poultry, Fast Food, Vegetables). You can select 1, several, or all 14 categories under this single Partner ID."
                  />
                </div>

                {/* 8. Shop Street Address */}
                <div className="sm:col-span-2">
                  <label htmlFor="reg-shopAddress" className="block font-bold text-slate-800 mb-1.5 text-xs">
                    Shop Street Address <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="reg-shopAddress"
                    type="text"
                    required
                    placeholder="Shop No. 12, Main Bazar Road"
                    value={shopAddress}
                    onChange={(e) => {
                      setShopAddress(e.target.value);
                      if (fieldErrors.shopAddress) setFieldErrors((prev) => ({ ...prev, shopAddress: '' }));
                    }}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 ${
                      fieldErrors.shopAddress
                        ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200'
                        : 'border-slate-300 bg-white focus:border-emerald-600 focus:ring-emerald-500/20'
                    }`}
                  />
                  {fieldErrors.shopAddress && (
                    <p className="text-rose-600 text-[11px] mt-1 font-medium">{fieldErrors.shopAddress}</p>
                  )}
                </div>

                {/* 9. Village / Town / City */}
                <div>
                  <label htmlFor="reg-villageTownCity" className="block font-bold text-slate-800 mb-1.5 text-xs">
                    Village / Town / City <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="reg-villageTownCity"
                    type="text"
                    required
                    placeholder="e.g. Birpara, Madarihat, Hasimara"
                    value={villageTownCity}
                    onChange={(e) => {
                      setVillageTownCity(e.target.value);
                      if (fieldErrors.villageTownCity) setFieldErrors((prev) => ({ ...prev, villageTownCity: '' }));
                    }}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 ${
                      fieldErrors.villageTownCity
                        ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200'
                        : 'border-slate-300 bg-white focus:border-emerald-600 focus:ring-emerald-500/20'
                    }`}
                  />
                  {fieldErrors.villageTownCity && (
                    <p className="text-rose-600 text-[11px] mt-1 font-medium">{fieldErrors.villageTownCity}</p>
                  )}
                </div>

                {/* 10. District */}
                <div>
                  <label htmlFor="reg-district" className="block font-bold text-slate-800 mb-1.5 text-xs">
                    District <span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="reg-district"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:border-emerald-600 focus:ring-emerald-500/20 cursor-pointer"
                  >
                    <option value="Alipurduar">Alipurduar</option>
                    <option value="Jalpaiguri">Jalpaiguri</option>
                    <option value="Cooch Behar">Cooch Behar</option>
                    <option value="Kalimpong">Kalimpong</option>
                    <option value="Darjeeling">Darjeeling</option>
                  </select>
                </div>

                {/* 11. State */}
                <div>
                  <label htmlFor="reg-state" className="block font-bold text-slate-800 mb-1.5 text-xs">
                    State
                  </label>
                  <input
                    id="reg-state"
                    type="text"
                    disabled
                    value={state}
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 text-xs sm:text-sm font-medium cursor-not-allowed"
                  />
                </div>

                {/* 12. PIN Code (6 digits) */}
                <div>
                  <label htmlFor="reg-pincode" className="block font-bold text-slate-800 mb-1.5 text-xs">
                    PIN Code (6 digits) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="reg-pincode"
                    type="tel"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    placeholder="735204"
                    value={pincode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPincode(val);
                      if (fieldErrors.pincode) setFieldErrors((prev) => ({ ...prev, pincode: '' }));
                    }}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border font-mono text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 ${
                      fieldErrors.pincode
                        ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200'
                        : 'border-slate-300 bg-white focus:border-emerald-600 focus:ring-emerald-500/20'
                    }`}
                  />
                  {fieldErrors.pincode ? (
                    <p className="text-rose-600 text-[11px] mt-1 font-medium">{fieldErrors.pincode}</p>
                  ) : (
                    <p className="text-slate-400 text-[10px] mt-1">Dooars region PIN code (e.g. 735xxx, 736xxx)</p>
                  )}
                </div>

                {/* Local Area * (Admin-Managed Dropdown) */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="reg-localArea" className="block font-bold text-slate-800 text-xs">
                      Local Area <span className="text-rose-600">*</span>
                    </label>
                    {loadingAreas && (
                      <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-semibold">
                        <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                        Loading available local areas…
                      </span>
                    )}
                  </div>

                  {areasError && (
                    <div className="mb-2 p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{areasError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRetryAreas}
                        className="px-2.5 py-1 text-[11px] font-bold bg-white text-rose-700 border border-rose-300 rounded-lg shadow-2xs hover:bg-rose-100 cursor-pointer shrink-0"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  <LocalAreaDropdown
                    id="reg-localArea"
                    areas={serviceAreas}
                    selectedAreaId={localAreaId}
                    isLoading={loadingAreas}
                    error={fieldErrors.localAreaId}
                    onOpenSupport={onOpenSupport}
                    onSelect={(selected) => {
                      if (selected) {
                        const val = selected.areaId || selected.id;
                        setLocalAreaId(val);
                        setLocalAreaName(selected.areaName);
                        if (selected.district) {
                          setDistrict(selected.district);
                        }
                        if (selected.city && !villageTownCity) {
                          setVillageTownCity(selected.city);
                        }
                        if (selected.pinCodes && selected.pinCodes.length > 0 && !pincode) {
                          setPincode(selected.pinCodes[0]);
                        }
                      } else {
                        setLocalAreaId('');
                        setLocalAreaName('');
                      }
                      if (fieldErrors.localAreaId) {
                        setFieldErrors((prev) => ({ ...prev, localAreaId: '' }));
                      }
                    }}
                  />
                  {!fieldErrors.localAreaId && serviceAreas.length > 0 && (
                    <p className="text-slate-500 text-[11px] mt-1.5">
                      Apna local operational area select karein taaki aapke store ko sirf aapke local area ke orders receive hon.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ================================================================ */}
            {/* SECTION 3: BUSINESS DOCUMENTS                                    */}
            {/* ================================================================ */}
            <section aria-labelledby="section-documents" className="space-y-4 pt-4 border-t border-slate-100">
              <div className="pb-2 border-b border-slate-100">
                <h2
                  id="section-documents"
                  className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>BUSINESS DOCUMENTS</span>
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Licenses, identity proof, and store photos for verification. Sensitive documents remain private in Firebase Storage.
                </p>
              </div>

              <div className="space-y-4">
                {/* 14 & 15: FSSAI Details & Upload */}
                <div className="p-3 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div>
                    <label htmlFor="reg-fssaiNumber" className="block font-bold text-slate-800 mb-1 text-xs">
                      14. FSSAI Registration Number (Food License if applicable)
                    </label>
                    <input
                      id="reg-fssaiNumber"
                      type="text"
                      placeholder="e.g. 12821000000000 (14-digit FSSAI number)"
                      value={fssaiNumber}
                      onChange={(e) => setFssaiNumber(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-slate-700 text-xs">
                        15. FSSAI Certificate Upload
                      </span>
                      <span className="text-[10px] text-slate-400">PDF, JPG, PNG • Max 5MB</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <label className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 cursor-pointer transition-colors shrink-0">
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{fssaiDoc.url ? 'Replace Document' : 'Select Certificate File'}</span>
                        <input
                          type="file"
                          accept=".pdf,image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => handleDocUpload(e, 'FSSAI Certificate', setFssaiDoc, 'docs')}
                        />
                      </label>

                      {fssaiDoc.isUploading && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading securely to Firebase...</span>
                        </div>
                      )}

                      {fssaiDoc.url && !fssaiDoc.isUploading && (
                        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                          <FileCheck className="w-4 h-4 text-emerald-600" />
                          <span className="font-medium truncate max-w-[200px]">{fssaiDoc.fileName}</span>
                          <span className="text-[10px] text-emerald-600">({fssaiDoc.fileSize})</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(setFssaiDoc)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer ml-auto"
                            title="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {fssaiDoc.error && <p className="text-rose-600 text-[11px] mt-1">{fssaiDoc.error}</p>}
                  </div>
                </div>

                {/* 16 & 17: Trade License / Registration & Upload */}
                <div className="p-3 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div>
                    <label htmlFor="reg-tradeLicenseNumber" className="block font-bold text-slate-800 mb-1 text-xs">
                      16. Trade License / Business Registration Number
                    </label>
                    <input
                      id="reg-tradeLicenseNumber"
                      type="text"
                      placeholder="e.g. TL/APD/2024/00129"
                      value={tradeLicenseNumber}
                      onChange={(e) => setTradeLicenseNumber(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-slate-700 text-xs">
                        17. Trade License / Registration Document Upload
                      </span>
                      <span className="text-[10px] text-slate-400">PDF, JPG, PNG • Max 5MB</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <label className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 cursor-pointer transition-colors shrink-0">
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{tradeDoc.url ? 'Replace Document' : 'Select Trade License'}</span>
                        <input
                          type="file"
                          accept=".pdf,image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => handleDocUpload(e, 'Trade License', setTradeDoc, 'docs')}
                        />
                      </label>

                      {tradeDoc.isUploading && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading securely to Firebase...</span>
                        </div>
                      )}

                      {tradeDoc.url && !tradeDoc.isUploading && (
                        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                          <FileCheck className="w-4 h-4 text-emerald-600" />
                          <span className="font-medium truncate max-w-[200px]">{tradeDoc.fileName}</span>
                          <span className="text-[10px] text-emerald-600">({tradeDoc.fileSize})</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(setTradeDoc)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer ml-auto"
                            title="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {tradeDoc.error && <p className="text-rose-600 text-[11px] mt-1">{tradeDoc.error}</p>}
                  </div>
                </div>

                {/* 18 & 19: Identity Document & Upload */}
                <div className="p-3 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div>
                    <label htmlFor="reg-identityDocNumber" className="block font-bold text-slate-800 mb-1 text-xs">
                      18. Identity Document Number (Aadhaar / PAN / Voter ID)
                    </label>
                    <input
                      id="reg-identityDocNumber"
                      type="text"
                      placeholder="e.g. ABCD1234E or 12-digit Aadhaar"
                      value={identityDocNumber}
                      onChange={(e) => setIdentityDocNumber(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-slate-700 text-xs">
                        19. Identity Document Upload
                      </span>
                      <span className="text-[10px] text-slate-400">PDF, JPG, PNG • Max 5MB</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <label className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 cursor-pointer transition-colors shrink-0">
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{identityDoc.url ? 'Replace Document' : 'Select ID Proof File'}</span>
                        <input
                          type="file"
                          accept=".pdf,image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => handleDocUpload(e, 'Identity Document', setIdentityDoc, 'docs')}
                        />
                      </label>

                      {identityDoc.isUploading && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading securely to Firebase...</span>
                        </div>
                      )}

                      {identityDoc.url && !identityDoc.isUploading && (
                        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                          <FileCheck className="w-4 h-4 text-emerald-600" />
                          <span className="font-medium truncate max-w-[200px]">{identityDoc.fileName}</span>
                          <span className="text-[10px] text-emerald-600">({identityDoc.fileSize})</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(setIdentityDoc)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer ml-auto"
                            title="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {identityDoc.error && <p className="text-rose-600 text-[11px] mt-1">{identityDoc.error}</p>}
                  </div>
                </div>

                {/* 20 & 21: Shop Photo and Shop Logo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 20. Shop Photo */}
                  <div className="p-3 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 text-xs">20. Shop Photo</span>
                      <span className="text-[10px] text-slate-400">JPG, PNG, WebP • Max 5MB</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Store front view visible to customers.</p>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                      <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 cursor-pointer transition-colors shrink-0">
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{shopPhotoDoc.url ? 'Replace Photo' : 'Upload Photo'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => handleDocUpload(e, 'Shop Photo', setShopPhotoDoc, 'store')}
                        />
                      </label>

                      {shopPhotoDoc.isUploading && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Uploading...</span>
                        </div>
                      )}

                      {shopPhotoDoc.url && !shopPhotoDoc.isUploading && (
                        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-medium truncate max-w-[140px]">{shopPhotoDoc.fileName}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(setShopPhotoDoc)}
                            className="p-0.5 text-slate-400 hover:text-rose-600 cursor-pointer ml-auto"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {shopPhotoDoc.error && <p className="text-rose-600 text-[11px] mt-1">{shopPhotoDoc.error}</p>}
                  </div>

                  {/* 21. Shop Logo */}
                  <div className="p-3 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 text-xs">21. Shop Logo</span>
                      <span className="text-[10px] text-slate-400">JPG, PNG, WebP • Max 3MB</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Square brand icon or shop crest.</p>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                      <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 cursor-pointer transition-colors shrink-0">
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{shopLogoDoc.url ? 'Replace Logo' : 'Upload Logo'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => handleDocUpload(e, 'Shop Logo', setShopLogoDoc, 'store')}
                        />
                      </label>

                      {shopLogoDoc.isUploading && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Uploading...</span>
                        </div>
                      )}

                      {shopLogoDoc.url && !shopLogoDoc.isUploading && (
                        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-medium truncate max-w-[140px]">{shopLogoDoc.fileName}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(setShopLogoDoc)}
                            className="p-0.5 text-slate-400 hover:text-rose-600 cursor-pointer ml-auto"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {shopLogoDoc.error && <p className="text-rose-600 text-[11px] mt-1">{shopLogoDoc.error}</p>}
                  </div>
                </div>
              </div>
            </section>

            {/* ================================================================ */}
            {/* SECTION 4: PAYMENT INFORMATION                                   */}
            {/* ================================================================ */}
            <section aria-labelledby="section-payment-info" className="space-y-4 pt-4 border-t border-slate-100">
              <div className="pb-2 border-b border-slate-100">
                <h2
                  id="section-payment-info"
                  className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>PAYMENT INFORMATION</span>
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Direct settlement bank account and UPI address for daily/weekly order disbursements.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 22. Account Holder Name */}
                <div>
                  <label htmlFor="reg-accountHolderName" className="block font-bold text-slate-800 mb-1.5 text-xs">
                    Account Holder Name
                  </label>
                  <input
                    id="reg-accountHolderName"
                    type="text"
                    placeholder="Name as per Bank Passbook"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                {/* 23. Bank Account Number */}
                <div>
                  <label htmlFor="reg-accountNumber" className="block font-bold text-slate-800 mb-1.5 text-xs">
                    Bank Account Number (if required)
                  </label>
                  <input
                    id="reg-accountNumber"
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 102938475612"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                {/* 24. IFSC Code */}
                <div>
                  <label htmlFor="reg-ifscCode" className="block font-bold text-slate-800 mb-1.5 text-xs">
                    IFSC Code (if required)
                  </label>
                  <input
                    id="reg-ifscCode"
                    type="text"
                    maxLength={11}
                    placeholder="e.g. SBIN0001234"
                    value={ifscCode}
                    onChange={(e) => {
                      setIfscCode(e.target.value.toUpperCase());
                      if (fieldErrors.ifscCode) setFieldErrors((prev) => ({ ...prev, ifscCode: '' }));
                    }}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border font-mono uppercase text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 ${
                      fieldErrors.ifscCode
                        ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-200'
                        : 'border-slate-300 bg-white focus:border-emerald-600 focus:ring-emerald-500/20'
                    }`}
                  />
                  {fieldErrors.ifscCode && (
                    <p className="text-rose-600 text-[11px] mt-1 font-medium">{fieldErrors.ifscCode}</p>
                  )}
                </div>

                {/* 25. UPI ID */}
                <div>
                  <label htmlFor="reg-upiId" className="block font-bold text-slate-800 mb-1.5 text-xs">
                    UPI ID (Fast settlement)
                  </label>
                  <input
                    id="reg-upiId"
                    type="text"
                    placeholder="e.g. shopname@okhdfcbank or 9876543210@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>
            </section>

            {/* ================================================================ */}
            {/* SECTION 5: SECURITY AND AGREEMENT                                */}
            {/* ================================================================ */}
            <section aria-labelledby="section-security-agreement" className="space-y-4 pt-4 border-t border-slate-100">
              <div className="pb-2 border-b border-slate-100">
                <h2
                  id="section-security-agreement"
                  className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>SECURITY AND AGREEMENT</span>
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Confirm merchant honesty, hygiene standards, and platform compliance.
                </p>
              </div>

              <div className="space-y-3">
                {/* 26. Terms and Conditions checkbox */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={acceptedTerms}
                    onChange={(e) => {
                      setAcceptedTerms(e.target.checked);
                      if (fieldErrors.acceptedTerms) setFieldErrors((prev) => ({ ...prev, acceptedTerms: '' }));
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                  />
                  <span className="text-slate-700 text-xs sm:text-sm leading-relaxed">
                    I confirm that all provided store details and business licenses are authentic. I agree to the{' '}
                    <strong className="text-slate-900">Dooars Daily Basket Merchant Terms & Conditions</strong>, including hygiene compliance, prompt order preparation, and fair local pricing. <span className="text-rose-600">*</span>
                  </span>
                </label>
                {fieldErrors.acceptedTerms && (
                  <p className="text-rose-600 text-[11px] font-medium pl-7">{fieldErrors.acceptedTerms}</p>
                )}

                {/* 27. Privacy Policy checkbox */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={acceptedPrivacy}
                    onChange={(e) => {
                      setAcceptedPrivacy(e.target.checked);
                      if (fieldErrors.acceptedPrivacy) setFieldErrors((prev) => ({ ...prev, acceptedPrivacy: '' }));
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                  />
                  <span className="text-slate-700 text-xs sm:text-sm leading-relaxed">
                    I accept the{' '}
                    <strong className="text-slate-900">Privacy Policy</strong> regarding the secure processing of store documents and customer contact numbers strictly for order fulfillment. <span className="text-rose-600">*</span>
                  </span>
                </label>
                {fieldErrors.acceptedPrivacy && (
                  <p className="text-rose-600 text-[11px] font-medium pl-7">{fieldErrors.acceptedPrivacy}</p>
                )}
              </div>

              {/* 28. Submit Registration button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    fssaiDoc.isUploading ||
                    tradeDoc.isUploading ||
                    identityDoc.isUploading ||
                    shopPhotoDoc.isUploading ||
                    shopLogoDoc.isUploading
                  }
                  className="w-full py-3.5 sm:py-4 px-6 rounded-xl text-xs sm:text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      <span>Submitting Application to Dooars Daily Basket...</span>
                    </>
                  ) : (
                    <span>Submit Registration</span>
                  )}
                </button>
                <p className="text-[11px] text-slate-400 text-center mt-2.5">
                  By clicking Submit Registration, your merchant credentials and documents are securely saved with status PENDING.
                </p>
              </div>
            </section>
          </form>
        </div>
      </div>
    </div>
  );
};
