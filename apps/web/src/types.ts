/**
 * @fileoverview Shared TypeScript domain types used across frontend pages and API clients.
 */
export type AuthUser = {
  customerId: number;
  email: string;
  name: string;
  points: number;
  shipPhone?: string;
  shipStreet?: string;
  shipStreet2?: string;
  shipCity?: string;
  shipState?: string;
  shipZip?: string;
  shipCountry?: string;
  billName?: string;
  billStreet?: string;
  billStreet2?: string;
  billCity?: string;
  billState?: string;
  billZip?: string;
  billCountry?: string;
  payCardType?: string;
  payCardMonth?: string;
  payCardYear?: string;
  payCardName?: string;
  payCardLast4?: string;
  authPersistence?: string;
  browserId?: string | null;
};

export type RegistrationPayload = {
  email: string;
  name?: string;
  password: string;
  rememberMe?: boolean;
  shipPhone?: string;
  shipStreet?: string;
  shipStreet2?: string;
  shipCity?: string;
  shipState?: string;
  shipZip?: string;
  shipCountry?: string;
  billName?: string;
  billStreet?: string;
  billStreet2?: string;
  billCity?: string;
  billState?: string;
  billZip?: string;
  billCountry?: string;
};

export type ProfileUpdatePayload = {
  email: string;
  name?: string;
  shipPhone?: string;
  shipStreet?: string;
  shipStreet2?: string;
  shipCity?: string;
  shipState?: string;
  shipZip?: string;
  shipCountry?: string;
  billName?: string;
  billStreet?: string;
  billStreet2?: string;
  billCity?: string;
  billState?: string;
  billZip?: string;
  billCountry?: string;
  payCardType?: string;
  payCardMonth?: string;
  payCardYear?: string;
  payCardName?: string;
  payCardLast4?: string;
};

export type PasswordResetPayload = {
  currentPassword: string;
  newPassword: string;
};

export type PasswordRecoveryPolicy = {
  legacyForgotPasswordAvailable: boolean;
  emailDependencyVerified: boolean;
  passwordStorage: string;
  implementedPath: string;
  notes: string[];
};

export type CatalogSubCategory2 = {
  name: string;
  productCount: number;
};

export type CatalogSubCategory = {
  name: string;
  productCount: number;
  subCategory2s?: CatalogSubCategory2[];
};

export type CatalogCategory = {
  name: string;
  productCount: number;
  subCategories: CatalogSubCategory[];
};

export type CustomerCatalogState = 'owned' | 'preordered';

export type ThirdPartyImage = {
  url: string;
  description: string;
};

export type ThirdPartyProductMeta = {
  sourceId?: number | null;
  thirdPartyId?: string | null;
  thumbnail?: string;
  image?: string;
  rating?: string | null;
  description?: string;
  status?: number | null;
  lastCheck?: string | null;
  gallery?: ThirdPartyImage[];
};

export type Product = {
  productId: string;
  description: string;
  price: string;
  category: string;
  subCategory: string;
  subCategory2?: string;
  customerCatalogState?: CustomerCatalogState | null;
  customerOwnedQuantity?: number | null;
  thirdParty?: ThirdPartyProductMeta | null;
  image?: string;
  image2?: string;
  image3?: string;
  image4?: string;
  extendedDescription?: string;
  specs?: string;
  resources?: string;
  status?: string;
  isDownloadable: boolean;
  downloadableFilename?: string;
  freebie?: boolean;
  releaseDate?: string;
  preorder?: number | null;
  header?: string;
  notes?: string;
  captions?: string[];
};

export type CartIdentity = {
  browserId: string;
  cookieName: string;
  storage: string;
  legacyMirror: boolean;
};

export type CartItem = {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unitPriceFormatted: string;
  lineSubtotal: number;
  lineSubtotalFormatted: string;
  category: string;
  subCategory: string;
  isDownloadable: boolean;
  status?: string;
};

export type CartSummary = {
  itemCount: number;
  uniqueItemCount: number;
  subtotal: number;
  subtotalFormatted: string;
  currency: string;
  hasItems: boolean;
  storage: string;
  totalItemsRequiringPayment?: number;
  downloadableItemCount?: number;
  shippableSubtotal?: number;
  shippableSubtotalFormatted?: string;
};

export type Cart = {
  browserId: string;
  orderId?: string | number | null;
  storage: string;
  items: CartItem[];
  summary: CartSummary;
};

export type CheckoutCustomer = {
  customerId: number;
  email: string;
  name: string;
  shipPhone?: string;
  shipStreet?: string;
  shipStreet2?: string;
  shipCity?: string;
  shipState?: string;
  shipZip?: string;
  shipCountry?: string;
  billName?: string;
  billStreet?: string;
  billStreet2?: string;
  billCity?: string;
  billState?: string;
  billZip?: string;
  billCountry?: string;
  payCardType?: string;
  payCardMonth?: string;
  payCardYear?: string;
  payCardName?: string;
  payCardLast4?: string;
  points: number;
};

export type CheckoutDraft = {
  shipName: string;
  shipEmail: string;
  shipPhone: string;
  shipStreet: string;
  shipStreet2: string;
  shipCity: string;
  shipState: string;
  shipZip: string;
  shipCountry: string;
  billName: string;
  billStreet: string;
  billStreet2: string;
  billCity: string;
  billState: string;
  billZip: string;
  billCountry: string;
  shipMethod: string;
  paymentType: string;
  payCardName: string;
  payCardMonth: string;
  payCardYear: string;
  payCardLast4: string;
  payCardNumber: string;
  promoCode: string;
  pointsApplied: number;
  euChoice: string;
};

export type CheckoutRequirements = {
  requiresLogin: boolean;
  guestCheckoutAllowed: boolean;
  policy: string;
  policyReason: string;
  shippingRequired: boolean;
  paymentRequired: boolean;
  availablePaymentTypes: string[];
  maxPointsApplicable: number;
};

export type CheckoutValidation = {
  isValid: boolean;
  errors: Record<string, string[]>;
};

export type CheckoutPaymentConfig = {
  enabled: boolean;
  merchantId: string;
  configId: string;
  testMode?: number | null;
  authMode?: number | null;
  vendor?: string;
  partner?: string;
  userId?: string;
  streetField?: string;
  zipField?: string;
  cardNumberField?: string;
  cardExpireMonthField?: string;
  cardExpireYearField?: string;
  cardAmountField?: string;
  resultCodeField?: string;
  responseMessageField?: string;
  referenceCodeField?: string;
};

export type CheckoutState = {
  orderId?: string | null;
  cart: Cart;
  customer: CheckoutCustomer | null;
  draft: CheckoutDraft;
  requirements: CheckoutRequirements;
  validation: CheckoutValidation;
  paymentConfig: CheckoutPaymentConfig;
  legacy: {
    orderFieldCount: number;
    browserStateFieldCount: number;
    storage: string;
  };
};


export type WishlistItem = {
  productId: string;
  description: string;
  quantity: number;
  price: string;
  category: string;
  subCategory: string;
  subCategory2?: string;
  image?: string;
  status?: string;
  isDownloadable: boolean;
  downloadableFilename?: string;
  preorder?: number | null;
  releaseDate?: string;
};

export type WishlistMutation = {
  action: 'add' | 'replace' | 'remove';
  productId: string;
  quantity: number;
  productDescription?: string;
};

export type WishlistPurchaseSyncItem = {
  productId: string;
  beforeQuantity: number;
  purchasedQuantity: number;
  afterQuantity: number;
  action: string;
};

export type WishlistPurchaseSync = {
  trigger: string;
  beforeCount: number;
  afterCount: number;
  updatedItems: WishlistPurchaseSyncItem[];
  removedProductIds: string[];
};

export type WishlistState = {
  customerId: number;
  customerEmail: string;
  customerName: string;
  items: WishlistItem[];
  meta: {
    count: number;
    totalQuantity: number;
    downloadableCount: number;
    hasItems: boolean;
    categories: string[];
    legacyRelation: string;
  };
  lastMutation?: WishlistMutation;
};

export type LibraryItem = {
  productId: string;
  description: string;
  quantity: number;
  price: string;
  category: string;
  subCategory: string;
  image?: string;
  status?: string;
  isDownloadable: boolean;
  downloadableFilename?: string;
  hasDownloadFile: boolean;
  releaseDate?: string;
  preorder?: number | null;
};

export type LibraryState = {
  customerId: number;
  items: LibraryItem[];
  meta: {
    count: number;
    hasItems: boolean;
    downloadableCount: number;
  };
};

export type CheckoutSubmission = {
  orderId: string;
  customerId: number;
  paymentType: string;
  pointsApplied: number;
  store: {
    customerId: number;
    pointsBefore: number;
    pointsAfter: number;
    recordedItemCount: number;
    recordedItems: Array<{ productId: string; quantity: number }>;
  };
  legacyOrder: {
    orderId: string;
    browserId: string;
    storage: string;
    quantities: Record<string, number>;
    summary: {
      paidLineCount: number;
      discountableTotal: number;
      downloadableSubtotal: number;
      shippableSubtotal: number;
      totalItemCount: number;
      uniqueItemCount: number;
      downloadableItemCount: number;
      nonDownloadableItemCount: number;
    };
    legacyContext: {
      merchantId: string;
      configId: string;
    };
  };
  wishlist: WishlistPurchaseSync;
  postSubmitCart: Cart;
};

export type CheckoutSubmitResponse = {
  ok: boolean;
  meta: ApiMeta;
  data: CheckoutState;
  submission: CheckoutSubmission | null;
};

export type ApiMeta = {
  requestId: string;
  method: string;
  path: string;
  durationMs: number;
  identity?: CartIdentity;
};

export type ApiError = {
  code: string;
  message: string;
  details: Record<string, unknown>;
};

export type ApiEnvelope<T> = {
  ok: boolean;
  data: T;
  meta: ApiMeta;
  error?: ApiError;
};
