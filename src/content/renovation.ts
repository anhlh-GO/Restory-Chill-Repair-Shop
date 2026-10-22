// Shop Renovation: the storefront grows from a run-down repair corner into the
// street's premium repair shop, one visible piece at a time. 22 upgrades in 6
// stages, each its own config: price, the in-game day it opens, what it needs,
// which part of the storefront model it changes and how that change animates.
// Finishing a stage also hands out an interior tier (the bench, counter, shelf
// and decor looks that used to be sold one by one).
// Prices and days were balanced against the real earnings of the 35 levels: every
// player profile, even one who always buys parts, finishes by day 30.

import type { Txt } from '../core/i18n';
import type { Track } from './meta';
import { renoDone } from './meta';
import { LEVELS } from './story';

/** A group of pieces on the storefront model that one upgrade switches. */
export type VisualId =
  | 'yard' | 'wall' | 'lamp' | 'paint' | 'shutter' | 'sign1' | 'awning' | 'icons' | 'board' | 'deco'
  | 'sign2' | 'led' | 'tools' | 'panel' | 'annex' | 'showcase' | 'station' | 'trim' | 'sign3' | 'shutter2' | 'finish' | 'grand';

export type AnimKind = 'sweep' | 'plaster' | 'lamp' | 'paint' | 'shutter' | 'sign' | 'awning' | 'pop' | 'grand';

export interface UpgradeDef {
  id: string;
  stage: number;
  name: Txt;
  desc: Txt;
  price: number;
  unlockDay: number;
  requires: string[];
  visual: VisualId;
  anim: AnimKind;
}

export interface StageDef {
  id: number;
  name: Txt;
  sub: Txt;
  /** Interior tiers granted when the whole stage is done. */
  reward: { track: Track; tier: number }[];
}

export const STAGES: StageDef[] = [
  { id: 1, name: { en: 'Stage 1 – The Old Corner', vi: 'Giai đoạn 1 – Khởi đầu' }, sub: { en: 'A tiny, run-down corner shop', vi: 'Cửa hàng nhỏ, cũ kỹ' }, reward: [{ track: 'workbench', tier: 1 }] },
  { id: 2, name: { en: 'Stage 2 – Basic Renovation', vi: 'Giai đoạn 2 – Sửa sang cơ bản' }, sub: { en: 'Cleaner and tidier', vi: 'Sạch hơn và gọn gàng hơn' }, reward: [{ track: 'counter', tier: 1 }] },
  { id: 3, name: { en: 'Stage 3 – Shop Identity', vi: 'Giai đoạn 3 – Mở rộng & Nhận diện' }, sub: { en: 'An awning and a sign people remember', vi: 'Thêm mái che và bảng hiệu đẹp hơn' }, reward: [{ track: 'decor', tier: 1 }, { track: 'workbench', tier: 2 }] },
  { id: 4, name: { en: 'Stage 4 – Professional Workshop', vi: 'Giai đoạn 4 – Chuyên nghiệp hơn' }, sub: { en: 'Modern, with a style of its own', vi: 'Thiết kế hiện đại, có phong cách riêng' }, reward: [{ track: 'counter', tier: 2 }, { track: 'shelf', tier: 1 }] },
  { id: 5, name: { en: 'Stage 5 – Expanded Repair Center', vi: 'Giai đoạn 5 – Mở rộng quy mô' }, sub: { en: 'More room, more services', vi: 'Thêm khu vực chức năng' }, reward: [{ track: 'shelf', tier: 2 }, { track: 'decor', tier: 2 }, { track: 'workbench', tier: 3 }] },
  { id: 6, name: { en: 'Stage 6 – Premium Repair Shop', vi: 'Giai đoạn 6 – Cửa hàng hoàn thiện' }, sub: { en: "The street's landmark repair shop", vi: 'Cửa hàng sửa chữa biểu tượng của khu phố' }, reward: [{ track: 'counter', tier: 3 }, { track: 'shelf', tier: 3 }, { track: 'decor', tier: 3 }] },
];

const u = (id: string, stage: number, en: string, vi: string, dEn: string, dVi: string, price: number, unlockDay: number, requires: string[], visual: VisualId, anim: AnimKind): UpgradeDef =>
  ({ id, stage, name: { en, vi }, desc: { en: dEn, vi: dVi }, price, unlockDay, requires, visual, anim });

export const UPGRADES: UpgradeDef[] = [
  u('U01', 1, 'Clean Up the Front', 'Dọn sân trước', 'Clear the old boxes, junk and loose cables', 'Dọn hộp cũ, rác và dây điện vương vãi', 10, 1, [], 'yard', 'sweep'),
  u('U02', 1, 'Patch the Wall', 'Trám tường ngoài', 'Fill the cracks and the peeling plaster', 'Trám vết nứt và mảng vữa bong', 15, 2, ['U01'], 'wall', 'plaster'),
  u('U03', 1, 'Fix the Old Wall Lamp', 'Sửa đèn tường cũ', 'New bulb and wiring: steady light again', 'Thay bóng, sửa dây: đèn sáng ổn định', 12, 2, [], 'lamp', 'lamp'),
  u('U04', 2, 'Repaint the Walls', 'Sơn lại tường', 'Bright cream walls with a blue base', 'Tường màu kem sáng, chân tường xanh', 22, 3, ['U02'], 'paint', 'paint'),
  u('U05', 2, 'Repair the Rolling Shutter', 'Sửa cửa cuốn', 'Rust off, new slats, silver-grey paint', 'Tẩy gỉ, thay thanh hỏng, sơn xám bạc', 25, 4, [], 'shutter', 'shutter'),
  u('U06', 2, 'New REPAIR Sign', 'Biển REPAIR mới', 'A blue REPAIR sign with a wrench', 'Biển REPAIR xanh có icon cờ lê', 20, 4, [], 'sign1', 'sign'),
  u('U07', 3, 'Blue & White Awning', 'Mái che xanh trắng', 'A striped awning over the shutter', 'Mái che sọc xanh trắng trên cửa cuốn', 28, 5, ['U04'], 'awning', 'awning'),
  u('U08', 3, 'Device Category Signs', 'Icon loại thiết bị', 'Phone, gamepad, camera and laptop icons', 'Icon điện thoại, gamepad, camera, laptop', 24, 6, ['U04'], 'icons', 'pop'),
  u('U09', 3, 'Service Board', 'Bảng dịch vụ', 'A FIX / CLEAN / RESTORE board out front', 'Bảng FIX / CLEAN / RESTORE trước cửa', 22, 6, [], 'board', 'pop'),
  u('U10', 3, 'Front Decoration', 'Trang trí mặt tiền', 'Plants, a tidy toolbox and a small shelf', 'Cây xanh, thùng dụng cụ gọn, kệ nhỏ', 26, 7, ['U01'], 'deco', 'pop'),
  u('U11', 4, 'Premium 3D Sign', 'Biển REPAIR SHOP 3D', 'Raised letters, a big gear-and-wrench icon', 'Chữ nổi, icon bánh răng + cờ lê lớn', 45, 9, ['U06'], 'sign2', 'sign'),
  u('U12', 4, 'Exterior LED Lighting', 'Đèn LED ngoài', 'LED trim on the sign and roof washers', 'LED viền biển hiệu và đèn hắt mái', 35, 10, ['U11'], 'led', 'lamp'),
  u('U13', 4, 'Tool Wall', 'Bảng treo dụng cụ', 'A tool board, a tester and part bins', 'Bảng treo dụng cụ, máy kiểm tra, thùng linh kiện', 32, 11, [], 'tools', 'pop'),
  u('U14', 4, 'Side Wall Panels', 'Ốp panel tường bên', 'Blue panels behind the device icons', 'Panel xanh cho tường bên và icon thiết bị', 38, 12, ['U08'], 'panel', 'pop'),
  u('U15', 5, 'Expand the Storefront', 'Mở rộng mặt tiền', 'A side bay for drop-offs (same main shutter)', 'Thêm gian nhận đồ (cửa cuốn chính giữ nguyên)', 60, 13, ['U14'], 'annex', 'pop'),
  u('U16', 5, 'Device Showcase', 'Tủ trưng bày thiết bị', 'Restored gadgets from your collection on show', 'Trưng bày đồ đã phục chế trong kho sưu tập', 50, 15, ['U15'], 'showcase', 'pop'),
  u('U17', 5, 'Advanced Repair Station', 'Bàn kiểm tra hiện đại', 'A test bench with a diagnostic screen', 'Bàn test có màn hình chẩn đoán', 48, 17, ['U13'], 'station', 'pop'),
  u('U18', 5, 'Modern Exterior Trim', 'Viền tường & mái cao cấp', 'Blue and gold trim along walls and roof', 'Viền xanh – vàng dọc tường và mái', 42, 18, ['U04'], 'trim', 'plaster'),
  u('U19', 6, 'Final Branding', 'Thương hiệu cao cấp', 'A bigger lit sign and a brand badge', 'Biển lớn có đèn và huy hiệu thương hiệu', 45, 19, ['U12'], 'sign3', 'sign'),
  u('U20', 6, 'Premium Rolling Shutter', 'Cửa cuốn cao cấp', 'Blue-grey shutter with a small logo', 'Cửa cuốn xanh xám có logo nhỏ', 40, 21, ['U05'], 'shutter2', 'shutter'),
  u('U21', 6, 'Final Exterior Touches', 'Hoàn thiện ngoại thất', 'Standing sign, waiting bench, yard lights', 'Biển đứng, ghế chờ nhận đồ, đèn sân', 30, 23, ['U16'], 'finish', 'pop'),
  u('U22', 6, 'Grand Opening', 'Khai trương', 'Light it all up: the premium repair shop', 'Thắp sáng tất cả: cửa hàng hoàn thiện', 0, 24, ['U19', 'U20', 'U21'], 'grand', 'grand'),
];

export const byId = (id: string): UpgradeDef | undefined => UPGRADES.find((x) => x.id === id);

export type Status = 'done' | 'available' | 'locked';
export type LockWhy = { kind: 'day'; day: number } | { kind: 'needs'; id: string } | { kind: 'stage'; stage: number } | null;

/** The in-game day the player has reached: the day of the next customer. */
export function currentDay(done: Record<number, unknown>): number {
  let next = 0;
  for (const k of Object.keys(done)) next = Math.max(next, Number(k) + 1);
  return LEVELS[Math.min(next, LEVELS.length - 1)].day;
}

export function stageDone(stage: number, have: ReadonlySet<string> = renoDone()): boolean {
  return UPGRADES.filter((x) => x.stage === stage).every((x) => have.has(x.id));
}

/** Why an upgrade can't be bought yet (null: it can). */
export function lockReason(d: UpgradeDef, day: number, have: ReadonlySet<string> = renoDone()): LockWhy {
  if (d.stage > 1 && !stageDone(d.stage - 1, have)) return { kind: 'stage', stage: d.stage - 1 };
  const miss = d.requires.find((r) => !have.has(r));
  if (miss) return { kind: 'needs', id: miss };
  if (day < d.unlockDay) return { kind: 'day', day: d.unlockDay };
  return null;
}

export function statusOf(d: UpgradeDef, day: number, have: ReadonlySet<string> = renoDone()): Status {
  if (have.has(d.id)) return 'done';
  return lockReason(d, day, have) ? 'locked' : 'available';
}

/** The stage the player is working on (the first one not finished), 7 when all are done. */
export function currentStage(have: ReadonlySet<string> = renoDone()): number {
  for (const s of STAGES) if (!stageDone(s.id, have)) return s.id;
  return 7;
}

/** The cheapest upgrade the player could buy right now, for the result card's nudge. */
export function affordable(day: number, cash: number): UpgradeDef | null {
  const have = renoDone();
  return UPGRADES.filter((d) => statusOf(d, day, have) === 'available' && d.price <= cash).sort((a, b) => a.price - b.price)[0] ?? null;
}

/** The storefront pieces in place: what the 3D shop shows outside the Renovation screen. */
export function visualsDone(): Set<VisualId> {
  const s = new Set<VisualId>();
  for (const id of renoDone()) { const d = byId(id); if (d) s.add(d.visual); }
  return s;
}

/** Shop level: how many of the 22 upgrades are done. */
export const shopLevel = (): number => renoDone().size;

/** Interior rewards an upgrade grants: the stage's reward, if this upgrade finishes it. */
export function rewardsFor(d: UpgradeDef): StageDef['reward'] {
  const have = new Set(renoDone());
  have.add(d.id);
  return stageDone(d.stage, have) && !stageDone(d.stage) ? STAGES[d.stage - 1].reward : [];
}
