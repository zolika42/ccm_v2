/**
 * @fileoverview Small fixture-backed API for UI parity docs and screenshot generation.
 */
import type {
  ApiEnvelope,
  ApiMeta,
  AuthUser,
  PasswordRecoveryPolicy,
  PasswordResetPayload,
  ProfileUpdatePayload,
  RegistrationPayload,
  Cart,
  CatalogCategory,
  CheckoutDraft,
  CheckoutState,
  LibraryState,
  Product,
  WishlistState,
} from '../types';

const USER: AuthUser = {
  customerId: 1042,
  email: 'fixture-library@example.invalid',
  name: 'Alex Fixture',
  points: 180,
};

const PRODUCTS: Product[] = [
  {
    productId: 'CG-ATLAS',
    description: 'Atlas Carrier Fleet',
    price: '$59.99',
    category: 'Miniatures',
    subCategory: 'Space Fleets',
    subCategory2: 'Carriers',
    extendedDescription: 'Flagship starter fleet with capital ships, escorts, and printable campaign reference sheets.',
    specs: 'Scale: 1/3780\nMaterial: Resin + card components\nPlayers: 2+',
    resources: 'Rulebook PDF\nShip cards\nScenario sheet',
    isDownloadable: false,
    releaseDate: '2025-11-04',
    status: 'Active',
  },
  {
    productId: 'CG-NEBULA',
    description: 'Nebula Border Wars PDF',
    price: '$19.99',
    category: 'Rulebooks',
    subCategory: 'Digital Editions',
    subCategory2: 'Campaign Books',
    extendedDescription: 'Fully searchable PDF campaign book for fast access during play.',
    specs: 'Format: PDF\nPages: 128',
    resources: 'Digital download\nErrata sheet',
    isDownloadable: true,
    downloadableFilename: 'nebula-border-wars.pdf',
    releaseDate: '2026-01-15',
    status: 'Active',
    thirdParty: {
      sourceId: 9001,
      thirdPartyId: 'BGG-NEBULA',
      thumbnail: 'https://picsum.photos/seed/nebula-thumb/240/180',
      image: 'https://picsum.photos/seed/nebula/800/600',
      rating: '7.8',
      description: 'Mirrored third-party catalog blurb used for PDP enrichment when legacy metadata exists.',
      status: 0,
      lastCheck: '1710508800',
      gallery: [
        { url: 'https://picsum.photos/seed/nebula-gallery-1/640/480', description: 'Cover art' },
        { url: 'https://picsum.photos/seed/nebula-gallery-2/640/480', description: 'Interior spread' },
      ],
    },
  },
  {
    productId: 'CG-ORBIT',
    description: 'Orbit Siege Command Pack',
    price: '$34.50',
    category: 'Board Games',
    subCategory: 'Starter Sets',
    subCategory2: 'Intro Boxes',
    extendedDescription: 'Compact boxed starter intended for first-time players and demos.',
    specs: 'Play time: 45-60 minutes\nPlayers: 2',
    resources: 'Quickstart booklet\nReference cards',
    isDownloadable: false,
    releaseDate: '2025-08-09',
    status: 'Active',
    preorder: 1,
  },
];

const CATEGORIES: CatalogCategory[] = [
  {
    name: 'Miniatures',
    productCount: 1,
    subCategories: [{ name: 'Space Fleets', productCount: 1, subCategory2s: [{ name: 'Carriers', productCount: 1 }] }],
  },
  {
    name: 'Rulebooks',
    productCount: 1,
    subCategories: [{ name: 'Digital Editions', productCount: 1, subCategory2s: [{ name: 'Campaign Books', productCount: 1 }] }],
  },
  {
    name: 'Board Games',
    productCount: 1,
    subCategories: [{ name: 'Starter Sets', productCount: 1, subCategory2s: [{ name: 'Intro Boxes', productCount: 1 }] }],
  },
];

const CART: Cart = {
  browserId: 'fixture-browser-001',
  orderId: 'FIXTURE-ORDER-1001',
  storage: 'fixture-memory',
  items: [
    {
      productId: 'CG-ATLAS',
      description: 'Atlas Carrier Fleet',
      quantity: 1,
      unitPrice: 59.99,
      unitPriceFormatted: '59.99',
      lineSubtotal: 59.99,
      lineSubtotalFormatted: '59.99',
      category: 'Miniatures',
      subCategory: 'Space Fleets',
      isDownloadable: false,
      status: 'Active',
    },
    {
      productId: 'CG-NEBULA',
      description: 'Nebula Border Wars PDF',
      quantity: 2,
      unitPrice: 19.99,
      unitPriceFormatted: '19.99',
      lineSubtotal: 39.98,
      lineSubtotalFormatted: '39.98',
      category: 'Rulebooks',
      subCategory: 'Digital Editions',
      isDownloadable: true,
      status: 'Active',
    },
  ],
  summary: {
    itemCount: 3,
    uniqueItemCount: 2,
    subtotal: 99.97,
    subtotalFormatted: '99.97',
    currency: 'USD',
    hasItems: true,
    storage: 'fixture-memory',
    totalItemsRequiringPayment: 2,
    downloadableItemCount: 2,
    shippableSubtotal: 59.99,
    shippableSubtotalFormatted: '59.99',
  },
};

const FIXTURE_WISHLIST_SEED: WishlistState = {
  customerId: USER.customerId,
  customerEmail: USER.email,
  customerName: USER.name,
  items: [
    {
      productId: 'CG-ATLAS',
      description: 'Atlas Carrier Fleet',
      quantity: 2,
      price: '$59.99',
      category: 'Miniatures',
      subCategory: 'Space Fleets',
      subCategory2: 'Carriers',
      status: 'Active',
      isDownloadable: false,
      preorder: null,
      releaseDate: '2025-11-04',
    },
    {
      productId: 'CG-ORBIT',
      description: 'Orbit Siege Command Pack',
      quantity: 1,
      price: '$34.50',
      category: 'Board Games',
      subCategory: 'Starter Sets',
      subCategory2: 'Intro Boxes',
      status: 'Active',
      isDownloadable: false,
      preorder: 1,
      releaseDate: '2025-08-09',
    },
  ],
  meta: {
    count: 2,
    totalQuantity: 3,
    downloadableCount: 0,
    hasItems: true,
    categories: ['Miniatures', 'Board Games'],
    legacyRelation: 'Fixture mirrors real_wishlists keyed by authenticated customer id.',
  },
};

let fixtureWishlistState: WishlistState = clone(FIXTURE_WISHLIST_SEED);

function rebuildWishlistMeta(state: WishlistState) {
  state.meta.count = state.items.length;
  state.meta.totalQuantity = state.items.reduce((sum, item) => sum + item.quantity, 0);
  state.meta.downloadableCount = state.items.filter((item) => item.isDownloadable).length;
  state.meta.hasItems = state.items.length > 0;
  state.meta.categories = Array.from(new Set(state.items.map((item) => item.category).filter(Boolean)));
}

const DRAFT: CheckoutDraft = {
  shipName: 'Alex Fixture',
  shipEmail: 'fixture-library@example.invalid',
  shipPhone: '555-0104',
  shipStreet: '101 Demo Street',
  shipStreet2: '',
  shipCity: 'Hudson',
  shipState: 'NY',
  shipZip: '10001',
  shipCountry: 'US',
  billName: 'Alex Fixture',
  billStreet: '101 Demo Street',
  billStreet2: '',
  billCity: 'Hudson',
  billState: 'NY',
  billZip: '10001',
  billCountry: 'US',
  shipMethod: 'UPS Ground',
  paymentType: '',
  payCardName: '',
  payCardMonth: '',
  payCardYear: '',
  payCardLast4: '4242',
  payCardNumber: '',
  promoCode: 'SPRING',
  pointsApplied: 25,
  euChoice: '',
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function scenario() {
  if (typeof window === 'undefined') return 'shopper';
  return new URLSearchParams(window.location.search).get('mockScenario') ?? 'shopper';
}

function signedIn() {
  return scenario() !== 'guest';
}

function meta(path: string): ApiMeta {
  return {
    requestId: `fixture-${path.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
    method: 'GET',
    path,
    durationMs: 1,
    identity: {
      browserId: CART.browserId,
      cookieName: 'ccm_browser_id',
      storage: CART.storage,
      legacyMirror: true,
    },
  };
}

function ok<T>(path: string, data: T): ApiEnvelope<T> {
  return { ok: true, data, meta: meta(path) };
}

function unauthorized<T>(path: string) {
  return {
    ok: false,
    data: null as unknown as T,
    meta: meta(path),
    error: { code: 'unauthorized', message: 'Not authenticated.', details: {} },
  };
}

function checkoutState(): CheckoutState {
  return {
    orderId: 'FIXTURE-ORDER-1001',
    cart: clone(CART),
    customer: signedIn()
      ? {
          customerId: USER.customerId,
          email: USER.email,
          name: USER.name,
          shipPhone: DRAFT.shipPhone,
          shipStreet: DRAFT.shipStreet,
          shipStreet2: DRAFT.shipStreet2,
          shipCity: DRAFT.shipCity,
          shipState: DRAFT.shipState,
          shipZip: DRAFT.shipZip,
          shipCountry: DRAFT.shipCountry,
          billName: DRAFT.billName,
          billStreet: DRAFT.billStreet,
          billStreet2: DRAFT.billStreet2,
          billCity: DRAFT.billCity,
          billState: DRAFT.billState,
          billZip: DRAFT.billZip,
          billCountry: DRAFT.billCountry,
          payCardType: DRAFT.paymentType,
          payCardMonth: DRAFT.payCardMonth,
          payCardYear: DRAFT.payCardYear,
          payCardName: DRAFT.payCardName,
          payCardLast4: DRAFT.payCardLast4,
          points: USER.points,
        }
      : null,
    draft: clone(DRAFT),
    requirements: {
      requiresLogin: true,
      guestCheckoutAllowed: false,
      policy: 'login-required',
      policyReason: 'legacy_submit_requires_customer_id',
      shippingRequired: true,
      paymentRequired: true,
      availablePaymentTypes: ['visa', 'mastercard', 'paypal'],
      maxPointsApplicable: USER.points,
    },
    validation: {
      isValid: false,
      errors: {
        paymentType: ['Choose a payment type for paid orders.'],
      },
    },
    paymentConfig: {
      enabled: true,
      merchantId: 'fixture-merchant',
      configId: 'fixture-config',
      testMode: 1,
      authMode: 1,
      vendor: 'payflowpro',
      partner: 'paypal',
      userId: 'fixture-user',
      streetField: 'street',
      zipField: 'zip',
      cardNumberField: 'cardNumber',
      cardExpireMonthField: 'cardMonth',
      cardExpireYearField: 'cardYear',
      cardAmountField: 'amount',
      resultCodeField: 'result',
      responseMessageField: 'response',
      referenceCodeField: 'pnref',
    },
    legacy: {
      orderFieldCount: 34,
      browserStateFieldCount: 7,
      storage: 'fixture-memory',
    },
  };
}

export async function login(email: string, _password?: string, rememberMe = false) {
  return ok('/auth/login', { user: { ...USER, email: email || USER.email, authPersistence: rememberMe ? 'remembered-session' : 'session', browserId: CART.browserId } });
}

export async function register(payload: RegistrationPayload) {
  return ok('/auth/register', { user: { ...USER, ...payload, email: payload.email || USER.email, name: payload.name || USER.name, authPersistence: payload.rememberMe ? 'remembered-session' : 'session', browserId: CART.browserId } });
}


export async function updateProfile(payload: ProfileUpdatePayload) {
  return ok('/auth/profile', { user: { ...USER, ...payload, authPersistence: 'session', browserId: CART.browserId } });
}

export async function resetPassword(_payload: PasswordResetPayload) {
  return ok('/auth/password/reset', { changed: true, recoveryPolicy: { legacyForgotPasswordAvailable: false, emailDependencyVerified: false, implementedPath: 'authenticated-password-reset' } });
}

export async function getPasswordRecoveryPolicy() {
  const policy: PasswordRecoveryPolicy = {
    legacyForgotPasswordAvailable: false,
    emailDependencyVerified: false,
    passwordStorage: 'legacy-plaintext-column-customer_password',
    implementedPath: 'authenticated-password-reset',
    notes: [
      'Fixture API mirrors the rewrite decision: no email-based recovery without verified legacy evidence.',
      'Logged-in password rotation remains available.',
    ],
  };
  return ok('/auth/password/recovery-policy', { policy });
}

export async function me() {
  if (!signedIn()) throw new Error('Not authenticated.');
  return ok('/auth/me', { user: clone(USER) });
}

export async function logout() {
  return ok('/auth/logout', { loggedOut: true });
}

export async function getCatalogCategories() {
  return ok('/catalog/categories', {
    categories: clone(CATEGORIES),
    meta: { categoryCount: CATEGORIES.length, subCategoryCount: 3, subCategory2Count: 3 },
  });
}

function enrichFixtureProduct(product: Product): Product {
  const base = clone(product);
  if (!signedIn()) {
    base.customerCatalogState = null;
    base.customerOwnedQuantity = null;
    return base;
  }

  if (base.productId === 'CG-NEBULA') {
    base.customerCatalogState = 'owned';
    base.customerOwnedQuantity = 1;
  }

  if (base.productId === 'CG-ORBIT') {
    base.customerCatalogState = 'preordered';
    base.customerOwnedQuantity = 1;
  }

  return base;
}

export async function listProducts(params: { limit?: number; offset?: number; q?: string; category?: string; sub_category?: string; sub_category2?: string } = {}) {
  const q = (params.q ?? '').toLowerCase();
  const category = (params.category ?? '').toLowerCase();
  const subCategory = (params.sub_category ?? '').toLowerCase();
  const subCategory2 = (params.sub_category2 ?? '').toLowerCase();
  const filtered = PRODUCTS.filter((product) => {
    const matchesQ = !q || `${product.productId} ${product.description} ${product.category} ${product.subCategory} ${product.subCategory2 ?? ''}`.toLowerCase().includes(q);
    const matchesCategory = !category || product.category.toLowerCase() === category;
    const matchesSub = !subCategory || product.subCategory.toLowerCase() === subCategory;
    const matchesSub2 = !subCategory2 || (product.subCategory2 ?? '').toLowerCase() === subCategory2;
    return matchesQ && matchesCategory && matchesSub && matchesSub2;
  });
  return ok('/catalog/products', {
    items: filtered.map(enrichFixtureProduct),
    meta: { total: filtered.length, limit: params.limit ?? 30, offset: params.offset ?? 0 },
  });
}

export async function getProduct(productId: string) {
  return ok(`/catalog/products/${productId}`, enrichFixtureProduct(PRODUCTS.find((item) => item.productId === productId) ?? PRODUCTS[0]));
}

export async function getRelated(productId: string) {
  const current = PRODUCTS.find((item) => item.productId === productId) ?? PRODUCTS[0];
  return ok(`/catalog/products/${productId}/related`, PRODUCTS.filter((item) => item.productId !== current.productId && item.category === current.category).map(enrichFixtureProduct));
}

export async function getCartIdentity() {
  return ok('/cart/identity', meta('/cart/identity').identity!);
}

export async function getCart() {
  return ok('/cart', clone(CART));
}

export async function getCartSummary() {
  return ok('/cart/summary', clone(CART.summary));
}

export async function addCartItem(_productId: string, _quantity = 1) {
  return ok('/cart/items', clone(CART));
}

export async function updateCartItem(_productId: string, _quantity: number) {
  return ok('/cart/items/update', clone(CART));
}

export async function removeCartItem(_productId: string) {
  return ok('/cart/items/remove', clone(CART));
}

export async function getCheckoutSummary() {
  return ok('/checkout/summary', checkoutState());
}

export async function validateCheckout(_draft: Partial<CheckoutDraft>) {
  return ok('/checkout/validate', checkoutState());
}

export async function submitCheckout(_draft: Partial<CheckoutDraft>) {
  if (!signedIn()) {
    return {
      ok: false,
      data: null as unknown as { checkout: CheckoutState; submission: null },
      meta: meta('/checkout/submit'),
      error: {
        code: 'unauthorized',
        message: 'Not authenticated.',
        details: {
          checkout: checkoutState(),
          submission: null,
        },
      },
    };
  }

  return ok('/checkout/submit', {
    checkout: { ...checkoutState(), cart: { ...clone(CART), items: [], summary: { ...clone(CART.summary), itemCount: 0, uniqueItemCount: 0, hasItems: false, subtotal: 0, subtotalFormatted: '0.00', downloadableItemCount: 0, shippableSubtotal: 0, shippableSubtotalFormatted: '0.00' } } },
    submission: {
      orderId: 'FIXTURE-SUBMIT-2001',
      customerId: USER.customerId,
      paymentType: 'visa',
      pointsApplied: 25,
      store: {
        customerId: USER.customerId,
        pointsBefore: 180,
        pointsAfter: 155,
        recordedItemCount: 2,
        recordedItems: [
          { productId: 'CG-ATLAS', quantity: 1 },
          { productId: 'CG-NEBULA', quantity: 2 },
        ],
      },
      legacyOrder: {
        orderId: 'FIXTURE-SUBMIT-2001',
        browserId: CART.browserId,
        storage: CART.storage,
        quantities: { 'CG-ATLAS': 1, 'CG-NEBULA': 2 },
        summary: {
          paidLineCount: 2,
          discountableTotal: 99.97,
          downloadableSubtotal: 39.98,
          shippableSubtotal: 59.99,
          totalItemCount: 3,
          uniqueItemCount: 2,
          downloadableItemCount: 2,
          nonDownloadableItemCount: 1,
        },
        legacyContext: { merchantId: 'cg', configId: 'default' },
      },
      wishlist: {
        trigger: 'post_purchase_sync',
        beforeCount: 2,
        afterCount: 1,
        updatedItems: [
          { productId: 'CG-ATLAS', beforeQuantity: 2, purchasedQuantity: 1, afterQuantity: 1, action: 'decremented' },
        ],
        removedProductIds: [],
      },
      postSubmitCart: { ...clone(CART), items: [], summary: { ...clone(CART.summary), itemCount: 0, uniqueItemCount: 0, hasItems: false, subtotal: 0, subtotalFormatted: '0.00', downloadableItemCount: 0, shippableSubtotal: 0, shippableSubtotalFormatted: '0.00' } },
    },
  });
}

export async function getWishlist() {
  if (!signedIn()) return unauthorized<WishlistState>('/wishlist');
  return ok('/wishlist', clone(fixtureWishlistState));
}

export async function addWishlistItem(productId: string, quantity = 1) {
  if (!signedIn()) return unauthorized<WishlistState>('/wishlist/items');
  const current = clone(fixtureWishlistState);
  const existing = current.items.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    const product = PRODUCTS.find((item) => item.productId === productId) ?? PRODUCTS[0];
    current.items.push({
      productId: product.productId,
      description: product.description,
      quantity,
      price: product.price,
      category: product.category,
      subCategory: product.subCategory,
      subCategory2: product.subCategory2,
      status: product.status,
      isDownloadable: product.isDownloadable,
      downloadableFilename: product.downloadableFilename,
      preorder: product.preorder ?? null,
      releaseDate: product.releaseDate,
    });
  }
  rebuildWishlistMeta(current);
  current.lastMutation = { action: 'add', productId, quantity };
  fixtureWishlistState = clone(current);
  return ok('/wishlist/items', current);
}

export async function replaceWishlistItem(productId: string, quantity: number) {
  if (!signedIn()) return unauthorized<WishlistState>(`/wishlist/items/${productId}`);
  const current = clone(fixtureWishlistState);
  const existing = current.items.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity = quantity;
  }
  current.items = current.items.filter((item) => item.quantity > 0);
  rebuildWishlistMeta(current);
  current.lastMutation = { action: 'replace', productId, quantity };
  fixtureWishlistState = clone(current);
  return ok(`/wishlist/items/${productId}`, current);
}

export async function removeWishlistItem(productId: string) {
  if (!signedIn()) return unauthorized<WishlistState>(`/wishlist/items/${productId}`);
  const current = clone(fixtureWishlistState);
  current.items = current.items.filter((item) => item.productId !== productId);
  rebuildWishlistMeta(current);
  current.lastMutation = { action: 'remove', productId, quantity: 0 };
  fixtureWishlistState = clone(current);
  return ok(`/wishlist/items/${productId}`, current);
}

export async function getLibrary() {
  if (!signedIn()) return unauthorized<LibraryState>('/library');
  return ok('/library', {
    customerId: USER.customerId,
    items: [
      {
        productId: 'CG-NEBULA',
        description: 'Nebula Border Wars PDF',
        quantity: 1,
        price: '$19.99',
        category: 'Rulebooks',
        subCategory: 'Digital Editions',
        status: 'Owned',
        isDownloadable: true,
        downloadableFilename: 'nebula-border-wars.pdf',
        hasDownloadFile: true,
        releaseDate: '2026-01-15',
        preorder: null,
      },
    ],
    meta: { count: 1, hasItems: true, downloadableCount: 1 },
  });
}

export function getLibraryDownloadUrl(productId: string) {
  return `#fixture-download-${encodeURIComponent(productId)}`;
}
