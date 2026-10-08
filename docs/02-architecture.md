# Kiến trúc và quy trình thực nghiệm

Python/scikit-learn → huấn luyện + 5-fold CV → chọn alpha trên train → khóa lựa chọn → đánh giá test → JSON artifacts → Next.js/TypeScript inference → trực quan hóa → diễn giải → quyết định con người.

- Next.js App Router, TypeScript, Tailwind, Lucide, Recharts, thành phần UI theo shadcn.
- Huấn luyện offline; web chỉ chọn cấu hình có thật. Không giả lập training, không backend Streamlit thường trực.
- Lưới alpha cố định trước đánh giá, độc lập dữ liệu test. Classification tối đa Macro F1, regression tối thiểu RMSE; hòa điểm ưu tiên alpha lớn hơn.
- sklearn nguồn cancer mã hóa malignant=0/benign=1; remap tường minh `y = 1 - target` trước stratified split.
- Diabetes dùng dữ liệu `load_diabetes(scaled=True)` mặc định. Đây là dữ liệu đã chuẩn hóa do nguồn phân phối, không phải dữ liệu đơn vị lâm sàng hay một scaler mới fit trên train/test.
- Model nhận float32 trong sklearn; TypeScript dùng `Math.fround` trước so sánh ngưỡng để bảo toàn phép suy luận.
- Regression tại node lưu mean train; classification lưu số mẫu theo lớp. Xác suất hiển thị là tỷ lệ train tại lá, không được hiệu chuẩn lâm sàng.
- Test parity bao phủ tất cả 1.011 mẫu ở từng cấu hình phù hợp, đối chiếu prediction, distribution, leaf, toàn bộ path. Kiểm tra ngưỡng float32 riêng.
- Artifact version dựa trên SHA-256 cấu trúc cây, split, schema, metrics; metadata ghi phiên bản Python/numpy/sklearn. Fixtures chỉ dùng trong kiểm thử, không đóng gói vào web.
- Phạm vi input là miền quan sát của dataset, không phải giới hạn y tế. Reject tên sai, giá trị thiếu, nonfinite, ngoài miền; thứ tự do schema quyết định.
- Triển khai: Vercel production đã xác minh tại https://cart-decision-lab.vercel.app từ commit 8078b42. Không lưu credentials vào repo; deployment evidence nằm trong evidence/deployment.json.

## Nguồn chính

- https://scikit-learn.org/stable/modules/tree.html
- https://scikit-learn.org/stable/auto_examples/tree/plot_cost_complexity_pruning.html
- https://scikit-learn.org/stable/modules/generated/sklearn.datasets.load_breast_cancer.html
- https://scikit-learn.org/stable/modules/generated/sklearn.datasets.load_diabetes.html
- https://nextjs.org/docs/app/getting-started/installation
