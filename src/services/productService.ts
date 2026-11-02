import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { type Product } from '../types';

export function subscribeToPartnerProducts(
  partnerId: string,
  onProducts: (products: Product[]) => void,
  onError?: (err: Error) => void
) {
  const productsRef = collection(db, 'products');
  const q = query(productsRef, where('partnerId', '==', partnerId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as Product);
      });
      // Sort in-memory to prevent complex composite index requirements on Firestore
      items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onProducts(items);
    },
    (err) => {
      if (onError) onError(err);
      else console.error('Error fetching partner products:', err);
    }
  );
}

export async function addProduct(
  partnerId: string,
  productData: Omit<Product, 'id' | 'partnerId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  // Strict validations
  if (!productData.name || !productData.name.trim()) {
    throw new Error('Product name is required.');
  }
  if (productData.price <= 0) {
    throw new Error('Price must be greater than zero.');
  }
  if (productData.discountPrice && productData.discountPrice >= productData.price) {
    throw new Error('Discount price must be less than the regular price.');
  }
  if (productData.stockQuantity < 0) {
    throw new Error('Stock quantity cannot be negative.');
  }
  if (!productData.categoryId) {
    throw new Error('Category selection is required.');
  }

  const nowIso = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'products'), {
    ...productData,
    name: productData.name.trim(),
    partnerId,
    storeId: partnerId,
    createdAt: nowIso,
    updatedAt: nowIso,
    serverCreatedAt: serverTimestamp(),
    serverUpdatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateProduct(
  productId: string,
  productData: Partial<Product>
): Promise<void> {
  if (productData.price !== undefined && productData.price <= 0) {
    throw new Error('Price must be greater than zero.');
  }
  if (
    productData.discountPrice !== undefined &&
    productData.price !== undefined &&
    productData.discountPrice >= productData.price
  ) {
    throw new Error('Discount price must be less than regular price.');
  }
  if (productData.stockQuantity !== undefined && productData.stockQuantity < 0) {
    throw new Error('Stock cannot be negative.');
  }

  const nowIso = new Date().toISOString();
  const productRef = doc(db, 'products', productId);
  await updateDoc(productRef, {
    ...productData,
    updatedAt: nowIso,
    serverUpdatedAt: serverTimestamp(),
  });
}

export async function toggleProductAvailability(productId: string, available: boolean): Promise<void> {
  const productRef = doc(db, 'products', productId);
  await updateDoc(productRef, {
    available,
    updatedAt: new Date().toISOString(),
  });
}

export async function updateProductStock(productId: string, newStock: number): Promise<void> {
  if (newStock < 0) throw new Error('Stock cannot be negative');
  const productRef = doc(db, 'products', productId);
  await updateDoc(productRef, {
    stockQuantity: newStock,
    available: newStock > 0,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteProduct(productId: string): Promise<void> {
  const productRef = doc(db, 'products', productId);
  await deleteDoc(productRef);
}
