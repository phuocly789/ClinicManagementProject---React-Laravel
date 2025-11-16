<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="utf-8" />
    <title>{{ $pdf_settings['customTitle'] ?? $title ?? 'HÓA ĐƠN THANH TOÁN' }}</title>
    <style>
        @page {
            size: A4;
            margin: 20px;
        }

        body {
            font-family: "DejaVu Sans", "Times New Roman", Arial, sans-serif;
            background: #fff;
            color: #000;
            font-size: 10px !important;
            line-height: 1.3;
            margin: 0;
            padding: 0;
        }

        .page {
            border: 1.5px solid #333;
            border-radius: 4px;
            padding: 15px 20px;
            position: relative;
            page-break-inside: avoid;
        }

        /* FIX HOÀN CHỈNH: HEADER LAYOUT CÂN ĐỐI */
        .header {
            border-bottom: 1.5px solid #000;
            padding-bottom: 8px;
            margin-bottom: 12px;
        }

        .header-container {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            width: 100%;
            min-height: 65px;
        }

        .logo-section {
            flex-shrink: 0;
            width: 80px;
            display: flex;
            align-items: flex-start;
            justify-content: flex-start;
            padding-top: 0;
            margin-top: 0;
        }

        .logo-img {
            width:
                {{ isset($logo_data['width']) ? $logo_data['width'] : '60px' }}
            ;
            height:
                {{ isset($logo_data['height']) ? $logo_data['height'] : '60px' }}
            ;
            object-fit: contain;
            opacity:
                {{ isset($logo_data['opacity']) ? $logo_data['opacity'] : 0.8 }}
            ;
            margin-top: 0;
        }

        .header-content {
            flex: 1;
            text-align: center;
            min-width: 0;
            padding: 0 10px;
            margin-top: 0;
        }

        .header-placeholder {
            width: 80px;
            flex-shrink: 0;
            visibility: hidden;
        }

        .header h2 {
            margin: 2px 0 !important;
            font-size: 16px !important;
            text-transform: uppercase;
            font-weight: bold;
            line-height: 1.2;
        }

        .header p {
            margin: 1px 0 !important;
            font-size: 10px !important;
            line-height: 1.2;
        }

        /* FIX: SECTION TITLE FONT-SIZE 16px */
        .section-title {
            background: #2c5aa0;
            color: white;
            padding: 5px 10px;
            margin: 12px 0 8px 0;
            font-weight: bold;
            font-size: 16px !important;
            text-align: center;
        }

        .title {
            text-align: center;
            margin: 8px 0 12px;
            font-size: 15px !important;
            font-weight: bold;
            text-transform: uppercase;
        }

        .title h3 {
            margin: 0;
            font-size: 15px !important;
        }

        .info {
            display: table;
            width: 100%;
            margin-bottom: 10px;
        }

        .info-row {
            display: table-row;
        }

        .info-cell {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding: 1px 4px;
        }

        .info p {
            margin: 1px 0;
            font-size: 10px !important;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }

        table th,
        table td {
            border: 1px solid #333;
            padding: 3px 5px;
            text-align: left;
            font-size: 10px !important;
        }

        table th {
            background: #f0f0f0;
            font-weight: bold;
            text-align: center;
        }

        .text-center {
            text-align: center;
            font-size: 10px !important;
        }

        .text-right {
            text-align: right;
            font-size: 10px !important;
        }

        .text-left {
            text-align: left;
            font-size: 10px !important;
        }

        .total {
            text-align: right;
            font-weight: bold;
            background: #fafafa;
            padding: 4px;
            font-size: 10px !important;
        }

        .real-money {
            text-align: left;
            margin-bottom: 12px;
            padding: 4px;
            font-size: 10px !important;
        }

        .footer-content {
            display: table;
            width: 100%;
            margin-top: 20px;
        }

        .footer-column {
            display: table-cell;
            width: 50%;
            text-align: center;
            vertical-align: top;
        }

        .footer p {
            margin: 0;
            font-size: 10px !important;
        }

        .signature {
            margin-top: 12px;
            border-top: 1px solid #000;
            width: 120px;
            margin-left: auto;
            margin-right: auto;
            height: 30px;
        }

        .no-break {
            page-break-inside: avoid;
        }

        .payment-info {
            background: #f0f8ff;
            padding: 8px;
            border-radius: 4px;
            margin: 12px 0;
            font-size: 10px !important;
        }

        .payment-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }

        .payment-label {
            font-weight: bold;
        }

        .payment-value {
            font-weight: bold;
            color: #d9534f;
        }

        .note {
            font-style: italic;
            color: #666;
            margin-top: 8px;
            font-size: 10px !important;
        }

        /* WATERMARK STYLES - FIX OPACITY */
        .watermark-text {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate({{ isset($watermark_data['rotation']) ? $watermark_data['rotation'] : -45 }}deg);
            font-size:
                {{ isset($watermark_data['fontSize']) ? $watermark_data['fontSize'] : 50 }}
                px;
            color:
                {{ isset($watermark_data['color']) ? $watermark_data['color'] : 'rgba(0, 0, 0, 0.08)' }}
            ;
            font-weight: bold;
            text-transform: uppercase;
            pointer-events: none;
            z-index: 100;
            white-space: nowrap;
            opacity:
                {{ isset($watermark_data['opacity']) ? $watermark_data['opacity'] : 0.8 }}
            ;
        }

        .watermark-image {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate({{ isset($watermark_data['rotation']) ? $watermark_data['rotation'] : -45 }}deg);
            opacity:
                {{ isset($watermark_data['opacity']) ? $watermark_data['opacity'] : 0.8 }}
            ;
            z-index: 100;
            pointer-events: none;
            max-width: 80%;
            max-height: 80%;
        }

        /* PRINT STYLES */
        @media print {
            body {
                font-size: 10px !important;
            }

            .header h2 {
                font-size: 16px !important;
            }

            .section-title {
                font-size: 16px !important;
            }

            .title h3 {
                font-size: 15px !important;
            }

            .header p,
            .info p,
            table,
            table th,
            table td,
            .footer p {
                font-size: 10px !important;
            }
        }
    </style>
</head>

<body>
    <div class="page no-break">
        <!-- WATERMARK -->
        @if(isset($watermark_data) && !empty($watermark_data) && isset($watermark_data['type']))
            @if($watermark_data['type'] === 'text')
                <div class="watermark-text">{{ $watermark_data['text'] ?? 'MẪU BẢN QUYỀN' }}</div>
            @elseif($watermark_data['type'] === 'image' && isset($watermark_data['url']))
                <img src="{{ $watermark_data['url'] }}" class="watermark-image" style="width: {{ $watermark_data['width'] ?? '200px' }};
                                    height: {{ $watermark_data['height'] ?? '200px' }};" alt="Watermark">
            @endif
        @elseif(isset($pdf_settings['watermark']['enabled']) && $pdf_settings['watermark']['enabled'])
            <div class="watermark-text">{{ $pdf_settings['watermark']['text'] ?? 'MẪU BẢN QUYỀN' }}</div>
        @endif

        <!-- HEADER -->
        <div class="header">
            <div class="header-container">
                <div class="logo-section">
                    @if(isset($logo_data) && !empty($logo_data) && isset($logo_data['url']))
                        <img src="{{ $logo_data['url'] }}" class="logo-img" alt="Clinic Logo">
                    @endif
                </div>

                <div class="header-content">
                    <h2>{{ $pdf_settings['clinicName'] ?? $clinic_name ?? 'PHÒNG KHÁM ĐA KHOA ABC' }}</h2>
                    <p>Địa chỉ:
                        {{ $pdf_settings['clinicAddress'] ?? $clinic_address ?? 'Số 53 Võ Văn Ngân, TP. Thủ Đức' }}</p>
                    <p>Điện thoại: {{ $pdf_settings['clinicPhone'] ?? $clinic_phone ?? '0123 456 789' }}</p>
                </div>

                <div class="header-placeholder"></div>
            </div>
        </div>

        <!-- TITLE -->
        <div class="title">
            <h3>{{ $pdf_settings['customTitle'] ?? $title ?? 'HÓA ĐƠN THANH TOÁN' }}</h3>
        </div>

        <!-- PATIENT INFO -->
        <div class="info">
            <div class="info-row">
                <div class="info-cell">
                    <p><strong>Họ tên:</strong> {{ $patient_name ?? ($data['patient_name'] ?? 'N/A') }}</p>
                    <p><strong>Tuổi:</strong> {{ $age ?? ($data['patient_age'] ?? 'N/A') }}</p>
                    <p><strong>Giới tính:</strong> {{ $gender ?? ($data['patient_gender'] ?? 'N/A') }}</p>
                    <p><strong>Điện thoại:</strong> {{ $phone ?? ($data['patient_phone'] ?? 'N/A') }}</p>
                </div>
                <div class="info-cell">
                    <p><strong>Mã hóa đơn:</strong> {{ $invoice_code ?? ($data['code'] ?? 'AUTO') }}</p>
                    <p><strong>Ngày thanh toán:</strong> {{ $appointment_date ?? ($data['date'] ?? date('d/m/Y')) }}</p>
                    <p><strong>Giờ thanh toán:</strong> {{ $appointment_time ?? 'Hoàn tất' }}</p>
                    <p><strong>Thu ngân:</strong> {{ $pdf_settings['doctorName'] ?? $doctor_name ?? 'Hệ thống' }}</p>
                </div>
            </div>
        </div>

        @php
            // 🔥 FIX LỖI TÍNH TỔNG TIỀN - XỬ LÝ DỮ LIỆU TỪ CONTROLLER

            // Khởi tạo biến tổng
            $serviceTotal = 0;
            $medicineTotal = 0;
            $subTotal = 0;
            $discount = $discount ?? 0;
            $totalAmount = 0;

            // Kiểm tra xem có dữ liệu services không
            $hasServices = !empty($services) && is_array($services) && count($services) > 0;
            $hasMedicines = !empty($prescriptions) && is_array($prescriptions) && count($prescriptions) > 0;

            // Tính tổng tiền dịch vụ
            if ($hasServices) {
                foreach ($services as $service) {
                    $price = $service['Price'] ?? $service['price'] ?? 0;
                    $quantity = $service['Quantity'] ?? $service['quantity'] ?? 1;
                    $serviceTotal += $price * $quantity;
                }
            }

            // Tính tổng tiền thuốc
            if ($hasMedicines) {
                foreach ($prescriptions as $prescription) {
                    if (isset($prescription->prescription_details) && is_array($prescription->prescription_details)) {
                        foreach ($prescription->prescription_details as $detail) {
                            $price = $detail->medicine->Price ?? 0;
                            $quantity = $detail->Quantity ?? 1;
                            $medicineTotal += $price * $quantity;
                        }
                    }
                }
            }

            // Tính tổng cộng và tổng thành tiền
            $subTotal = $serviceTotal + $medicineTotal;
            $totalAmount = $subTotal - $discount;

            // Log để debug
            // echo "<!-- DEBUG: serviceTotal=$serviceTotal, medicineTotal=$medicineTotal, subTotal=$subTotal, discount=$discount, totalAmount=$totalAmount -->";
        @endphp

        <!-- PHẦN DỊCH VỤ Y TẾ - CHỈ HIỆN KHI CÓ DỮ LIỆU -->
        @if($hasServices)
            <div class="section-title">DỊCH VỤ Y TẾ</div>
            <table class="no-break">
                <thead>
                    <tr>
                        <th width="5%">STT</th>
                        <th width="50%">Tên dịch vụ</th>
                        <th width="15%">Đơn giá</th>
                        <th width="10%">Số lượng</th>
                        <th width="20%">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    @php $j = 1; @endphp
                    @foreach ($services as $service)
                        @php
                            $price = $service['Price'] ?? $service['price'] ?? 0;
                            $quantity = $service['Quantity'] ?? $service['quantity'] ?? 1;
                            $amount = $price * $quantity;
                            $serviceName = $service['ServiceName'] ?? $service['service_name'] ?? 'N/A';
                        @endphp
                        <tr>
                            <td class="text-center">{{ $j++ }}</td>
                            <td>{{ $serviceName }}</td>
                            <td class="text-right">{{ number_format($price, 0, ',', '.') }} VNĐ</td>
                            <td class="text-center">{{ $quantity }}</td>
                            <td class="text-right">{{ number_format($amount, 0, ',', '.') }} VNĐ</td>
                        </tr>
                    @endforeach
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4" class="total">Tổng tiền dịch vụ:</td>
                        <td class="text-right">{{ number_format($serviceTotal, 0, ',', '.') }} VNĐ</td>
                    </tr>
                </tfoot>
            </table>
        @endif

        <!-- PHẦN THUỐC - CHỈ HIỆN KHI CÓ DỮ LIỆU -->
        @if($hasMedicines)
            <div class="section-title">THUỐC</div>
            <table class="no-break">
                <thead>
                    <tr>
                        <th width="5%">STT</th>
                        <th width="40%">Tên thuốc</th>
                        <th width="10%">Số lượng</th>
                        <th width="25%">Liều dùng</th>
                        <th width="10%">Đơn giá</th>
                        <th width="10%">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    @php $i = 1; @endphp
                    @foreach ($prescriptions as $prescription)
                        @if(isset($prescription->prescription_details) && is_array($prescription->prescription_details))
                            @foreach ($prescription->prescription_details as $detail)
                                @php
                                    $price = $detail->medicine->Price ?? 0;
                                    $quantity = $detail->Quantity ?? 1;
                                    $amount = $price * $quantity;
                                    $medicineName = $detail->medicine->MedicineName ?? 'N/A';
                                    $usage = $detail->Usage ?? 'N/A';
                                @endphp
                                <tr>
                                    <td class="text-center">{{ $i++ }}</td>
                                    <td>{{ $medicineName }}</td>
                                    <td class="text-center">{{ $quantity }}</td>
                                    <td>{{ $usage }}</td>
                                    <td class="text-right">{{ number_format($price, 0, ',', '.') }} VNĐ</td>
                                    <td class="text-right">{{ number_format($amount, 0, ',', '.') }} VNĐ</td>
                                </tr>
                            @endforeach
                        @endif
                    @endforeach
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="5" class="total">Tổng tiền thuốc:</td>
                        <td class="text-right">{{ number_format($medicineTotal, 0, ',', '.') }} VNĐ</td>
                    </tr>
                </tfoot>
            </table>
        @endif

        <!-- TỔNG HỢP THANH TOÁN -->
        @if($hasServices || $hasMedicines)
            <div class="payment-info">
                <div class="section-title">THÔNG TIN THANH TOÁN</div>

                @if($medicineTotal > 0)
                    <div class="payment-row">
                        <span class="payment-label">Tổng tiền thuốc:</span>
                        <span class="payment-value">{{ number_format($medicineTotal, 0, ',', '.') }} VNĐ</span>
                    </div>
                @endif

                @if($serviceTotal > 0)
                    <div class="payment-row">
                        <span class="payment-label">Tổng tiền dịch vụ:</span>
                        <span class="payment-value">{{ number_format($serviceTotal, 0, ',', '.') }} VNĐ</span>
                    </div>
                @endif

                <div class="payment-row">
                    <span class="payment-label">Tổng cộng:</span>
                    <span class="payment-value">{{ number_format($subTotal, 0, ',', '.') }} VNĐ</span>
                </div>

                @if($discount > 0)
                    <div class="payment-row">
                        <span class="payment-label">Giảm giá:</span>
                        <span class="payment-value">- {{ number_format($discount, 0, ',', '.') }} VNĐ</span>
                    </div>
                @endif

                <div class="payment-row" style="border-top: 1px solid #ccc; padding-top: 3px; margin-top: 3px;">
                    <span class="payment-label" style="font-size: 11px !important;">THÀNH TIỀN:</span>
                    <span class="payment-value"
                        style="font-size: 11px !important; color: #d9534f;">{{ number_format($totalAmount, 0, ',', '.') }}
                        VNĐ</span>
                </div>

                <div class="payment-row">
                    <span class="payment-label">Phương thức thanh toán:</span>
                    <span class="payment-value">
                        @php
                            $paymentMethod = $payment_method ?? ($data['payment_method'] ?? 'cash');
                            $methodText = match ($paymentMethod) {
                                'cash' => 'Tiền mặt',
                                'napas' => 'Thẻ Napas',
                                'momo' => 'Ví MoMo',
                                'bank' => 'Chuyển khoản',
                                default => 'Tiền mặt'
                            };
                        @endphp
                        {{ $methodText }}
                    </span>
                </div>

                <div class="payment-row">
                    <span class="payment-label">Trạng thái:</span>
                    <span class="payment-value"
                        style="color: #5cb85c;">{{ $payment_status ?? ($data['status'] ?? 'Đã thanh toán') }}</span>
                </div>

                <div class="payment-row">
                    <span class="payment-label">Ngày thanh toán:</span>
                    <span
                        class="payment-value">{{ $payment_date ?? ($data['paid_at'] ?? now()->format('d/m/Y H:i')) }}</span>
                </div>
            </div>

            @if($totalAmount > 0)
                <div class="real-money">
                    <p><strong>Số tiền viết bằng chữ:</strong>
                        {{-- Sử dụng helper có sẵn hoặc tự định nghĩa --}}
                        @php
                            function numberToWords($number)
                            {
                                // Hàm chuyển số thành chữ tiếng Việt
                                // Bạn có thể thay thế bằng helper thực tế của bạn
                                $ones = array("", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín");
                                $teens = array("mười", "mười một", "mười hai", "mười ba", "mười bốn", "mười lăm", "mười sáu", "mười bảy", "mười tám", "mười chín");
                                $tens = array("", "", "hai mươi", "ba mươi", "bốn mươi", "năm mươi", "sáu mươi", "bảy mươi", "tám mươi", "chín mươi");

                                if ($number == 0)
                                    return "không";

                                $words = "";

                                // Triệu
                                if (floor($number / 1000000) > 0) {
                                    $words .= numberToWords(floor($number / 1000000)) . " triệu ";
                                    $number %= 1000000;
                                }

                                // Nghìn
                                if (floor($number / 1000) > 0) {
                                    $words .= numberToWords(floor($number / 1000)) . " nghìn ";
                                    $number %= 1000;
                                }

                                // Trăm
                                if (floor($number / 100) > 0) {
                                    $words .= numberToWords(floor($number / 100)) . " trăm ";
                                    $number %= 100;
                                }

                                // Chục và đơn vị
                                if ($number > 0) {
                                    if ($number < 10) {
                                        $words .= $ones[$number];
                                    } else if ($number < 20) {
                                        $words .= $teens[$number - 10];
                                    } else {
                                        $words .= $tens[floor($number / 10)];
                                        if ($number % 10 > 0) {
                                            $words .= " " . $ones[$number % 10];
                                        }
                                    }
                                }

                                return trim($words);
                            }
                        @endphp
                        {{ numberToWords($totalAmount) }} đồng
                    </p>
                </div>
            @endif
        @endif

        <div class="note">
            <p><strong>Ghi chú:</strong> Hóa đơn này có giá trị thanh toán một lần. Vui lòng giữ lại hóa đơn để đối
                chiếu khi cần thiết.</p>
        </div>

        <div class="footer no-break">
            <div class="footer-content">
                <div class="footer-column">
                    <p><strong>Bệnh nhân</strong></p>
                    <p>(Ký và ghi rõ họ tên)</p>
                    <div class="signature"></div>
                </div>
                <div class="footer-column">
                    <p><strong>Nhân viên thu ngân</strong></p>
                    <p>(Ký và ghi rõ họ tên)</p>
                    <div class="signature"></div>
                    <p style="margin-top: 8px; font-weight: bold;">
                        {{ $pdf_settings['doctorName'] ?? $doctor_name ?? 'Hệ thống' }}
                    </p>
                </div>
            </div>
        </div>
    </div>
</body>

</html>