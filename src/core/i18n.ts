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
  // level / day results
  fixedIt: { en: 'Fixed it!', vi: 'Sửa xong rồi!' },
  nextCustomerBtn: { en: 'Next customer ▶', vi: 'Khách tiếp theo ▶' },
  nextDayBtn: { en: 'Next day ☀', vi: 'Sang ngày mới ☀' },
  dayOver: { en: 'Day {0} is over', vi: 'Hết ngày {0}' },
  todayFixed: { en: 'Fixed today', vi: 'Đã sửa hôm nay' },
  todayEarned: { en: 'Earned today', vi: 'Thu nhập hôm nay' },
  earned: { en: 'Earned', vi: 'Tiền công' },
  allDone: { en: 'All 20 gadgets repaired!', vi: 'Đã sửa đủ 20 món đồ!' },
  allDoneSub: { en: 'The whole street sings your name.', vi: 'Cả khu phố đều nhắc tên tiệm bạn.' },
  playAgain: { en: 'Play again ↻', vi: 'Chơi lại từ đầu ↻' },
  // collection
  collection: { en: 'Collection', vi: 'Kho sưu tập' },
  collectionBtn: { en: '📦 Collection', vi: '📦 Kho sưu tập' },
  collected: { en: '{0}/{1} repaired', vi: 'Đã sửa {0}/{1}' },
  notYet: { en: 'Not repaired yet', vi: 'Chưa sửa' },
  ownerOf: { en: 'Owner: {0}', vi: 'Chủ: {0}' },
  dayN: { en: 'Day {0}', vi: 'Ngày {0}' },
  dragToSpin: { en: 'Drag to spin', vi: 'Kéo để xoay' },
  // chapters
  chapterDone: { en: 'Chapter 1 complete!', vi: 'Hoàn thành Chương 1!' },
  chapterDoneSub: { en: 'The street threw you a party. New faces are on the way…', vi: 'Cả phố mở tiệc mừng tiệm. Khách mới sắp tới…' },
  chapterNext: { en: 'Day 16 ☀', vi: 'Sang ngày 16 ☀' },
  // collection 2.0
  tabArchive: { en: 'Archive', vi: 'Lưu trữ' },
  tabAlbums: { en: 'Albums', vi: 'Album' },
  tabMemories: { en: 'Keepsakes', vi: 'Kỷ vật' },
  claim: { en: 'Claim', vi: 'Nhận' },
  claimed: { en: 'Claimed ✓', vi: 'Đã nhận ✓' },
  locked: { en: 'Locked', vi: 'Chưa mở' },
  memoryHow: { en: 'Unlocks after: {0}', vi: 'Mở khi sửa xong: {0}' },
  newMemory: { en: 'New keepsake: {0}', vi: 'Kỷ vật mới: {0}' },
  albumReward: { en: 'Reward: {0}', vi: 'Thưởng: {0}' },
  badgeRestorer: { en: '🏅 Neighborhood Restorer', vi: '🏅 Thợ phục chế của phố' },
  // renovation buttons
  shopBtn: { en: '🛠 Renovate', vi: '🛠 Cải tạo' },
  improveShop: { en: 'Renovate the shop 🛠', vi: 'Cải tạo tiệm 🛠' },
  buy: { en: 'Buy ${0}', vi: 'Mua ${0}' },
  notEnough: { en: 'Not enough cash yet', vi: 'Chưa đủ tiền' },
  // renovation
  renoLevel: { en: 'Shop Lv {0}/{1}', vi: 'Cấp tiệm {0}/{1}' },
  renoStageN: { en: 'Stage {0}', vi: 'Giai đoạn {0}' },
  renoAllDone: { en: 'Premium Repair Shop ✨', vi: 'Cửa hàng hoàn thiện ✨' },
  renoPreview: { en: '👁 Preview', vi: '👁 Xem trước' },
  renoPreviewing: { en: 'Preview: tap to go back', vi: 'Đang xem trước: chạm để quay lại' },
  renoOpenBtn: { en: 'Grand opening! 🎉', vi: 'Khai trương! 🎉' },
  renoFree: { en: 'Free: the celebration', vi: 'Miễn phí: buổi lễ' },
  renoDoneTag: { en: 'Done ✓', vi: 'Đã xong ✓' },
  renoLockDay: { en: 'Opens on day {0}', vi: 'Mở từ ngày {0}' },
  renoLockNeeds: { en: 'Needs: {0}', vi: 'Cần: {0}' },
  renoLockStage: { en: 'Finish stage {0} first', vi: 'Xong giai đoạn {0} trước' },
  renoStageDone: { en: '{0}: complete!', vi: '{0}: hoàn thành!' },
  renoReward: { en: 'Shop interior reward: {0}', vi: 'Thưởng nội thất: {0}' },
  renoCanUpgrade: { en: '🛠 Upgrade: {0} · ${1}', vi: '🛠 Nâng cấp: {0} · ${1}' },
  renoRefund: { en: 'Old upgrades refunded +${0}', vi: 'Hoàn tiền nâng cấp cũ +${0}' },
  tapToSkip: { en: 'Tap to skip', vi: 'Chạm để bỏ qua' },
  renoWorking: { en: 'Renovating… 🔨', vi: 'Đang cải tạo… 🔨' },
  // quick diagnosis
  diagTitle: { en: 'What seems wrong?', vi: 'Có vẻ hỏng chỗ nào?' },
  diagAsk: { en: 'One guess: tap the part you suspect', vi: 'Chỉ đoán 1 lần: chạm vào linh kiện bạn nghi' },
  diagRight: { en: 'Spot on! Bonus +${0} 🔍', vi: 'Chẩn đoán chuẩn! Thưởng +${0} 🔍' },
  diagWrong: { en: "Not quite. Let's find the cause together!", vi: 'Chưa đúng rồi. Cùng tháo máy ra tìm nguyên nhân nhé!' },
  diagSkip: { en: 'Skip', vi: 'Bỏ qua' },
  // settings: start over
  clearData: { en: '🗑 Clear data', vi: '🗑 Xóa dữ liệu' },
  clearConfirm: { en: 'Tap again to erase all', vi: 'Chạm lần nữa để xóa hết' },
  clearDone: { en: 'Fresh start! ✨', vi: 'Bắt đầu lại từ đầu! ✨' },
} satisfies Record<string, Txt>;

export type UIKey = keyof typeof UI;

export function t(key: UIKey, ...args: (string | number)[]): string {
  let s = UI[key][lang];
  args.forEach((a, i) => { s = s.replace(`{${i}}`, String(a)); });
  return s;
}
