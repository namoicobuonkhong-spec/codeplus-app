# codeplus Thi — app điện thoại (Android, iOS)

Một app cho cả **học sinh** và **cán bộ**. Đăng nhập xong, app tự hiện chức năng theo vai trò.
Viết bằng Expo (React Native): một mã nguồn chạy trên cả Android lẫn iOS. Cơ sở dữ liệu là Firebase (Auth, Firestore, Cloud Functions).

## Chức năng

**Học sinh**
- Trang chủ: ca thi đang mở, lịch thi sắp tới, thông báo của trường.
- Phòng chờ:
  - các mục kiểm tra: kết nối, chế độ thi, phòng đang ở bước nào (CBCT đang điểm danh, chờ lệnh…);
  - báo ngay nếu em đang bị ghi vắng.
- Làm bài:
  - 4 dạng câu như đề TN THPT: trắc nghiệm 4 lựa chọn, đúng/sai 4 ý, trả lời ngắn (điền số), tự luận;
  - đồng hồ theo giờ máy chủ, bảng câu, đánh dấu xem lại;
  - mỗi em một thứ tự câu riêng (trộn trong từng phần);
  - đáp án lưu ngay trong máy, gửi lên máy chủ 5 giây/lần. Mất mạng vẫn làm tiếp, có mạng tự gửi;
  - hết giờ thì tự nộp. Máy hết pin/tắt hẳn thì máy chủ tự nộp phần đã lưu.
- Chế độ thi:
  - chặn chụp/ghi màn hình (Android chặn hẳn; iOS phát hiện và ghi lại);
  - giữ màn hình sáng, chặn nút quay lại;
  - ghi lại mỗi lần rời app, quay lại app, chụp màn hình.
- Nộp bài có **mã biên nhận**. Khi trường công bố điểm: xem điểm, đúng/sai từng câu, điểm theo chương.
- Hỏi đáp: nhắn với kĩ thuật viên, giáo viên.

**Cán bộ coi thi (CBCT)**
- Hôm nay: phòng mình coi, bao nhiêu em đã vào phòng chờ, phòng đang ở bước nào.
- Phát đề tại phòng, 5 bước:
  1. *Nhận phòng*;
  2. *Điểm danh*: Có mặt/Vắng từng em, có nút đánh dấu nhanh;
  3. chờ *lệnh phát đề* của quản lí ca;
  4. CBCT1 *mở niêm phong*: nhập 4 kí tự cuối mã trên biên bản giao đề, xác nhận bằng **vân tay/Face ID** (máy không có thì nhập mật khẩu);
  5. CBCT2 *xác nhận* trên máy của mình → đề mở cùng lúc trên mọi máy có mặt.
- Phòng chỉ có 1 CBCT thì phát luôn ở bước 4.
- Em đến muộn (mặc định trong 15 phút): *phát bổ sung*, ghi lí do; giờ nộp vẫn như cả phòng.
- Màn hình bài làm: lưới thu nhỏ từng em (câu đang làm, bảng câu, thao tác gần nhất).
  - Ô viền đỏ: em đang ở ngoài app. Ô viền vàng: có dấu hiệu nghi ngờ.
  - Bấm vào một em: xem màn hình bài làm đầy đủ, lịch sử từng thao tác. Bấm một dòng lịch sử để **xem lại màn hình lúc đó**.
  - Ghi biên bản vi phạm ngay trên màn hình đó.

**Quản lí ca thi (tổ trưởng, BGH)**
- Tạo ca thi: chọn đề, chọn lớp; app tự chia phòng theo tên (ABC tiếng Việt: tên → họ đệm) và cấp số báo danh.
- Phân công CBCT (1–3 người/phòng, một người không coi hai phòng).
- Mở phòng chờ → ra lệnh phát đề → phát thay / phát đồng loạt khi cần → kết thúc ca.
- Mã niêm phong và *biên bản giao nhận đề*: gửi qua Zalo/email bằng nút chia sẻ của điện thoại.
- Theo dõi phát đề: từng phòng ở bước nào, ai đã nhận phòng, phát lúc mấy giờ, chậm bao lâu so với lệnh, bao nhiêu máy đã nhận đề.
- Lịch sử làm bài: xếp theo mức nghi ngờ kèm lí do, và các cặp thí sinh cùng phòng trùng nhiều đáp án sai.
- Kết quả: phổ điểm, danh sách, chấm tự luận, công bố/thu hồi điểm.
- Ngân hàng câu hỏi (thêm, sửa, xoá); soạn đề từ ngân hàng.

**Kĩ thuật viên, BGH, quản trị**
- Theo dõi mọi phòng. Kĩ thuật viên **chỉ thấy khung bài**: số câu, phương án đã chọn, không thấy nội dung đề.
- Danh sách học sinh theo lớp, cấp tài khoản học sinh.
- Gửi thông báo (tới mọi học sinh hoặc thí sinh một ca), trả lời tin nhắn.
- Quản trị: tài khoản cán bộ, vai trò.

## 1. Chạy thử ngay (không cần Firebase)

Khi chưa điền cấu hình Firebase, app chạy **chế độ thử**: dữ liệu mẫu nằm trong máy, gồm:
- 9 cán bộ, 24 học sinh, 16 câu hỏi, 2 đề;
- 4 ca thi: một ca đang mở phòng chờ, một ca **đang thi** có thí sinh giả lập làm bài (có em rời app, chụp màn hình), một ca đã có điểm, một ca sắp tới.

Mật khẩu chung `demo1234`. Trang đăng nhập có sẵn các tài khoản thử, bấm vào là điền.

```bash
npm install
npx expo start          # quét mã QR bằng app Expo Go (Android/iOS) hoặc bấm w để mở trên trình duyệt
```

Thử trọn quy trình phát đề:
1. `hs001` vào phòng chờ.
2. `giamthi1` nhận phòng, điểm danh.
3. `toan` ra lệnh phát đề.
4. `giamthi1` mở niêm phong (mã niêm phong xem ở màn hình ca thi của `toan`).
5. `giamthi2` nhận phòng rồi xác nhận.
6. `hs001` tự vào bài.

Trên trình duyệt: mở nhiều tab, mỗi tab đăng nhập một tài khoản; các tab dùng chung dữ liệu.

## 2. Tạo Firebase (khoảng 20 phút)

1. <https://console.firebase.google.com> → **Add project**.
2. **Build → Authentication → Get started → Email/Password → Enable.**
3. **Build → Firestore Database → Create database**, vùng `asia-southeast1` (Singapore), chế độ *production*.
4. **Nâng gói Blaze** (trả theo dùng; Cloud Functions bắt buộc gói này). Quy mô một trường thường nằm trong mức miễn phí hằng tháng. Nên đặt **Budget alert**.
5. **Project settings → Your apps → Web (</>)** → đăng kí → chép khối `firebaseConfig`.
   - Sao chép `.env.example` thành `.env` rồi điền các giá trị (hoặc sửa thẳng `src/data/config.ts`).
6. Cài công cụ và triển khai:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add                     # chọn dự án vừa tạo
   cd functions && npm install && cd ..
   firebase deploy --only firestore,functions
   ```
7. Nạp dữ liệu mẫu (tài khoản, câu hỏi, một ca thi):
   - **Project settings → Service accounts → Generate new private key** → lưu thành `functions/service-account.json` (**không** chia sẻ tệp này);
   - chạy:
     ```bash
     cd functions && npm run build && node lib/functions/tools/seed.js
     ```
8. Chạy app: `npx expo start`. App tự dùng Firebase khi có `apiKey`.

Tài khoản thật: quản trị tạo cán bộ ở *Quản lí → Cán bộ*; kĩ thuật viên tạo học sinh ở *Quản lí → Học sinh*. Tên đăng nhập `hs001` tương ứng email nội bộ `hs001@hvt.codeplus.app`.

## 3. Đóng gói app (không cần máy Mac)

Dùng EAS Build (dịch vụ build đám mây của Expo; cần tài khoản expo.dev miễn phí):
```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview      # ra tệp .apk cài thẳng lên điện thoại Android
eas build -p ios --profile production       # cần tài khoản Apple Developer (99 USD/năm)
eas submit -p android | ios                 # đưa lên Google Play / App Store
```

Lưu ý:
- Chặn chụp màn hình và vân tay/Face ID chạy đầy đủ trên bản build. Trong Expo Go chỉ để thử.
- Đổi tên gói `vn.edu.hvt.codeplus` và tên app trong `app.json` nếu cần.

## 4. Kiến trúc

```
shared/logic.ts        Lõi nghiệp vụ: chấm điểm (cả đúng/sai 4 ý kiểu TN THPT), quy trình phát đề 5 bước,
                       nhật kí thao tác + điểm nghi ngờ, chia phòng ABC, trộn câu có hạt giống
shared/handlers.ts     MỌI thao tác ghi (tạo ca, phát đề, lưu bài, nộp bài, công bố…) — một bản duy nhất,
                       chạy trên Cloud Functions (giao dịch Firestore) và trong app ở chế độ thử
shared/seed.ts         Dữ liệu mẫu
functions/src/index.ts Cloud Functions: api (gọi handlers), createUser, autoClose (mỗi phút tự nộp bài quá giờ)
functions/tools/       seed.ts (nạp dữ liệu mẫu), test.ts (28 kiểm thử nghiệp vụ: npm run test:logic)
firestore.rules        Quyền đọc: học sinh chỉ thấy ca/bài/phòng của mình; ĐỀ chỉ đọc được khi bài đã được phát
src/data/              api.ts (giao diện chung), firebase.ts, demo.ts (chế độ thử), config.ts
src/app/               Màn hình (Expo Router): (hs)/ học sinh · (cb)/ cán bộ · thi/ làm bài · cb/ phát đề, theo dõi…
src/ui/                Thành phần giao diện, màu, hộp thoại, hiển thị câu hỏi
```

Dữ liệu Firestore:
- `users`
- `sessions/{ca}` với `rooms/{phòng}` và `paper/main` (đề không có đáp án)
- `keys/{ca}` (đáp án, chỉ quản lí ca đọc)
- `attempts/{ca_hs}` với `events/` (nhật kí thao tác)
- `bank`, `exams`, `notices`, `incidents`, `threads/{hs}/msgs`

App không ghi thẳng dữ liệu thi. Mọi thao tác đi qua Cloud Functions trong giao dịch nên không sửa được giờ, điểm, trạng thái từ máy.

## 5. Giới hạn của bản này

- **Chưa mã hoá dữ liệu** (theo lựa chọn hiện tại). Ai có quyền vào Firebase Console đọc được nội dung. Bảo vệ hiện có là Security Rules và tài khoản Google của dự án.
- Điểm ghi vào bài làm ngay khi nộp. Giao diện chỉ hiện sau khi công bố, nhưng học sinh rành kĩ thuật có thể đọc sớm qua API. Muốn chặn hẳn: tách điểm sang bộ sưu tập riêng.
- Mở phòng chờ ghi mọi bài trong một giao dịch (Firestore giới hạn 500 thao tác) → **tối đa khoảng 480 thí sinh mỗi ca**. Ca lớn hơn thì chia nhiều ca, hoặc sửa `openSession` ghi theo lô.
- iOS không cho app chặn hẳn chụp màn hình: app phát hiện, ghi lại và báo CBCT. Android chặn được. App chưa bật *ghim màn hình* (screen pinning) của Android.
- Đề chỉ có chữ (chưa có ảnh, công thức LaTeX).
- Phần Firebase chưa chạy thử trên dự án thật vì môi trường viết mã không kết nối được Firebase. Logic nghiệp vụ dùng chung đã kiểm thử, giao diện đã chạy thử ở chế độ thử. Lần đầu triển khai nên thử một ca nhỏ trước.
