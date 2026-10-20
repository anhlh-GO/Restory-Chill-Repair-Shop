# Chill Fix Corner (Ale Ela)

Game sửa đồ điện tử thư giãn, màn dọc cho mobile. Lấy cảm hứng từ *ReStory: Chill Electronics Repairs* và video tham khảo "Uncrewed".
Đồ vật là model 3D dựng bằng code (Three.js): thiết bị và linh kiện, dụng cụ, hộp, bàn làm việc với thảm cắt, quầy tiệm cùng các đạo cụ trên đó. Nhân vật, cảnh phố và HUD vẽ bằng Canvas 2D. Khi máy không có WebGL, game tự chuyển về bản vẽ 2D. Âm thanh và nhạc lo-fi được tổng hợp bằng WebAudio. Không dùng asset ngoài, chỉ nhúng 2 font OFL.

```bash
npm install
npm run dev      # hoặc mở Preview trong Falcon IDE; ?level=N để nhảy tới level N
npm run build    # dist/index.html — một tệp duy nhất
```

## Bản build

Mỗi lần push lên `main`, GitHub Actions (`.github/workflows/build.yml`) tự build:

- **Web:** chơi trên trình duyệt tại https://anhlh-GO.github.io/Restory-Chill-Repair-Shop/ (lần đầu cần bật *Settings → Pages → Source: GitHub Actions*).
- **APK Android:** tải `Restory-Chill-Repair-Shop.apk` ở [Release "latest"](https://github.com/anhlh-GO/Restory-Chill-Repair-Shop/releases/tag/latest). Bản debug, cài trực tiếp (bật "cài ứng dụng không rõ nguồn gốc"). APK bọc bản web bằng Capacitor (`capacitor.config.json`), khóa màn hình dọc.

## Vòng chơi (1 level = 1 khách)

1. **Quầy tiệm:** khách bước vào, kể chuyện qua hộp thoại gõ chữ, rồi để hộp lên quầy. Camera pan xuống bàn làm việc.
2. **Mở hộp:** máy nảy ra kèm hiệu ứng lấp lánh.
3. **Tháo rời:** kéo tua vít tới con vít để vặn ra, vít bay vào đĩa. Sau đó kéo linh kiện ra khỏi máy. Phải tháo theo thứ tự ("Tháo vít trước", "X trước"). Kéo trên nền thảm để xoay máy 3D tự do 360° (kéo ngang: xoay quanh trục dọc, kéo dọc: lộn qua cạnh). Máy có hai mặt thật: xoay qua là tới mặt sau và tháo tiếp ở đó; chạm 2 lần để lật nhanh.
4. **Sửa chữa:** chạm vào linh kiện có huy hiệu để làm việc của nó. Một level có thể có nhiều việc, mỗi việc trên một linh kiện:
   - minigame mạch (huy hiệu ⚡ đỏ): vẽ một nét, nối màu, xoay ô
   - việc tay (huy hiệu cam, trong `src/scenes/asmr.ts`): hàn chấm thiếc 🔥, đấu dây 🔌, bấm phím cao su (pop-it) 🫧, bóc màng bảo vệ ✨, thổi bụi 💨, gel lau khe 🟢, quấn băng / lên dây cót 📼

   Có thể bỏ qua bằng "Mua linh kiện mới".
5. **Lau chùi:** chạm vào linh kiện bẩn, rồi chà bằng bàn chải hoặc miếng bọt biển. Mỗi linh kiện có 2 mặt, tự hoàn tất khi đạt 95%.
6. **Lắp lại:** kéo linh kiện về chỗ cũ (có bóng mờ chỉ vị trí), rồi bắt vít lại.
7. **Xong:** máy bật lên, có hiệu ứng riêng cho từng loại. Bấm "Xong ✓" để đóng hộp, khách quay lại phản ứng, nhận hóa đơn có dấu PAID và tiền.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `src/game.ts` | Hợp đồng `FalconGame`, vòng lặp, chuyển cảnh, input |
| `src/core/` | view, tween, âm thanh, helper vẽ, hiệu ứng, i18n (EN/VI) |
| `src/content/` | 20 thiết bị (`dev-*.ts`), chân dung khách (`characters.ts`), 20 level, mỗi level một thiết bị (`story.ts`) |
| `src/three/` | lớp 3D: `stage` (renderer, camera bàn + camera quầy), `models` (linh kiện, dụng cụ, hộp), `volume` (khối linh kiện: mặt cong theo `round`, vỏ rỗng theo `cavity`/`wall`), `props` (đạo cụ, gỗ, thảm cắt), `bench3d`, `counter3d` |
| `src/scenes/` | quầy (`counter.ts`), bàn (`bench.ts`), đồ trên bàn + HUD (`desk.ts`), minigame, cảnh phố, cài đặt |

**Thêm level:** thêm một mục vào `LEVELS` trong `src/content/story.ts`, gồm khách, thiết bị, linh kiện hỏng + `puzzle`, các việc thêm `tasks` (mỗi việc: linh kiện + cơ chế), linh kiện bẩn và lời thoại. Bản dev: `?device=<id>` và `?puzzle=<json>` để thử nhanh một thiết bị / cơ chế.

**Thêm thiết bị:** khai báo danh sách `PartDef` (vị trí, mặt, z, `needs`, hàm vẽ, độ dày `thick`, độ bo `round`: bằng nửa bề rộng là thành nửa ống trụ), xem `src/content/dev-dryer.ts`.

Game không có trạng thái thua (đúng chất "chill"). Mỗi level phát `levelStart` khi khách vào quầy, và `win` sau khi khách trả tiền.
