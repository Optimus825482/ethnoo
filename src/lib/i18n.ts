const LOCALE_KEY = "shuttlecall-locale";

export type SupportedLocale = "tr" | "en" | "de" | "ru" | "ar" | "es";

export interface LocaleDef {
  code: SupportedLocale;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const LOCALES: LocaleDef[] = [
  { code: "tr", label: "Türkçe", nativeLabel: "Türkçe", flag: "🇹🇷" },
  { code: "en", label: "English", nativeLabel: "English", flag: "🇬🇧" },
  { code: "de", label: "German", nativeLabel: "Deutsch", flag: "🇩🇪" },
  { code: "ru", label: "Russian", nativeLabel: "Русский", flag: "🇷🇺" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", flag: "🇸🇦" },
  { code: "es", label: "Spanish", nativeLabel: "Español", flag: "🇪🇸" },
];

const LOCALE_MAP = new Map(LOCALES.map((l) => [l.code, l]));

export type TranslationKeys =
  | "pageTitle"
  | "locationNotFound"
  | "loading"
  | "yourName"
  | "roomNumber"
  | "phone"
  | "phoneLabel"
  | "enterName"
  | "enterRoom"
  | "enterPhone"
  | "callShuttle"
  | "shuttleCall"
  | "callingShuttle"
  | "confirmTitle"
  | "confirmDescription"
  | "location"
  | "name"
  | "room"
  | "yesCall"
  | "cancel"
  | "statusReceived"
  | "statusSearching"
  | "statusEnRoute"
  | "statusCompleted"
  | "statusCancelled"
  | "driver"
  | "vehicle"
  | "driverLocation"
  | "waitTime"
  | "acceptedBy"
  | "requestNotFound"
  | "connectionError"
  | "requestNumber"
  | "notes"
  | "time";

type Translations = Record<SupportedLocale, Record<TranslationKeys, string>>;

const t: Translations = {
  tr: {
    pageTitle: "Shuttle Çağır",
    locationNotFound: "Konum bulunamadı.",
    loading: "Yükleniyor...",
    yourName: "Adınız",
    roomNumber: "Oda Numarası",
    phone: "Telefon",
    enterName: "Adınızı yazın",
    enterRoom: "Oda numaranızı yazın",
    enterPhone: "Telefon numaranızı yazın",
    callShuttle: "Shuttle Çağır",
    shuttleCall: "Shuttle çağrılıyor...",
    callingShuttle: "Shuttle çağrılıyor...",
    confirmTitle: "Shuttle Çağırmak İstiyor musunuz?",
    confirmDescription: "Talebinizi onaylayın",
    location: "Lokasyon",
    name: "Ad",
    room: "Oda",
    phoneLabel: "Telefon",
    yesCall: "Evet, Çağır",
    cancel: "İptal",
    statusReceived: "Talebiniz Alındı!",
    statusSearching: "Sürücü aranıyor...",
    statusEnRoute: "Aracınız yolda!",
    statusCompleted: "Yolculuk tamamlandı.",
    statusCancelled: "Talep iptal edildi.",
    driver: "Sürücü",
    vehicle: "Araç",
    driverLocation: "Konum",
    waitTime: "Bekleme Süresi",
    acceptedBy: "Kabul eden",
    requestNotFound: "Talep bulunamadı.",
    connectionError: "Bağlantı hatası",
    requestNumber: "Talep No",
    notes: "Not",
    time: "Saat",
  },
  en: {
    pageTitle: "Call Shuttle",
    locationNotFound: "Location not found.",
    loading: "Loading...",
    yourName: "Your Name",
    roomNumber: "Room Number",
    phone: "Phone",
    enterName: "Enter your name",
    enterRoom: "Enter your room number",
    enterPhone: "Enter your phone number",
    callShuttle: "Call Shuttle",
    shuttleCall: "Calling shuttle...",
    callingShuttle: "Calling shuttle...",
    confirmTitle: "Do you want to call a shuttle?",
    confirmDescription: "Confirm your request",
    location: "Location",
    name: "Name",
    room: "Room",
    phoneLabel: "Phone",
    yesCall: "Yes, Call",
    cancel: "Cancel",
    statusReceived: "Request Received!",
    statusSearching: "Looking for a driver...",
    statusEnRoute: "Your vehicle is on the way!",
    statusCompleted: "Trip completed.",
    statusCancelled: "Request cancelled.",
    driver: "Driver",
    vehicle: "Vehicle",
    driverLocation: "Location",
    waitTime: "Wait Time",
    acceptedBy: "Accepted by",
    requestNotFound: "Request not found.",
    connectionError: "Connection error",
    requestNumber: "Request #",
    notes: "Note",
    time: "Time",
  },
  de: {
    pageTitle: "Shuttle Rufen",
    locationNotFound: "Standort nicht gefunden.",
    loading: "Wird geladen...",
    yourName: "Ihr Name",
    roomNumber: "Zimmernummer",
    phone: "Telefon",
    enterName: "Geben Sie Ihren Namen ein",
    enterRoom: "Geben Sie Ihre Zimmernummer ein",
    enterPhone: "Geben Sie Ihre Telefonnummer ein",
    callShuttle: "Shuttle Rufen",
    shuttleCall: "Shuttle wird gerufen...",
    callingShuttle: "Shuttle wird gerufen...",
    confirmTitle: "Möchten Sie einen Shuttle rufen?",
    confirmDescription: "Bestätigen Sie Ihre Anfrage",
    location: "Standort",
    name: "Name",
    room: "Zimmer",
    phoneLabel: "Telefon",
    yesCall: "Ja, Rufen",
    cancel: "Abbrechen",
    statusReceived: "Anfrage erhalten!",
    statusSearching: "Fahrer wird gesucht...",
    statusEnRoute: "Ihr Fahrzeug ist unterwegs!",
    statusCompleted: "Fahrt abgeschlossen.",
    statusCancelled: "Anfrage storniert.",
    driver: "Fahrer",
    vehicle: "Fahrzeug",
    driverLocation: "Standort",
    waitTime: "Wartezeit",
    acceptedBy: "Angenommen von",
    requestNotFound: "Anfrage nicht gefunden.",
    connectionError: "Verbindungsfehler",
    requestNumber: "Anfrage Nr.",
    notes: "Notiz",
    time: "Zeit",
  },
  ru: {
    pageTitle: "Вызов шаттла",
    locationNotFound: "Местоположение не найдено.",
    loading: "Загрузка...",
    yourName: "Ваше имя",
    roomNumber: "Номер комнаты",
    phone: "Телефон",
    enterName: "Введите ваше имя",
    enterRoom: "Введите номер комнаты",
    enterPhone: "Введите номер телефона",
    callShuttle: "Вызвать шаттл",
    shuttleCall: "Вызов шаттла...",
    callingShuttle: "Вызов шаттла...",
    confirmTitle: "Хотите вызвать шаттл?",
    confirmDescription: "Подтвердите ваш запрос",
    location: "Местоположение",
    name: "Имя",
    room: "Комната",
    phoneLabel: "Телефон",
    yesCall: "Да, вызвать",
    cancel: "Отмена",
    statusReceived: "Запрос получен!",
    statusSearching: "Ищем водителя...",
    statusEnRoute: "Ваш транспорт в пути!",
    statusCompleted: "Поездка завершена.",
    statusCancelled: "Запрос отменён.",
    driver: "Водитель",
    vehicle: "Транспорт",
    driverLocation: "Местоположение",
    waitTime: "Время ожидания",
    acceptedBy: "Принято",
    requestNotFound: "Запрос не найден.",
    connectionError: "Ошибка соединения",
    requestNumber: "Запрос №",
    notes: "Заметка",
    time: "Время",
  },
  ar: {
    pageTitle: "طلب النقل",
    locationNotFound: "الموقع غير موجود.",
    loading: "جار التحميل...",
    yourName: "اسمك",
    roomNumber: "رقم الغرفة",
    phone: "الهاتف",
    enterName: "أدخل اسمك",
    enterRoom: "أدخل رقم غرفتك",
    enterPhone: "أدخل رقم هاتفك",
    callShuttle: "طلب النقل",
    shuttleCall: "جارٍ طلب النقل...",
    callingShuttle: "جارٍ طلب النقل...",
    confirmTitle: "هل تريد طلب النقل؟",
    confirmDescription: "أكد طلبك",
    location: "الموقع",
    name: "الاسم",
    room: "الغرفة",
    phoneLabel: "الهاتف",
    yesCall: "نعم، اطلب",
    cancel: "إلغاء",
    statusReceived: "تم استلام الطلب!",
    statusSearching: "جارٍ البحث عن سائق...",
    statusEnRoute: "مركبتك في الطريق!",
    statusCompleted: "اكتملت الرحلة.",
    statusCancelled: "تم إلغاء الطلب.",
    driver: "السائق",
    vehicle: "المركبة",
    driverLocation: "الموقع",
    waitTime: "وقت الانتظار",
    acceptedBy: "مقبول من قبل",
    requestNotFound: "الطلب غير موجود.",
    connectionError: "خطأ في الاتصال",
    requestNumber: "رقم الطلب",
    notes: "ملاحظة",
    time: "الوقت",
  },
  es: {
    pageTitle: "Llamar Shuttle",
    locationNotFound: "Ubicación no encontrada.",
    loading: "Cargando...",
    yourName: "Su Nombre",
    roomNumber: "Número de Habitación",
    phone: "Teléfono",
    enterName: "Ingrese su nombre",
    enterRoom: "Ingrese su número de habitación",
    enterPhone: "Ingrese su número de teléfono",
    callShuttle: "Llamar Shuttle",
    shuttleCall: "Llamando shuttle...",
    callingShuttle: "Llamando shuttle...",
    confirmTitle: "¿Desea llamar un shuttle?",
    confirmDescription: "Confirme su solicitud",
    location: "Ubicación",
    name: "Nombre",
    room: "Habitación",
    phoneLabel: "Teléfono",
    yesCall: "Sí, Llamar",
    cancel: "Cancelar",
    statusReceived: "¡Solicitud Recibida!",
    statusSearching: "Buscando conductor...",
    statusEnRoute: "¡Su vehículo está en camino!",
    statusCompleted: "Viaje completado.",
    statusCancelled: "Solicitud cancelada.",
    driver: "Conductor",
    vehicle: "Vehículo",
    driverLocation: "Ubicación",
    waitTime: "Tiempo de Espera",
    acceptedBy: "Aceptado por",
    requestNotFound: "Solicitud no encontrada.",
    connectionError: "Error de conexión",
    requestNumber: "Solicitud #",
    notes: "Nota",
    time: "Hora",
  },
};

function detectBrowserLocale(): SupportedLocale {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "en";
  const lang = (navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage || "en").toLowerCase();
  const two = lang.split("-")[0];
  const supported = new Set<SupportedLocale>(["tr", "en", "de", "ru", "ar", "es"]);
  if (supported.has(two as SupportedLocale)) return two as SupportedLocale;
  if (supported.has(lang as SupportedLocale)) return lang as SupportedLocale;
  return "en";
}

export function getInitialLocale(): SupportedLocale {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored && LOCALE_MAP.has(stored as SupportedLocale)) return stored as SupportedLocale;
  } catch {}
  return detectBrowserLocale();
}

export function setLocale(code: SupportedLocale) {
  try { localStorage.setItem(LOCALE_KEY, code); } catch {}
}

export function getLocale(): SupportedLocale {
  return getInitialLocale();
}

export function __(locale: SupportedLocale, key: TranslationKeys): string {
  return t[locale]?.[key] ?? t.en[key] ?? key;
}

export function useTranslation() {
  if (typeof window === "undefined") return { locale: "en" as SupportedLocale, t: (k: TranslationKeys) => t.en[k] ?? k };
  // This is meant to be called from a React hook context; for simplicity export helpers
  return { locale: detectBrowserLocale(), t: (key: TranslationKeys) => t[detectBrowserLocale()]?.[key] ?? t.en[key] ?? key };
}
