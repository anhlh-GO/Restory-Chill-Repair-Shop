// The long game around the repairs: shop upgrades bought with the cash the
// customers pay, albums that fill as gadgets get archived, and keepsakes the
// regulars leave behind. Albums and keepsakes are read straight from the repair
// record (chillfix_collection), so old saves light up with no migration; only
// the shop tiers and the claimed rewards are stored here.

import type { Txt } from '../core/i18n';
import { LEVELS } from './story';

// ---------- shop upgrades ----------

export type Track = 'workbench' | 'counter' | 'shelf' | 'decor';
export const TRACKS: Track[] = ['workbench', 'counter', 'shelf', 'decor'];

export interface TrackDef {
  name: Txt;
  icon: string;
  /** The track opens once this many customers have been served. */
  after: number;
  /** What it changes, one line. */
  perk: Txt;
  tiers: { name: Txt; price: number }[];
}

export const SHOP: Record<Track, TrackDef> = {
  workbench: {
    name: { en: 'Workbench', vi: 'Bàn sửa' }, icon: '🧰', after: 2,
    perk: { en: 'New mat, lamp and tools on the bench', vi: 'Thảm, đèn và dụng cụ mới trên bàn sửa' },
    tiers: [
      { name: { en: 'Fresh cutting mat', vi: 'Thảm cắt mới' }, price: 25 },
      { name: { en: 'Brass desk lamp', vi: 'Đèn bàn đồng' }, price: 65 },
      { name: { en: 'Pro walnut bench', vi: 'Bàn chuyên dụng gỗ óc chó' }, price: 130 },
    ],
  },
  counter: {
    name: { en: 'Counter', vi: 'Quầy' }, icon: '🪧', after: 4,
    perk: { en: 'A shop sign the whole street can read', vi: 'Biển hiệu cả phố đều nhìn thấy' },
    tiers: [
      { name: { en: 'Wooden sign', vi: 'Biển gỗ' }, price: 20 },
      { name: { en: 'Polished counter', vi: 'Quầy đánh bóng' }, price: 55 },
      { name: { en: 'LED sign board', vi: 'Bảng điện tử' }, price: 115 },
    ],
  },
  shelf: {
    name: { en: 'Display shelf', vi: 'Kệ trưng bày' }, icon: '🗄', after: 8,
    perk: { en: 'A finer home for the collection', vi: 'Nơi trưng bày đẹp hơn cho kho sưu tập' },
    tiers: [
      { name: { en: 'Two-tier shelf', vi: 'Kệ 2 tầng' }, price: 30 },
      { name: { en: 'Glass cabinet', vi: 'Tủ kính' }, price: 75 },
      { name: { en: 'Museum corner', vi: 'Góc bảo tàng' }, price: 150 },
    ],
  },
  decor: {
    name: { en: 'Decor', vi: 'Trang trí' }, icon: '🪴', after: 12,
    perk: { en: 'Little comforts by the counter', vi: 'Những góc nhỏ ấm cúng bên quầy' },
    tiers: [
      { name: { en: 'Potted plant', vi: 'Chậu cây xanh' }, price: 15 },
      { name: { en: 'Tea corner', vi: 'Góc trà' }, price: 45 },
      { name: { en: 'Nostalgia corner', vi: 'Góc hoài niệm' }, price: 100 },
    ],
  },
};

// ---------- albums ----------

export interface AlbumDef {
  id: string;
  name: Txt;
  devices: string[];
  /** Reward per milestone: the count needed, and the shop gift it grants. */
  steps: { need: number; gift: Gift }[];
}

/** Gifts are drawn around the counter once claimed or earned. */
export type Gift =
  | 'tablecloth' | 'sticker' | 'retroPoster' | 'radio' | 'photoFrame' | 'stringLights' | 'namePlate' | 'pegboard'
  | 'hoangPhoto' | 'streetPhoto' | 'kenPoster' | 'medal' | 'kidsPostcard' | 'lantern' | 'arcadePoster';

export const GIFT_NAMES: Record<Gift, Txt> = {
  tablecloth: { en: 'Checked tablecloth', vi: 'Khăn bàn kẻ ô' },
  sticker: { en: 'Helper sticker', vi: 'Sticker trợ thủ' },
  retroPoster: { en: 'Retro poster', vi: 'Poster retro' },
  radio: { en: 'Little shelf radio', vi: 'Radio để bàn' },
  photoFrame: { en: 'Photo frame', vi: 'Khung ảnh' },
  stringLights: { en: 'String lights', vi: 'Dây đèn' },
  namePlate: { en: 'Shop name plate', vi: 'Bảng tên tiệm' },
  pegboard: { en: 'Tool pegboard', vi: 'Bảng treo dụng cụ' },
  hoangPhoto: { en: "Mr. Hoang's photo", vi: 'Ảnh của ông Hoàng' },
  streetPhoto: { en: 'The street photo', vi: 'Ảnh cả phố' },
  kenPoster: { en: 'Gig poster', vi: 'Poster show nhạc' },
  medal: { en: 'Finisher sticker', vi: 'Sticker về đích' },
  kidsPostcard: { en: "Kids' postcard", vi: 'Bưu thiếp của tụi nhỏ' },
  lantern: { en: 'Paper lantern', vi: 'Lồng đèn giấy' },
  arcadePoster: { en: 'Arcade poster', vi: 'Poster arcade' },
};

export const ALBUMS: AlbumDef[] = [
  {
    id: 'helpers', name: { en: 'Everyday Helpers', vi: 'Trợ thủ thường ngày' },
    devices: ['dryer', 'remote', 'kettle', 'fan', 'toothbrush'],
    steps: [{ need: 3, gift: 'tablecloth' }, { need: 5, gift: 'sticker' }],
  },
  {
    id: 'sound', name: { en: 'Play & Sound', vi: 'Chơi & Nghe' },
    devices: ['handheld', 'walkman', 'headphones', 'gamepad', 'radio'],
    steps: [{ need: 3, gift: 'retroPoster' }, { need: 5, gift: 'radio' }],
  },
  {
    id: 'time', name: { en: 'Time & Memories', vi: 'Thời gian & Ký ức' },
    devices: ['camera', 'lamp', 'phone', 'watch', 'clock', 'musicbox'],
    steps: [{ need: 3, gift: 'photoFrame' }, { need: 6, gift: 'stringLights' }],
  },
  {
    id: 'craft', name: { en: 'Craft & Work', vi: 'Nghề & Việc' },
    devices: ['keyboard', 'toaster', 'calculator', 'flashlight'],
    steps: [{ need: 2, gift: 'namePlate' }, { need: 4, gift: 'pegboard' }],
  },
];

// ---------- keepsakes ----------

export interface MemoryDef {
  id: string;
  icon: string;
  name: Txt;
  item: Txt;
  /** Level indices (0-based) that must all be repaired. */
  levels: number[];
  story: Txt[];
  /** A keepsake that also shows up by the counter. */
  gift?: Gift;
}

export const MEMORIES: MemoryDef[] = [
  {
    id: 'warmSecret', icon: '🐶', levels: [0],
    name: { en: 'A Warm Secret', vi: 'Bí mật ấm áp' },
    item: { en: 'A photo of soggy Mochi', vi: 'Ảnh Mochi còn ướt' },
    story: [
      { en: 'Kai sent it the same night: Mochi, half fluffy, half soggy, very proud.', vi: 'Kai gửi ngay tối hôm đó: Mochi nửa bông nửa ướt, mặt rất tự hào.' },
      { en: 'His sister never found out. Or she did, and decided to laugh.', vi: 'Chị cậu chưa bao giờ phát hiện. Hoặc có, nhưng chọn bật cười.' },
    ],
  },
  {
    id: 'firstPhoto', icon: '🎫', levels: [2],
    name: { en: 'First Photograph', vi: 'Tấm ảnh đầu tiên' },
    item: { en: "A ticket to Vy's opening", vi: 'Vé khai trương tiệm đĩa' },
    story: [
      { en: "The first photo at Vy's workshop was the shop owner, holding a record upside down.", vi: 'Tấm ảnh đầu tiên ở xưởng của Vy là chủ tiệm, cầm ngược chiếc đĩa than.' },
      { en: "She framed it anyway. \"Mom would have liked it,\" she said.", vi: 'Cô vẫn đóng khung. "Mẹ chắc sẽ thích," cô nói.' },
    ],
  },
  {
    id: 'summerSong', icon: '📼', levels: [3], gift: 'hoangPhoto',
    name: { en: 'Summer Song', vi: 'Bài hát mùa hè' },
    item: { en: 'A cassette label, summer 1989', vi: 'Nhãn cassette mùa hè 1989' },
    story: [
      { en: 'In her handwriting: "For the man who can\'t sing. Summer \'89."', vi: 'Nét chữ của bà: "Cho người không biết hát. Hè 89."' },
      { en: 'Mr. Hoang brought a photo of the two of them for the shop wall.', vi: 'Ông Hoàng mang tặng tiệm tấm ảnh hai ông bà để treo tường.' },
    ],
  },
  {
    id: 'oneMoreRound', icon: '🎮', levels: [1, 12],
    name: { en: 'One More Round', vi: 'Thêm một ván' },
    item: { en: "Grandpa and Bin's scoreboard", vi: 'Bảng kỷ lục ông cháu' },
    story: [
      { en: 'Two names on the board now: GRANDPA and BIN, a single point apart.', vi: 'Giờ trên bảng có hai cái tên: ÔNG và BIN, cách nhau đúng một điểm.' },
      { en: 'Who is ahead changes every Sunday.', vi: 'Ai dẫn trước thì chủ nhật nào cũng đổi.' },
    ],
  },
  {
    id: 'familyMelody', icon: '🎼', levels: [7, 17],
    name: { en: 'Family Melody', vi: 'Giai điệu gia đình' },
    item: { en: 'Handwritten sheet music', vi: 'Tờ nhạc viết tay' },
    story: [
      { en: "Grandma Sau wrote the music box song down for Nhi, note by note.", vi: 'Bà Sáu chép lại bài hát trong hộp nhạc cho Nhi, từng nốt một.' },
      { en: 'In the corner: a tea stain shaped like a heart. "On purpose," Grandma says.', vi: 'Góc giấy có vết trà hình trái tim. "Bà cố ý đấy," bà bảo.' },
    ],
  },
  {
    id: 'shopStories', icon: '💌', levels: [19],
    name: { en: 'A Shop Full of Stories', vi: 'Tiệm đầy những câu chuyện' },
    item: { en: 'The street party invitation', vi: 'Thiệp mời tiệc khu phố' },
    story: [
      { en: 'Every customer signed the back of the invitation.', vi: 'Mọi vị khách đều ký tên sau tấm thiệp mời.' },
      { en: 'Kai\'s note at the bottom: "Same time next year, boss."', vi: 'Dòng của Kai ở cuối: "Năm sau y hẹn nha anh."' },
    ],
  },
  {
    id: 'photoWall', icon: '🖼', levels: [20], gift: 'streetPhoto',
    name: { en: 'The Photo Wall', vi: 'Bức tường ảnh' },
    item: { en: 'The whole street in one photo', vi: 'Ảnh cả khu phố' },
    story: [
      { en: 'Vy hung the party photo by the counter. Everyone you helped is in it.', vi: 'Vy treo ảnh buổi tiệc cạnh quầy. Ai từng được tiệm giúp đều có mặt.' },
      { en: 'Mochi is in the front row, finally fluffy.', vi: 'Mochi đứng hàng đầu, cuối cùng cũng bông xù.' },
    ],
  },
  {
    id: 'jasmine', icon: '🌼', levels: [23],
    name: { en: 'Water the Jasmine', vi: 'Nhớ tưới hoa nhài' },
    item: { en: 'The second tape', vi: 'Cuộn băng thứ hai' },
    story: [
      { en: 'Mr. Hoang waters the jasmine every morning now, humming off-key.', vi: 'Giờ sáng nào ông Hoàng cũng tưới giàn nhài, vừa tưới vừa hát lạc tông.' },
      { en: 'He says she would complain about the singing. He hums louder.', vi: 'Ông bảo bà mà nghe chắc sẽ chê. Thế là ông hát to hơn.' },
    ],
  },
  {
    id: 'familyMelody2', icon: '🎙', levels: [7, 17, 31],
    name: { en: 'Family Melody II', vi: 'Giai điệu gia đình II' },
    item: { en: "Nhi's recording for Dad", vi: 'Bản thu Nhi tặng bố' },
    story: [
      { en: 'Three voices on one tape: Grandma, the music box, and Nhi.', vi: 'Ba giọng trên một cuộn băng: bà, hộp nhạc và Nhi.' },
      { en: 'Dad played it twice, then asked to hear it once more.', vi: 'Bố nghe hai lần, rồi xin nghe thêm lần nữa.' },
    ],
  },
  {
    id: 'exhibition', icon: '🏛', levels: [34],
    name: { en: 'A Street Full of Stories', vi: 'Khu phố đầy những câu chuyện' },
    item: { en: 'The exhibition ribbon', vi: 'Dải băng khai mạc triển lãm' },
    story: [
      { en: 'Twenty keepsakes on one wall, and a boombox playing in the corner.', vi: 'Hai mươi kỷ vật trên một bức tường, và chiếc đài phát nhạc ở góc.' },
      { en: 'People came for the photos. They stayed for the stories.', vi: 'Mọi người đến vì những tấm ảnh. Họ ở lại vì những câu chuyện.' },
    ],
  },
];

/** Thank-you gifts the chapter 2 regulars leave: they appear once that job is done. */
export const LEVEL_GIFTS: { level: number; gift: Gift }[] = [
  { level: 25, gift: 'kenPoster' },
  { level: 27, gift: 'medal' },
  { level: 28, gift: 'kidsPostcard' },
  { level: 32, gift: 'lantern' },
  { level: 33, gift: 'arcadePoster' },
];

// ---------- saved state ----------

interface MetaSave {
  shop: Record<Track, number>;
  claimed: string[];
  seen: string[];
}

const KEY = 'chillfix_meta';

function fresh(): MetaSave {
  return { shop: { workbench: 0, counter: 0, shelf: 0, decor: 0 }, claimed: [], seen: [] };
}

function load(): MetaSave {
  const m = fresh();
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (v && typeof v === 'object') {
      for (const k of TRACKS) {
        const n = Number(v.shop?.[k]);
        if (Number.isFinite(n)) m.shop[k] = Math.max(0, Math.min(3, Math.floor(n)));
      }
      if (Array.isArray(v.claimed)) m.claimed = v.claimed.filter((x: unknown) => typeof x === 'string');
      if (Array.isArray(v.seen)) m.seen = v.seen.filter((x: unknown) => typeof x === 'string');
    }
  } catch { /* storage blocked or broken: start fresh */ }
  return m;
}

let meta = load();

function save(next: MetaSave): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    return true;
  } catch { return false; }
}

/** Forget every upgrade, claim and keepsake (Settings → Clear data). */
export function resetMeta(): void {
  meta = fresh();
  try { localStorage.removeItem(KEY); } catch { /* storage blocked */ }
}

export const tierOf = (t: Track): number => meta.shop[t];

/** How many customers have been served: the furthest repaired level + 1. */
export function served(done: Record<number, unknown>): number {
  let n = 0;
  for (const k of Object.keys(done)) n = Math.max(n, Number(k) + 1);
  return n;
}

export type BuyCheck = 'ok' | 'owned' | 'locked' | 'prev' | 'cash';

export function canBuy(t: Track, tier: number, cash: number, done: Record<number, unknown>): BuyCheck {
  const have = meta.shop[t];
  if (tier <= have) return 'owned';
  if (served(done) < SHOP[t].after) return 'locked';
  if (tier !== have + 1) return 'prev';
  if (cash < SHOP[t].tiers[tier - 1].price) return 'cash';
  return 'ok';
}

/**
 * Buy one tier: check, pay, grant, save, all or nothing. `pay` takes the money
 * and returns a refund function, used when the save fails.
 */
export function buy(t: Track, tier: number, cash: number, done: Record<number, unknown>, pay: (n: number) => () => void): boolean {
  if (canBuy(t, tier, cash, done) !== 'ok') return false;
  const refund = pay(SHOP[t].tiers[tier - 1].price);
  const next: MetaSave = { ...meta, shop: { ...meta.shop, [t]: tier } };
  if (!save(next)) { refund(); return false; }
  meta = next;
  return true;
}

/** Any track the player could buy into right now (for a gentle glow on the sign). */
export function shopHasNews(cash: number, done: Record<number, unknown>): boolean {
  return TRACKS.some((t) => meta.shop[t] < 3 && canBuy(t, meta.shop[t] + 1, cash, done) === 'ok');
}

/** Devices that have been repaired at least once. */
export function archived(done: Record<number, unknown>): Set<string> {
  const s = new Set<string>();
  LEVELS.forEach((L, i) => { if (done[i]) s.add(L.device.id); });
  return s;
}

export function albumCount(a: AlbumDef, done: Record<number, unknown>): number {
  const s = archived(done);
  return a.devices.filter((d) => s.has(d)).length;
}

const stepId = (a: AlbumDef, i: number) => `${a.id}:${i}`;
export const isClaimed = (a: AlbumDef, i: number): boolean => meta.claimed.includes(stepId(a, i));

/** Claim an album milestone once. */
export function claim(a: AlbumDef, i: number, done: Record<number, unknown>): boolean {
  const st = a.steps[i];
  if (!st || isClaimed(a, i) || albumCount(a, done) < st.need) return false;
  const next: MetaSave = { ...meta, claimed: [...meta.claimed, stepId(a, i)] };
  if (!save(next)) return false;
  meta = next;
  return true;
}

export const memoryOpen = (m: MemoryDef, done: Record<number, unknown>): boolean => m.levels.every((i) => !!done[i]);

/** Keepsakes unlocked but not yet announced; marks them announced. */
export function takeNewMemories(done: Record<number, unknown>): MemoryDef[] {
  const fresh = MEMORIES.filter((m) => memoryOpen(m, done) && !meta.seen.includes(m.id));
  if (!fresh.length) return [];
  const next: MetaSave = { ...meta, seen: [...meta.seen, ...fresh.map((m) => m.id)] };
  if (save(next)) meta = next;
  return fresh;
}

/** Everything that decorates the counter right now. */
export function giftsOwned(done: Record<number, unknown>): Set<Gift> {
  const g = new Set<Gift>();
  for (const a of ALBUMS) a.steps.forEach((st, i) => { if (isClaimed(a, i)) g.add(st.gift); });
  for (const m of MEMORIES) if (m.gift && memoryOpen(m, done)) g.add(m.gift);
  for (const lg of LEVEL_GIFTS) if (done[lg.level]) g.add(lg.gift);
  // Mr. Hoang's photo needs a sign to hang next to
  if (meta.shop.counter < 1) g.delete('hoangPhoto');
  return g;
}

/** All twenty gadgets archived. */
export const restorer = (done: Record<number, unknown>): boolean => archived(done).size >= 20;
