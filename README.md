# CART Decision Lab

Ứng dụng học thuật tiếng Việt cho môn **Hệ hỗ trợ quyết định (DSS)**. Next.js App Router suy luận TypeScript từ cây CART được Python/scikit-learn huấn luyện thật.

> Ứng dụng sử dụng bộ dữ liệu nghiên cứu nhằm minh họa thuật toán CART. Kết quả không dành cho chẩn đoán, điều trị hoặc quyết định y tế.

## Chức năng

7 trang: Overview, Classification Lab, Regression Lab, Live Prediction, Decision Path Explorer, Pruning Experiment và Algorithm Explainer. Có cây tương tác, thống kê node, confusion matrix/report/ROC, feature importance, actual vs predicted, residuals, IF–THEN và ví dụ Gini tương tác. Hỗ trợ dark/light, mobile/tablet và bàn phím.

Chỉ chọn 26 cấu hình đã huấn luyện; không giả lập train, không Python server/Streamlit thường trực. Xác suất hiển thị là tỷ lệ lớp trong mẫu train tại lá, chưa hiệu chuẩn lâm sàng.

## Cài đặt và chạy Windows

Cần Node.js >= 22.12 (đã dùng 26.3.1) và npm. Python 3.12 chỉ cần khi tái lập ML.

```powershell
cd "C:\Users\LAPTOP\Dương Việt Anh\cart-decision-lab"
npm ci
npm run dev
```

Mở http://localhost:3000. Production local: `npm run build`, sau đó `npm start`. Khi không có Internet, web local vẫn suy luận từ artifacts đã có; cài dependencies và thử trước buổi demo.

## Tái lập ML

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r ml/requirements.txt
.\.venv\Scripts\python.exe ml/train.py
.\.venv\Scripts\python.exe -m pytest ml -q --junitxml=evidence/pytest-results.xml
```

Môi trường bàn giao đã có venv ở thư mục lân cận `cart-ml-env`; lệnh chuẩn trên tạo venv độc lập trong repo. Không commit venv.

| Cấu hình | Classification | Regression |
|---|---|---|
| Dataset | Breast Cancer Wisconsin Diagnostic | Diabetes, scaled mặc định sklearn |
| Mẫu / feature | 569 / 30 | 442 / 10 |
| Train / test | 455 / 114, stratified | 353 / 89 |
| Random state | 42 | 42 |
| Estimator | DecisionTreeClassifier | DecisionTreeRegressor |
| Criterion | gini | squared_error |
| Chọn alpha | Max CV Macro F1 | Min CV RMSE |
| Alpha CV selected | 0.02 | 160 |
| Depth / leaves selected | 2 / 3 | 3 / 5 |

CV 5 folds, shuffle=True, seed 42. Lưới alpha cố định trước đánh giá, chỉ dùng train cho CV, hòa điểm ưu tiên alpha lớn hơn. Test đánh giá sau khi khóa lựa chọn. Metric test của cấu hình khác được trình bày cho đối chiếu học thuật, không chọn lại alpha bằng test.

Cancer nguồn sklearn malignant=0, benign=1 được remap tường minh `y = 1 - target` trước split. Diabetes dùng `load_diabetes(scaled=True)`: nhập dữ liệu scaled, không tuổi/BMI theo đơn vị thô. Miền input là min/max dataset tham chiếu, không phải phạm vi y tế. Schema xác thực đầy đủ tên, thứ tự, kiểu, giá trị hữu hạn và miền quan sát.

## Kết quả test thật

| Classification | Alpha | Accuracy | Precision malignant | Recall malignant | F1 malignant | Macro F1 |
|---|---:|---:|---:|---:|---:|---:|
| Baseline | 0 | 0.929825 | 0.904762 | 0.904762 | 0.904762 | 0.924603 |
| Tham chiếu yêu cầu | 0.004396 | 0.938596 | 0.972973 | 0.857143 | 0.911392 | 0.932206 |
| CV selected | 0.02 | 0.929825 | 0.947368 | 0.857143 | 0.900000 | 0.922973 |

| Regression | Alpha | MAE | MSE | RMSE | R² |
|---|---:|---:|---:|---:|---:|
| Baseline | 0 | 54.528090 | 4976.797753 | 70.546423 | 0.060654 |
| CV selected | 160 | 47.203282 | 3370.379490 | 58.054970 | 0.363858 |

Chi tiết train/test, CV từng fold, ROC-AUC, nodes và leaves trong `evidence/experiments.json`. Đã tái lập đúng Phụ lục A/B báo cáo gốc. Classification tham chiếu khớp toàn bộ kết quả. Regression tham chiếu α = 201.6003887727345 (path-derived CV), 4 lá, RMSE 61.118734, R² 0.294943; mô hình này cũng có artifact riêng. Web chọn α = 160 trên lưới cố định, cho 5 lá, RMSE 58.054970. Hai cách chọn alpha được phân biệt, không ép số liệu trùng nhau.

## Kiểm thử

```powershell
npm run typecheck
npm run lint -- --max-warnings 0
npm test
npx playwright install chromium
# Chạy npm start hoặc npm run dev ở terminal khác:
npm run test:browser
```

- Pytest huấn luyện lại toàn bộ 26 cấu hình, kiểm tra split/nhãn/CV không có test/metrics/thống kê node/version SHA-256.
- Vitest đối chiếu prediction, distribution, leaf, path trên **13.016 lượt suy luận** (569×12 + 442×14), cộng input sát threshold float32. `Math.fround` input và threshold float64 bảo toàn sklearn; hòa lớp chọn index nhỏ hơn.
- Playwright thực hiện thao tác trên 7 trang, refresh, hai bài toán prediction, lỗi input, path highlight, alpha, dark/light, mobile/tablet, 200% text, axe WCAG cơ bản và ảnh chụp web thật.
- Bằng chứng lưu `evidence/`; chỉ kết quả đã chạy mới được ghi là passed trong `docs/STATUS.md`.

Kiểm tra production bằng cùng suite:

```powershell
$env:CART_BASE_URL = 'URL-thuc-da-deploy'
npm run test:browser
Remove-Item Env:CART_BASE_URL
```

## Source

`src/app/`: 7 routes, layout/theme; `src/components/`: UI, charts, tree; `src/components/ui/`: Button theo shadcn (Radix Slot + cva); `src/artifacts/`: models/schema/metrics/version; `src/lib/`: inference/tree layout/types/Gini; `ml/`: training/pytest/pinned requirements; `tests/fixtures/`: expected sklearn, không bundle vào web; `tests/unit/`, `tests/e2e/`: tests; `docs/`, `evidence/`: tài liệu và bằng chứng.

## GitHub / Vercel

Dùng repository riêng `cart-decision-lab`. Vercel framework **Next.js**, root repository root, install `npm ci`, build `npm run build`. Không cần env vars. Artifacts commit cùng source; Python/fixtures không nằm trong runtime web. GitHub Actions có typecheck/lint/unit/ML/build/browser checks. Production đã được xác minh tại [cart-decision-lab.vercel.app](https://cart-decision-lab.vercel.app) từ commit `8078b42`; bằng chứng deployment và kiểm thử public nằm trong `evidence/deployment.json` và `evidence/browser-tests.json`.

Nếu CLI chưa đăng nhập: `npx vercel login` và xác thực qua trình duyệt; không gửi mật khẩu hay token qua chat. URL thật và trạng thái triển khai ghi trong `docs/STATUS.md` sau kiểm chứng. Test local không chứng minh production đã deploy.

## Giới hạn

Chưa train động/dữ liệu mới; không pipeline categorical thô/missing; tỷ lệ lớp chưa hiệu chuẩn; path/importance không phải giải thích nhân quả. Pruning không bảo đảm mọi test metric tăng. Dataset nghiên cứu không đại diện mọi dân số.

Đã nhận và đọc DOCX gốc; chưa được cung cấp Canva/PPTX gốc. Giữ trạng thái thật, không tái dựng nội dung gốc theo suy đoán. Bản báo cáo và slides được xử lý sau bước xác định triển khai theo master prompt.

## Nguồn chính

- https://scikit-learn.org/stable/modules/tree.html
- https://scikit-learn.org/stable/auto_examples/tree/plot_cost_complexity_pruning.html
- https://scikit-learn.org/stable/modules/generated/sklearn.datasets.load_breast_cancer.html
- https://scikit-learn.org/stable/modules/generated/sklearn.datasets.load_diabetes.html
- Breiman et al. (1984), *Classification and Regression Trees*.
- Quinlan (1986), *Induction of Decision Trees*; Quinlan (1993), *C4.5: Programs for Machine Learning*.
