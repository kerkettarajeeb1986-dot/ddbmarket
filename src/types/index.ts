export type PartnerApplicationStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'DISABLED';

export type UserRole = 'market_partner' | 'customer' | 'delivery_partner' | 'admin';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  address?: string;
}

export interface BankAccountDetails {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName?: string;
}

export interface MarketPartnerProfile {
  uid: string;
  email: string;
  fullName: string;
  mobileNumber: string;
  shopName: string;
  shopAddress: string;
  villageTownCity: string;
  district: string;
  state: string;
  pincode: string;
  gpsLocation?: LocationCoordinates;
  businessCategory: string; // Preserved for 100% backward compatibility (display string or primary category)
  businessCategories?: string[]; // Array of authoritative category IDs (e.g. ['grocery', 'meat'])
  businessCategoryNames?: string[]; // Display names of selected categories (e.g. ['Grocery', 'Meat'])
  localAreaId?: string; // Authoritative relationship to Admin-managed Service Area
  areaId?: string; // Firestore document ID of the local area
  localAreaName?: string; // Display/cache field for rapid presentation
  fssaiNumber?: string;
  fssaiCertUrl?: string;
  foodLicenseUrl?: string;
  tradeLicenseNumber?: string;
  tradeLicenseUrl?: string;
  identityDocNumber?: string;
  identityDocUrl?: string;
  identityProofUrl?: string;
  shopPhotoUrl?: string;
  storePhotoUrl?: string;
  shopLogoUrl?: string;
  upiQrUrl?: string;
  bankPassbookUrl?: string;
  upiId?: string;
  bankDetails?: BankAccountDetails;
  openingHours?: string;
  closingHours?: string;
  weeklyHoliday?: string;
  minimumOrder?: number;
  preparationTimeMinutes?: number;
  storeDescription?: string;
  isOnline: boolean;
  storeStatus?: 'ONLINE' | 'OFFLINE';
  shopIsOpen?: boolean;
  statusText?: string;
  autoAcceptOrders?: boolean;
  status: PartnerApplicationStatus;
  rejectionReason?: string;
  adminRemarks?: string;
  commissionPercentage?: number;
  createdAt: string;
  updatedAt: string;
  lastSeen?: string;
}

export interface Product {
  id: string;
  productId?: string;
  partnerId: string;
  storeId?: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  imageUrl: string;
  price: number;
  discountPrice?: number;
  stockQuantity: number;
  unit: string; // 'kg', 'g', 'piece', 'packet', 'liter', 'dozen'
  weight?: number;
  weightUnit?: 'kg' | 'g' | 'piece' | 'liter';
  available: boolean;
  localDeliveryAvailable: boolean;
  shippingEligible: boolean;
  isPerishable: boolean;
  requiresRefrigeration: boolean;
  packageLength?: number;
  packageWidth?: number;
  packageHeight?: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'ASSIGNED'
  | 'DELIVERY_ACCEPTED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETELY_DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type ShippingStatus =
  | 'SHIPPING_PENDING'
  | 'SHIPPING_CONFIRMED'
  | 'PACKING'
  | 'READY_TO_SHIP'
  | 'SHIPMENT_CREATED'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'RETURNED'
  | 'CANCELLED';

export type PaymentMethod = 'COD' | 'UPI' | 'ONLINE' | 'WALLET';
export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'COD_PENDING'
  | 'COD_COLLECTED'
  | 'SETTLED';

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  unit: string;
  imageUrl?: string;
  weight?: number;
  weightUnit?: string;
  shippingEligible?: boolean;
}

export interface CustomerAddress {
  fullName?: string;
  phone?: string;
  street: string;
  villageTownCity?: string;
  district: string;
  state: string;
  pincode: string;
  landmark?: string;
}

export interface CourierDetails {
  provider?: string;
  awbNumber?: string;
  trackingUrl?: string;
  packageWeightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  readyToShipAt?: string;
  shippedAt?: string;
  handoverConfirmed?: boolean;
}

export interface AssignedDeliveryPartner {
  id: string;
  name: string;
  phone: string;
  assignedAt?: string;
  status?: string;
}

export interface Order {
  id: string;
  orderNumber?: string;
  partnerId: string;
  storeName?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: CustomerAddress;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  packagingCharge: number;
  discount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderType: 'LOCAL_DELIVERY' | 'COURIER_SHIPPING';
  localAreaId?: string;
  localAreaName?: string;
  orderStatus: OrderStatus;
  shippingStatus?: ShippingStatus;
  rejectionReason?: string;
  assignedDeliveryPartner?: AssignedDeliveryPartner;
  courierDetails?: CourierDetails;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  readyAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

export interface NotificationItem {
  id: string;
  partnerId: string;
  recipientUserId?: string;
  recipientPartnerId?: string;
  storeId?: string;
  title: string;
  message: string;
  type:
    | 'NEW_ORDER'
    | 'ORDER_ACCEPTED'
    | 'ORDER_REJECTED'
    | 'CUSTOMER_CANCELLED'
    | 'ORDER_CANCELLED'
    | 'DELIVERY_ASSIGNED'
    | 'DELIVERY_ACCEPTED'
    | 'DELIVERY_PICKED_UP'
    | 'PICKUP_UPDATE'
    | 'PAYMENT_UPDATE'
    | 'COD_UPDATE'
    | 'REFUND_UPDATE'
    | 'ADMIN_MESSAGE'
    | 'ADMIN_ANNOUNCEMENT'
    | 'PRODUCT_UPDATE'
    | 'STORE_STATUS_UPDATE'
    | 'ACCOUNT_STATUS_UPDATE'
    | 'STATUS_CHANGE';
  read: boolean;
  isRead?: boolean;
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
  itemSummary?: string;
  totalAmount?: number;
  paymentMethod?: string;
  createdAt: string;
  updatedAt?: string;
}

export type PayoutRequestStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PROCESSING'
  | 'PAID';

export interface PayoutRequest {
  id: string;
  partnerId: string;
  partnerName: string;
  shopName: string;
  amount: number;
  upiId?: string;
  bankDetails?: BankAccountDetails;
  status: PayoutRequestStatus;
  requestDate: string;
  processedDate?: string;
  adminNote?: string;
  paymentReference?: string;
}

export interface DeliveryPartnerCandidate {
  id: string;
  fullName: string;
  mobileNumber: string;
  isOnline: boolean;
  status: string;
  currentActiveDeliveries?: number;
  vehicleType?: string;
  distanceKm?: number;
}

export interface ServiceArea {
  id: string;
  areaId: string;
  areaName: string;
  name?: string;
  city: string;
  district: string;
  state: string;
  pinCodes: string[];
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  enabled: boolean;
  status?: string;
  notes?: string;
  deliveryAvailable: boolean;
  shippingAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AreaChangeRequest {
  id: string;
  partnerId: string;
  partnerName: string;
  shopName: string;
  currentAreaId: string;
  currentAreaName: string;
  requestedAreaId: string;
  requestedAreaName: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  reviewedAt?: string;
  adminRemarks?: string;
}

export interface GlobalCategoryConfig {
  id?: string;
  disabledCategoryIds: string[]; // List of category IDs disabled globally by Admin
  updatedAt?: string;
  updatedBy?: string;
}

