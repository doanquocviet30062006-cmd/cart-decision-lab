# Đối chiếu thực nghiệm với báo cáo gốc

Đã đọc toàn bộ báo cáo gốc do người dùng cung cấp tại Downloads, gồm 472 đoạn, 10 bảng và 9 hình. Mã A/B có thể tái lập bằng cùng dữ liệu, seed và label remapping.

## Kết quả tái lập

| Mô hình | Báo cáo gốc | Python hiện tại | Kết luận |
|---|---|---|---|
| Classification baseline | sâu 8, 24 lá, Accuracy 92.98% | 8, 24, 92.982456% | Khớp làm tròn |
| Classification alpha 0.004396 | sâu 5, 11 lá, Accuracy 93.86%, Macro F1 93.22% | 5, 11, 93.859649%, 93.220627% | Khớp làm tròn |
| Confusion matrix tham chiếu | TN 71, FP 1, FN 6, TP 36 | 71, 1, 6, 36 | Khớp |
| Regression baseline | 19, 346, RMSE 70.55, R² 0.061 | 19, 346, 70.546423, 0.060654 | Khớp làm tròn |
| Regression Phụ lục B | α≈201.600, 2, 4, MAE 49.37, RMSE 61.12, R² 0.295 | α=201.6003887727345, 2, 4, 49.365345, 61.118734, 0.294943 | Khớp làm tròn |

Không có bằng chứng sai khác do phiên bản thư viện đối với các cấu hình tham chiếu. Evidence: original-report-reproduction.json; scikit-learn 1.9.1.

## Cấu hình bổ sung trên web

Web khóa một lưới alpha cố định cho lựa chọn chính bằng training-only CV. Trong lưới này: classifier α=0.02, 3 lá, Accuracy test 92.982456%, Macro F1 0.922973; regressor α=160, 5 lá, RMSE test 58.054970, R² 0.363858.

Đây là các mô hình khác với cấu hình minh họa gốc, không phải số liệu bị sửa để khớp. Regression gốc chọn từ 243 alpha hiệu dụng trên đường cost-complexity, còn lưới web có 13 mức định trước. Cả hai dùng 5-fold KFold shuffle/seed42 trên train. Khác tập ứng viên có thể đổi mô hình được chọn; không suy ra mô hình web luôn tốt hơn chỉ từ một holdout.

Hai mô hình gốc được giữ trong dropdown như **Tham chiếu báo cáo**. Giao diện và tài liệu phải ghi đúng loại cấu hình khi nêu metric. Kết quả gốc vẫn được giữ ở phần thực nghiệm, bổ sung bảng so sánh cho phiên bản web.

## Nội dung cần bổ sung khi cập nhật DOCX

- Chương 1/2: bổ sung luồng DSS và Decision Path thực hiện từ cấu trúc cây.
- Chương 3: thay công nghệ giao diện dự kiến thành kiến trúc Next.js + offline Python + JSON + TypeScript; mô tả 7 trang, phiên bản, schema, parity, tests và trạng thái triển khai thật.
- Giữ phần thực nghiệm gốc đúng; phân biệt tham chiếu gốc với lựa chọn chính trên web. Bổ sung MSE regression.
- Chương 4: chuyển giao diện giải thích từ hướng phát triển sang kết quả đã có; giữ các hạn chế chưa làm như train động, calibration, drift/audit log và xác thực ngoài.
- Phụ lục A/B: giữ script thực nghiệm tham chiếu, bổ sung lệnh tái lập artifacts và inference TypeScript. C: thay test gợi ý bằng bằng chứng chạy thật và ghi rõ chưa có log quyết định/audit runtime.
- Screenshot phải là ảnh app thật; chỉ gọi ảnh production sau kiểm chứng deployment.
