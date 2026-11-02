import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Sparkles,
  Search,
  Truck,
  PackageCheck,
  Globe,
  Store,
  Sliders,
  ChevronRight,
  Layers,
  Power,
  Info,
  Edit,
} from 'lucide-react';
import {
  subscribeToAllServiceAreas,
  saveServiceArea,
  toggleServiceAreaEnabled,
  archiveServiceArea,
  deleteServiceArea,
  subscribeToAreaChangeRequests,
  reviewAreaChangeRequest,
  LOCAL_AREAS_COLLECTION,
} from '../../services/serviceAreaService';
import {
  ALLOWED_CATEGORIES,
  getPartnerCategoryIds,
  getPartnerCategoryNames,
  normalizeCategoryId,
  getCategoryName,
} from '../../data/categories';
import {
  subscribeToGlobalCategoryConfig,
  toggleGlobalCategoryStatus,
  updatePartnerCategoryPreferences,
} from '../../services/categoryService';
import { MultiCategorySelector } from '../common/MultiCategorySelector';
import { type ServiceArea, type AreaChangeRequest, type MarketPartnerProfile } from '../../types';
import { collection, onSnapshot, query, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface SuperAdminServiceAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuperAdminServiceAreaModal: React.FC<SuperAdminServiceAreaModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'areas' | 'categories' | 'applications' | 'requests'>('areas');

  // Master Service Areas state
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingArea, setIsEditingArea] = useState(false);
  const [editingArea, setEditingArea] = useState<Partial<ServiceArea> | null>(null);
  const [pinCodesInput, setPinCodesInput] = useState('');
  const [savingArea, setSavingArea] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Global Categories Master state
  const [disabledCategoryIds, setDisabledCategoryIds] = useState<string[]>([]);
  const [togglingCategory, setTogglingCategory] = useState<string | null>(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // Partner Category Permissions Inspector/Modal state
  const [editingPartnerCategories, setEditingPartnerCategories] = useState<MarketPartnerProfile | null>(null);
  const [adminPartnerCategoryIds, setAdminPartnerCategoryIds] = useState<string[]>([]);
  const [savingPartnerCategories, setSavingPartnerCategories] = useState(false);

  // Applications Review state
  const [applications, setApplications] = useState<MarketPartnerProfile[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appStatusFilter, setAppStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);

  // Area Change Requests state
  const [changeRequests, setChangeRequests] = useState<AreaChangeRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Subscribe to global categories configuration
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToGlobalCategoryConfig((config) => {
      setDisabledCategoryIds(config.disabledCategoryIds || []);
    });
    return () => unsub();
  }, [isOpen]);

  // Subscribe to all areas
  useEffect(() => {
    if (!isOpen) return;
    setLoadingAreas(true);
    const unsub = subscribeToAllServiceAreas(
      (allAreas) => {
        setAreas(allAreas);
        setLoadingAreas(false);
      },
      (err) => {
        console.error('Super Admin: error loading areas:', err);
        setLoadingAreas(false);
      }
    );
    return () => unsub();
  }, [isOpen]);

  // Subscribe to market partner applications for review
  useEffect(() => {
    if (!isOpen || activeTab !== 'applications') return;
    setLoadingApps(true);
    const q = collection(db, 'market_partners');
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: MarketPartnerProfile[] = [];
        snapshot.forEach((d) => {
          list.push({ uid: d.id, ...d.data() } as MarketPartnerProfile);
        });
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setApplications(list);
        setLoadingApps(false);
      },
      (err) => {
        console.warn('Apps listener error:', err);
        setLoadingApps(false);
      }
    );
    return () => unsub();
  }, [isOpen, activeTab]);

  // Subscribe to area change requests
  useEffect(() => {
    if (!isOpen || activeTab !== 'requests') return;
    setLoadingRequests(true);
    const unsub = subscribeToAreaChangeRequests((reqs) => {
      setChangeRequests(reqs);
      setLoadingRequests(false);
    });
    return () => unsub();
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleOpenAddArea = () => {
    setEditingArea({
      id: '',
      areaId: '',
      areaName: '',
      name: '',
      city: '',
      district: 'Jalpaiguri',
      state: 'West Bengal',
      pinCodes: [],
      notes: '',
      latitude: 26.85,
      longitude: 88.7,
      radiusKm: 12,
      enabled: true,
      deliveryAvailable: true,
      shippingAvailable: true,
    });
    setPinCodesInput('');
    setIsEditingArea(true);
  };

  const handleOpenEditArea = (area: ServiceArea) => {
    setEditingArea({ ...area });
    setPinCodesInput((area.pinCodes || []).join(', '));
    setIsEditingArea(true);
  };

  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArea || !editingArea.areaName?.trim()) {
      showFeedback('Area Name is required.', 'error');
      return;
    }

    try {
      setSavingArea(true);
      await saveServiceArea({
        areaId: editingArea.areaId || editingArea.id || undefined,
        id: editingArea.id || editingArea.areaId || undefined,
        areaName: editingArea.areaName.trim(),
        name: editingArea.areaName.trim(),
        city: editingArea.city?.trim() || editingArea.areaName.trim(),
        district: editingArea.district?.trim() || 'Jalpaiguri',
        state: editingArea.state?.trim() || 'West Bengal',
        pinCodes: pinCodesInput,
        notes: editingArea.notes || '',
        latitude: editingArea.latitude ? Number(editingArea.latitude) : undefined,
        longitude: editingArea.longitude ? Number(editingArea.longitude) : undefined,
        radiusKm: editingArea.radiusKm ? Number(editingArea.radiusKm) : 10,
        enabled: editingArea.enabled !== false,
        deliveryAvailable: editingArea.deliveryAvailable !== false,
        shippingAvailable: editingArea.shippingAvailable !== false,
      });

      showFeedback(`Service Area "${editingArea.areaName}" saved successfully in Firestore localAreas!`);
      setIsEditingArea(false);
      setEditingArea(null);
    } catch (err: any) {
      showFeedback(`Failed to save area: ${err.message}`, 'error');
    } finally {
      setSavingArea(false);
    }
  };

  const handleToggleEnabled = async (area: ServiceArea) => {
    try {
      const newStatus = !area.enabled;
      await toggleServiceAreaEnabled(area.id || area.areaId, newStatus);
      showFeedback(`Area "${area.areaName}" is now ${newStatus ? 'ENABLED' : 'DISABLED'}.`);
    } catch (err: any) {
      showFeedback(`Could not toggle status: ${err.message}`, 'error');
    }
  };

  const handleArchiveArea = async (area: ServiceArea) => {
    if (!window.confirm(`Are you sure you want to archive area "${area.areaName}"? It will be disabled and hidden from new registrations.`)) {
      return;
    }
    try {
      await archiveServiceArea(area.id || area.areaId);
      showFeedback(`Service Area "${area.areaName}" has been archived.`);
    } catch (err: any) {
      showFeedback(`Could not archive area: ${err.message}`, 'error');
    }
  };

  const handleDeleteArea = async (area: ServiceArea) => {
    if (!window.confirm(`Are you sure you want to permanently delete service area "${area.areaName}" from Firestore?`)) {
      return;
    }
    try {
      await deleteServiceArea(area.id || area.areaId);
      showFeedback(`Service Area "${area.areaName}" deleted successfully from Firestore localAreas.`);
    } catch (err: any) {
      showFeedback(`Could not delete area: ${err.message}`, 'error');
    }
  };

  const handleToggleGlobalCategory = async (catId: string, currentEnabled: boolean) => {
    try {
      setTogglingCategory(catId);
      await toggleGlobalCategoryStatus(catId, !currentEnabled, 'Super Admin Console');
      showFeedback(
        `Category "${getCategoryName(catId)}" is now ${!currentEnabled ? 'ENABLED' : 'DISABLED'} globally.`
      );
    } catch (err: any) {
      showFeedback(`Failed to update category: ${err.message}`, 'error');
    } finally {
      setTogglingCategory(null);
    }
  };

  const handleOpenPartnerCategoryEditor = (app: MarketPartnerProfile) => {
    setEditingPartnerCategories(app);
    setAdminPartnerCategoryIds(getPartnerCategoryIds(app));
  };

  const handleSavePartnerCategoryPermissions = async () => {
    if (!editingPartnerCategories) return;
    if (adminPartnerCategoryIds.length === 0) {
      showFeedback('Please select at least one category for this partner.', 'error');
      return;
    }
    try {
      setSavingPartnerCategories(true);
      await updatePartnerCategoryPreferences(
        editingPartnerCategories.uid,
        adminPartnerCategoryIds,
        editingPartnerCategories.shopName
      );
      showFeedback(
        `Category permissions updated for "${editingPartnerCategories.shopName}" (${adminPartnerCategoryIds.length} categories).`
      );
      setEditingPartnerCategories(null);
    } catch (err: any) {
      showFeedback(`Failed to update partner categories: ${err.message}`, 'error');
    } finally {
      setSavingPartnerCategories(false);
    }
  };

  const handleUpdateApplicationStatus = async (
    partnerId: string,
    newStatus: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW'
  ) => {
    let rejectionReason = '';
    if (newStatus === 'REJECTED') {
      const inputReason = window.prompt(
        'Enter reason for rejection (this will be shown to the partner):',
        'Document or location verification could not be satisfied.'
      );
      if (inputReason === null) return;
      rejectionReason = inputReason || 'Application rejected by administration.';
    }

    try {
      setUpdatingAppId(partnerId);
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'market_partners', partnerId), {
        status: newStatus,
        rejectionReason: newStatus === 'REJECTED' ? rejectionReason : '',
        updatedAt: now,
        serverUpdatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'users', partnerId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      showFeedback(`Partner application status updated to ${newStatus}.`);
    } catch (err: any) {
      showFeedback(`Failed to update application: ${err.message}`, 'error');
    } finally {
      setUpdatingAppId(null);
    }
  };

  const handleApproveAreaChange = async (req: AreaChangeRequest) => {
    const targetArea = areas.find((a) => a.areaId === req.requestedAreaId || a.id === req.requestedAreaId);
    try {
      await reviewAreaChangeRequest(req.id, true, targetArea, 'Approved by Administrator');
      showFeedback(`Approved area change for ${req.shopName} to ${req.requestedAreaName}.`);
    } catch (err: any) {
      showFeedback(`Error approving area change: ${err.message}`, 'error');
    }
  };

  const handleRejectAreaChange = async (req: AreaChangeRequest) => {
    const remark = window.prompt('Enter reason for rejecting area change request:', 'Operating capacity full in requested area.');
    if (remark === null) return;
    try {
      await reviewAreaChangeRequest(req.id, false, undefined, remark);
      showFeedback(`Rejected area change request for ${req.shopName}.`);
    } catch (err: any) {
      showFeedback(`Error rejecting area change: ${err.message}`, 'error');
    }
  };

  const filteredAreas = areas.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.areaName.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.district.toLowerCase().includes(q) ||
      (a.pinCodes || []).some((p) => p.includes(q))
    );
  });

  const filteredApplications = applications.filter((app) => {
    if (appStatusFilter === 'ALL') return true;
    return (app.status || 'PENDING') === appStatusFilter;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Super Admin Management Console
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-bold text-emerald-300">
                  Authoritative Backend
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Manage Master Service Areas, review Partner Applications & Area Change Requests
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 shrink-0 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 shrink-0 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('areas')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'areas'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Master Service Areas</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono">
              {areas.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'categories'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Master Categories (14)</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono">
              {ALLOWED_CATEGORIES.length - disabledCategoryIds.length}/{ALLOWED_CATEGORIES.length} Active
            </span>
          </button>

          <button
            onClick={() => setActiveTab('applications')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'applications'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Market Partner Applications</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono">
              {applications.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'requests'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Area Change Requests</span>
            {changeRequests.filter((r) => r.status === 'PENDING').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {changeRequests.filter((r) => r.status === 'PENDING').length}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {/* TAB 1: MASTER SERVICE AREAS */}
          {activeTab === 'areas' && (
            <div className="space-y-4">
              {/* Controls Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search areas by name, city, district, or PIN code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleOpenAddArea}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Area</span>
                  </button>
                </div>
              </div>

              {/* Areas List */}
              {loadingAreas ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                  <p className="text-xs font-semibold">Loading master local areas from Firestore ({LOCAL_AREAS_COLLECTION})...</p>
                </div>
              ) : filteredAreas.length === 0 ? (
                <div className="py-12 bg-white rounded-2xl border border-slate-200 text-center p-6 space-y-3">
                  <MapPin className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800">No Local Areas Found</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    No areas found in Firestore collection <code className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">{LOCAL_AREAS_COLLECTION}</code>.
                    Click "Add Area" to register your operational service areas.
                  </p>
                  <button
                    onClick={handleOpenAddArea}
                    className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    + Add New Local Area
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredAreas.map((area) => {
                    const isArchived = (area.status || '').toLowerCase() === 'archived';
                    const isEnabled = area.enabled && !isArchived;

                    return (
                      <div
                        key={area.id || area.areaId}
                        className={`p-4 rounded-2xl border bg-white transition-all shadow-xs flex flex-col justify-between gap-3 ${
                          isEnabled
                            ? 'border-emerald-200 ring-1 ring-emerald-500/10'
                            : isArchived
                            ? 'border-slate-200 bg-slate-100/70 opacity-60'
                            : 'border-slate-200 bg-slate-50/70 opacity-75'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-slate-900">{area.name || area.areaName}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isEnabled
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : isArchived
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {isEnabled
                                  ? 'Active / Enabled'
                                  : isArchived
                                  ? 'Archived (Hidden)'
                                  : 'Disabled (Hidden)'}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {area.id || area.areaId}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 font-medium">
                            {area.city && area.city !== area.areaName ? `${area.city}, ` : ''}
                            {area.district ? `${area.district}, ` : ''}{area.state}
                          </p>

                          {area.notes && (
                            <p className="text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <span className="font-semibold text-slate-700">Note: </span>
                              {area.notes}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                            {area.pinCodes && area.pinCodes.length > 0 ? (
                              <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                PIN: {area.pinCodes.join(', ')}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No PIN specified</span>
                            )}

                            <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              Radius: {area.radiusKm || 10} km
                            </span>

                            {area.deliveryAvailable !== false && (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                                <Truck className="w-3 h-3" /> Delivery
                              </span>
                            )}

                            {area.shippingAvailable !== false && (
                              <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                                <PackageCheck className="w-3 h-3" /> Shipping
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Area Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleToggleEnabled(area)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                              isEnabled
                                ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                          >
                            {isEnabled ? 'Disable Area' : 'Enable Area'}
                          </button>

                          <div className="flex items-center gap-1">
                            {!isArchived && (
                              <button
                                onClick={() => handleArchiveArea(area)}
                                className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
                                title="Archive this area"
                              >
                                Archive
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditArea(area)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Edit Area Configuration"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteArea(area)}
                              className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Permanently Delete Area"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MASTER PLATFORM CATEGORIES (14 AUTHORIZED CATEGORIES) */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              {/* Header Banner & Global Controls */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>Dooars Daily Basket — 14 Master Platform Categories</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enable or disable categories platform-wide. When disabled, partners cannot select them or list new items in them.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs shrink-0 font-bold">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {ALLOWED_CATEGORIES.length - disabledCategoryIds.length} Active Globally
                  </span>
                  {disabledCategoryIds.length > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
                      {disabledCategoryIds.length} Disabled
                    </span>
                  )}
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search among 14 authorized categories..."
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                />
              </div>

              {/* Grid of 14 Categories */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ALLOWED_CATEGORIES.filter((cat) => {
                  if (!categorySearchQuery.trim()) return true;
                  const q = categorySearchQuery.toLowerCase().trim();
                  return cat.name.toLowerCase().includes(q) || cat.id.toLowerCase().includes(q);
                }).map((cat, idx) => {
                  const isDisabled = disabledCategoryIds.includes(cat.id);
                  const enrolledCount = applications.filter((app) =>
                    getPartnerCategoryIds(app).includes(cat.id)
                  ).length;
                  const isBusy = togglingCategory === cat.id;

                  return (
                    <div
                      key={cat.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-xs ${
                        isDisabled
                          ? 'border-slate-300 bg-slate-100/80 opacity-80'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                              {cat.name}
                            </h4>
                            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                              ID: {cat.id}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isDisabled
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isDisabled ? 'Disabled Globally' : 'Active'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {cat.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-1 text-[9px]">
                        {cat.defaultShippingEligible ? (
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">
                            Courier Shipping Eligible
                          </span>
                        ) : (
                          <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-semibold border border-blue-200">
                            Hyperlocal Delivery Only
                          </span>
                        )}
                        {cat.isPerishableDefault && (
                          <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-semibold border border-amber-200">
                            Fresh / Perishable
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500 font-semibold">
                          Enrolled Partners: <strong className="text-slate-900">{enrolledCount}</strong>
                        </span>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleGlobalCategory(cat.id, !isDisabled)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                            isDisabled
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isBusy ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Power className="w-3 h-3" />
                          )}
                          <span>{isDisabled ? 'Enable Globally' : 'Disable'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: MARKET PARTNER APPLICATIONS */}
          {activeTab === 'applications' && (
            <div className="space-y-4">
              {/* Filter */}
              <div className="flex items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Filter Status:</span>
                <div className="flex items-center gap-1">
                  {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setAppStatusFilter(status)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        appStatusFilter === status
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {loadingApps ? (
                <div className="py-12 text-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                  <p className="text-xs mt-2">Loading partner applications...</p>
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className="py-12 bg-white rounded-2xl border border-slate-200 text-center p-6">
                  <Store className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-semibold">No applications found under filter.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredApplications.map((app) => {
                    const status = app.status || 'PENDING';
                    return (
                      <div
                        key={app.uid}
                        className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-slate-900">{app.shopName || 'Store'}</h4>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  status === 'APPROVED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : status === 'REJECTED'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              Owner: {app.fullName} • Phone: {app.mobileNumber}
                            </p>
                            <div className="flex flex-wrap items-center gap-1 mt-1.5">
                              <span className="text-[10px] text-slate-400 font-bold">Categories ({getPartnerCategoryIds(app).length}):</span>
                              {getPartnerCategoryNames(app).map((cName) => (
                                <span
                                  key={cName}
                                  className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold"
                                >
                                  {cName}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Selected Local Area Badge */}
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                              Selected Local Area
                            </span>
                            <span className="font-extrabold text-emerald-950 text-sm">
                              {app.localAreaName || app.villageTownCity || 'Not Specified'}
                            </span>
                            {app.localAreaId && (
                              <span className="text-[10px] font-mono text-emerald-600 block">
                                ID: {app.localAreaId}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Location Details */}
                        <div className="text-xs text-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Address</span>
                            <span className="truncate block font-medium">{app.shopAddress}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Town/Village</span>
                            <span className="font-medium">{app.villageTownCity}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">District & PIN</span>
                            <span className="font-medium">{app.district} - {app.pincode}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Applied On</span>
                            <span className="font-medium">
                              {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Admin Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenPartnerCategoryEditor(app)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Layers className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Manage Categories ({getPartnerCategoryIds(app).length})</span>
                          </button>

                          {status !== 'APPROVED' && (
                            <button
                              onClick={() => handleUpdateApplicationStatus(app.uid, 'APPROVED')}
                              disabled={updatingAppId === app.uid}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve Partner</span>
                            </button>
                          )}

                          {status !== 'UNDER_REVIEW' && status !== 'APPROVED' && (
                            <button
                              onClick={() => handleUpdateApplicationStatus(app.uid, 'UNDER_REVIEW')}
                              disabled={updatingAppId === app.uid}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <span>Set Under Review</span>
                            </button>
                          )}

                          {status !== 'REJECTED' && (
                            <button
                              onClick={() => handleUpdateApplicationStatus(app.uid, 'REJECTED')}
                              disabled={updatingAppId === app.uid}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <span>Reject</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AREA CHANGE REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              {loadingRequests ? (
                <div className="py-12 text-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                  <p className="text-xs mt-2">Loading area change requests...</p>
                </div>
              ) : changeRequests.length === 0 ? (
                <div className="py-12 bg-white rounded-2xl border border-slate-200 text-center p-6">
                  <Sliders className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-semibold">No area change requests submitted by Market Partners.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {changeRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900">{req.shopName}</h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                req.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : req.status === 'REJECTED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {req.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">Partner: {req.partnerName}</p>
                        </div>

                        {/* Transition visual */}
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <span className="font-semibold text-slate-600">{req.currentAreaName || 'None'}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-extrabold text-emerald-700">{req.requestedAreaName}</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 text-xs text-slate-700">
                        <span className="font-bold text-slate-900 block mb-0.5">Partner's Stated Reason:</span>
                        <p className="italic text-slate-600">"{req.reason}"</p>
                      </div>

                      {req.status === 'PENDING' && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApproveAreaChange(req)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve & Update Store Area</span>
                          </button>
                          <button
                            onClick={() => handleRejectAreaChange(req)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Edit / Add Area Sub-Modal */}
        {isEditingArea && editingArea && (
          <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
            <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>{editingArea.areaId ? `Edit Area: ${editingArea.areaName}` : 'Add Master Service Area'}</span>
                </h3>
                <button
                  onClick={() => setIsEditingArea(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-600" />
                </button>
              </div>

              <form onSubmit={handleSaveArea} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Area Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bagrakote, Oodlabari, Damdim"
                    value={editingArea.areaName || ''}
                    onChange={(e) => setEditingArea({ ...editingArea, areaName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">City / Town</label>
                    <input
                      type="text"
                      placeholder="e.g. Mal, Alipurduar"
                      value={editingArea.city || ''}
                      onChange={(e) => setEditingArea({ ...editingArea, city: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">District</label>
                    <select
                      value={editingArea.district || 'Jalpaiguri'}
                      onChange={(e) => setEditingArea({ ...editingArea, district: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="Jalpaiguri">Jalpaiguri</option>
                      <option value="Alipurduar">Alipurduar</option>
                      <option value="Cooch Behar">Cooch Behar</option>
                      <option value="Kalimpong">Kalimpong</option>
                      <option value="Darjeeling">Darjeeling</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Served PIN Codes (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 735205, 735222"
                    value={pinCodesInput}
                    onChange={(e) => setPinCodesInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Separate multiple PIN codes with commas.</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Administrative Notes / Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Near Bus stand, GP Office area"
                    value={editingArea.notes || ''}
                    onChange={(e) => setEditingArea({ ...editingArea, notes: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="26.8833"
                      value={editingArea.latitude ?? ''}
                      onChange={(e) => setEditingArea({ ...editingArea, latitude: parseFloat(e.target.value) || undefined })}
                      className="w-full p-2 rounded-xl border border-slate-200 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="88.5833"
                      value={editingArea.longitude ?? ''}
                      onChange={(e) => setEditingArea({ ...editingArea, longitude: parseFloat(e.target.value) || undefined })}
                      className="w-full p-2 rounded-xl border border-slate-200 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Radius (km)</label>
                    <input
                      type="number"
                      step="1"
                      placeholder="12"
                      value={editingArea.radiusKm ?? 12}
                      onChange={(e) => setEditingArea({ ...editingArea, radiusKm: parseInt(e.target.value) || 10 })}
                      className="w-full p-2 rounded-xl border border-slate-200 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={editingArea.enabled !== false}
                      onChange={(e) => setEditingArea({ ...editingArea, enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Active in Market Partner Registration dropdown (enabled = true)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={editingArea.deliveryAvailable !== false}
                      onChange={(e) => setEditingArea({ ...editingArea, deliveryAvailable: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Local Order Delivery Available</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={editingArea.shippingAvailable !== false}
                      onChange={(e) => setEditingArea({ ...editingArea, shippingAvailable: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Courier / Long-Distance Shipping Available</span>
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingArea(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingArea}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {savingArea ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Save Area</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Partner Categories Management Modal */}
        {editingPartnerCategories && (
          <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Manage Partner Categories
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {editingPartnerCategories.shopName} (ID: {editingPartnerCategories.uid})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingPartnerCategories(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <MultiCategorySelector
                selectedCategoryIds={adminPartnerCategoryIds}
                onChange={(ids) => setAdminPartnerCategoryIds(ids)}
                disabledCategoryIds={disabledCategoryIds}
                title="Authorized Partner Categories"
                description="Assign or remove category authorizations for this store. Real-time updates sync to the partner account and customer storefront."
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPartnerCategories(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingPartnerCategories || adminPartnerCategoryIds.length === 0}
                  onClick={handleSavePartnerCategoryPermissions}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingPartnerCategories ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Partner Categories</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
