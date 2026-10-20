// Two languages, like the reference: English and Vietnamese.

export type Lang = 'en' | 'vi';
export type Txt = { en: string; vi: string };

function initialLang(): Lang {
  try {
    const s = localStorage.getItem('chillfix_lang');
    if (s === 'en' || s === 'vi') return s;
  } catch { /* storage blocked */ }
  return (navigator.language || '').toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export let lang: Lang = initialLang();

export function setLang(l: Lang): void {
  lang = l;
  try { localStorage.setItem('chillfix_lang', l); } catch { /* ignore */ }
}

export function tr(t: Txt | string): string {
  return typeof t === 'string' ? t : t[lang];
}

const UI = {
  openBox: { en: 'Open the box', vi: 'Mở hộp' },
  takeApart: { en: 'Take apart', vi: 'Tháo rời' },
  repair: { en: 'Repair', vi: 'Sửa chữa' },
  clean: { en: 'Clean', vi: 'Lau chùi' },
  rebuild: { en: 'Rebuild', vi: 'Lắp lại' },
  done: { en: 'Done', vi: 'Xong' },
  screwsFirst: { en: 'Screws first', vi: 'Tháo vít trước' },
  screwFirst: { en: 'Screw first', vi: 'Bắt vít trước' },
  first: { en: '{0} first', vi: '{0} trước' },
  dragScrewdriver: { en: 'DRAG|the screwdriver to a screw', vi: 'KÉO|tua vít tới con vít' },
  dragPart: { en: 'DRAG|the part off', vi: 'KÉO|linh kiện ra' },
  dragBack: { en: 'DRAG|it back in', vi: 'KÉO|lắp nó vào lại' },
  dragBrush: { en: 'DRAG|the brush', vi: 'KÉO|bàn chải' },
  dragSponge: { en: 'DRAG|the sponge', vi: 'KÉO|miếng bọt biển' },
  doubleTap: { en: 'DOUBLE-TAP|to flip', vi: 'CHẠM 2 LẦN|để lật' },
  spinHint: { en: 'DRAG the mat|to turn it 360°', vi: 'KÉO nền|để xoay máy 360°' },
  tapList: { en: 'TAP|for the list', vi: 'CHẠM|để xem danh sách' },
  tapBroken: { en: 'TAP|the broken part', vi: 'CHẠM|vào linh kiện hỏng' },
  tapDirty: { en: 'TAP|a dirty part', vi: 'CHẠM|vào linh kiện bẩn' },
  tapBox: { en: 'TAP|the box', vi: 'CHẠM|vào hộp' },
  tapContinue: { en: 'TAP|to continue', vi: 'CHẠM|để tiếp tục' },
  repaired: { en: 'Repaired! ✨', vi: 'Đã sửa! ✨' },
  spotless: { en: 'Spotless! ✨', vi: 'Sạch bong! ✨' },
  takeAllApart: { en: 'Take it all apart first', vi: 'Tháo hết ra trước đã' },
  out: { en: 'Out', vi: 'Đã tháo' },
  fitted: { en: 'Fitted', vi: 'Đã lắp' },
  fixIt: { en: 'Fix it', vi: 'Cần sửa' },
  dirty: { en: 'Dirty', vi: 'Bẩn' },
  strangePart: { en: 'Strange part', vi: 'Linh kiện lạ' },
  screws: { en: 'Screws', vi: 'Vít' },
  buyPart: { en: 'Buy a new part · ${0}', vi: 'Mua linh kiện mới · ${0}' },
  youHave: { en: 'You have ${0}', vi: 'Bạn có ${0}' },
  doneBtn: { en: 'Done ✓', vi: 'Xong ✓' },
  settings: { en: 'Settings', vi: 'Cài đặt' },
  restart: { en: 'Restart', vi: 'Chơi lại' },
  receiptRepair: { en: 'Repair', vi: 'Tiền công' },
  receiptParts: { en: 'Parts ×{0}', vi: 'Linh kiện ×{0}' },
  receiptTip: { en: 'Tip', vi: 'Tiền boa' },
  total: { en: 'TOTAL', vi: 'TỔNG' },
  thankYou: { en: 'THANK YOU!', vi: 'CẢM ƠN QUÝ KHÁCH!' },
  paid: { en: 'PAID', vi: 'ĐÃ TRẢ' },
  shopName: { en: 'CHILL FIX CORNER', vi: 'TIỆM SỬA CHILL' },
  traceTitle: { en: 'Fix {0}', vi: 'Sửa {0}' },
  traceSub: { en: 'Touch a joint, run every line in one stroke.', vi: 'Chạm một mối hàn, đi hết mọi đường trong một nét.' },
  traceStart: { en: 'Touch the glowing joint', vi: 'Chạm vào mối hàn đang sáng' },
  traceKeep: { en: 'Run over every line, keep your finger down', vi: 'Đi hết mọi đường, giữ ngón tay trên màn' },
  flowSub: { en: 'Join same colours, no crossing.', vi: 'Nối các màu giống nhau, không cắt nhau.' },
  rotSub: { en: 'Tap tiles to rotate. Power the bulb.', vi: 'Chạm để xoay ô. Cấp điện cho bóng đèn.' },
  startHere: { en: 'Start here', vi: 'Bắt đầu ở đây' },
  sound: { en: 'Sound', vi: 'Âm thanh' },
  music: { en: 'Music', vi: 'Nhạc' },
  vibration: { en: 'Vibration', vi: 'Rung' },
  day: { en: 'Day', vi: 'Ngày' },
  nextCustomer: { en: 'Next customer…', vi: 'Khách tiếp theo…' },
} satisfies Record<string, Txt>;

export type UIKey = keyof typeof UI;

export function t(key: UIKey, ...args: (string | number)[]): string {
  let s = UI[key][lang];
  args.forEach((a, i) => { s = s.replace(`{${i}}`, String(a)); });
  return s;
}
