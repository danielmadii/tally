export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "tally_locale";

/**
 * UI strings. English is the source; Arabic is what the shop floor reads, so
 * it is written in plain retail Arabic rather than literal translation.
 */
const en = {
  // shell / navigation
  home: "Home",
  sell: "Sell",
  mySales: "My sales",
  settings: "Settings",
  signOut: "Sign out",
  account: "Account",
  noShop: "No shop",
  dashboard: "Dashboard",
  shops: "Shops",
  products: "Products",
  team: "Team",
  approvals: "Approvals",
  reconcile: "Reconcile",
  overview: "Overview",
  manage: "Manage",
  operations: "Operations",
  system: "System",
  collapseMenu: "Collapse menu",
  expandMenu: "Expand menu",
  notifications: "Notifications",
  allClear: "All clear — nothing needs you.",
  voidRequestsPending: "void requests",
  voidRequestPending: "void request",
  awaitingApproval: "awaiting approval",
  lowStockItems: "items",
  lowStockItem: "item",
  atOrBelowReorder: "at or below reorder point",

  // login
  signInTitle: "Sign in to Tally",
  signInSubtitle: "Sales attribution & stock",
  phoneNumber: "Phone number",
  phonePlaceholder: "07xx xxx xxxx",
  pin: "PIN",
  keepSignedIn: "Keep me signed in for 30 days",
  signIn: "Sign in",
  signingIn: "Signing in…",
  wrongCredentials: "Wrong phone number or PIN",
  networkProblem: "Network problem — try again",
  forgotPin: "Forgot your PIN? Your supervisor can issue a new one.",

  // home
  greeting: "Hi",
  daySoFar: "Here’s your day so far",
  today: "Today",
  units: "Units",
  shopRank: "Shop rank",
  ofMonthlyTarget: "of monthly target",
  thisMonth: "this month",
  noTargetSet: "No target set for this month yet",
  sellButton: "SELL",

  // sell
  scan: "Scan",
  search: "Search",
  searchPlaceholder: "Name, brand, shade, SKU…",
  recentlySold: "Recently sold",
  allProducts: "All products",
  nothingFound: "Nothing found — check the spelling or ask your supervisor to add it.",
  basket: "Basket",
  item: "item",
  items: "items",
  total: "Total",
  confirm: "CONFIRM",
  recording: "Recording…",
  inStock: "in stock",
  left: "left",
  added: "Added",
  unknownBarcode: "Unknown barcode",
  useSearch: "use search",
  cameraBlocked:
    "Camera access is blocked. Allow it in your browser settings, or use Search instead.",
  cameraFailed: "The camera could not be started on this device. Use Search instead.",
  soldBy: "Sold by",
  itCounted: "It counted for you",
  nextSale: "Next sale",
  sale: "Sale",
  couldNotRecord: "Could not record the sale",
  saleNotRecorded: "Network problem — the sale was NOT recorded. Try again.",

  // my sales
  thisMonthTab: "This month",
  todayTab: "Today",
  salesCount: "sales",
  noSalesYet: "No sales yet — go sell!",
  loading: "Loading…",
  requestVoid: "Request void",
  voidRequested: "void requested",
  whyVoid: "Why void this sale?",
  supervisorWillReview: "Your supervisor will review and approve the void.",
  reasonWrongItem: "Wrong item",
  reasonWrongQuantity: "Wrong quantity",
  reasonChangedMind: "Customer changed mind",
  reasonWrongPerson: "Entered under wrong person",
  reasonPriceError: "Price error",

  // settings
  name: "Name",
  shop: "Shop",
  changePin: "Change PIN",
  currentPin: "Current PIN",
  newPin: "New PIN",
  repeatNewPin: "Repeat new PIN",
  saving: "Saving…",
  pinChanged: "PIN changed — use it next time you sign in.",
  pinsDoNotMatch: "The two new PINs do not match.",
  couldNotChangePin: "Could not change your PIN",
  language: "Language",
  english: "English",
  arabic: "العربية",

  // closed shop
  shopClosedTitle: "Selling is closed",
  shopClosedBody:
    "Your shop is not active right now, so sales cannot be recorded. Ask your supervisor or administrator.",
} as const;

const ar: Record<keyof typeof en, string> = {
  // shell / navigation
  home: "الرئيسية",
  sell: "بيع",
  mySales: "مبيعاتي",
  settings: "الإعدادات",
  signOut: "تسجيل الخروج",
  account: "الحساب",
  noShop: "بدون محل",
  dashboard: "لوحة المعلومات",
  shops: "المحلات",
  products: "المنتجات",
  team: "الفريق",
  approvals: "الموافقات",
  reconcile: "المطابقة",
  overview: "نظرة عامة",
  manage: "الإدارة",
  operations: "العمليات",
  system: "النظام",
  collapseMenu: "طي القائمة",
  expandMenu: "توسيع القائمة",
  notifications: "الإشعارات",
  allClear: "لا يوجد ما يحتاج انتباهك.",
  voidRequestsPending: "طلبات إلغاء",
  voidRequestPending: "طلب إلغاء",
  awaitingApproval: "بانتظار الموافقة",
  lowStockItems: "أصناف",
  lowStockItem: "صنف",
  atOrBelowReorder: "عند حد إعادة الطلب أو أقل",

  // login
  signInTitle: "تسجيل الدخول إلى Tally",
  signInSubtitle: "تسجيل المبيعات والمخزون",
  phoneNumber: "رقم الهاتف",
  phonePlaceholder: "07xx xxx xxxx",
  pin: "الرمز السري",
  keepSignedIn: "إبقائي مسجلاً لمدة 30 يوماً",
  signIn: "تسجيل الدخول",
  signingIn: "جارٍ تسجيل الدخول…",
  wrongCredentials: "رقم الهاتف أو الرمز السري غير صحيح",
  networkProblem: "مشكلة في الاتصال — حاولي مرة أخرى",
  forgotPin: "نسيتِ الرمز السري؟ يمكن لمشرفتك إصدار رمز جديد.",

  // home
  greeting: "أهلاً",
  daySoFar: "هذه حصيلة يومك حتى الآن",
  today: "اليوم",
  units: "القطع",
  shopRank: "ترتيبك بالمحل",
  ofMonthlyTarget: "من هدف الشهر",
  thisMonth: "هذا الشهر",
  noTargetSet: "لم يتم تحديد هدف لهذا الشهر بعد",
  sellButton: "بيع",

  // sell
  scan: "مسح",
  search: "بحث",
  searchPlaceholder: "الاسم، الماركة، الدرجة، الرمز…",
  recentlySold: "المباعة مؤخراً",
  allProducts: "كل المنتجات",
  nothingFound: "لا توجد نتائج — تحققي من الكتابة أو اطلبي من مشرفتك إضافته.",
  basket: "السلة",
  item: "صنف",
  items: "أصناف",
  total: "المجموع",
  confirm: "تأكيد",
  recording: "جارٍ التسجيل…",
  inStock: "بالمخزون",
  left: "متبقي",
  added: "تمت إضافة",
  unknownBarcode: "باركود غير معروف",
  useSearch: "استخدمي البحث",
  cameraBlocked: "الكاميرا محظورة. اسمحي بالوصول من إعدادات المتصفح أو استخدمي البحث.",
  cameraFailed: "تعذّر تشغيل الكاميرا على هذا الجهاز. استخدمي البحث بدلاً منها.",
  soldBy: "بواسطة",
  itCounted: "تم احتسابها لكِ",
  nextSale: "بيعة جديدة",
  sale: "فاتورة",
  couldNotRecord: "تعذّر تسجيل البيعة",
  saleNotRecorded: "مشكلة في الاتصال — لم يتم تسجيل البيعة. حاولي مرة أخرى.",

  // my sales
  thisMonthTab: "هذا الشهر",
  todayTab: "اليوم",
  salesCount: "بيعات",
  noSalesYet: "لا توجد مبيعات بعد — بالتوفيق!",
  loading: "جارٍ التحميل…",
  requestVoid: "طلب إلغاء",
  voidRequested: "طلب إلغاء مُرسل",
  whyVoid: "سبب إلغاء هذه البيعة؟",
  supervisorWillReview: "ستقوم مشرفتك بمراجعة الطلب والموافقة عليه.",
  reasonWrongItem: "صنف خاطئ",
  reasonWrongQuantity: "كمية خاطئة",
  reasonChangedMind: "الزبونة غيّرت رأيها",
  reasonWrongPerson: "سُجّلت باسم شخص آخر",
  reasonPriceError: "خطأ في السعر",

  // settings
  name: "الاسم",
  shop: "المحل",
  changePin: "تغيير الرمز السري",
  currentPin: "الرمز الحالي",
  newPin: "الرمز الجديد",
  repeatNewPin: "تأكيد الرمز الجديد",
  saving: "جارٍ الحفظ…",
  pinChanged: "تم تغيير الرمز — استخدميه في المرة القادمة.",
  pinsDoNotMatch: "الرمزان الجديدان غير متطابقين.",
  couldNotChangePin: "تعذّر تغيير الرمز السري",
  language: "اللغة",
  english: "English",
  arabic: "العربية",

  // closed shop
  shopClosedTitle: "البيع متوقف",
  shopClosedBody: "محلك غير مفعّل حالياً، لذلك لا يمكن تسجيل المبيعات. راجعي المشرفة أو الإدارة.",
};

export type TranslationKey = keyof typeof en;

export const dictionaries: Record<Locale, Record<TranslationKey, string>> = { en, ar };

export function translate(locale: Locale, key: TranslationKey): string {
  return dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key;
}

export const isRtl = (locale: Locale) => locale === "ar";
