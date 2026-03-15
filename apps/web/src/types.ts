export type AuthUser = {
  customerId: number;
  email: string;
  name: string;
  points: number;
};

export type Product = {
  productId: string;
  description: string;
  price: string;
  category: string;
  subCategory: string;
  subCategory2?: string;
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
