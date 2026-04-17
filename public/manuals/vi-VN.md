# tuc translator Hướng dẫn sử dụng

---

## 1. Tính Năng Giao Diện & Hướng Dẫn Vận Hành

### 1. Bắt Đầu

Sau khi mở trang web lần đầu tiên, hoàn thành các bước sau:

1. **Nhập Tên**: Nhập tên hiển thị của bạn (ví dụ: `Barret`, chức danh hoặc số ghế).
2. **Nhập Gemini API Key**: Nhập khóa API Google AI Studio (định dạng: `AIza...`).
3. **Tạo hoặc Tham gia Phòng**:
   - Nhấp "Tạo Phòng Mới" để bắt đầu phiên dịch.
   - Hoặc dán liên kết mời được chia sẻ bởi người khác để tham gia trực tiếp.

> [!IMPORTANT]
> **Cơ chế chấp nhập nghiêm ngặt**: Khi vào phòng họp, hệ thống sẽ phát hiện xem bạn có Khóa API hợp lệ hay không (khóa cá nhân hoặc khóa được chia sẻ). Nếu cả hai đều không khả dụng, hướng dẫn thiết lập sẽ tự động hiện lên. Nếu bạn chọn hủy, bạn sẽ không thể vào phòng hoặc xem bất kỳ bản dịch nào.

> [!NOTE]
> API Key được lưu trữ cục bộ trong trình duyệt và sẽ không được tải lên bất kỳ máy chủ nào.

---

### 2. Thanh Chọn Ngôn Ngữ (Bảng Điều Khiển)

Thanh ngang ở giữa màn hình, từ trái sang phải:

| Phần tử | Mô tả |
|---|---|
| 🏳️ Cờ Bên Trái | Ngôn ngữ bạn nói (ngôn ngữ nguồn) |
| 🌐 Menu Bên Trái | Chọn "Ngôn ngữ của tôi" (Local); không thể thay đổi khi đang ghi âm |
| ⇄ Nút Mũi Tên Giữa | Hoán đổi nhanh ngôn ngữ trái/phải; bị vô hiệu hóa khi đang ghi âm |
| 🌐 Menu Bên Phải | Chọn "Ngôn ngữ đối phương" (Client); không thể thay đổi khi đang ghi âm |
| 🏳️ Cờ Bên Phải | Cờ ngôn ngữ của đối phương |
| 🔴 **Nhãn Đỏ LIVE** | Kết nối giọng nói thời gian thực đang hoạt động, dịch qua Gemini Live API |
| ⚡ **Nhãn Vàng Local** | Chế độ dự phòng, sử dụng nhận dạng giọng nói cục bộ; dịch thuật vẫn hoạt động bình thường |
| 🎙️ Nút Ghi Âm | 🔵 Xanh = chưa ghi âm, nhấp để bắt đầu; 🔴 Khung đỏ nhấp nháy = đang ghi âm, nhấp để dừng |

> [!IMPORTANT]
> Ngôn ngữ phải được thiết lập **trước khi bắt đầu ghi âm**. Bạn không thể chuyển đổi ngôn ngữ trong khi đang ghi âm.

---

### 3. Hộp Chat Dịch Thuật

- Mỗi tin nhắn hiển thị: tên người nói (ví dụ: `Barret`), văn bản gốc và văn bản đã dịch.
- Thanh trạng thái phía trên:
  - 🔴 **Đang nghe...** = Gemini Live đang xử lý âm thanh thời gian thực
  - 🟡 **Chế độ Local đang nghe...** = Chế độ dự phòng; nhận dạng và dịch thuật vẫn hoạt động
- Nút góc trên bên phải:
  - **Chia sẻ**: Sao chép hoặc chia sẻ tất cả bản ghi hội thoại
  - **Xóa**: Xóa tất cả bản ghi hội thoại (chỉ người tạo phòng mới có thể thực hiện)

---

### 4. Thanh Nhập Văn Bản (Dưới Cùng Màn Hình)

Khi không thể sử dụng giọng nói hoặc cần nhập văn bản chính xác:

1. Nhấp nút hướng bên trái để chuyển đổi hướng dịch (Local → Client hoặc Client → Local).
2. Nhập tin nhắn vào hộp văn bản.
3. Nhấn Enter hoặc nhấp nút gửi để dịch.

> [!NOTE]
> Nhập văn bản có sẵn bất cứ lúc nào, **không cần bắt đầu ghi âm trước**.

---

### 5. Cài Đặt Đầu Ra Giọng Nói (Nút Nổi, Góc Dưới Bên Phải)

Nhấp nút tròn (biểu tượng loa) ở góc dưới bên phải để mở cài đặt phát:

| Tùy chọn | Mô tả |
|---|---|
| **Tắt tiếng** | Không phát giọng nói cho bản dịch |
| **Chỉ mình tôi** | Chỉ phát âm thanh dịch trên thiết bị của bạn |
| **Tất cả** | Tất cả người tham gia có thể nghe |
| **Chỉ người khác** | Chỉ người tham gia khác nghe; bạn không nghe |

---

### 6. Thanh Công Cụ Trên Cùng

Góc trên bên trái hiển thị logo thương hiệu **TUC** (đỏ đậm) và phụ đề (mặc định: Equipment Department). Thanh công cụ bên phải, theo thứ tự:

| Biểu tượng | Chức năng |
|---|---|
| 📋 Room ID + Nút Sao Chép | Sao chép liên kết mời để chia sẻ |
| 📱 Biểu tượng QR Code | Hiển thị QR Code để người khác quét và tham gia |
| 🚪 Biểu tượng Đăng Xuất | Rời phòng hiện tại |
| 👥 Số người dùng (xx/100) | Số người dùng trực tuyến hiện tại |
| 🌙 / ☀️ Biểu tượng Trăng / Mặt Trời | Chuyển đổi chế độ Tối / Sáng |
| 🔒 Biểu tượng Khóa | Cài đặt quản trị (chỉ người tạo phòng mới nhìn thấy) |
| 🟢 **Hệ thống sẵn sàng** | Hệ thống đang hoạt động bình thường |

---

### 7. Cài Đặt Quản Trị (Biểu tượng Khóa)

Chỉ người tạo phòng mới truy cập được:

- **Quotas Limitation**: Xem bảng điều khiển sử dụng RPM / RPD.
- **Cài đặt API Key**: Thay đổi Gemini API Key hoặc Google Cloud API Key.
- **Chuyển đổi Tier API**: Free Tier hoặc Tier 1 (trả theo sử dụng).
- **Cài đặt Tiêu đề**: Tùy chỉnh tên thương hiệu (mặc định: `TUC`) và phụ đề (mặc định: `Equipment Department`).

---

### 8. Tại sao tôi cần API Key cá nhân? (BYOK)

Hệ thống này tuân theo mô hình **BYOK (Bring Your Own Key)**, mang lại một số lợi thế chính:

1. **Hạn ngạch Độc lập**: Mỗi khóa miễn phí có giới hạn 2 kết nối mỗi phút (RPM). Nếu nhiều người dùng chung một khóa, giới hạn này rất dễ bị chạm tới, khiến mọi người bị ngắt kết nối. Sử dụng khóa riêng của bạn đảm bảo kết nối của bạn luôn ổn định và không bị ảnh hưởng bởi người khác.
2. **Đăng ký Dễ dàng và Miễn phí**: Bạn có thể lấy khóa miễn phí trong chưa đầy một phút qua [Google AI Studio](https://aistudio.google.com/app/apikey). Không cần thẻ tín dụng hay cấu hình phức tạp.
3. **Độ ổn định Kết nối**: Có hạn ngạch riêng giúp đảm bảo bạn duy trì nhận dạng giọng nói và dịch thuật ổn định trong giờ cao điểm hoặc các cuộc họp dài.
4. **Bảo mật Dữ liệu**: Khóa API và lịch sử trò chuyện của bạn chỉ được lưu trữ trong trình duyệt cục bộ. Khóa giao tiếp trực tiếp với máy chủ của Google mà không được chuyển tiếp qua bất kỳ máy chủ trung gian nào của bên thứ ba.

---

## 2. Giới Hạn Sử Dụng

### 1. Giới hạn Quota API

Hệ thống sử dụng Google Gemini API. Giới hạn tài khoản Free Tier:

| Mục | Giới hạn Free Tier |
|---|---|
| **Kết nối mỗi Phút (RPM)** | 2 |
| **Kết nối mỗi Ngày (RPD)** | 50 |
| **Thời lượng Kết nối Tối đa** | 3 giờ (ngắt kết nối bắt buộc) |
| **Ngắt kết nối khi Không hoạt động** | Hỏi sau 1 giờ; ngắt tự động sau 3 phút không phản hồi |

Thời gian đặt lại quota:
- RPM: Đặt lại cuộn mỗi phút
- RPD: Đặt lại hàng ngày lúc 15:00 (mùa đông) hoặc 16:00 (mùa hè) giờ Thái Lan

---

### 2. Tương thích Trình duyệt

| Tính năng | Chrome | Safari (iOS/Mac) | Firefox |
|---|---|---|---|
| Dịch Giọng nói Thời gian Thực | Hỗ trợ Đầy đủ | Hỗ trợ Đầy đủ | **Không Hỗ trợ** |
| Nhận dạng Giọng nói Cục bộ | Hỗ trợ | Hỗ trợ | **Không Hỗ trợ** |
| Dịch Nhập Văn bản | Hỗ trợ | Hỗ trợ | Hỗ trợ |
| Chia sẻ QR Code | Hỗ trợ | Hỗ trợ | Hỗ trợ |

> [!CAUTION]
> **Người dùng Firefox chỉ có thể sử dụng chế độ nhập văn bản.** Tính năng giọng nói không khả dụng.

---

### 3. Hỗ trợ Ngôn ngữ

Hệ thống hỗ trợ 37 ngôn ngữ. Trong **chế độ dự phòng (Local STT)**, độ chính xác có thể thấp hơn cho một số ngôn ngữ. Chrome hoặc Safari được khuyến nghị cho:
- Tiếng Ả Rập
- Tiếng Do Thái
- Tiếng Filipino

---

### 4. Lưu ý Thiết bị iOS

> [!WARNING]
> **Chuyển ứng dụng ra nền hoặc khóa màn hình**: Micro sẽ bị hệ thống iOS ngắt. Hệ thống sẽ cố khởi động lại ghi âm trong vòng 2 giây sau khi bạn quay lại ứng dụng.

- **Trong khi nghe điện thoại**: Ghi âm sẽ tạm dừng. Vui lòng khởi động lại ghi âm thủ công sau khi kết thúc cuộc gọi.

---

## 3. Kịch bản Sử dụng & Tránh Giới hạn Quota

### Thông tin Cơ bản

"Số lần kết nối" Gemini Live được tính: **mỗi lần bắt đầu ghi âm hoặc hệ thống tự động kết nối lại = 1 yêu cầu**.

- **Một cuộc họp liên tục** = tiêu thụ **1 RPD**
- **Một lần kết nối lại tự động** = tiêu thụ thêm **1 RPD và 1 RPM**

---

### Khuyến nghị

> [!IMPORTANT]
> **Thiết lập ngôn ngữ trước khi ghi âm**: Chuyển đổi ngôn ngữ kích hoạt kết nối lại, mỗi lần +1 RPD.

> [!IMPORTANT]
> **Tránh bắt đầu/dừng ghi âm quá 2 lần trong 1 phút**: Free Tier chỉ cho phép 2 kết nối mỗi phút.

1. **Duy trì kết nối internet ổn định**: Wi-Fi ổn định hơn dữ liệu di động.
2. **Ghi âm liên tục cho cuộc họp dài**: Đừng dừng ghi âm chỉ vì tạm ngừng nói.
3. **Thấy ⚡ Local là bình thường**: Dịch thuật vẫn hoạt động. Hệ thống sẽ tự động kết nối lại và chuyển về 🔴 LIVE khi thành công.

---

*Hướng dẫn này được viết dựa trên phiên bản hệ thống 2026-04-15.*
