# Phenikaa Dental Frontend

Frontend React/Vite của đồ án DOAN1, nằm độc lập trong thư mục `frontend/`.

## Công nghệ

- React 19
- Vite 8
- React Router
- Axios
- Socket.IO Client
- Tailwind CSS 4
- Recharts

## Cài đặt

```bash
cd frontend
npm install
```

Tạo file `.env` từ `.env.example`:

```env
VITE_API_URL=http://localhost:8080/api
VITE_SOCKET_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

`VITE_GOOGLE_CLIENT_ID` phải trùng với `GOOGLE_CLIENT_ID` ở `backend/.env` nếu bật đăng nhập Google.

## Chạy frontend

```bash
npm run dev
```

Mặc định Vite chạy tại:

```text
http://localhost:5173
```

Backend cần chạy song song tại:

```text
http://localhost:8080
```

## Kiểm tra

```bash
npm run lint
npm run build
```

Build output nằm trong `frontend/dist/`.

## Màn hình chính

- Trang chủ public Phenikaa Dental.
- Đăng nhập/đăng ký thường và Google.
- Đặt lịch khám theo dịch vụ, bác sĩ, slot trống.
- Profile bệnh nhân: lịch hẹn, hồ sơ, hóa đơn, đánh giá.
- Dashboard theo role:
  - Admin: tổng quan, dịch vụ, lịch, lịch làm việc, khuyến mãi, đánh giá, tài khoản, cài đặt.
  - Staff: lịch hẹn, lịch làm việc, hóa đơn, thông báo.
  - Dentist: lịch khám, ghi hồ sơ, đăng ký nghỉ, thông báo.
- Chat realtime khách hàng/nhân viên.
- Notification realtime và lịch sử thông báo theo loại.

## Theme giao diện

Màu giao diện được điều khiển qua `Settings` ở dashboard admin. Frontend đọc theme từ `/settings/public` và áp vào `html[data-theme]`.

Các palette hiện có:

- Pastel nha khoa
- Mint dịu
- Ocean xanh
- Lavender sạch
- Rose ấm
- Navy chuyên nghiệp
