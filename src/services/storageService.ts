import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function uploadPartnerFile(
  file: File,
  partnerUid: string,
  folder: 'docs' | 'store' | 'products'
): Promise<string> {
  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size exceeds the 5MB limit. Please choose a smaller file.');
  }

  // Allowed file types
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPG, PNG, WEBP, and PDF documents are supported.');
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `partners/${partnerUid}/${folder}/${Date.now()}_${cleanName}`;

  if (storage) {
    try {
      const storageReference = ref(storage, path);
      const snapshot = await uploadBytes(storageReference, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: partnerUid,
          category: folder,
        },
      });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (storageErr: any) {
      console.warn('Firebase Storage upload failed, utilizing secure base64 inline fallback:', storageErr);
    }
  }

  // Fallback: Read as base64 data URL for resilient offline/local functionality
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file contents'));
      }
    };
    reader.onerror = () => reject(new Error('Failed reading file'));
    reader.readAsDataURL(file);
  });
}
