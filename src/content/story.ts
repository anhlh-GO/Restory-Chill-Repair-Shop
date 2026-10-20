// The levels: one customer, one gadget, one little story each.
// Twenty gadgets, each repaired exactly once, over fifteen days: one-gadget days
// to breathe, two-gadget days (4, 7, 9, 12, 14) are the hard ones, with more and
// bigger jobs. The difficulty is never shown, only felt.

import type { DeviceDef } from './device';
import type { Look, Pose, Expr } from './characters';
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
    pay: 17, partPrice: 8, day: 1, timeIn: [12, 3], timeOut: [18, 30],
    arrive: [
      { en: "Yo! Hair dryer. I dry Mochi with it after his bath. Mochi's my dog.", vi: 'Chào anh! Máy sấy tóc nè. Em hay sấy cho Mochi sau khi tắm. Mochi là chó của em.', expr: 'neutral', pose: 'idle' },
      { en: "Now it only blows cold. My sister says it's a fire hazard.", vi: 'Giờ nó chỉ thổi gió lạnh thôi. Chị em bảo dễ cháy lắm.', expr: 'annoyed', pose: 'cross' },
      { en: 'Can you fix it? Mochi hates being wet.', vi: 'Anh sửa giúp em nha? Mochi ghét bị ướt lắm.', expr: 'grin', pose: 'peace' },
    ],
    leave: [
      { en: "Warm air! Mochi's gonna be so fluffy.", vi: 'Gió ấm rồi! Mochi sắp bông xù luôn.', expr: 'happy', pose: 'cheer' },
      { en: 'Keep the change, boss!', vi: 'Anh giữ tiền thừa nha!', expr: 'wink', pose: 'peace' },
    ],
  },
  {
    name: 'Bin', tag: '#e0569b', voice: 1.35,
    look: { masc: true, skin: '#9a6440', hair: '#1d1716', style: 'buzz', outfit: 'tee', top: '#f4c430', inner: '#e8573c', age: 'kid', eyes: '#2a1a12' },
    device: handheld, broken: 'board', puzzle: { kind: 'flow', grid: 0 }, dirty: ['front', 'bezel'],
    pay: 17, partPrice: 7, day: 2, timeIn: [8, 2], timeOut: [12, 0],
    arrive: [
      { en: "Hi mister! I'm Bin. Grandpa gave me this handheld game. He played it all the time.", vi: 'Chào chú! Con là Bin. Ông nội cho con máy chơi game này. Hồi xưa ông chơi suốt.', expr: 'happy', pose: 'idle' },
      { en: 'I was about to beat his high score, and then the A button died. It won\'t press.', vi: 'Con sắp phá kỷ lục của ông thì nút A hỏng. Bấm không ăn nữa.', expr: 'sad', pose: 'shy' },
      { en: 'Grandpa says only you can fix it. Please hurry, my record is waiting!', vi: 'Ông bảo chỉ có chú sửa được. Chú làm nhanh nha, kỷ lục đang chờ con!', expr: 'grin', pose: 'cheer' },
    ],
    leave: [
      { en: 'It clicks again! Tonight I beat the record!', vi: 'Bấm được rồi! Tối nay con phá kỷ lục!', expr: 'happy', pose: 'cheer' },
      { en: "Tomorrow I'll come show you. Don't tell Grandpa first, okay?", vi: 'Mai con qua khoe chú. Chú đừng kể ông trước nha?', expr: 'wink', pose: 'peace' },
    ],
  },
  {
    name: 'Vy', tag: '#e07b39', voice: 0.9,
    look: { skin: '#f4dcd0', hair: '#1c1620', style: 'braids', outfit: 'dress', top: '#3a2a5e', age: 'adult', choker: true, earrings: true, lipstick: '#4a1632', makeup: '#6a3a76', bow: '#5b3a9e', nails: '#1a1420', necklace: 'cross', eyes: '#5a3a3a' },
    device: camera, broken: 'shutter', puzzle: { kind: 'rotate', size: 3, seed: 7 }, dirty: ['lens', 'plate'],
    pay: 24, partPrice: 9, day: 3, timeIn: [12, 4], timeOut: [17, 40],
    arrive: [
      { en: "Hello. I'm Vy. I just opened a sound restoration workshop at the end of the street.", vi: 'Chào anh. Tôi là Vy. Tôi vừa mở xưởng phục chế âm thanh cuối phố.', expr: 'happy', pose: 'laugh' },
      { en: "It was my mother's. The lens cover jams halfway and won't open.", vi: 'Máy ảnh này của mẹ tôi. Nắp ống kính kẹt nửa chừng, không mở ra được.', expr: 'sad', pose: 'shy' },
      { en: "I want to shoot the opening night with it. Can you?", vi: 'Tôi muốn chụp đêm khai trương bằng nó. Anh giúp được không?', expr: 'neutral', pose: 'cross' },
    ],
    leave: [
      { en: "...It's like she's holding it with me. Thank you.", vi: '...Cứ như mẹ đang cầm máy cùng tôi. Cảm ơn anh.', expr: 'happy', pose: 'laugh' },
      { en: 'Come by the workshop. First record is on me.', vi: 'Ghé xưởng tôi nhé. Đĩa đầu tiên tôi mời.', expr: 'wink', pose: 'rock' },
    ],
  },
  {
    name: 'Mr. Hoang', tag: '#7d8fd6', voice: 0.75,
    look: { masc: true, skin: '#e8c4a2', hair: '#d8d8d8', style: 'bald', outfit: 'cardigan', top: '#8a5a3b', inner: '#efe3cc', age: 'old', glasses: true, eyes: '#3a2a20' },
    device: walkman, broken: 'motor', puzzle: { kind: 'trace', layout: 1 }, tasks: [{ part: 'tape', puzzle: { kind: 'wind', turns: 6 } }], dirty: ['door', 'keys', 'shell'],
    pay: 28, partPrice: 8, day: 4, timeIn: [9, 15], timeOut: [13, 30],
    arrive: [
      { en: 'Good morning, young one.', vi: 'Chào buổi sáng, cậu trai trẻ.', expr: 'happy', pose: 'wave' },
      { en: 'This walkman plays my wife\'s singing too slow. She sounds like a sleepy bear.', vi: 'Cái máy này phát giọng hát của vợ tôi chậm rì. Nghe như con gấu buồn ngủ.', expr: 'grin', pose: 'idle' },
      { en: "She'd laugh at that. But I'd like to hear her right again.", vi: 'Bà ấy mà nghe chắc cười lắm. Nhưng tôi muốn nghe lại giọng bà cho đúng.', expr: 'sad', pose: 'shy' },
    ],
    leave: [
      { en: "Ah... there she is. Just like the summer of '89.", vi: 'À... bà ấy đây rồi. Y như mùa hè năm 89.', expr: 'happy', pose: 'idle' },
      { en: 'You have kind hands. Thank you.', vi: 'Cậu có đôi tay hiền lành lắm. Cảm ơn cậu.', expr: 'grin', pose: 'wave' },
    ],
  },
  {
    name: 'Nina', tag: '#ef6f6c', voice: 1.25, look: NINA,
    device: remote, broken: 'springs', puzzle: { kind: 'wire', wires: 3, seed: 5 }, tasks: [{ part: 'membrane', puzzle: { kind: 'popit', cols: 4, rows: 5, color: '#8c8698' } }], dirty: ['top', 'door'],
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
    pay: 36, partPrice: 10, day: 7, timeIn: [15, 0], timeOut: [17, 20],
    arrive: [
      { en: 'Hello dear, I brought you some sticky rice cakes.', vi: 'Chào con, bà mang bánh dày cho con nè.', expr: 'happy', pose: 'idle' },
      { en: "My kettle clicks off before the water boils. And the inside looks like a cave.", vi: 'Cái ấm của bà chưa sôi đã tắt phụt. Bên trong thì đóng cặn như hang đá.', expr: 'sad', pose: 'shy' },
      { en: 'The ladies come for tea every afternoon. No tea, no gossip!', vi: 'Chiều nào mấy bà cũng sang uống trà. Không có trà là không có chuyện để kể!', expr: 'grin', pose: 'wave' },
    ],
    leave: [
      { en: 'Listen to it bubble! Like a little song.', vi: 'Nghe nó reo kìa! Như một bài hát nhỏ.', expr: 'surprised', pose: 'cheer' },
      { en: "Here, eat a cake while it's warm.", vi: 'Nè, ăn bánh lúc còn ấm nha con.', expr: 'happy', pose: 'idle' },
    ],
  },
  {
    name: 'DJ Ken', tag: '#9a5be0', voice: 0.95, look: KEN,
    device: headphones, broken: 'driverL', puzzle: { kind: 'wire', wires: 4, seed: 23 }, tasks: [{ part: 'board', puzzle: { kind: 'solder', pads: 8, seed: 9 } }], dirty: ['cushionL', 'cushionR', 'headband'],
    pay: 38, partPrice: 11, day: 7, timeIn: [19, 30], timeOut: [21, 10],
    arrive: [
      { en: 'Yo, maestro. Emergency in the bass department.', vi: 'Chào thầy. Có chuyện khẩn ở khu vực âm trầm.', expr: 'neutral', pose: 'idle' },
      { en: 'My lucky headphones went silent on the left. I mix half-deaf now.', vi: 'Cái tai nghe may mắn của tôi câm bên trái. Giờ tôi chỉnh nhạc kiểu điếc một bên.', expr: 'annoyed', pose: 'cross' },
      { en: 'Gig at midnight. The crowd deserves stereo.', vi: 'Nửa đêm nay có show. Khán giả xứng đáng được nghe đủ hai bên.', expr: 'grin', pose: 'peace' },
    ],
    leave: [
      { en: 'Left. Right. Left. Right. Beautiful.', vi: 'Trái. Phải. Trái. Phải. Tuyệt vời.', expr: 'happy', pose: 'cheer' },
      { en: "Tonight's first track is called 'Chill Fix'. You're famous now.", vi: 'Bài mở màn tối nay tên là "Chill Fix". Anh nổi tiếng rồi đó.', expr: 'wink', pose: 'wave' },
    ],
  },
  {
    name: 'Hana', tag: '#d4a017', voice: 1.15, look: HANA,
    device: watch, broken: 'glass', puzzle: { kind: 'peel', shape: 'round', color: '#2a2d36' }, tasks: [{ part: 'board', puzzle: { kind: 'solder', pads: 5, seed: 14 } }], dirty: ['strapT', 'case'],
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
    pay: 44, partPrice: 12, day: 9, timeIn: [20, 15], timeOut: [22, 0],
    arrive: [
      { en: "Hey. I'm Duc. I stream games at night. Small channel. Very loyal fans.", vi: 'Chào anh. Em là Đức. Em stream game buổi tối. Kênh nhỏ thôi nhưng fan trung thành lắm.', expr: 'neutral', pose: 'idle' },
      { en: 'I spilled bubble tea on my keyboard. Now W sticks and half the row is dead.', vi: 'Em làm đổ trà sữa lên bàn phím. Giờ phím W dính, nửa hàng thì chết luôn.', expr: 'sad', pose: 'shy' },
      { en: "I can't walk forward. In ANY game. Please.", vi: 'Em không đi tới được. Trong BẤT KỲ game nào. Cứu em.', expr: 'annoyed', pose: 'cross' },
    ],
    leave: [
      { en: 'Thock thock thock. That sound. Chef\'s kiss.', vi: 'Lạch cạch lạch cạch. Âm thanh này. Đỉnh của chóp.', expr: 'happy', pose: 'cheer' },
      { en: "I'm putting your shop in my stream title tonight!", vi: 'Tối nay em ghi tên tiệm anh lên tiêu đề stream luôn!', expr: 'grin', pose: 'peace' },
    ],
  },
  {
    name: 'Bin', tag: '#e0569b', voice: 1.35, look: BIN,
    device: gamepad, broken: 'membrane', puzzle: { kind: 'popit', cols: 4, rows: 3, color: '#b9a4e8' }, tasks: [{ part: 'rumbleL', puzzle: { kind: 'wire', wires: 2, seed: 41 } }], dirty: ['top', 'shoulderL'],
    pay: 36, partPrice: 13, day: 10, timeIn: [9, 0], timeOut: [11, 30],
    arrive: [
      { en: 'Mister! I beat Grandpa\'s record! He was SO proud.', vi: 'Chú ơi! Con phá kỷ lục của ông rồi! Ông tự hào lắm luôn.', expr: 'happy', pose: 'cheer' },
      { en: 'So now we play together. But his controller is ancient. The A button is mushy and it stopped rumbling.', vi: 'Giờ hai ông cháu chơi chung. Mà tay cầm của ông cổ lắm. Nút A mềm nhũn, rung cũng không rung nữa.', expr: 'sad', pose: 'shy' },
      { en: 'Grandpa says rumble is the best part. He laughs every time.', vi: 'Ông bảo rung là phần hay nhất. Lần nào rung ông cũng cười.', expr: 'grin', pose: 'peace' },
    ],
    leave: [
      { en: 'Brrrr! It tickles! Grandpa is gonna laugh so hard.', vi: 'Rừ rừ! Nhột quá! Ông sẽ cười to lắm cho xem.', expr: 'happy', pose: 'cheer' },
      { en: 'Co-op night! You can be player three.', vi: 'Tối nay chơi chung! Chú làm người chơi thứ ba nha.', expr: 'wink', pose: 'wave' },
    ],
  },
  {
    name: 'Chef Bao', tag: '#d9772b', voice: 0.82, look: BAO,
    device: toaster, broken: 'tray', puzzle: { kind: 'blow', dust: 44, seed: 19, look: 'tray' }, tasks: [{ part: 'element', puzzle: { kind: 'wire', wires: 2, seed: 7 } }], dirty: ['shell'],
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
    pay: 40, partPrice: 10, day: 14, timeIn: [10, 30], timeOut: [15, 0],
    arrive: [
      { en: "Hello! I'm Nhi. Grandma Sau is my grandma! She said you fix everything.", vi: 'Chào chú! Con là Nhi. Bà Sáu là bà nội con! Bà nói chú sửa được mọi thứ.', expr: 'happy', pose: 'wave' },
      { en: "Grandma gave me her music box. But the dancer stopped dancing and the song stopped singing.", vi: 'Bà cho con hộp nhạc của bà. Mà cô vũ công không múa nữa, bài hát cũng im luôn.', expr: 'sad', pose: 'shy' },
      { en: 'It plays the song Grandma sang to Dad. I want to hear it.', vi: 'Nó phát bài bà hay hát cho bố con nghe hồi nhỏ. Con muốn được nghe.', expr: 'neutral', pose: 'think' },
    ],
    leave: [
      { en: 'She is dancing! Listen, listen!', vi: 'Cô ấy múa rồi! Chú nghe nè, nghe nè!', expr: 'happy', pose: 'cheer' },
      { en: "I'm going to play it for Grandma right now!", vi: 'Con về mở cho bà nghe ngay đây!', expr: 'grin', pose: 'wave' },
    ],
  },
  {
    name: 'Mr. Tu', tag: '#4a7a9a', voice: 0.72, look: TU,
    device: flashlight, broken: 'spring', puzzle: { kind: 'wire', wires: 3, seed: 61 }, tasks: [{ part: 'lens', puzzle: { kind: 'peel', shape: 'round', color: '#3d4a5a' } }, { part: 'reflector', puzzle: { kind: 'blow', dust: 40, seed: 37, look: 'reflector' } }, { part: 'led', puzzle: { kind: 'solder', pads: 6, seed: 63 } }], dirty: ['head', 'cover'],
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
    pay: 60, partPrice: 18, day: 15, timeIn: [10, 0], timeOut: [17, 30],
    arrive: [
      { en: "Boss! Mochi is super fluffy now. All thanks to you.", vi: 'Anh ơi! Mochi giờ bông xù lắm. Nhờ anh hết đó.', expr: 'grin', pose: 'peace' },
      { en: "Big news: the whole street is throwing a party tonight. Everyone you helped is coming.", vi: 'Tin lớn nè: tối nay cả khu phố mở tiệc. Ai được anh sửa đồ cũng tới hết.', expr: 'happy', pose: 'cheer' },
      { en: "But my sister's boombox ate the mixtape. No music, no party. You're our only hope!", vi: 'Mà cái radio của chị em nuốt mất cuộn băng rồi. Không nhạc là không tiệc. Chỉ còn trông vào anh thôi!', expr: 'sad', pose: 'shy' },
    ],
    leave: [
      { en: "It plays! Loud! The whole street's gonna dance!", vi: 'Kêu rồi! To nữa! Cả phố sắp nhảy hết luôn!', expr: 'happy', pose: 'cheer' },
      { en: "Close the shop early tonight, boss. You're the guest of honor.", vi: 'Tối nay anh đóng tiệm sớm nha. Anh là khách mời danh dự đó.', expr: 'wink', pose: 'wave' },
    ],
  },
];
