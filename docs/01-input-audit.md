# Giai đoạn 1 — Kiểm kê đầu vào

Ngày: 08/10/2026 (Asia/Saigon).

Đã đọc toàn bộ tệp yêu cầu `Pasted text.txt` do người dùng đính kèm. Thư mục làm việc ban đầu trống.

| Đầu vào | Trạng thái | Hệ quả |
|---|---|---|
| Master prompt | Đã đọc | Nguồn yêu cầu chức năng và quy trình |
| Báo cáo DOCX gốc | Đã được cung cấp trong khi xây dựng; đã đọc toàn bộ 472 đoạn, 10 bảng | Báo cáo có 4 chương, Phụ lục A/B/C, 9 hình; mã Python có trong A/B; không có mã Streamlit |
| Mã Python/Streamlit | Chưa được cung cấp | Xây dựng mới; không khẳng định đã bảo toàn chức năng cũ |
| ZIP dự án | Chưa được cung cấp | Không có mã nguồn để kế thừa |
| Canva/PPTX | Chưa được cung cấp | Có thể xây dựng PPTX mới sau khi xác định triển khai |

Thông số từ yêu cầu: Breast Cancer 569×30; malignant=1, benign=0; Gini; stratified 80/20, seed 42; cấu hình tham chiếu alpha=0.004396. Diabetes 442×10; squared_error; 80/20, seed 42; 5-fold CV trên train; MAE/MSE/RMSE/R².

Alpha=0.004396 là cấu hình minh họa trong báo cáo, không mặc định tối ưu CV. Baseline và phân loại tham chiếu khớp báo cáo. Hồi quy trong Phụ lục B dùng alpha từ đường cost-complexity: tái lập α=201.6003887727345, sâu 2, 4 lá, RMSE=61.118734, R²=0.294943. Web bổ sung mô hình tham chiếu này và giữ mô hình chọn bằng lưới cố định riêng. Xem 03-report-comparison.md.
