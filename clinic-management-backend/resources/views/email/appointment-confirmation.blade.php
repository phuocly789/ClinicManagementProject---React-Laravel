<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8" />
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f5f6fa;
            margin: 0;
            padding: 0;
        }

        .container {
            width: 650px;
            margin: 20px auto;
            background: #ffffff;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .header {
            font-size: 22px;
            font-weight: bold;
            color: #0057b8;
            text-transform: uppercase;
            margin-bottom: 20px;
        }

        .label {
            font-weight: bold;
            color: #333;
        }

        .info-box {
            margin-bottom: 10px;
            font-size: 16px;
        }

        .icon {
            margin-right: 8px;
            color: #0057b8;
        }

        .doctor-note {
            padding-left: 12px;
            border-left: 4px solid #0057b8;
            margin: 12px 0;
            color: #444;
            font-size: 15px;
        }

        .footer {
            margin-top: 25px;
            font-size: 15px;
        }

        .doctor-sign {
            font-weight: bold;
            margin-top: 5px;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">XÁC NHẬN LỊCH HẸN KHÁM BỆNH</div>

        <p>Xin chào <strong>{{ $userName }}</strong>,</p>
        <p>Bác sĩ xin thông báo rằng bạn đã đặt lịch hẹn thành công. Dưới đây là thông tin chi tiết:</p>

        <div class="info-box">
            <span class="icon">👤</span>
            <span class="label">Tên bệnh nhân:</span>
            <span>{{ $userName }}</span>
        </div>

        <div class="info-box">
            <span class="icon">📅</span>
            <span class="label">Ngày hẹn:</span>
            <span>{{ $date }}</span>
        </div>

        <div class="info-box">
            <span class="icon">⏰</span>
            <span class="label">Giờ hẹn:</span>
            <span>{{ $time }}</span>
        </div>

        <div class="info-box">
            <span class="icon">💬</span>
            <span class="label">Lời nhắn từ bác sĩ:</span>
            <div class="doctor-note">
                {{ $messageFromDoctor }}
            </div>
        </div>

        <p class="footer">
            Nếu bạn có bất kỳ thắc mắc hoặc cần thay đổi thời gian, vui lòng liên hệ qua email hoặc hotline
            <strong>1900 1234</strong>.
        </p>

        <p class="doctor-sign">
            Trân trọng,<br>
            {{ $doctorName }}<br>
            Phòng khám Đa khoa Vitacare
        </p>
    </div>
</body>

</html>