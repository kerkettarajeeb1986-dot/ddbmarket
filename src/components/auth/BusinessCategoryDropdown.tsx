import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  Search,
  Check,
  X,
  Store,
  Drumstick,
  Beef,
  Fish,
  Utensils,
  Pizza,
  ShoppingBag,
  Egg,
  Milk,
  CupSoda,
  Carrot,
  Apple,
  Sparkles,
  HeartPulse,
  Package,
} from 'lucide-react';
import { ALLOWED_CATEGORIES, type CategoryDef } from '../../data/categories';

interface BusinessCategoryDropdownProps {
  id?: string;
  selectedCategory: string;
  onSelect: (categoryName: string) => void;
  error?: string;
  disabled?: boolean;
}

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Drumstick,
  Beef,
  Fish,
  Utensils,
  Pizza,
  ShoppingBag,
  Egg,
  Milk,
  CupSoda,
  Carrot,
  Apple,
  Sparkles,
  HeartPulse,
  Package,
};

export const BusinessCategoryDropdown: React.FC<BusinessCategoryDropdownProps> = ({
  id = 'reg-businessCategory',
  selectedCategory,
  onSelect,
  error,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find currently selected category object
  const currentCategory = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'Select Business Category') return null;
    return ALLOWED_CATEGORIES.find(
      (c) => c.name.toLowerCase() === selectedCategory.toLowerCase() || c.id.toLowerCase() === selectedCategory.toLowerCase()
    ) || null;
  }, [selectedCategory]);

  // Filter categories by search query
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ALLOWED_CATEGORIES;

    return ALLOWED_CATEGORIES.filter((cat) => {
      const nameMatch = cat.name.toLowerCase().includes(q);
      const idMatch = cat.id.toLowerCase().includes(q);
      return nameMatch || idMatch;
    });
  }, [searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
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
    if (disabled) return;
    if (!isOpen) {
      setSearchQuery('');
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (cat: CategoryDef) => {
    onSelect(cat.name);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect('');
  };

  const IconComponent = currentCategory
    ? CATEGORY_ICON_MAP[currentCategory.iconName] || Store
    : Store;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Hidden input for form data and browser compatibility */}
      <input
        type="hidden"
        id={id}
        name="businessCategory"
        value={selectedCategory || ''}
      />

      {/* Main trigger button */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border bg-white text-left flex items-center justify-between gap-2.5 transition-all outline-hidden cursor-pointer ${
          error
            ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-200'
            : isOpen
            ? 'border-emerald-600 ring-2 ring-emerald-500/20'
            : 'border-slate-300 hover:border-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
        } ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-80' : ''}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              currentCategory ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <IconComponent className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            {currentCategory ? (
              <div className="leading-tight">
                <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                  {currentCategory.name}
                </div>
                <div className="text-[10px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                  <span className="font-semibold text-emerald-700">Authorized Merchant Category</span>
                  {currentCategory.isPerishableDefault && (
                    <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded text-[9px] font-medium">
                      Fresh / Perishable
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-xs sm:text-sm text-slate-400 font-medium">
                Select Business Category
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {currentCategory && !disabled && (
            <span
              role="button"
              tabIndex={0}
              title="Clear category selection"
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
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

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/90 sticky top-0 z-10">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search business categories..."
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-white border border-slate-200 focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category Items List */}
          <div className="max-h-64 sm:max-h-72 overflow-y-auto p-1.5 divide-y divide-slate-50">
            {filteredCategories.length === 0 ? (
              <div className="py-6 px-4 text-center">
                <p className="text-xs text-slate-500 font-medium">
                  No category matching "{searchQuery}".
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  Show all 14 authorized categories
                </button>
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const isSelected =
                  currentCategory?.id === cat.id ||
                  selectedCategory?.toLowerCase() === cat.name.toLowerCase();

                const CatIcon = CATEGORY_ICON_MAP[cat.iconName] || Store;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(cat)}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer min-h-[48px] ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-950 font-bold'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <CatIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-bold truncate">
                          {cat.name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                          {cat.defaultShippingEligible ? (
                            <span className="text-emerald-700 font-medium">Local & Courier Shipping</span>
                          ) : (
                            <span className="text-blue-700 font-medium">Local Hyperlocal Delivery</span>
                          )}
                          {cat.isPerishableDefault && (
                            <span className="text-amber-700">• Fresh / Daily</span>
                          )}
                        </div>
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

          {/* Footer count indicator */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="font-semibold text-emerald-800">
              14 Authorized Dooars Daily Basket Categories
            </span>
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
