# Hệ thống Quản lý Phòng khám Dịch vụ (Laravel & React)

![Laravel](https://img.shields.io/badge/Laravel-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)

Dự án xây dựng một hệ thống phần mềm dựa trên web (web-based) nhằm tối ưu hóa quy trình hoạt động của một phòng khám dịch vụ, từ khâu tiếp nhận bệnh nhân đến quản lý tài chính và dược phẩm.

---
## Người thực hiện 
> Lý Minh Phước
> Lê Xuân Vũ
---

## 🎯 Mục tiêu dự án

Xây dựng một hệ thống phần mềm web cho phép phòng khám hoạt động hiệu quả hơn bằng cách quản lý toàn bộ quy trình khám bệnh:
> Từ tiếp nhận bệnh nhân → đặt lịch → chờ khám
> Đến khám bệnh, chỉ định xét nghiệm → trả kết quả → kê toa
> Quản lý thuốc, quản lý dịch vụ, bác sĩ, thống kê doanh thu

---

## 📋 Công nghệ sử dụng

| Thành phần | Công nghệ |
| :--- | :--- |
| 🚀 **Backend** | Laravel Framework (PHP) |
| ⚛️ **Frontend** | ReactJS (khởi tạo với Vite) |
| 🐘 **Database** | PostgreSQL |
| 🔐 **Authentication**| Laravel Sanctum (cho SPA) |
| ☁️ **Deployment** | Supabase (Database), Vercel (Frontend), Render (Backend) |

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy

### Yêu cầu hệ thống
* Git
* PHP >= 8.2
* Composer 2
* Node.js >= 18.0 & npm
* Một PostgreSQL client (ví dụ: DBeaver, pgAdmin)

### Các bước cài đặt

1.  **Clone repository về máy:**
    ```bash
    git clone 
    cd 
    ```

2.  **Cài đặt Backend (Laravel):**
    ```bash
    # Di chuyển vào thư mục backend
    cd backend

    # Cài đặt các gói phụ thuộc
    composer install

    # Sao chép file môi trường
    copy .env.example .env

    # Mở file .env và cấu hình thông tin kết nối đến database PostgreSQL của bạn
    # DB_CONNECTION=pgsql
    # DB_HOST=...
    # DB_PORT=...
    # DB_DATABASE=...
    # DB_USERNAME=...
    # DB_PASSWORD=...

    # Tạo khóa ứng dụng
    php artisan key:generate

    # (Quan trọng) Chạy script SQL để tạo bảng và dữ liệu mẫu
    # Sử dụng PostgreSQL client để chạy file database.sql của bạn
    ```

3.  **Cài đặt Frontend (React):**
    ```bash
    # Di chuyển sang thư mục frontend
    cd ../frontend

    # Cài đặt các gói phụ thuộc
    npm install
    ```

4.  **Khởi chạy dự án:**
    * **Chạy Backend Server** (tại terminal trong thư mục `backend`):
        ```bash
        php artisan serve
        ```
        > Backend sẽ chạy tại: `http://127.0.0.1:8000`

    * **Chạy Frontend Server** (mở một terminal khác, trong thư mục `frontend`):
        ```bash
        npm run dev
        ```
        > Frontend sẽ chạy tại: `http://localhost:5173` (hoặc một cổng khác)

---

## ⭐ Chức năng chính

Hệ thống được phân quyền rõ ràng cho 4 vai trò người dùng chính:

#### 📌 Admin
* Quản lý toàn bộ danh sách người dùng (bệnh nhân, nhân viên).
* Quản lý danh mục dịch vụ (khám, xét nghiệm, chi phí...).
* Quản lý danh mục thuốc (tên, đơn vị, giá, số lượng tồn kho).
* Xem thống kê tổng quan về lượt khám và doanh thu.

#### 📌 Lễ tân
* Tạo và quản lý lịch hẹn cho bệnh nhân (đặt online và trực tiếp).
* Quản lý hàng đợi khám bệnh trong ngày.
* Quản lý và sắp xếp lịch làm việc của bác sĩ.
* Thực hiện quy trình thanh toán và in hóa đơn.

#### 📌 Bác sĩ
* Xem danh sách bệnh nhân được phân công khám trong ngày.
* Ghi nhận thông tin khám bệnh: triệu chứng, chẩn đoán.
* Chỉ định các dịch vụ cận lâm sàng (xét nghiệm, siêu âm...).
* Xem kết quả xét nghiệm và đưa ra kết luận cuối cùng.
* Kê đơn thuốc điện tử dựa trên danh mục thuốc có sẵn.

#### 📌 Bệnh nhân
* Đăng ký tài khoản và đăng nhập vào hệ thống.
* Chủ động đặt lịch khám online (chọn chuyên khoa, bác sĩ, ngày giờ).
* Xem lại lịch sử các lần khám bệnh của mình.
* Xem và tải về đơn thuốc, kết quả xét nghiệm.

---

## 🔄 Quy trình nghiệp vụ
1.  **Tiếp nhận & Đặt lịch:** Bệnh nhân đặt lịch online hoặc lễ tân tạo lịch trực tiếp. Lịch khám có các trạng thái: `Đã đặt`, `Đang chờ`, `Đã khám`, `Hủy`.
2.  **Khám bệnh:** Bác sĩ xem thông tin, ghi nhận chẩn đoán và chỉ định dịch vụ xét nghiệm (nếu cần).
3.  **Xét nghiệm:** Kỹ thuật viên cập nhật kết quả. Bác sĩ dựa vào đó để đưa ra kết luận và kê toa.
4.  **Kê toa & Quản lý thuốc:** Đơn thuốc được tạo từ kho thuốc của hệ thống, tự động trừ tồn kho.
5.  **Thanh toán:** Hệ thống tự động tính tổng chi phí (khám + dịch vụ + thuốc) và tạo hóa đơn.

---

## 🔐 Bảo mật

Hệ thống được xây dựng với các tiêu chí bảo mật chặt chẽ:
* **Mã hoá mật khẩu:** Sử dụng cơ chế Hashing mặc định và an toàn của Laravel (Bcrypt).
* **Xác thực API:** **Laravel Sanctum** được sử dụng để xác thực cho ứng dụng React (SPA), đảm bảo an toàn cho các endpoint.
* **Phân quyền chi tiết:** Sử dụng **Gates và Policies** của Laravel để kiểm soát quyền truy cập của từng vai trò, đảm bảo người dùng chỉ có thể thực hiện các hành động được cho phép.
* **Bảo vệ Endpoint:** Toàn bộ API endpoint được bảo vệ bởi **Middleware**. Dữ liệu đầu vào được kiểm tra chặt chẽ bằng **Form Requests** để chống lại các tấn công phổ biến như XSS, SQL Injection.

---

## 💡 Tính năng dự kiến phát triển
* Tích hợp gửi SMS hoặc email tự động để nhắc lịch khám.
* Xây dựng module chat nội bộ giữa lễ tân và bác sĩ.
* Mở rộng quản lý cho nhiều chi nhánh phòng khám.
* Tạo mã QR Code cho mỗi bệnh nhân để tra cứu hồ sơ nhanh.
* Xây dựng các báo cáo doanh thu chi tiết theo ngày/tháng/năm.
