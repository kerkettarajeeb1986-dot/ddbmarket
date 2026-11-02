import React, { useState, useMemo } from 'react';
import {
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
  AlertTriangle,
  Layers,
  CheckSquare,
  Square,
  Info,
} from 'lucide-react';
import { ALLOWED_CATEGORIES, normalizeCategoryId, type CategoryDef } from '../../data/categories';

interface MultiCategorySelectorProps {
  selectedCategoryIds: string[];
  onChange: (categoryIds: string[]) => void;
  disabledCategoryIds?: string[]; // Globally disabled by Super Admin
  error?: string;
  disabled?: boolean;
  showSummary?: boolean;
  title?: string;
  description?: string;
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

export const MultiCategorySelector: React.FC<MultiCategorySelectorProps> = ({
  selectedCategoryIds,
  onChange,
  disabledCategoryIds = [],
  error,
  disabled = false,
  showSummary = true,
  title = 'Authorized Business Categories',
  description = 'Select one or more categories that your store will sell on Dooars Daily Basket. You can manage multiple categories under this single Market Partner account.',
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Set of normalized globally disabled category IDs
  const disabledSet = useMemo(() => {
    return new Set(disabledCategoryIds.map(normalizeCategoryId));
  }, [disabledCategoryIds]);

  // Set of normalized currently selected category IDs
  const selectedSet = useMemo(() => {
    return new Set(selectedCategoryIds.map(normalizeCategoryId));
  }, [selectedCategoryIds]);

  // Available categories that are not globally disabled by Admin
  const availableCategories = useMemo(() => {
    return ALLOWED_CATEGORIES.filter((cat) => !disabledSet.has(cat.id));
  }, [disabledSet]);

  // Filtered categories based on search query
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ALLOWED_CATEGORIES;

    return ALLOWED_CATEGORIES.filter((cat) => {
      const matchName = cat.name.toLowerCase().includes(q);
      const matchId = cat.id.toLowerCase().includes(q);
      const matchDesc = cat.description?.toLowerCase().includes(q) || false;
      const matchAlias = cat.aliases?.some((a) => a.toLowerCase().includes(q)) || false;
      return matchName || matchId || matchDesc || matchAlias;
    });
  }, [searchQuery]);

  // Toggle an individual category
  const handleToggle = (categoryId: string) => {
    if (disabled) return;
    const normId = normalizeCategoryId(categoryId);
    if (disabledSet.has(normId)) return; // Admin restricted

    const next = new Set(selectedSet);
    if (next.has(normId)) {
      next.delete(normId);
    } else {
      next.add(normId);
    }
    onChange(Array.from(next));
  };

  // Select all Admin-enabled categories
  const handleSelectAll = () => {
    if (disabled) return;
    const allEnabledIds = availableCategories.map((c) => c.id);
    onChange(allEnabledIds);
  };

  // Clear all selections
  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  // Remove a specific selected category chip
  const handleRemoveChip = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    const normId = normalizeCategoryId(categoryId);
    const next = new Set(selectedSet);
    next.delete(normId);
    onChange(Array.from(next));
  };

  const selectedCount = selectedSet.size;
  const isAllSelected = availableCategories.length > 0 && selectedCount >= availableCategories.length;

  return (
    <div className="w-full space-y-3.5">
      {/* Header & Quick Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">{title}</h4>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-black tracking-wide ${
                selectedCount > 0
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-100 text-rose-700 border border-rose-200'
              }`}
            >
              {selectedCount} {selectedCount === 1 ? 'Category' : 'Categories'} Selected
            </span>
          </div>
          {description && (
            <p className="text-[11px] text-slate-500 mt-1 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Action Controls: Select All / Clear All */}
        {!disabled && (
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={isAllSelected}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <CheckSquare className="w-3 h-3 text-emerald-600" />
              <span>Select All ({availableCategories.length})</span>
            </button>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-rose-700 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Search Input Filter */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search categories (e.g. Grocery, Meat, Chicken, Vegetables, Fruit)..."
          disabled={disabled}
          className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Categories Grid (Multi-select Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto p-1 border border-slate-200 rounded-2xl bg-slate-50/60 shadow-2xs">
        {filteredCategories.length === 0 ? (
          <div className="col-span-full py-8 text-center text-slate-400">
            <Info className="w-6 h-6 mx-auto mb-1 text-slate-300" />
            <p className="text-xs font-semibold">No category matching "{searchQuery}"</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[11px] text-emerald-700 font-bold mt-1 hover:underline cursor-pointer"
            >
              Show all categories
            </button>
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const isSelected = selectedSet.has(cat.id);
            const isGloballyDisabled = disabledSet.has(cat.id);
            const Icon = CATEGORY_ICON_MAP[cat.iconName] || Store;

            return (
              <div
                key={cat.id}
                onClick={() => !isGloballyDisabled && handleToggle(cat.id)}
                className={`relative p-3 rounded-xl border transition-all text-left flex items-start gap-2.5 min-h-[56px] select-none ${
                  isGloballyDisabled
                    ? 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                    : isSelected
                    ? 'border-emerald-500 bg-emerald-50/90 shadow-xs ring-1 ring-emerald-500/30 cursor-pointer'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 cursor-pointer'
                } ${disabled ? 'pointer-events-none' : ''}`}
              >
                {/* Custom Checkbox */}
                <div className="pt-0.5 shrink-0">
                  <div
                    className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                        : isGloballyDisabled
                        ? 'border-slate-300 bg-slate-200'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                {/* Category Icon */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : isGloballyDisabled
                      ? 'bg-slate-200 text-slate-400'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-bold truncate ${
                        isSelected ? 'text-emerald-950' : 'text-slate-900'
                      }`}
                    >
                      {cat.name}
                    </span>
                    {isGloballyDisabled && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded shrink-0">
                        Restricted
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                    {cat.description}
                  </p>

                  {/* Metadata Tags */}
                  <div className="flex flex-wrap items-center gap-1 mt-1 text-[9px]">
                    {cat.defaultShippingEligible ? (
                      <span className="text-emerald-700 bg-emerald-100/60 px-1 py-0.2 rounded font-medium">
                        Courier Shipping
                      </span>
                    ) : (
                      <span className="text-blue-700 bg-blue-50 px-1 py-0.2 rounded font-medium">
                        Hyperlocal
                      </span>
                    )}
                    {cat.isPerishableDefault && (
                      <span className="text-amber-800 bg-amber-50 px-1 py-0.2 rounded font-medium">
                        Fresh / Perishable
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected Categories Summary Pill Bar */}
      {showSummary && selectedCount > 0 && (
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-700">
              Selected Categories Summary ({selectedCount} of {availableCategories.length})
            </span>
            <span className="text-[10px] text-slate-400">
              Your store products will be searchable under each of these tags
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {Array.from<string>(selectedSet).map((catId: string) => {
              const def = ALLOWED_CATEGORIES.find((c) => c.id === catId);
              const name = def?.name || catId;
              const Icon = def ? CATEGORY_ICON_MAP[def.iconName] || Store : Store;

              return (
                <span
                  key={catId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold shadow-2xs"
                >
                  <Icon className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{name}</span>
                  {!disabled && (
                    <button
                      type="button"
                      title={`Remove ${name}`}
                      onClick={(e) => handleRemoveChip(catId, e)}
                      className="w-3.5 h-3.5 rounded-full hover:bg-emerald-200 flex items-center justify-center text-emerald-700 cursor-pointer ml-0.5"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Validation Error Banner */}
      {error && (
        <div className="p-2.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
