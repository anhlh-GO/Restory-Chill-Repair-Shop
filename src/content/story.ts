// The levels: one customer, one gadget, one little story each.
// Chapter 1: twenty gadgets, each repaired once, over fifteen days: one-gadget days
// to breathe, two-gadget days (4, 7, 9, 12, 14) are the hard ones, with more and
// bigger jobs. Chapter 2 (days 16-30): the neighbours come back, one a day, with a
// new fault in the gadget we already know. The difficulty is never shown, only felt.

import type { DeviceDef } from './device';
import type { Look, Pose, Expr } from './characters';
import type { Txt } from '../core/i18n';
import { dryer } from './dev-dryer';
import { handheld } from './dev-console';
import { camera } from './dev-camera';
import { walkman } from './dev-walkman';
import { remote } from './dev-remote';
import { lamp } from './dev-lamp';
import { phone } from './dev-phone';
import { kettle } from './dev-kettle';
import { headphones } from './dev-headphones';
import { watch } from './dev-watch';
import { fan } from './dev-fan';
import { keyboard } from './dev-keyboard';
import { gamepad } from './dev-gamepad';
import { toaster } from './dev-toaster';
import { calculator } from './dev-calculator';
import { clock } from './dev-clock';
import { toothbrush } from './dev-toothbrush';
import { musicbox } from './dev-musicbox';
import { flashlight } from './dev-flashlight';
import { radio } from './dev-radio';

export interface Line { en: string; vi: string; expr?: Expr; pose?: Pose }

export type PuzzleSpec =
  | { kind: 'trace'; layout: number }
  | { kind: 'flow'; grid: number }
  | { kind: 'rotate'; size: number; seed: number }
  | AsmrSpec;

/** The hands-on mechanics: ASMR, wiring, antistress. See src/scenes/asmr.ts. */
export type AsmrSpec =
  /** Hold the iron on each pad until its solder blob fills. */
  | { kind: 'solder'; pads: number; seed: number }
  /** Drag each coloured wire to its terminal, then tap the terminal to tighten it. */
  | { kind: 'wire'; wires: number; seed: number }
  /** Pop every silicone dome of a rubber keypad / membrane. */
  | { kind: 'popit'; cols: number; rows: number; color: string }
  /** Peel the scratched protective film off a screen, from a corner. */
  | { kind: 'peel'; shape: 'screen' | 'round' | 'wide'; color: string }
  /** Hold the bulb blower over dust until it is all blown away; `look` = what is dusty. */
  | { kind: 'blow'; dust: number; seed: number; look?: 'fan' | 'shade' | 'grille' | 'tray' | 'comb' | 'reflector' }
  /** Press the cleaning gel into the gaps to lift the crumbs out. */
  | { kind: 'slime'; crumbs: number; seed: number; color: string }
  /** Turn in circles: wind the loose cassette tape back in ('tape', default), or wind a clockwork spring with its key ('spring'). */
  | { kind: 'wind'; turns: number; look?: 'tape' | 'spring' };

/** One repair job on one part. */
export interface Task { part: string; puzzle: PuzzleSpec }

export interface Level {
  name: string;
  tag: string;
  voice: number;
  look: Look;
  device: DeviceDef;
  broken: string;
  /** What the customer noticed: the Quick Diagnosis card shows it. */
  symptom: Txt;
  puzzle: PuzzleSpec;
  /** More hands-on jobs in the repair step, each on its own part. */
  tasks?: Task[];
  dirty: string[];
  pay: number;
  partPrice: number;
  day: number;
  timeIn: [number, number];
  timeOut: [number, number];
  arrive: Line[];
  leave: Line[];
}

const KAI: Look = { masc: true, skin: '#f6d2b8', hair: '#3b3442', hair2: '#c9e86a', style: 'spiky', outfit: 'hoodie', top: '#5b2a86', age: 'teen', eyes: '#3a4a6a' };

// returning customers
const BIN: Look = { masc: true, skin: '#9a6440', hair: '#1d1716', style: 'buzz', outfit: 'tee', top: '#f4c430', inner: '#e8573c', age: 'kid', eyes: '#2a1a12' };
const LENA: Look = { makeup: '#a8806a', skin: '#f7d9c4', hair: '#6b3e26', style: 'bob', outfit: 'jacket', top: '#2c3e66', inner: '#f2f2f2', age: 'adult', earrings: true, eyes: '#4a3020' };
const TUAN: Look = { masc: true, skin: '#d9a77c', hair: '#221a18', style: 'short', outfit: 'jacket', top: '#f07a1f', inner: '#2a2a2a', age: 'adult', hat: '#2f6f4f', eyes: '#2a1a12' };
const SAU: Look = { skin: '#eac6a8', hair: '#cfcfd4', style: 'bun', outfit: 'apron', top: '#6f8f5a', inner: '#f3e6cf', age: 'old', glasses: true, eyes: '#3a2a20' };
const KEN: Look = { masc: true, necklace: 'chain', skin: '#c88d64', hair: '#2a1d1a', style: 'curly', outfit: 'jacket', top: '#1f1f29', inner: '#e94f64', age: 'adult', earrings: true, eyes: '#2a1a12' };
const NINA: Look = { skin: '#fbe0cf', hair: '#c8452c', style: 'pony', outfit: 'tee', top: '#f49ac1', age: 'teen', freckles: true, eyes: '#3d6a3a' };
const LONG: Look = { masc: true, necklace: 'whistle', skin: '#d9a684', hair: '#1f1a17', style: 'buzz', outfit: 'jacket', top: '#2f8f4f', inner: '#f2f2f2', age: 'adult', beard: true, eyes: '#2a1a12' };
const VY: Look = { skin: '#f4dcd0', hair: '#1c1620', style: 'braids', outfit: 'dress', top: '#3a2a5e', age: 'adult', choker: true, earrings: true, lipstick: '#4a1632', makeup: '#6a3a76', bow: '#5b3a9e', nails: '#1a1420', necklace: 'cross', eyes: '#5a3a3a' };
const HOANG: Look = { masc: true, skin: '#e8c4a2', hair: '#d8d8d8', style: 'bald', outfit: 'cardigan', top: '#8a5a3b', inner: '#efe3cc', age: 'old', glasses: true, eyes: '#3a2a20' };
const HANA: Look = { skin: '#f8dcc8', hair: '#a8744a', style: 'long', outfit: 'jacket', top: '#d9c3a0', inner: '#ffffff', age: 'adult', hat: '#e9dcc2', eyes: '#5a3a20' };
// new faces
const DUC: Look = { masc: true, skin: '#f1d0b5', hair: '#2a2430', style: 'short', outfit: 'hoodie', top: '#2a6fd6', age: 'teen', glasses: true, eyes: '#2a2a3a' };
const BAO: Look = { masc: true, skin: '#d9a07a', hair: '#2a1d18', style: 'buzz', outfit: 'apron', top: '#f4f1ea', inner: '#d9772b', age: 'adult', beard: true, hat: '#ffffff', hatKind: 'chef', eyes: '#2a1a12' };
const LINH: Look = { skin: '#f7dccb', hair: '#4a2c20', style: 'curly', outfit: 'cardigan', top: '#e9a23b', inner: '#fff6e0', age: 'teen', freckles: true, eyes: '#4a3020' };
const HA: Look = { necklace: 'chain', makeup: '#9a7a8a', skin: '#f0d2bc', hair: '#2a2228', style: 'bun', outfit: 'shirt', top: '#6a8fd0', age: 'adult', glasses: true, earrings: true, eyes: '#3a2a30' };
const MAI: Look = { makeup: '#c48a9a', nails: '#e0569b', skin: '#f6d6c2', hair: '#3a2420', style: 'pony', outfit: 'shirt', top: '#e0569b', inner: '#ffffff', age: 'adult', earrings: true, lipstick: '#c4405a', eyes: '#3a2a20' };
const NHI: Look = { bow: '#ff6fa0', skin: '#f6d2b8', hair: '#2a1d1a', style: 'pony', outfit: 'tee', top: '#ffb3c7', inner: '#ffffff', age: 'kid', eyes: '#2a1a12' };
const TU: Look = { masc: true, skin: '#c9946c', hair: '#bdbdc2', style: 'short', outfit: 'jacket', top: '#4a6a8a', inner: '#e8e2d0', age: 'old', beard: true, hat: '#c9a46a', hatKind: 'bucket', eyes: '#2a1a12' };

export const LEVELS: Level[] = [
  {
    name: 'Kai', tag: '#4fbf9f', voice: 1.1, look: KAI,
    device: dryer, broken: 'heater', puzzle: { kind: 'trace', layout: 0 }, dirty: ['lower'],
    symptom: { en: "Only blows cold air.", vi: "Chỉ thổi ra gió lạnh." },
    pay: 17, partPrice: 8, day: 1, timeIn: [12, 3], timeOut: [18, 30],
    arrive: [
      { en: "Yo! You're the new repair guy, right? First customer, that's me. Lucky you.", vi: "Chào anh! Anh là thợ mới của tiệm hả? Khách đầu tiên là em nè. Hên ghê.", expr: 'happy', pose: 'wave' },
      { en: "This is my sister's hair dryer. I... borrowed it to dry Mochi after his bath. Mochi's my corgi.", vi: "Đây là máy sấy của chị em. Em... mượn để sấy cho Mochi sau khi tắm. Mochi là con corgi của em.", expr: 'neutral', pose: 'idle' },
      { en: "Halfway through it went 'pfft', and now it only blows cold air.", vi: "Đang sấy dở thì nó kêu 'phụt' một cái, giờ chỉ thổi ra gió lạnh.", expr: 'surprised', pose: 'idle' },
      { en: "So Mochi is half fluffy, half soggy. And my sister gets home at seven.", vi: "Giờ Mochi nửa bông nửa ướt. Mà bảy giờ chị em đi làm về rồi.", expr: 'annoyed', pose: 'cross' },
      { en: "Can you fix it before she finds out? Please?", vi: "Anh sửa giúp em trước khi chị phát hiện được không? Năn nỉ đó!", expr: 'grin', pose: 'peace' },
    ],
    leave: [
      { en: "Whoa, it's warm! And it looks even newer than before.", vi: "Ồ, gió ấm rồi! Còn sạch bóng hơn lúc trước nữa.", expr: 'surprised', pose: 'idle' },
      { en: "Mochi's gonna be the fluffiest dog on the street.", vi: "Mochi sắp thành con chó bông xù nhất phố luôn.", expr: 'happy', pose: 'cheer' },
      { en: "Our secret, okay? Keep the change, boss!", vi: "Bí mật giữa hai anh em nha. Tiền thừa anh giữ luôn!", expr: 'wink', pose: 'peace' },
    ],
  },
  {
    name: 'Bin', tag: '#e0569b', voice: 1.35,
    look: { masc: true, skin: '#9a6440', hair: '#1d1716', style: 'buzz', outfit: 'tee', top: '#f4c430', inner: '#e8573c', age: 'kid', eyes: '#2a1a12' },
    device: handheld, broken: 'board', puzzle: { kind: 'flow', grid: 0 }, dirty: ['front', 'bezel'],
    symptom: { en: "Screen goes stripy, then black.", vi: "Màn hình sọc sọc rồi tối thui." },
    pay: 17, partPrice: 7, day: 2, timeIn: [8, 2], timeOut: [12, 0],
    arrive: [
      { en: "Hi mister! I'm Bin. I'm eight and a half.", vi: "Con chào chú! Con là Bin. Con tám tuổi rưỡi.", expr: 'happy', pose: 'wave' },
      { en: "This was Grandpa's game when he was young. He had the best score in the whole neighbourhood.", vi: "Đây là máy chơi game hồi trẻ của ông nội con. Hồi đó ông giữ kỷ lục cả xóm luôn.", expr: 'grin', pose: 'idle' },
      { en: "I was ONE level from beating him, and the screen went all stripy. Then black.", vi: "Con chỉ còn MỘT màn nữa là phá kỷ lục của ông, thì màn hình sọc sọc. Rồi tối thui.", expr: 'sad', pose: 'shy' },
      { en: "Grandpa laughed. He says the machine is protecting his record.", vi: "Ông còn cười. Ông bảo cái máy đang bảo vệ kỷ lục cho ông.", expr: 'annoyed', pose: 'cross' },
      { en: "Please fix it, mister! I'll be super quiet while you work.", vi: "Chú sửa giúp con nha! Con hứa ngồi im re trong lúc chú làm.", expr: 'grin', pose: 'cheer' },
    ],
    leave: [
      { en: "It's ON! The music! Grandpa's music!", vi: "Lên rồi! Nhạc nè! Nhạc của ông nè!", expr: 'surprised', pose: 'cheer' },
      { en: "Tonight I beat the record. For real this time.", vi: "Tối nay con phá kỷ lục. Lần này là thật đó.", expr: 'happy', pose: 'cheer' },
      { en: "I'll come back and tell you. Don't tell Grandpa first, okay?", vi: "Mai con qua kể chú nghe. Mà chú đừng kể ông trước nha!", expr: 'wink', pose: 'peace' },
      { en: 'Mister, do you have a shelf for pictures of everything you fixed?', vi: 'Chú có cái kệ nào để giữ hình những món đã sửa không?', expr: 'surprised', pose: 'think' },
    ],
  },
  {
    name: 'Vy', tag: '#e07b39', voice: 0.9,
    look: VY,
    device: camera, broken: 'shutter', puzzle: { kind: 'rotate', size: 3, seed: 7 }, dirty: ['lens', 'plate'],
    symptom: { en: "Shutter clicks halfway, then nothing.", vi: "Màn trập bấm nửa chừng rồi kẹt." },
    pay: 24, partPrice: 9, day: 3, timeIn: [12, 4], timeOut: [17, 40],
    arrive: [
      { en: "Ha, so this is the famous repair corner. Hi, I'm Vy. I run the little vinyl and tape workshop down the street.", vi: "Ha, ra đây là tiệm sửa đồ nổi tiếng. Chào anh, tôi là Vy. Tôi mở xưởng phục chế đĩa than và băng từ ở cuối phố.", expr: 'happy', pose: 'laugh' },
      { en: "This camera was my mom's. She photographed every concert she ever went to.", vi: "Máy ảnh này của mẹ tôi. Bà chụp lại mọi buổi hòa nhạc bà từng đi.", expr: 'neutral', pose: 'idle' },
      { en: "Now the shutter jams halfway. Click... and nothing. Like it's holding its breath.", vi: "Giờ màn trập kẹt nửa chừng. Tách... rồi im luôn. Như thể nó đang nín thở.", expr: 'sad', pose: 'shy' },
      { en: "My workshop opens Friday night. I want the first photos to come from her camera.", vi: "Tối thứ Sáu xưởng tôi khai trương. Tôi muốn những tấm ảnh đầu tiên được chụp bằng máy của mẹ.", expr: 'neutral', pose: 'cross' },
      { en: "No pressure. Okay, a little pressure.", vi: "Không áp lực gì đâu. À, áp lực một chút.", expr: 'wink', pose: 'rock' },
    ],
    leave: [
      { en: "That sound... Click. Whirr. Just like when I was little.", vi: "Tiếng này... Tách. Rè rè. Y như hồi tôi còn nhỏ.", expr: 'surprised', pose: 'idle' },
      { en: "...It's like she's holding it with me. Thank you, really.", vi: "...Cứ như mẹ đang cầm máy cùng tôi. Cảm ơn anh, thật lòng.", expr: 'happy', pose: 'laugh' },
      { en: "Come to the opening. First record's on me, and I'm taking your picture.", vi: "Hôm khai trương ghé nhé. Đĩa đầu tiên tôi mời, còn anh làm mẫu ảnh cho tôi.", expr: 'wink', pose: 'rock' },
    ],
  },
  {
    name: 'Mr. Hoang', tag: '#7d8fd6', voice: 0.75,
    look: HOANG,
    device: walkman, broken: 'motor', puzzle: { kind: 'trace', layout: 1 }, tasks: [{ part: 'tape', puzzle: { kind: 'wind', turns: 6 } }], dirty: ['door', 'keys', 'shell'],
    symptom: { en: "Plays too slow. Tape tangled.", vi: "Phát chậm rì, băng bị rối." },
    pay: 28, partPrice: 8, day: 4, timeIn: [9, 15], timeOut: [13, 30],
    arrive: [
      { en: 'Good morning, young one.', vi: 'Chào buổi sáng, cậu trai trẻ.', expr: 'happy', pose: 'wave' },
      { en: 'This walkman plays my wife\'s singing too slow. She sounds like a sleepy bear.', vi: 'Cái máy này phát giọng hát của vợ tôi chậm rì. Nghe như con gấu buồn ngủ.', expr: 'grin', pose: 'idle' },
      { en: "She'd laugh at that. But I'd like to hear her right again.", vi: 'Bà ấy mà nghe chắc cười lắm. Nhưng tôi muốn nghe lại giọng bà cho đúng.', expr: 'sad', pose: 'shy' },
    ],
    leave: [
      { en: "Ah... there she is. Just like the summer of '89.", vi: 'À... bà ấy đây rồi. Y như mùa hè năm 89.', expr: 'happy', pose: 'idle' },
      { en: 'You have kind hands. Thank you.', vi: 'Cậu có đôi tay hiền lành lắm. Cảm ơn cậu.', expr: 'grin', pose: 'wave' },
      { en: 'Some things get fixed, but the memories stay with them.', vi: 'Có những món đồ sửa xong, nhưng ký ức thì ở lại.', expr: 'happy', pose: 'idle' },
    ],
  },
  {
    name: 'Nina', tag: '#ef6f6c', voice: 1.25, look: NINA,
    device: remote, broken: 'springs', puzzle: { kind: 'wire', wires: 3, seed: 5 }, tasks: [{ part: 'membrane', puzzle: { kind: 'popit', cols: 4, rows: 5, color: '#8c8698' } }], dirty: ['top', 'door'],
    symptom: { en: "Works only if you smack it.", vi: "Phải đập mới chịu chạy." },
    pay: 30, partPrice: 8, day: 4, timeIn: [16, 40], timeOut: [19, 0],
    arrive: [
      { en: 'Hiii! Movie night at my place tonight, and THIS happened.', vi: 'Chàooo! Tối nay tụi em xem phim ở nhà em, vậy mà nó dở chứng.', expr: 'grin', pose: 'wave' },
      { en: 'The remote only works if you smack it. My hand hurts. The couch hurts.', vi: 'Cái remote phải đập mới chịu chạy. Tay em đau. Cái ghế cũng đau.', expr: 'annoyed', pose: 'cross' },
      { en: 'Also the buttons feel like old gum. Please make it clicky again!', vi: 'Mấy cái nút còn mềm nhũn như kẹo cao su cũ. Anh làm nó bấm sướng lại nha!', expr: 'happy', pose: 'peace' },
    ],
    leave: [
      { en: 'Click, click, click! No smacking needed!', vi: 'Tách, tách, tách! Khỏi phải đập luôn!', expr: 'happy', pose: 'cheer' },
      { en: "I'm saving you a seat. Bring snacks, okay?", vi: 'Em chừa anh một ghế nha. Nhớ mang bỏng ngô!', expr: 'wink', pose: 'peace' },
    ],
  },
  {
    name: 'Lena', tag: '#3f9ad6', voice: 1.05, look: LENA,
    device: lamp, broken: 'switch', puzzle: { kind: 'wire', wires: 3, seed: 11 }, tasks: [{ part: 'shade', puzzle: { kind: 'blow', dust: 36, seed: 3, look: 'shade' } }], dirty: ['base'],
    symptom: { en: "Flickers on and off like a disco.", vi: "Chớp tắt liên tục như sàn nhảy." },
    pay: 26, partPrice: 9, day: 5, timeIn: [18, 20], timeOut: [21, 0],
    arrive: [
      { en: 'Good evening! Quick question: is a lamp supposed to blink like a disco?', vi: 'Chào anh! Hỏi nhanh nè: đèn bàn chớp như sàn nhảy có bình thường không?', expr: 'surprised', pose: 'idle' },
      { en: "I'm finishing my design portfolio at night and it keeps flickering off.", vi: 'Tôi đang hoàn thiện bộ hồ sơ thiết kế ban đêm mà nó cứ chập chờn tắt.', expr: 'annoyed', pose: 'cross' },
      { en: 'The deadline is Friday. Save me?', vi: 'Hạn chót là thứ Sáu. Anh cứu tôi nhé?', expr: 'neutral', pose: 'shy' },
    ],
    leave: [
      { en: 'Steady warm light. My eyes say thank you.', vi: 'Ánh sáng vàng ấm, đều tăm tắp. Mắt tôi cảm ơn anh.', expr: 'happy', pose: 'cheer' },
      { en: "When the portfolio wins something, I'm crediting your shop!", vi: 'Hồ sơ mà đoạt giải, tôi sẽ ghi tên tiệm anh vào!', expr: 'wink', pose: 'peace' },
    ],
  },
  {
    name: 'Tuan', tag: '#f08a24', voice: 1.0, look: TUAN,
    device: phone, broken: 'lcd', puzzle: { kind: 'peel', shape: 'screen', color: '#2c4fa8' }, tasks: [{ part: 'keypad', puzzle: { kind: 'popit', cols: 3, rows: 5, color: '#c9cdd6' } }], dirty: ['cover', 'bcover'],
    symptom: { en: "Screen too scratched to read.", vi: "Màn hình xước, đọc không ra chữ." },
    pay: 28, partPrice: 10, day: 6, timeIn: [11, 20], timeOut: [12, 25],
    arrive: [
      { en: "Delivery! ...Just kidding, it's mine this time.", vi: 'Giao hàng đây! ...Đùa thôi, lần này là đồ của tôi.', expr: 'grin', pose: 'wave' },
      { en: 'My backup phone. Unbreakable, they said. The screen is so scratched I read addresses by guessing.', vi: 'Điện thoại dự phòng của tôi. Người ta bảo nó không bao giờ hỏng. Màn hình xước tới mức tôi đọc địa chỉ bằng cách đoán.', expr: 'surprised', pose: 'idle' },
      { en: "And the keys don't click. I only have an hour for lunch, but I'll wait!", vi: 'Phím thì bấm không ăn. Tôi chỉ có một tiếng nghỉ trưa, nhưng tôi chờ được!', expr: 'happy', pose: 'peace' },
    ],
    leave: [
      { en: "Crystal clear! I can see the snake game again.", vi: 'Nét căng! Thấy rõ cả game rắn săn mồi luôn.', expr: 'happy', pose: 'cheer' },
      { en: 'Gotta run, three bowls of noodles are getting cold!', vi: 'Tôi phải chạy đây, ba tô phở đang nguội!', expr: 'grin', pose: 'wave' },
    ],
  },
  {
    name: 'Grandma Sau', tag: '#c45a8a', voice: 0.85, look: SAU,
    device: kettle, broken: 'thermo', puzzle: { kind: 'wire', wires: 3, seed: 17 }, tasks: [{ part: 'plate', puzzle: { kind: 'slime', crumbs: 34, seed: 4, color: '#8fd3c7' } }], dirty: ['body', 'lid', 'handle'],
    symptom: { en: "Clicks off before the water boils.", vi: "Chưa sôi đã tự tắt." },
    pay: 36, partPrice: 10, day: 7, timeIn: [15, 0], timeOut: [17, 20],
    arrive: [
      { en: 'Hello dear, I brought you some sticky rice cakes.', vi: 'Chào con, bà mang bánh dày cho con nè.', expr: 'happy', pose: 'idle' },
      { en: "My kettle clicks off before the water boils. And the inside looks like a cave.", vi: 'Cái ấm của bà chưa sôi đã tắt phụt. Bên trong thì đóng cặn như hang đá.', expr: 'sad', pose: 'shy' },
      { en: 'The ladies come for tea every afternoon. No tea, no gossip!', vi: 'Chiều nào mấy bà cũng sang uống trà. Không có trà là không có chuyện để kể!', expr: 'grin', pose: 'wave' },
    ],
    leave: [
      { en: 'Listen to it bubble! Like a little song.', vi: 'Nghe nó reo kìa! Như một bài hát nhỏ.', expr: 'surprised', pose: 'cheer' },
      { en: "Here, eat a cake while it's warm.", vi: 'Nè, ăn bánh lúc còn ấm nha con.', expr: 'happy', pose: 'idle' },
      { en: "I'll bring you a tea cloth too. A shop feels warmer with one.", vi: 'Để bà mang cho cái khăn trải bàn, tiệm sẽ ấm hơn.', expr: 'grin', pose: 'wave' },
    ],
  },
  {
    name: 'DJ Ken', tag: '#9a5be0', voice: 0.95, look: KEN,
    device: headphones, broken: 'driverL', puzzle: { kind: 'wire', wires: 4, seed: 23 }, tasks: [{ part: 'board', puzzle: { kind: 'solder', pads: 8, seed: 9 } }], dirty: ['cushionL', 'cushionR', 'headband'],
    symptom: { en: "Left side went silent.", vi: "Bên trái câm hẳn." },
    pay: 38, partPrice: 11, day: 7, timeIn: [19, 30], timeOut: [21, 10],
    arrive: [
      { en: 'Yo, maestro. Emergency in the bass department.', vi: 'Chào thầy. Có chuyện khẩn ở khu vực âm trầm.', expr: 'neutral', pose: 'idle' },
      { en: 'My lucky headphones went silent on the left. I mix half-deaf now.', vi: 'Cái tai nghe may mắn của tôi câm bên trái. Giờ tôi chỉnh nhạc kiểu điếc một bên.', expr: 'annoyed', pose: 'cross' },
      { en: 'Gig at midnight. The crowd deserves stereo.', vi: 'Nửa đêm nay có show. Khán giả xứng đáng được nghe đủ hai bên.', expr: 'grin', pose: 'peace' },
    ],
    leave: [
      { en: 'Left. Right. Left. Right. Beautiful.', vi: 'Trái. Phải. Trái. Phải. Tuyệt vời.', expr: 'happy', pose: 'cheer' },
      { en: "Tonight's first track is called 'Chill Fix'. You're famous now.", vi: 'Bài mở màn tối nay tên là "Chill Fix". Anh nổi tiếng rồi đó.', expr: 'wink', pose: 'wave' },
      { en: "Get a display corner and I'll bring you a gig poster!", vi: 'Khi nào có góc trưng bày, tôi mang poster show tới!', expr: 'grin', pose: 'rock' },
    ],
  },
  {
    name: 'Hana', tag: '#d4a017', voice: 1.15, look: HANA,
    device: watch, broken: 'glass', puzzle: { kind: 'peel', shape: 'round', color: '#2a2d36' }, tasks: [{ part: 'board', puzzle: { kind: 'solder', pads: 5, seed: 14 } }], dirty: ['strapT', 'case'],
    symptom: { en: "Glass all scratched, died mid-run.", vi: "Mặt kính xước, tắt giữa đường chạy." },
    pay: 34, partPrice: 12, day: 8, timeIn: [6, 40], timeOut: [9, 30],
    arrive: [
      { en: 'Morning! Sorry, I ran here. Literally ran.', vi: 'Chào buổi sáng! Xin lỗi, tôi chạy tới đây. Chạy thật luôn.', expr: 'grin', pose: 'wave' },
      { en: 'My first marathon is next week and my watch died mid-run. The glass is all scratched too.', vi: 'Tuần sau tôi chạy marathon đầu tiên mà đồng hồ tắt ngúm giữa đường. Mặt kính còn xước hết.', expr: 'sad', pose: 'shy' },
      { en: "Without it I don't know if I'm fast or just sweaty.", vi: 'Không có nó tôi chẳng biết mình chạy nhanh hay chỉ đổ mồ hôi.', expr: 'neutral', pose: 'think' },
    ],
    leave: [
      { en: 'Heart rate: excited! Thank you!', vi: 'Nhịp tim: đang phấn khích! Cảm ơn anh!', expr: 'happy', pose: 'cheer' },
      { en: "I'll run past your window every morning. Wave at me!", vi: 'Sáng nào tôi cũng sẽ chạy ngang tiệm. Vẫy tay với tôi nha!', expr: 'wink', pose: 'wave' },
    ],
  },
  {
    name: 'Coach Long', tag: '#3fa34d', voice: 0.8, look: LONG,
    device: fan, broken: 'rotor', puzzle: { kind: 'blow', dust: 68, seed: 8 }, tasks: [{ part: 'motor', puzzle: { kind: 'wire', wires: 4, seed: 31 } }], dirty: ['cage', 'housing', 'rear'],
    symptom: { en: "Hums, but the blades won't turn.", vi: "Kêu ù ù mà cánh không quay." },
    pay: 41, partPrice: 12, day: 9, timeIn: [13, 0], timeOut: [16, 30],
    arrive: [
      { en: 'Afternoon. This fan has cooled my boxing gym for twenty years.', vi: 'Chào cậu. Cái quạt này làm mát phòng tập quyền anh của tôi hai mươi năm rồi.', expr: 'neutral', pose: 'idle' },
      { en: 'Now it hums like it is trying, but the blades just sit there. Like my students on Monday.', vi: 'Giờ nó cứ ù ù như đang cố, mà cánh thì đứng im. Giống học trò tôi sáng thứ Hai.', expr: 'annoyed', pose: 'cross' },
      { en: 'And it is... a little dusty. Do your best.', vi: 'Mà nó... hơi bụi một chút. Cậu cố lên.', expr: 'grin', pose: 'think' },
    ],
    leave: [
      { en: 'Feel that breeze! Champion fan!', vi: 'Gió mát quá! Quạt vô địch!', expr: 'happy', pose: 'cheer' },
      { en: 'Come train with us. First class is free, and the air is fresh now.', vi: 'Qua tập với tụi tôi đi. Buổi đầu miễn phí, giờ không khí còn trong lành nữa.', expr: 'wink', pose: 'wave' },
    ],
  },
  {
    name: 'Duc', tag: '#2a6fd6', voice: 1.2, look: DUC,
    device: keyboard, broken: 'case', puzzle: { kind: 'slime', crumbs: 42, seed: 6, color: '#f2b4d8' }, tasks: [{ part: 'pcb', puzzle: { kind: 'solder', pads: 10, seed: 27 } }, { part: 'mods', puzzle: { kind: 'popit', cols: 5, rows: 2, color: '#f6b8c8' } }], dirty: ['keysTop', 'space'],
    symptom: { en: "Bubble tea spill, keys sticking.", vi: "Đổ trà sữa, phím dính." },
    pay: 44, partPrice: 12, day: 9, timeIn: [20, 15], timeOut: [22, 0],
    arrive: [
      { en: "Hey. I'm Duc. I stream games at night. Small channel. Very loyal fans.", vi: 'Chào anh. Em là Đức. Em stream game buổi tối. Kênh nhỏ thôi nhưng fan trung thành lắm.', expr: 'neutral', pose: 'idle' },
      { en: 'I spilled bubble tea on my keyboard. Now W sticks and half the row is dead.', vi: 'Em làm đổ trà sữa lên bàn phím. Giờ phím W dính, nửa hàng thì chết luôn.', expr: 'sad', pose: 'shy' },
      { en: "I can't walk forward. In ANY game. Please.", vi: 'Em không đi tới được. Trong BẤT KỲ game nào. Cứu em.', expr: 'annoyed', pose: 'cross' },
    ],
    leave: [
      { en: 'Thock thock thock. That sound. Chef\'s kiss.', vi: 'Lạch cạch lạch cạch. Âm thanh này. Đỉnh của chóp.', expr: 'happy', pose: 'cheer' },
      { en: "I'm putting your shop in my stream title tonight!", vi: 'Tối nay em ghi tên tiệm anh lên tiêu đề stream luôn!', expr: 'grin', pose: 'peace' },
      { en: "And I'll show the whole stream your new shop sign.", vi: 'Em sẽ cho cả stream xem chiếc biển hiệu mới của tiệm.', expr: 'wink', pose: 'peace' },
    ],
  },
  {
    name: 'Bin', tag: '#e0569b', voice: 1.35, look: BIN,
    device: gamepad, broken: 'membrane', puzzle: { kind: 'popit', cols: 4, rows: 3, color: '#b9a4e8' }, tasks: [{ part: 'rumbleL', puzzle: { kind: 'wire', wires: 2, seed: 41 } }], dirty: ['top', 'shoulderL'],
    symptom: { en: "The A button is mushy.", vi: "Nút A mềm nhũn." },
    pay: 36, partPrice: 13, day: 10, timeIn: [9, 0], timeOut: [11, 30],
    arrive: [
      { en: 'Mister! I beat Grandpa\'s record! He was SO proud.', vi: 'Chú ơi! Con phá kỷ lục của ông rồi! Ông tự hào lắm luôn.', expr: 'happy', pose: 'cheer' },
      { en: 'So now we play together. But his controller is ancient. The A button is mushy and it stopped rumbling.', vi: 'Giờ hai ông cháu chơi chung. Mà tay cầm của ông cổ lắm. Nút A mềm nhũn, rung cũng không rung nữa.', expr: 'sad', pose: 'shy' },
      { en: 'Grandpa says rumble is the best part. He laughs every time.', vi: 'Ông bảo rung là phần hay nhất. Lần nào rung ông cũng cười.', expr: 'grin', pose: 'peace' },
    ],
    leave: [
      { en: 'Brrrr! It tickles! Grandpa is gonna laugh so hard.', vi: 'Rừ rừ! Nhột quá! Ông sẽ cười to lắm cho xem.', expr: 'happy', pose: 'cheer' },
      { en: 'Co-op night! You can be player three.', vi: 'Tối nay chơi chung! Chú làm người chơi thứ ba nha.', expr: 'wink', pose: 'wave' },
      { en: 'Grandpa and me have a record together now!', vi: 'Ông cháu con có thêm một kỷ lục chung rồi!', expr: 'happy', pose: 'cheer' },
    ],
  },
  {
    name: 'Chef Bao', tag: '#d9772b', voice: 0.82, look: BAO,
    device: toaster, broken: 'tray', puzzle: { kind: 'blow', dust: 44, seed: 19, look: 'tray' }, tasks: [{ part: 'element', puzzle: { kind: 'wire', wires: 2, seed: 7 } }], dirty: ['shell'],
    symptom: { en: "Toasts only one side.", vi: "Chỉ nướng được một bên." },
    pay: 38, partPrice: 13, day: 11, timeIn: [6, 10], timeOut: [7, 45],
    arrive: [
      { en: "Morning! Chef Bao, banh mi cart, corner of the market.", vi: 'Chào cậu! Bảo đây, xe bánh mì góc chợ.', expr: 'grin', pose: 'wave' },
      { en: 'My toaster warms only one side now. Half crunchy, half sad.', vi: 'Máy nướng của tôi giờ chỉ nóng một bên. Nửa giòn, nửa buồn.', expr: 'annoyed', pose: 'cross' },
      { en: 'Forty customers at seven. No pressure. Okay, some pressure.', vi: 'Bảy giờ có bốn chục khách. Không áp lực đâu. À, cũng hơi áp lực.', expr: 'surprised', pose: 'think' },
    ],
    leave: [
      { en: 'Golden on both sides! Smell that!', vi: 'Vàng đều hai mặt! Ngửi thử đi!', expr: 'happy', pose: 'cheer' },
      { en: 'Your banh mi is free forever. Extra pate.', vi: 'Bánh mì của cậu miễn phí trọn đời. Thêm pa-tê nha.', expr: 'wink', pose: 'peace' },
    ],
  },
  {
    name: 'Linh', tag: '#e9a23b', voice: 1.18, look: LINH,
    device: calculator, broken: 'keys', puzzle: { kind: 'popit', cols: 4, rows: 5, color: '#e8e2d4' }, tasks: [{ part: 'lcd', puzzle: { kind: 'peel', shape: 'wide', color: '#3a3f4a' } }, { part: 'board', puzzle: { kind: 'solder', pads: 7, seed: 45 } }], dirty: ['case', 'back'],
    symptom: { en: "The 7 key doesn't press.", vi: "Phím 7 bấm không ăn." },
    pay: 46, partPrice: 13, day: 12, timeIn: [9, 30], timeOut: [11, 0],
    arrive: [
      { en: 'Hi! Math exam tomorrow. Final. Biggest one.', vi: 'Chào anh! Mai em thi toán. Thi cuối kỳ. Bài to nhất.', expr: 'surprised', pose: 'idle' },
      { en: "This calculator was my dad's in university. It's my lucky one. The screen is foggy and the 7 doesn't press.", vi: 'Máy tính này hồi đại học của bố em. Là máy may mắn của em. Màn hình mờ căm, phím 7 bấm không ăn.', expr: 'sad', pose: 'shy' },
      { en: 'Every answer has a 7 in it. I just know it.', vi: 'Kiểu gì đáp án cũng có số 7. Em linh cảm vậy.', expr: 'annoyed', pose: 'think' },
    ],
    leave: [
      { en: 'Seven! Seventy-seven! Clear as day!', vi: 'Bảy! Bảy mươi bảy! Rõ như ban ngày!', expr: 'happy', pose: 'cheer' },
      { en: "If I get an A, I'll bring you a cake. Dad's idea.", vi: 'Em mà được điểm A, em mang bánh qua cho anh. Ý của bố em đó.', expr: 'wink', pose: 'peace' },
    ],
  },
  {
    name: 'Ms. Ha', tag: '#6a8fd0', voice: 0.92, look: HA,
    device: clock, broken: 'movement', puzzle: { kind: 'wind', turns: 8, look: 'spring' }, tasks: [{ part: 'glass', puzzle: { kind: 'peel', shape: 'round', color: '#c94a3a' } }, { part: 'aboard', puzzle: { kind: 'solder', pads: 7, seed: 33 } }], dirty: ['case', 'bellL', 'bellR'],
    symptom: { en: "Stopped ticking overnight.", vi: "Đang chạy thì đứng im." },
    pay: 48, partPrice: 14, day: 12, timeIn: [13, 5], timeOut: [17, 0],
    arrive: [
      { en: 'Good morning. I am a teacher. I have not been late in twelve years.', vi: 'Chào cậu. Tôi là giáo viên. Mười hai năm nay tôi chưa đi trễ lần nào.', expr: 'neutral', pose: 'idle' },
      { en: 'This morning my alarm clock simply... stopped. I was late. Five minutes. The children cheered.', vi: 'Sáng nay đồng hồ báo thức của tôi cứ thế... đứng im. Tôi đi trễ. Năm phút. Học trò reo hò.', expr: 'annoyed', pose: 'cross' },
      { en: 'It must not happen again. My reputation depends on you.', vi: 'Không được để chuyện đó lặp lại. Danh dự của tôi trông cả vào cậu.', expr: 'sad', pose: 'think' },
    ],
    leave: [
      { en: 'Tick, tock. RRRRING! Oh, that is a proper alarm.', vi: 'Tích, tắc. RENG RENG! Đây mới là đồng hồ báo thức chứ.', expr: 'surprised', pose: 'cheer' },
      { en: 'Full marks, young man. Full marks.', vi: 'Mười điểm, cậu trai trẻ. Mười điểm.', expr: 'happy', pose: 'wave' },
    ],
  },
  {
    name: 'Mai', tag: '#e0569b', voice: 1.08, look: MAI,
    device: toothbrush, broken: 'head', puzzle: { kind: 'slime', crumbs: 18, seed: 12, color: '#9ee6f2' }, tasks: [{ part: 'board', puzzle: { kind: 'solder', pads: 4, seed: 51 } }], dirty: ['sleeve'],
    symptom: { en: "Head is grimy, died mid-brush.", vi: "Đầu chải bám cặn, chết giữa chừng." },
    pay: 40, partPrice: 14, day: 13, timeIn: [12, 10], timeOut: [13, 20],
    arrive: [
      { en: "Hi, lunch break, so I'll be quick! Dentist at two.", vi: 'Chào anh, đang nghỉ trưa nên tôi nói nhanh! Hai giờ tôi đi nha sĩ.', expr: 'grin', pose: 'wave' },
      { en: 'My toothbrush died mid-brush this morning. I walked into a meeting with half a smile.', vi: 'Sáng nay bàn chải điện chết giữa chừng. Tôi bước vào cuộc họp với nửa nụ cười sạch.', expr: 'annoyed', pose: 'cross' },
      { en: "And the head is... let's not talk about the head.", vi: 'Còn cái đầu bàn chải thì... thôi đừng nhắc tới nó.', expr: 'sad', pose: 'shy' },
    ],
    leave: [
      { en: 'Bzzzz! Sparkly clean, like new!', vi: 'Bzzzz! Sạch bóng, như mới luôn!', expr: 'happy', pose: 'cheer' },
      { en: 'My dentist will think I became a new person.', vi: 'Nha sĩ chắc tưởng tôi là người khác luôn.', expr: 'wink', pose: 'peace' },
    ],
  },
  {
    name: 'Nhi', tag: '#ff8fb1', voice: 1.4, look: NHI,
    device: musicbox, broken: 'spring', puzzle: { kind: 'wind', turns: 7, look: 'spring' }, tasks: [{ part: 'comb', puzzle: { kind: 'blow', dust: 44, seed: 21, look: 'comb' } }, { part: 'glass', puzzle: { kind: 'peel', shape: 'round', color: '#8a5a32' } }], dirty: ['box', 'dancer'],
    symptom: { en: "The dancer stopped, the song is silent.", vi: "Vũ công không múa, nhạc im bặt." },
    pay: 40, partPrice: 10, day: 14, timeIn: [10, 30], timeOut: [15, 0],
    arrive: [
      { en: "Hello! I'm Nhi. Grandma Sau is my grandma! She said you fix everything.", vi: 'Chào chú! Con là Nhi. Bà Sáu là bà nội con! Bà nói chú sửa được mọi thứ.', expr: 'happy', pose: 'wave' },
      { en: "Grandma gave me her music box. But the dancer stopped dancing and the song stopped singing.", vi: 'Bà cho con hộp nhạc của bà. Mà cô vũ công không múa nữa, bài hát cũng im luôn.', expr: 'sad', pose: 'shy' },
      { en: 'It plays the song Grandma sang to Dad. I want to hear it.', vi: 'Nó phát bài bà hay hát cho bố con nghe hồi nhỏ. Con muốn được nghe.', expr: 'neutral', pose: 'think' },
    ],
    leave: [
      { en: 'She is dancing! Listen, listen!', vi: 'Cô ấy múa rồi! Chú nghe nè, nghe nè!', expr: 'happy', pose: 'cheer' },
      { en: "I'm going to play it for Grandma right now!", vi: 'Con về mở cho bà nghe ngay đây!', expr: 'grin', pose: 'wave' },
      { en: 'Grandma Sau says old things here all have a story to tell.', vi: 'Bà Sáu bảo ở đây đồ cũ đều có chuyện để kể.', expr: 'happy', pose: 'idle' },
    ],
  },
  {
    name: 'Mr. Tu', tag: '#4a7a9a', voice: 0.72, look: TU,
    device: flashlight, broken: 'spring', puzzle: { kind: 'wire', wires: 3, seed: 61 }, tasks: [{ part: 'lens', puzzle: { kind: 'peel', shape: 'round', color: '#3d4a5a' } }, { part: 'reflector', puzzle: { kind: 'blow', dust: 40, seed: 37, look: 'reflector' } }, { part: 'led', puzzle: { kind: 'solder', pads: 6, seed: 63 } }], dirty: ['head', 'cover'],
    symptom: { en: "Flickers like a sleepy firefly.", vi: "Chập chờn như đom đóm buồn ngủ." },
    pay: 52, partPrice: 15, day: 14, timeIn: [17, 50], timeOut: [19, 10],
    arrive: [
      { en: 'Evening, son. I fish at night, out past the bridge.', vi: 'Chào con. Tối nào bác cũng đi câu, ngoài chân cầu kia.', expr: 'neutral', pose: 'idle' },
      { en: "This flashlight flickers like a sleepy firefly. Last night I almost stepped on a crab.", vi: 'Cái đèn pin này chập chờn như con đom đóm buồn ngủ. Tối qua bác suýt dẫm lên con cua.', expr: 'grin', pose: 'think' },
      { en: 'The crab was not happy. Neither was I.', vi: 'Con cua không vui. Bác cũng chẳng vui.', expr: 'annoyed', pose: 'cross' },
    ],
    leave: [
      { en: 'Like a lighthouse! The fish will come to see.', vi: 'Sáng như ngọn hải đăng! Cá cũng phải bơi lại xem.', expr: 'happy', pose: 'cheer' },
      { en: "Tomorrow I'll bring you the biggest one I catch.", vi: 'Mai bác mang con cá to nhất bác câu được qua cho con.', expr: 'wink', pose: 'wave' },
    ],
  },
  {
    name: 'Kai', tag: '#4fbf9f', voice: 1.1, look: KAI,
    device: radio, broken: 'tape', puzzle: { kind: 'wind', turns: 6 }, tasks: [{ part: 'spkL', puzzle: { kind: 'wire', wires: 4, seed: 71 } }, { part: 'grilleL', puzzle: { kind: 'blow', dust: 40, seed: 29, look: 'grille' } }, { part: 'board', puzzle: { kind: 'solder', pads: 9, seed: 77 } }], dirty: ['shell', 'door'],
    symptom: { en: "It ate the mixtape.", vi: "Nuốt mất cuộn băng." },
    pay: 60, partPrice: 18, day: 15, timeIn: [10, 0], timeOut: [17, 30],
    arrive: [
      { en: "Boss! Mochi is super fluffy now. All thanks to you.", vi: 'Anh ơi! Mochi giờ bông xù lắm. Nhờ anh hết đó.', expr: 'grin', pose: 'peace' },
      { en: "Big news: the whole street is throwing a party tonight. Everyone you helped is coming.", vi: 'Tin lớn nè: tối nay cả khu phố mở tiệc. Ai được anh sửa đồ cũng tới hết.', expr: 'happy', pose: 'cheer' },
      { en: "But my sister's boombox ate the mixtape. No music, no party. You're our only hope!", vi: 'Mà cái radio của chị em nuốt mất cuộn băng rồi. Không nhạc là không tiệc. Chỉ còn trông vào anh thôi!', expr: 'sad', pose: 'shy' },
    ],
    leave: [
      { en: "It plays! Loud! The whole street's gonna dance!", vi: 'Kêu rồi! To nữa! Cả phố sắp nhảy hết luôn!', expr: 'happy', pose: 'cheer' },
      { en: "Close the shop early tonight, boss. You're the guest of honor.", vi: 'Tối nay anh đóng tiệm sớm nha. Anh là khách mời danh dự đó.', expr: 'wink', pose: 'wave' },
      { en: "The whole street is coming. Maybe we make a memory corner for everyone?", vi: 'Cả phố tới dự tiệc, hay mình làm góc kỷ niệm cho mọi người?', expr: 'grin', pose: 'peace' },
    ],
  },

  // ---------------- Chapter 2: days 16-30 ----------------
  // The neighbours come back with the same gadgets and new faults: one customer
  // a day, each story a step after their first visit.
  {
    name: 'Vy', tag: '#e07b39', voice: 0.9, look: VY,
    device: camera, broken: 'lens', puzzle: { kind: 'peel', shape: 'round', color: '#2a2a33' }, tasks: [{ part: 'flash', puzzle: { kind: 'blow', dust: 38, seed: 81, look: 'reflector' } }], dirty: ['body', 'plate'],
    symptom: { en: 'Every photo comes out foggy.', vi: 'Ảnh chụp ra tấm nào cũng mờ.' },
    pay: 50, partPrice: 14, day: 16, timeIn: [10, 20], timeOut: [15, 0],
    arrive: [
      { en: "I just developed the party photos. There's one of the whole street together.", vi: 'Tôi vừa rửa ảnh buổi tiệc. Có một tấm chụp cả khu phố.', expr: 'happy', pose: 'wave' },
      { en: 'But the lens went foggy. Every shot after it looks like it was taken through steam.', vi: 'Nhưng ống kính lại mờ. Mấy tấm sau tấm nào cũng như chụp qua hơi nước.', expr: 'sad', pose: 'shy' },
      { en: "Mom's camera deserves sharp pictures. So does this street.", vi: 'Máy của mẹ xứng đáng có ảnh nét. Khu phố này cũng vậy.', expr: 'neutral', pose: 'think' },
    ],
    leave: [
      { en: 'Sharp as the day she bought it.', vi: 'Nét như ngày mẹ mới mua.', expr: 'surprised', pose: 'idle' },
      { en: 'Mom used to say: a good photo keeps the people you love.', vi: 'Mẹ tôi từng bảo: ảnh đẹp là ảnh giữ được người mình thương.', expr: 'happy', pose: 'laugh' },
      { en: "I'll hang the street photo by your counter. It belongs here.", vi: 'Tôi sẽ treo tấm ảnh cả phố cạnh quầy của anh. Nó thuộc về nơi này.', expr: 'wink', pose: 'rock' },
    ],
  },
  {
    name: 'Tuan', tag: '#f08a24', voice: 1.0, look: TUAN,
    device: phone, broken: 'keypad', puzzle: { kind: 'popit', cols: 3, rows: 5, color: '#c9cdd6' }, tasks: [{ part: 'board', puzzle: { kind: 'slime', crumbs: 26, seed: 83, color: '#9ee6f2' } }], dirty: ['cover', 'bcover'],
    symptom: { en: 'Dropped in the rain, keys stuck.', vi: 'Rơi giữa mưa, phím kẹt cứng.' },
    pay: 52, partPrice: 14, day: 17, timeIn: [11, 40], timeOut: [12, 30],
    arrive: [
      { en: 'Rainy deliveries all morning. I slipped, the phone took a swim in a puddle.', vi: 'Sáng nay giao hàng dưới mưa. Tôi trượt chân, điện thoại đi bơi trong vũng nước.', expr: 'annoyed', pose: 'cross' },
      { en: 'Now half the keys are stuck and there is mud in places I cannot see.', vi: 'Giờ nửa bàn phím kẹt cứng, bùn lọt vào mấy chỗ tôi không nhìn thấy.', expr: 'sad', pose: 'shy' },
      { en: "Lunch break again. You're my pit stop!", vi: 'Lại giờ nghỉ trưa. Tiệm anh là trạm dừng của tôi!', expr: 'grin', pose: 'peace' },
    ],
    leave: [
      { en: 'Clicky and clean! Better than before the puddle.', vi: 'Bấm sướng mà còn sạch! Ngon hơn cả trước khi rơi.', expr: 'happy', pose: 'cheer' },
      { en: 'Next time I bring you noodles. Hot ones.', vi: 'Lần sau tôi mang phở cho anh. Phở nóng hẳn hoi.', expr: 'wink', pose: 'wave' },
    ],
  },
  {
    name: 'Nina', tag: '#ef6f6c', voice: 1.25, look: NINA,
    device: remote, broken: 'board', puzzle: { kind: 'wire', wires: 3, seed: 85 }, tasks: [{ part: 'membrane', puzzle: { kind: 'popit', cols: 4, rows: 6, color: '#8c8698' } }], dirty: ['top', 'door'],
    symptom: { en: 'Changes channel on its own.', vi: 'Tự nhảy kênh lung tung.' },
    pay: 50, partPrice: 14, day: 18, timeIn: [16, 10], timeOut: [18, 40],
    arrive: [
      { en: "Movie night is going OUTDOORS this time. Projector, blankets, the whole yard!", vi: 'Đêm phim lần này tổ chức NGOÀI SÂN. Máy chiếu, chăn, cả khoảng sân luôn!', expr: 'grin', pose: 'cheer' },
      { en: "But the remote keeps jumping channels by itself. Like it's haunted.", vi: 'Mà cái remote cứ tự nhảy kênh. Như bị ma nhập.', expr: 'surprised', pose: 'idle' },
      { en: 'Please exorcise it. Gently.', vi: 'Anh trừ tà giúp em. Nhẹ tay thôi.', expr: 'wink', pose: 'peace' },
    ],
    leave: [
      { en: 'No ghosts, just clicks. Perfect.', vi: 'Hết ma, chỉ còn tiếng tách tách. Hoàn hảo.', expr: 'happy', pose: 'cheer' },
      { en: "You're on the guest list. Front row blanket!", vi: 'Anh có tên trong danh sách khách. Chăn hàng đầu nha!', expr: 'wink', pose: 'wave' },
    ],
  },
  {
    name: 'Mr. Hoang', tag: '#7d8fd6', voice: 0.75, look: HOANG,
    device: walkman, broken: 'tape', puzzle: { kind: 'wind', turns: 8 }, tasks: [{ part: 'wboard', puzzle: { kind: 'solder', pads: 6, seed: 87 } }], dirty: ['shell', 'keys'],
    symptom: { en: 'The sound is warped and wobbly.', vi: 'Tiếng bị méo, lúc to lúc nhỏ.' },
    pay: 54, partPrice: 15, day: 19, timeIn: [9, 40], timeOut: [14, 10],
    arrive: [
      { en: 'Good morning again, young one.', vi: 'Chào cậu trai trẻ, lại gặp nhau rồi.', expr: 'happy', pose: 'wave' },
      { en: 'I found another tape in her drawer. At the end, her voice says something, but it warps away.', vi: 'Tôi tìm thấy một cuộn băng khác trong ngăn kéo của bà. Cuối băng bà nói gì đó, nhưng tiếng méo mất.', expr: 'sad', pose: 'shy' },
      { en: 'Forty years, and she still has one more thing to tell me.', vi: 'Bốn mươi năm rồi, bà vẫn còn một điều muốn nói với tôi.', expr: 'neutral', pose: 'think' },
    ],
    leave: [
      { en: '"Don\'t forget to water the jasmine." ...Ha. Of course.', vi: '"Nhớ tưới giàn hoa nhài nhé." ...Ha. Đúng là bà.', expr: 'surprised', pose: 'idle' },
      { en: 'I will water it today. Thank you, son.', vi: 'Hôm nay tôi sẽ tưới. Cảm ơn con.', expr: 'happy', pose: 'wave' },
    ],
  },
  {
    name: 'Lena', tag: '#3f9ad6', voice: 1.05, look: LENA,
    device: lamp, broken: 'board', puzzle: { kind: 'rotate', size: 4, seed: 89 }, tasks: [{ part: 'switch', puzzle: { kind: 'wire', wires: 4, seed: 91 } }], dirty: ['base', 'shade'],
    symptom: { en: 'Light pulses brighter and dimmer.', vi: 'Ánh sáng lúc sáng lúc mờ.' },
    pay: 52, partPrice: 15, day: 20, timeIn: [18, 0], timeOut: [20, 45],
    arrive: [
      { en: 'Big news: my portfolio made the final round!', vi: 'Tin lớn: hồ sơ của tôi lọt vào vòng chung kết!', expr: 'happy', pose: 'cheer' },
      { en: 'Bad news: the lamp now breathes. Bright, dim, bright, dim.', vi: 'Tin xấu: cái đèn giờ biết thở. Sáng, mờ, sáng, mờ.', expr: 'annoyed', pose: 'cross' },
      { en: 'The final is on Monday. I need one more long night.', vi: 'Thứ Hai là chung kết. Tôi cần thêm một đêm dài nữa.', expr: 'neutral', pose: 'think' },
    ],
    leave: [
      { en: 'Steady again. My lucky lamp is back.', vi: 'Đều trở lại rồi. Đèn may mắn của tôi đã về.', expr: 'happy', pose: 'cheer' },
      { en: "If I win, your shop is on the thank-you page. Again.", vi: 'Nếu thắng, tên tiệm anh lại có trong trang cảm ơn.', expr: 'wink', pose: 'peace' },
    ],
  },
  {
    name: 'DJ Ken', tag: '#9a5be0', voice: 0.95, look: KEN,
    device: headphones, broken: 'cable', puzzle: { kind: 'wire', wires: 4, seed: 93 }, tasks: [{ part: 'driverL', puzzle: { kind: 'blow', dust: 40, seed: 95, look: 'grille' } }], dirty: ['cushionL', 'cushionR'],
    symptom: { en: 'Left side weak, crackles when moved.', vi: 'Bên trái nhỏ, lắc dây là rè.' },
    pay: 56, partPrice: 16, day: 21, timeIn: [17, 30], timeOut: [19, 20],
    arrive: [
      { en: 'Maestro. The street festival asked me to play the main stage.', vi: 'Thầy ơi. Lễ hội phố mời tôi chơi sân khấu chính.', expr: 'grin', pose: 'rock' },
      { en: 'Left side is weak again, and it crackles when the cable moves.', vi: 'Bên trái lại nhỏ, mà dây cứ động là rè.', expr: 'annoyed', pose: 'cross' },
      { en: 'Biggest crowd of my life. No crackle allowed.', vi: 'Đám đông lớn nhất đời tôi. Không được rè.', expr: 'neutral', pose: 'idle' },
    ],
    leave: [
      { en: 'Clean bass, both sides. Chef\'s kiss.', vi: 'Bass sạch, đủ hai bên. Tuyệt cú mèo.', expr: 'happy', pose: 'cheer' },
      { en: 'The poster I promised? It goes on your wall tonight.', vi: 'Tấm poster tôi hứa đó? Tối nay nó lên tường tiệm anh.', expr: 'wink', pose: 'rock' },
    ],
  },
  {
    name: 'Grandma Sau', tag: '#c45a8a', voice: 0.85, look: SAU,
    device: kettle, broken: 'thermo', puzzle: { kind: 'wire', wires: 4, seed: 97 }, tasks: [{ part: 'plate', puzzle: { kind: 'slime', crumbs: 40, seed: 99, color: '#8fd3c7' } }], dirty: ['body', 'lid', 'handle'],
    symptom: { en: 'Switches off halfway, scale again.', vi: 'Đun nửa chừng lại tắt, đóng cặn.' },
    pay: 54, partPrice: 15, day: 22, timeIn: [14, 30], timeOut: [16, 30],
    arrive: [
      { en: 'Hello dear. The whole lane is coming for tea today.', vi: 'Chào con. Hôm nay cả xóm đến uống trà.', expr: 'happy', pose: 'wave' },
      { en: 'The kettle keeps switching off halfway. Everyone has to wait.', vi: 'Ấm cứ tắt giữa chừng, ai cũng phải chờ.', expr: 'sad', pose: 'shy' },
      { en: 'Hot tea should never be left to go cold.', vi: 'Trà nóng thì không nên để nguội.', expr: 'neutral', pose: 'think' },
    ],
    leave: [
      { en: 'Just in time! Listen to it sing.', vi: 'Vừa kịp! Nghe nó reo kìa.', expr: 'surprised', pose: 'cheer' },
      { en: "With a tea corner like yours, I'll drop by again tomorrow.", vi: 'Tiệm có góc trà thế này, mai bà lại ghé.', expr: 'happy', pose: 'idle' },
    ],
  },
  {
    name: 'Hana', tag: '#d4a017', voice: 1.15, look: HANA,
    device: watch, broken: 'back', puzzle: { kind: 'solder', pads: 7, seed: 101 }, tasks: [{ part: 'glass', puzzle: { kind: 'peel', shape: 'round', color: '#2a2d36' } }], dirty: ['strapT', 'case'],
    symptom: { en: 'Heart rate reads zero.', vi: 'Nhịp tim lúc nào cũng hiện số 0.' },
    pay: 56, partPrice: 16, day: 23, timeIn: [7, 10], timeOut: [9, 50],
    arrive: [
      { en: 'I finished it! My first marathon! Slowly, but I finished!', vi: 'Tôi về đích rồi! Marathon đầu tiên! Chậm thôi, nhưng về đích!', expr: 'happy', pose: 'cheer' },
      { en: 'Now the heart sensor says zero. According to my watch, I am a ghost.', vi: 'Giờ cảm biến nhịp tim báo số 0. Theo đồng hồ thì tôi là ma.', expr: 'surprised', pose: 'think' },
      { en: 'Next goal: a half marathon under two hours. I need my data!', vi: 'Mục tiêu tiếp: bán marathon dưới hai tiếng. Tôi cần số liệu!', expr: 'grin', pose: 'peace' },
    ],
    leave: [
      { en: 'Seventy-two beats. Alive and ready!', vi: 'Bảy mươi hai nhịp. Còn sống và sẵn sàng!', expr: 'happy', pose: 'cheer' },
      { en: 'Here, my finisher medal sticker. Put it somewhere sunny.', vi: 'Tặng anh sticker huy chương về đích. Dán chỗ nào nhiều nắng nhé.', expr: 'wink', pose: 'wave' },
    ],
  },
  {
    name: 'Chef Bao', tag: '#d9772b', voice: 0.82, look: BAO,
    device: toaster, broken: 'element', puzzle: { kind: 'wire', wires: 3, seed: 103 }, tasks: [{ part: 'tray', puzzle: { kind: 'blow', dust: 50, seed: 105, look: 'tray' } }], dirty: ['shell'],
    symptom: { en: 'Stays cold, smells of burnt crumbs.', vi: 'Không nóng, mùi vụn bánh cháy.' },
    pay: 55, partPrice: 16, day: 24, timeIn: [5, 50], timeOut: [7, 10],
    arrive: [
      { en: "Morning! I'm making free breakfast for the kids' football team.", vi: 'Chào cậu! Tôi làm bữa sáng miễn phí cho đội bóng thiếu nhi.', expr: 'grin', pose: 'wave' },
      { en: 'Twenty banh mi, and the toaster stays cold. Smells like burnt crumbs.', vi: 'Hai mươi ổ bánh mì, mà máy nướng nguội ngắt. Còn bốc mùi vụn cháy.', expr: 'annoyed', pose: 'cross' },
      { en: 'Hungry kids are scarier than any customer.', vi: 'Tụi nhỏ đói còn đáng sợ hơn mọi vị khách.', expr: 'surprised', pose: 'think' },
    ],
    leave: [
      { en: 'Crunch! The kids will score ten goals.', vi: 'Giòn rụm! Tụi nhỏ sẽ ghi mười bàn.', expr: 'happy', pose: 'cheer' },
      { en: 'They drew you a postcard. Hang it up, it is important.', vi: 'Tụi nhỏ vẽ tặng cậu tấm bưu thiếp. Treo lên nhé, quan trọng lắm.', expr: 'wink', pose: 'peace' },
    ],
  },
  {
    name: 'Duc', tag: '#2a6fd6', voice: 1.2, look: DUC,
    device: keyboard, broken: 'pcb', puzzle: { kind: 'solder', pads: 12, seed: 107 }, tasks: [{ part: 'keysHome', puzzle: { kind: 'popit', cols: 6, rows: 2, color: '#f2efe6' } }], dirty: ['keysTop', 'space', 'plate'],
    symptom: { en: 'The whole ASDF row is dead.', vi: 'Cả hàng phím ASDF chết.' },
    pay: 58, partPrice: 16, day: 25, timeIn: [19, 45], timeOut: [21, 30],
    arrive: [
      { en: "Tonight's stream is a charity marathon. School supplies for kids.", vi: 'Stream tối nay là gây quỹ. Mua đồ dùng học tập cho trẻ em.', expr: 'neutral', pose: 'idle' },
      { en: 'And the whole ASDF row just... died. No tea this time, I swear.', vi: 'Thế mà cả hàng ASDF... chết luôn. Lần này em thề không đổ trà.', expr: 'sad', pose: 'shy' },
      { en: 'Chat already named it "the curse of the walnut".', vi: 'Chat đã đặt tên là "lời nguyền gỗ óc chó".', expr: 'grin', pose: 'peace' },
    ],
    leave: [
      { en: 'A-S-D-F. Curse lifted!', vi: 'A-S-D-F. Giải nguyền rồi!', expr: 'happy', pose: 'cheer' },
      { en: 'Your shop is getting a shout-out every hour tonight.', vi: 'Tối nay cứ mỗi tiếng em lại nhắc tên tiệm anh.', expr: 'wink', pose: 'peace' },
    ],
  },
  {
    name: 'Ms. Ha', tag: '#6a8fd0', voice: 0.92, look: HA,
    device: clock, broken: 'movement', puzzle: { kind: 'wind', turns: 9, look: 'spring' }, tasks: [{ part: 'aboard', puzzle: { kind: 'rotate', size: 4, seed: 109 } }], dirty: ['case', 'bellL', 'bellR'],
    symptom: { en: 'Loses ten minutes every hour.', vi: 'Cứ mỗi giờ lại chậm mười phút.' },
    pay: 60, partPrice: 17, day: 26, timeIn: [13, 15], timeOut: [16, 40],
    arrive: [
      { en: 'Good afternoon. My class performs at the school concert on Friday.', vi: 'Chào cậu. Thứ Sáu lớp tôi biểu diễn ở buổi hòa nhạc của trường.', expr: 'neutral', pose: 'idle' },
      { en: 'I use the clock bell to start every song. Now it loses ten minutes an hour.', vi: 'Tôi dùng chuông đồng hồ để bắt nhịp mỗi bài. Giờ nó cứ mỗi giờ chậm mười phút.', expr: 'annoyed', pose: 'cross' },
      { en: 'Forty children waiting for a bell. You understand the stakes.', vi: 'Bốn mươi đứa trẻ chờ một tiếng chuông. Cậu hiểu tầm quan trọng rồi đấy.', expr: 'sad', pose: 'think' },
    ],
    leave: [
      { en: 'On the second. RRRING. Beautiful.', vi: 'Đúng từng giây. RENG. Tuyệt đẹp.', expr: 'surprised', pose: 'cheer' },
      { en: 'You are invited. Front row. Do not be late.', vi: 'Cậu được mời. Hàng ghế đầu. Đừng đến trễ.', expr: 'happy', pose: 'wave' },
    ],
  },
  {
    name: 'Nhi', tag: '#ff8fb1', voice: 1.4, look: NHI,
    device: musicbox, broken: 'spring', puzzle: { kind: 'wind', turns: 8, look: 'spring' }, tasks: [{ part: 'cylinder', puzzle: { kind: 'blow', dust: 42, seed: 111, look: 'comb' } }, { part: 'stage', puzzle: { kind: 'slime', crumbs: 20, seed: 113, color: '#ffb3c7' } }], dirty: ['box', 'dancer'],
    symptom: { en: 'The dancer is stuck mid-spin.', vi: 'Vũ công kẹt giữa vòng xoay.' },
    pay: 58, partPrice: 15, day: 27, timeIn: [10, 0], timeOut: [14, 30],
    arrive: [
      { en: "Uncle! I'm recording Grandma's song to give to Dad for his birthday!", vi: 'Chú ơi! Con đang thu âm bài hát của bà để tặng bố dịp sinh nhật!', expr: 'happy', pose: 'wave' },
      { en: 'But I spilled glitter glue and now the dancer is stuck halfway round.', vi: 'Mà con làm đổ keo kim tuyến, giờ cô vũ công kẹt giữa vòng.', expr: 'sad', pose: 'shy' },
      { en: 'Grandma says you can fix anything. Even glitter.', vi: 'Bà bảo chú sửa được mọi thứ. Cả kim tuyến nữa.', expr: 'grin', pose: 'peace' },
    ],
    leave: [
      { en: 'She spins! And the song is all there!', vi: 'Cô ấy xoay rồi! Bài hát còn nguyên vẹn!', expr: 'happy', pose: 'cheer' },
      { en: "Dad's going to cry. The happy kind.", vi: 'Bố con sẽ khóc cho xem. Khóc vì vui.', expr: 'wink', pose: 'wave' },
    ],
  },
  {
    name: 'Mr. Tu', tag: '#4a7a9a', voice: 0.72, look: TU,
    device: flashlight, broken: 'spring', puzzle: { kind: 'wire', wires: 4, seed: 115 }, tasks: [{ part: 'led', puzzle: { kind: 'solder', pads: 8, seed: 117 } }], dirty: ['head', 'cover'],
    symptom: { en: 'Goes out when tapped.', vi: 'Gõ nhẹ là tắt.' },
    pay: 60, partPrice: 17, day: 28, timeIn: [17, 20], timeOut: [18, 50],
    arrive: [
      { en: 'Evening, son. Tonight the fireflies come out by the river.', vi: 'Chào con. Tối nay đom đóm ra bờ sông.', expr: 'neutral', pose: 'idle' },
      { en: 'I invited the whole street. The flashlight goes out every time I tap it.', vi: 'Bác rủ cả phố đi xem. Mà đèn pin cứ gõ nhẹ là tắt.', expr: 'grin', pose: 'think' },
      { en: 'A guide with no light is just a man in the dark.', vi: 'Người dẫn đường không có đèn thì chỉ là ông già đứng trong bóng tối.', expr: 'annoyed', pose: 'cross' },
    ],
    leave: [
      { en: 'Steady as a lighthouse. The fireflies will be jealous.', vi: 'Vững như hải đăng. Đom đóm phải ghen tị.', expr: 'happy', pose: 'cheer' },
      { en: "Here's a paper lantern for the shop. Light it on quiet nights.", vi: 'Tặng con chiếc lồng đèn giấy cho tiệm. Đêm nào yên ả thì thắp lên.', expr: 'wink', pose: 'wave' },
    ],
  },
  {
    name: 'Bin', tag: '#e0569b', voice: 1.35, look: BIN,
    device: gamepad, broken: 'rumbleR', puzzle: { kind: 'wire', wires: 3, seed: 119 }, tasks: [{ part: 'membrane', puzzle: { kind: 'popit', cols: 4, rows: 4, color: '#b9a4e8' } }], dirty: ['top', 'shoulderL'],
    symptom: { en: 'No rumble, buttons mushy again.', vi: 'Mất rung, nút lại mềm nhũn.' },
    pay: 62, partPrice: 17, day: 29, timeIn: [9, 30], timeOut: [12, 0],
    arrive: [
      { en: 'Mister! Grandpa and me are hosting a tournament. Sixteen players!', vi: 'Chú ơi! Ông với con tổ chức giải đấu. Mười sáu người chơi!', expr: 'happy', pose: 'cheer' },
      { en: 'We practised SO much the controller stopped rumbling. Again.', vi: 'Tụi con tập NHIỀU quá nên tay cầm lại hết rung.', expr: 'sad', pose: 'shy' },
      { en: 'Grandpa says a tournament with no rumble is just a quiz.', vi: 'Ông bảo giải đấu mà không rung thì chỉ là thi trắc nghiệm.', expr: 'grin', pose: 'peace' },
    ],
    leave: [
      { en: 'BRRRR! Both sides! It tickles double!', vi: 'RỪ RỪ! Cả hai bên! Nhột gấp đôi!', expr: 'happy', pose: 'cheer' },
      { en: "We made you an arcade poster. You're the official referee!", vi: 'Tụi con làm tặng chú poster arcade. Chú là trọng tài chính thức!', expr: 'wink', pose: 'wave' },
    ],
  },
  {
    name: 'Kai', tag: '#4fbf9f', voice: 1.1, look: KAI,
    device: radio, broken: 'spkR', puzzle: { kind: 'wire', wires: 4, seed: 121 }, tasks: [{ part: 'tape', puzzle: { kind: 'wind', turns: 7 } }, { part: 'board', puzzle: { kind: 'solder', pads: 10, seed: 123 } }, { part: 'grilleR', puzzle: { kind: 'blow', dust: 44, seed: 125, look: 'grille' } }], dirty: ['shell', 'door', 'grilleL'],
    symptom: { en: 'Right speaker crackles, tape jammed.', vi: 'Loa phải rè, băng lại kẹt.' },
    pay: 75, partPrice: 20, day: 30, timeIn: [10, 0], timeOut: [17, 0],
    arrive: [
      { en: 'Boss! Everyone brought photos and keepsakes for the street exhibition.', vi: 'Anh ơi! Mọi người mang ảnh với kỷ vật tới đủ cho buổi triển lãm khu phố rồi.', expr: 'grin', pose: 'cheer' },
      { en: 'But the boombox crackles right at the opening. And the tape is stuck again!', vi: 'Mà cái đài lại rè đúng lúc khai mạc. Băng cũng kẹt nữa!', expr: 'sad', pose: 'shy' },
      { en: 'This radio saved the first party. One more time?', vi: 'Cái đài này từng cứu buổi tiệc đầu tiên. Thêm lần nữa nha?', expr: 'happy', pose: 'peace' },
    ],
    leave: [
      { en: 'Left. Right. Loud and clear!', vi: 'Trái. Phải. To và rõ!', expr: 'surprised', pose: 'cheer' },
      { en: "Our shop doesn't just fix things. It keeps everyone's stories.", vi: 'Tiệm mình không chỉ sửa đồ, mà còn giữ cả chuyện của mọi người.', expr: 'happy', pose: 'laugh' },
      { en: 'Come on, boss. The exhibition is opening, and you cut the ribbon.', vi: 'Đi thôi anh. Triển lãm sắp khai mạc, anh là người cắt băng.', expr: 'wink', pose: 'wave' },
    ],
  },
];

/** The first chapter: levels before this index are the curated 15 days. */
export const CHAPTER1 = 20;
