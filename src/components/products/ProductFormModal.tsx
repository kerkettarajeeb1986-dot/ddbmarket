import React, { useState, useEffect, useMemo } from 'react';
import { X, Upload, Package, AlertCircle, Loader2, Sparkles, Check, Info } from 'lucide-react';
import { type Product } from '../../types';
import {
  ALLOWED_CATEGORIES,
  getPartnerCategoryIds,
  normalizeCategoryId,
  getCategoryName,
} from '../../data/categories';
import { subscribeToGlobalCategoryConfig } from '../../services/categoryService';
import { uploadPartnerFile } from '../../services/storageService';
import { useAuth } from '../../context/AuthContext';

interface ProductFormModalProps {
  product: Product | null; // null for add, object for edit
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Product, 'id' | 'partnerId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product,
  isOpen,
  onClose,
  onSave,
}) => {
  const { currentUser, partnerProfile } = useAuth();
  const [disabledCategoryIds, setDisabledCategoryIds] = useState<string[]>([]);

  useEffect(() => {
    const unsub = subscribeToGlobalCategoryConfig((config) => {
      setDisabledCategoryIds(config.disabledCategoryIds || []);
    });
    return () => unsub();
  }, []);

  const partnerAuthorizedIds = useMemo(() => {
    return getPartnerCategoryIds(partnerProfile);
  }, [partnerProfile]);

  // Allowed categories for this partner:
  // Must be in partner's selected categories AND not globally disabled by Admin.
  // Exception: If editing an existing product, always include its current category so existing records remain intact.
  const selectableCategories = useMemo(() => {
    return ALLOWED_CATEGORIES.filter((cat) => {
      if (
        product &&
        (product.categoryId === cat.id ||
          normalizeCategoryId(product.categoryId) === cat.id ||
          normalizeCategoryId(product.categoryName) === cat.id)
      ) {
        return true; // Keep existing product's category intact
      }
      const isAuthorized = partnerAuthorizedIds.length === 0 || partnerAuthorizedIds.includes(cat.id);
      const isNotDisabled = !disabledCategoryIds.includes(cat.id);
      return isAuthorized && isNotDisabled;
    });
  }, [product, partnerAuthorizedIds, disabledCategoryIds]);

  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [categoryId, setCategoryId] = useState(() => {
    if (product?.categoryId) return normalizeCategoryId(product.categoryId);
    return selectableCategories[0]?.id || ALLOWED_CATEGORIES[0].id;
  });

  // Sync categoryId if selectable categories change and current isn't in it
  useEffect(() => {
    if (selectableCategories.length > 0 && !selectableCategories.some((c) => c.id === categoryId)) {
      setCategoryId(selectableCategories[0].id);
    }
  }, [selectableCategories, categoryId]);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
  const [price, setPrice] = useState<string>(product?.price ? String(product.price) : '');
  const [discountPrice, setDiscountPrice] = useState<string>(
    product?.discountPrice ? String(product.discountPrice) : ''
  );
  const [stockQuantity, setStockQuantity] = useState<string>(
    product?.stockQuantity !== undefined ? String(product.stockQuantity) : '20'
  );
  const [unit, setUnit] = useState(product?.unit || 'kg');
  const [weight, setWeight] = useState<string>(product?.weight ? String(product.weight) : '1');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'g' | 'piece' | 'liter'>(
    product?.weightUnit || 'kg'
  );
  const [available, setAvailable] = useState(product?.available ?? true);
  const [localDeliveryAvailable, setLocalDeliveryAvailable] = useState(
    product?.localDeliveryAvailable ?? true
  );
  const [shippingEligible, setShippingEligible] = useState(
    product?.shippingEligible ?? false
  );
  const [isPerishable, setIsPerishable] = useState(product?.isPerishable ?? false);
  const [requiresRefrigeration, setRequiresRefrigeration] = useState(
    product?.requiresRefrigeration ?? false
  );
  const [packageLength, setPackageLength] = useState<string>(
    product?.packageLength ? String(product.packageLength) : ''
  );
  const [packageWidth, setPackageWidth] = useState<string>(
    product?.packageWidth ? String(product.packageWidth) : ''
  );
  const [packageHeight, setPackageHeight] = useState<string>(
    product?.packageHeight ? String(product.packageHeight) : ''
  );

  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    const catDef = ALLOWED_CATEGORIES.find((c) => c.id === catId);
    if (catDef) {
      setShippingEligible(catDef.defaultShippingEligible);
      setIsPerishable(catDef.isPerishableDefault);
      setRequiresRefrigeration(catDef.requiresRefrigerationDefault);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    try {
      setUploadingImage(true);
      setError(null);
      const url = await uploadPartnerFile(file, currentUser.uid, 'products');
      setImageUrl(url);
    } catch (err: any) {
      setError('Image upload failed: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Product title is required.');
      return;
    }
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setError('Price must be a valid number greater than ₹0.');
      return;
    }
    const numDiscount = discountPrice ? Number(discountPrice) : undefined;
    if (numDiscount !== undefined && (isNaN(numDiscount) || numDiscount >= numPrice || numDiscount <= 0)) {
      setError('Discounted price must be less than the regular price and greater than ₹0.');
      return;
    }
    const numStock = Number(stockQuantity);
    if (isNaN(numStock) || numStock < 0) {
      setError('Stock quantity cannot be negative.');
      return;
    }

    const selectedCat = ALLOWED_CATEGORIES.find((c) => c.id === categoryId);

    try {
      setIsSubmitting(true);
      await onSave({
        name: name.trim(),
        description: description.trim(),
        categoryId,
        categoryName: selectedCat?.name || 'General',
        imageUrl: imageUrl.trim(),
        price: numPrice,
        discountPrice: numDiscount,
        stockQuantity: numStock,
        unit,
        weight: weight ? Number(weight) : undefined,
        weightUnit,
        available: available && numStock > 0,
        localDeliveryAvailable,
        shippingEligible,
        isPerishable,
        requiresRefrigeration,
        packageLength: packageLength ? Number(packageLength) : undefined,
        packageWidth: packageWidth ? Number(packageWidth) : undefined,
        packageHeight: packageHeight ? Number(packageHeight) : undefined,
      });
      onClose();
    } catch (err: any) {
      setError('Failed to save product: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {product ? 'Edit Catalog Product' : 'Add New Product to Catalog'}
              </h3>
              <p className="text-xs text-slate-500">
                Configure prices, inventory, courier shipping, and food handling specifications.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Product Title / Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Fresh Dooars Farm Eggs, Basmati Rice"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Authorized Category *
              </label>
              {selectableCategories.length === 0 ? (
                <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>No authorized categories available. Please enable categories in Store Profile &gt; Manage My Categories first.</span>
                </div>
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium bg-white"
                >
                  {selectableCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Pricing & Stock */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Regular Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="100"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Discount Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Optional"
                value={discountPrice}
                onChange={(e) => setDiscountPrice(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-bold text-emerald-700"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Stock Quantity *
              </label>
              <input
                type="number"
                required
                placeholder="25"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Unit of Sale *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
              >
                <option value="kg">kg (Kilogram)</option>
                <option value="g">g (Gram)</option>
                <option value="piece">piece (Pcs)</option>
                <option value="packet">packet (Pkt)</option>
                <option value="liter">liter (L)</option>
                <option value="dozen">dozen</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Product Description / Quality Details
            </label>
            <textarea
              rows={2}
              placeholder="Fresh locally harvested product from Dooars..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 resize-none"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Product Photograph
            </label>
            <div className="flex items-center gap-4">
              {imageUrl ? (
                <div className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shrink-0">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-900/70 text-white hover:bg-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
              )}

              <div className="flex-1">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageFileChange}
                  disabled={uploadingImage}
                  className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
                {uploadingImage && (
                  <span className="text-[11px] text-emerald-700 flex items-center gap-1 mt-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Uploading image...
                  </span>
                )}
                <div className="text-[10px] text-slate-400 mt-1">
                  Supported formats: JPG, PNG, WEBP (Max 5MB)
                </div>
              </div>
            </div>
          </div>

          {/* Grocery Shipping & Fulfillment Configuration */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <span>Fulfillment & Logistics Parameters</span>
              <span className="text-[10px] font-semibold text-slate-500">(Courier & Local Delivery)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localDeliveryAvailable}
                  onChange={(e) => setLocalDeliveryAvailable(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-bold text-slate-800">Local Express Delivery</div>
                  <div className="text-[10px] text-slate-500">Delivered by local bike/two-wheeler fleet</div>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shippingEligible}
                  onChange={(e) => setShippingEligible(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-bold text-slate-800">Courier Grocery Shipping</div>
                  <div className="text-[10px] text-slate-500">Shippable via regional courier / parcel</div>
                </div>
              </label>
            </div>

            {/* Perishable and Refrigeration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPerishable}
                  onChange={(e) => setIsPerishable(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <div className="font-bold text-slate-800">Perishable Food Item</div>
                  <div className="text-[10px] text-slate-500">Short shelf life (same-day delivery priority)</div>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresRefrigeration}
                  onChange={(e) => setRequiresRefrigeration(e.target.checked)}
                  className="rounded text-cyan-600 focus:ring-cyan-500"
                />
                <div>
                  <div className="font-bold text-slate-800">Requires Refrigeration / Cold Pack</div>
                  <div className="text-[10px] text-slate-500">Meats, dairy, frozen foods</div>
                </div>
              </label>
            </div>

            {/* Weight and Package Dimensions for courier shipping */}
            {shippingEligible && (
              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    Unit Weight (kg):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="1.0"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    Length (cm):
                  </label>
                  <input
                    type="number"
                    placeholder="15"
                    value={packageLength}
                    onChange={(e) => setPackageLength(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    Width (cm):
                  </label>
                  <input
                    type="number"
                    placeholder="10"
                    value={packageWidth}
                    onChange={(e) => setPackageWidth(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    Height (cm):
                  </label>
                  <input
                    type="number"
                    placeholder="5"
                    value={packageHeight}
                    onChange={(e) => setPackageHeight(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Availability Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="font-bold text-slate-800">Product Active / Available in Store</div>
              <div className="text-[10px] text-slate-500">When enabled, customers can discover and purchase this item.</div>
            </div>
            <button
              type="button"
              onClick={() => setAvailable(!available)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                available ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  available ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || uploadingImage}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-transform active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Product...' : product ? 'Save Changes' : 'Add to Catalog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
