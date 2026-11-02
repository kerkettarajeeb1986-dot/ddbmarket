import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MapPin,
  ChevronDown,
  Search,
  Check,
  X,
  AlertTriangle,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { type ServiceArea } from '../../types';

interface LocalAreaDropdownProps {
  id?: string;
  areas: ServiceArea[];
  selectedAreaId: string;
  onSelect: (area: ServiceArea | null) => void;
  isLoading?: boolean;
  error?: string;
  onOpenSupport?: () => void;
}

export const LocalAreaDropdown: React.FC<LocalAreaDropdownProps> = ({
  id = 'local-area-select',
  areas,
  selectedAreaId,
  onSelect,
  isLoading = false,
  error,
  onOpenSupport,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Active enabled areas only (Requirement 2)
  const activeAreas = useMemo(() => {
    return areas.filter((a) => a.enabled !== false);
  }, [areas]);

  // Selected area object
  const selectedArea = useMemo(() => {
    return activeAreas.find((a) => (a.areaId || a.id) === selectedAreaId || a.id === selectedAreaId) || null;
  }, [activeAreas, selectedAreaId]);

  // Filtered areas by search query (Requirement 11)
  const filteredAreas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeAreas;

    return activeAreas.filter((a) => {
      const nameMatch = (a.name || a.areaName || '').toLowerCase().includes(q);
      const cityMatch = a.city?.toLowerCase().includes(q);
      const districtMatch = a.district?.toLowerCase().includes(q);
      const notesMatch = a.notes?.toLowerCase().includes(q);
      const pinMatch = Array.isArray(a.pinCodes)
        ? a.pinCodes.some((p) => p.toLowerCase().includes(q))
        : false;
      return nameMatch || cityMatch || districtMatch || pinMatch || notesMatch;
    });
  }, [activeAreas, searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleToggle = () => {
    if (isLoading) return;
    if (!isOpen) {
      setSearchQuery('');
    }
    setIsOpen(!isOpen);
  };

  const handleSelectArea = (area: ServiceArea) => {
    onSelect(area);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button - Mobile friendly touch target (>= 44px) */}
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={isLoading || (!isLoading && activeAreas.length === 0)}
        onClick={handleToggle}
        className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border bg-white text-left flex items-center justify-between gap-2.5 transition-all outline-hidden cursor-pointer ${
          error
            ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-200'
            : isOpen
            ? 'border-emerald-600 ring-2 ring-emerald-500/20'
            : 'border-slate-300 hover:border-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
        } ${isLoading || (!isLoading && activeAreas.length === 0) ? 'bg-slate-50 cursor-not-allowed opacity-90' : ''}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            selectedArea ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
          }`}>
            <MapPin className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>Loading available local areas…</span>
              </div>
            ) : selectedArea ? (
              <div className="leading-tight">
                <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                  {selectedArea.name || selectedArea.areaName}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {selectedArea.district ? `${selectedArea.district}` : ''}
                  {selectedArea.pinCodes && selectedArea.pinCodes.length > 0
                    ? ` • PIN: ${selectedArea.pinCodes.join(', ')}`
                    : ''}
                </div>
              </div>
            ) : activeAreas.length === 0 ? (
              <span className="text-xs text-slate-400 font-medium">No active areas available</span>
            ) : (
              <span className="text-xs sm:text-sm text-slate-400 font-medium">
                Select your local operational area…
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedArea && !isLoading && (
            <span
              role="button"
              tabIndex={0}
              title="Clear selection"
              onClick={handleClearSelection}
              onKeyDown={(e) => e.key === 'Enter' && handleClearSelection(e as any)}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-700' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu (Mobile-Friendly & Searchable) */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search area name, city, or PIN code…"
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-white border border-slate-200 focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 sm:max-h-72 overflow-y-auto p-1.5 divide-y divide-slate-50">
            {filteredAreas.length === 0 ? (
              <div className="py-6 px-4 text-center">
                <p className="text-xs text-slate-500 font-medium">
                  {searchQuery
                    ? `No service areas matching "${searchQuery}".`
                    : 'No active service areas found.'}
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Clear search query
                  </button>
                )}
              </div>
            ) : (
              filteredAreas.map((area) => {
                const areaKey = area.areaId || area.id;
                const isSelected = selectedAreaId === areaKey;

                return (
                  <button
                    key={areaKey}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectArea(area)}
                    className={`w-full text-left p-3 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer min-h-[48px] ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-950 font-semibold'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold truncate">
                          {area.name || area.areaName}
                        </span>
                        {area.city && area.city.toLowerCase() !== (area.name || area.areaName).toLowerCase() && (
                          <span className="text-[11px] text-slate-400 font-normal">
                            ({area.city})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span>{area.district ? `${area.district}, ` : ''}{area.state || 'West Bengal'}</span>
                        {area.pinCodes && area.pinCodes.length > 0 && (
                          <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                            PIN: {area.pinCodes.join(', ')}
                          </span>
                        )}
                        {area.notes && (
                          <span className="text-[10px] text-slate-400 italic">
                            ({area.notes})
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer showing count */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="font-medium text-emerald-800">
              {activeAreas.length} active service {activeAreas.length === 1 ? 'area' : 'areas'}
            </span>
            <span className="text-slate-400">Dooars Region</span>
          </div>
        </div>
      )}

      {/* Requirement 8: If no active areas exist, show message and support link */}
      {!isLoading && activeAreas.length === 0 && (
        <div className="mt-2.5 p-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <p className="font-bold text-amber-900">
                No service area is currently available. Please contact support.
              </p>
              {onOpenSupport && (
                <button
                  type="button"
                  onClick={onOpenSupport}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Contact Support Desk
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Validation error message */}
      {error && (
        <p className="text-rose-600 text-[11px] mt-1.5 font-semibold flex items-center gap-1">
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
