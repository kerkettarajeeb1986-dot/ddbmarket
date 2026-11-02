import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Truck,
  Bike,
  AlertCircle,
  Layers,
  ThermometerSnowflake,
  Clock,
} from 'lucide-react';
import { type Product } from '../../types';
import { ALLOWED_CATEGORIES, normalizeCategoryId } from '../../data/categories';
import {
  addProduct,
  updateProduct,
  deleteProduct,
  toggleProductAvailability,
  updateProductStock,
} from '../../services/productService';
import { ProductFormModal } from './ProductFormModal';
import { useAuth } from '../../context/AuthContext';

interface ProductManagementProps {
  products: Product[];
  loading: boolean;
}

export const ProductManagement: React.FC<ProductManagementProps> = ({ products, loading }) => {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStockFilter, setSelectedStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);

  // Filters
  const filteredProducts = products.filter((prod) => {
    if (selectedCategory !== 'ALL') {
      const normSelected = normalizeCategoryId(selectedCategory);
      const prodCatId = normalizeCategoryId(prod.categoryId || prod.categoryName);
      if (prodCatId !== normSelected) return false;
    }

    if (selectedStockFilter === 'IN_STOCK' && (prod.stockQuantity <= 0 || !prod.available)) return false;
    if (selectedStockFilter === 'LOW_STOCK' && (prod.stockQuantity > 5 || prod.stockQuantity <= 0)) return false;
    if (selectedStockFilter === 'OUT_OF_STOCK' && prod.stockQuantity > 0 && prod.available) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = prod.name.toLowerCase().includes(q);
      const matchCat = (prod.categoryName || '').toLowerCase().includes(q);
      return matchName || matchCat;
    }

    return true;
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleSaveProduct = async (
    data: Omit<Product, 'id' | 'partnerId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!currentUser) return;
    if (editingProduct) {
      await updateProduct(editingProduct.id, data);
    } else {
      await addProduct(currentUser.uid, data);
    }
  };

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${product.name}" from your catalog?`
    );
    if (!confirmed) return;

    try {
      setBusyProductId(product.id);
      setActionError(null);
      await deleteProduct(product.id);
    } catch (err: any) {
      setActionError('Delete failed: ' + err.message);
    } finally {
      setBusyProductId(null);
    }
  };

  const handleToggleAvailability = async (product: Product) => {
    try {
      setBusyProductId(product.id);
      setActionError(null);
      await toggleProductAvailability(product.id, !product.available);
    } catch (err: any) {
      setActionError('Could not update status: ' + err.message);
    } finally {
      setBusyProductId(null);
    }
  };

  const handleQuickStockChange = async (product: Product, delta: number) => {
    const newStock = Math.max(0, product.stockQuantity + delta);
    try {
      setBusyProductId(product.id);
      setActionError(null);
      await updateProductStock(product.id, newStock);
    } catch (err: any) {
      setActionError('Stock update error: ' + err.message);
    } finally {
      setBusyProductId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Product & Inventory Catalog
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage merchant inventory, local delivery eligibility, and grocery shipping parameters.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-600 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">All Categories</option>
            {ALLOWED_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={selectedStockFilter}
            onChange={(e) => setSelectedStockFilter(e.target.value as any)}
            className="p-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock (&le; 5)</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-slate-200/60 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200 shadow-xs">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No products found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery || selectedCategory !== 'ALL'
              ? 'Try adjusting your search terms or category filters.'
              : 'Your store catalog is empty. Click "Add Product" to create your first listing.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Product</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.stockQuantity <= 0;
            const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= 5;
            const isBusy = busyProductId === product.id;

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Image & Quick Badges */}
                  <div className="relative h-40 bg-slate-100 overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50">
                        <Package className="w-10 h-10 stroke-[1.5]" />
                      </div>
                    )}

                    {/* Category Pill */}
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/95 backdrop-blur-xs text-slate-800 shadow-xs">
                      {product.categoryName}
                    </span>

                    {/* Stock Status Pill */}
                    <span
                      className={`absolute top-2.5 right-2.5 px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase shadow-xs ${
                        isOutOfStock
                          ? 'bg-rose-500 text-white'
                          : isLowStock
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isOutOfStock ? 'Out of Stock' : isLowStock ? `Low (${product.stockQuantity})` : `In Stock (${product.stockQuantity})`}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-1">
                        {product.name}
                      </h4>
                      <button
                        onClick={() => handleToggleAvailability(product)}
                        disabled={isBusy}
                        title={product.available ? 'Click to deactivate' : 'Click to activate'}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 transition-colors ${
                          product.available
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {product.available ? 'Active' : 'Hidden'}
                      </button>
                    </div>

                    {/* Price and Unit */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-black text-slate-900">
                        ₹{product.discountPrice ? product.discountPrice.toFixed(2) : product.price.toFixed(2)}
                      </span>
                      {product.discountPrice && (
                        <span className="text-xs text-slate-400 line-through">
                          ₹{product.price.toFixed(2)}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-medium">/ {product.unit}</span>
                    </div>

                    {/* Fulfillment Flags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-semibold text-slate-600">
                      {product.localDeliveryAvailable && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center gap-1">
                          <Bike className="w-3 h-3 text-emerald-600" /> Local
                        </span>
                      )}
                      {product.shippingEligible && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-100 flex items-center gap-1">
                          <Truck className="w-3 h-3 text-blue-600" /> Courier
                        </span>
                      )}
                      {product.requiresRefrigeration && (
                        <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-100 flex items-center gap-1">
                          <ThermometerSnowflake className="w-3 h-3 text-cyan-600" /> Cold
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stock Controls & Actions Footer */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  {/* Quick Stock Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleQuickStockChange(product, -5)}
                      disabled={isBusy || product.stockQuantity <= 0}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-md font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                      title="Reduce stock by 5"
                    >
                      -5
                    </button>
                    <button
                      onClick={() => handleQuickStockChange(product, +5)}
                      disabled={isBusy}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-md font-bold text-slate-700 hover:bg-slate-100"
                      title="Add 5 to stock"
                    >
                      +5
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(product)}
                      disabled={isBusy}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
                      title="Edit Product"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      disabled={isBusy}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:text-rose-600 hover:border-rose-300 transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <ProductFormModal
        product={editingProduct}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveProduct}
      />
    </div>
  );
};
