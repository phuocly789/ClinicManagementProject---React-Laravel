<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>{{ $pdf_settings['customTitle'] ?? $title ?? 'PHIẾU DỊCH VỤ' }}</title>
    <style>
        /* 🔥 QUAN TRỌNG: ĐẢM BẢO UTF-8 VÀ FONT TIẾNG VIỆT */
        @charset "UTF-8";

        @page {
            size:
                {{ $pdf_settings['pageSize'] ?? 'A4' }}
            ;
            margin-top:
                {{ $pdf_settings['marginTop'] ?? '20px' }}
            ;
            margin-bottom:
                {{ $pdf_settings['marginBottom'] ?? '20px' }}
            ;
            margin-left:
                {{ $pdf_settings['marginLeft'] ?? '20px' }}
            ;
            margin-right:
                {{ $pdf_settings['marginRight'] ?? '20px' }}
            ;
        }

        /* 🔥 SỬ DỤNG DEJAVU SANS - FONT HỖ TRỢ TIẾNG VIỆT */
        body {
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
            font-size:
                {{ $pdf_settings['fontSize'] ?? '14px' }}
                !important;
            color:
                {{ $pdf_settings['fontColor'] ?? '#000000' }}
                !important;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
                !important;
            font-weight:
                {{ $pdf_settings['fontWeight'] ?? 'normal' }}
                !important;
            line-height:
                {{ $pdf_settings['lineHeight'] ?? 1.5 }}
                !important;
            background-color:
                {{ $pdf_settings['backgroundColor'] ?? '#ffffff' }}
                !important;
            margin: 0;
            padding: 0;
        }

        .page {
            border: 1.5px solid
                {{ $pdf_settings['borderColor'] ?? '#333' }}
                !important;
            border-radius: 4px;
            padding: 15px 20px;
            position: relative;
            page-break-inside: avoid;
            background-color:
                {{ $pdf_settings['backgroundColor'] ?? '#ffffff' }}
                !important;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        /* 🔥 HEADER VỚI REAL-TIME COLORS */
        .header {
            border-bottom: 1.5px solid
                {{ $pdf_settings['borderColor'] ?? '#000' }}
                !important;
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
                {{ $pdf_settings['logo']['width'] ?? ($logo_data['width'] ?? '60px') }}
                !important;
            height:
                {{ $pdf_settings['logo']['height'] ?? ($logo_data['height'] ?? '60px') }}
                !important;
            object-fit: contain;
            opacity:
                {{ $pdf_settings['logo']['opacity'] ?? ($logo_data['opacity'] ?? 0.8) }}
                !important;
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
            font-size: 13px !important;
            text-transform: uppercase;
            font-weight: bold;
            line-height: 1.2;
            color:
                {{ $pdf_settings['primaryColor'] ?? '#2c5aa0' }}
                !important;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        .header p {
            margin: 1px 0 !important;
            font-size: 10px !important;
            line-height: 1.2;
            color:
                {{ $pdf_settings['fontColor'] ?? '#000000' }}
                !important;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        /* 🔥 SECTION TITLE VỚI REAL-TIME COLORS */
        .section-title {
            background:
                {{ $pdf_settings['primaryColor'] ?? '#2c5aa0' }}
                !important;
            color: white !important;
            padding: 5px 10px;
            margin: 12px 0 8px 0;
            font-weight: bold;
            font-size: 13px !important;
            text-align: center;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        .title {
            text-align: center;
            margin: 8px 0 12px;
            font-size: 12px !important;
            font-weight: bold;
            text-transform: uppercase;
        }

        .title h3 {
            margin: 0;
            font-size: 12px !important;
            color:
                {{ $pdf_settings['primaryColor'] ?? '#2c5aa0' }}
                !important;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        /* 🔥 INFO SECTION VỚI REAL-TIME FONTS */
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
            color:
                {{ $pdf_settings['fontColor'] ?? '#000000' }}
                !important;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
                !important;
            font-weight:
                {{ $pdf_settings['fontWeight'] ?? 'normal' }}
                !important;
            line-height:
                {{ $pdf_settings['lineHeight'] ?? 1.5 }}
                !important;
        }

        /* 🔥 TABLE VỚI REAL-TIME COLORS */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        table th,
        table td {
            border: 1px solid
                {{ $pdf_settings['borderColor'] ?? '#333' }}
                !important;
            padding: 3px 5px;
            text-align: left;
            font-size: 10px !important;
            color:
                {{ $pdf_settings['fontColor'] ?? '#000000' }}
                !important;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        table th {
            background:
                {{ $pdf_settings['headerBgColor'] ?? '#f0f0f0' }}
                !important;
            font-weight: bold;
            text-align: center;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        .text-center {
            text-align: center;
            font-size: 10px !important;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        .text-right {
            text-align: right;
            font-size: 10px !important;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        .text-left {
            text-align: left;
            font-size: 10px !important;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        .total {
            text-align: right;
            font-weight: bold;
            background: #fafafa;
            padding: 4px;
            font-size: 10px !important;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        /* 🔥 DIAGNOSIS SECTION VỚI REAL-TIME FONTS */
        .diagnosis-info {
            /* background: #f8f9fa; */
            padding: 8px;
            border-radius: 4px;
            margin: 12px 0;
            font-size: 10px !important;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        .diagnosis-row {
            margin-bottom: 3px;
        }

        .diagnosis-label {
            font-weight: bold;
            color:
                {{ $pdf_settings['fontColor'] ?? '#000000' }}
                !important;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        /* 🔥 MONEY IN WORDS SECTION */
        .money-in-words {
            /* background: #f0f8ff; */
            padding: 6px 10px;
            border-radius: 4px;
            margin: 10px 0;
            border-left: 4px solid #2c5aa0;
            font-size: 10px !important;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        .money-label {
            font-weight: bold;
            color: #2c5aa0;
            margin-right: 5px;
            font-size: 10px !important;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        .money-words {
            font-style: italic;
            color: #d9534f;
            font-size: 10px !important;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        /* 🔥 FOOTER VỚI REAL-TIME FONTS */
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
            color:
                {{ $pdf_settings['fontColor'] ?? '#000000' }}
                !important;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        .signature {
            margin-top: 12px;
            border-top: 1px solid
                {{ $pdf_settings['borderColor'] ?? '#000' }}
                !important;
            width: 120px;
            margin-left: auto;
            margin-right: auto;
            height: 30px;
        }

        .no-break {
            page-break-inside: avoid;
        }

        .note {
            font-style: italic;
            color: #666;
            margin-top: 8px;
            font-size: 10px !important;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        /* 🔥 WATERMARK STYLES - REAL-TIME SETTINGS */
        .watermark-text {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate({{ isset($watermark_data['rotation']) ? $watermark_data['rotation'] : ($pdf_settings['watermark']['rotation'] ?? -45) }}deg);
            font-size:
                {{ isset($watermark_data['fontSize']) ? $watermark_data['fontSize'] : ($pdf_settings['watermark']['fontSize'] ?? 50) }}
                px;
            color:
                {{ isset($watermark_data['color']) ? $watermark_data['color'] : ($pdf_settings['watermark']['color'] ?? 'rgba(0, 0, 0, 0.08)') }}
                !important;
            font-weight: bold;
            text-transform: uppercase;
            pointer-events: none;
            z-index: -1;
            white-space: nowrap;
            opacity:
                {{ isset($watermark_data['opacity']) ? $watermark_data['opacity'] : ($pdf_settings['watermark']['opacity'] ?? 0.8) }}
                !important;
            font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
        }

        .watermark-image {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate({{ isset($watermark_data['rotation']) ? $watermark_data['rotation'] : ($pdf_settings['watermark']['rotation'] ?? -45) }}deg);
            opacity:
                {{ isset($watermark_data['opacity']) ? $watermark_data['opacity'] : ($pdf_settings['watermark']['opacity'] ?? 0.8) }}
                !important;
            z-index: -1;
            pointer-events: none;
            max-width: 80%;
            max-height: 80%;
        }

        /* 🔥 PRINT STYLES VỚI FONT TIẾNG VIỆT */
        @media print {
            body {
                font-size:
                    {{ $pdf_settings['fontSize'] ?? '14px' }}
                    !important;
                font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
                color:
                    {{ $pdf_settings['fontColor'] ?? '#000000' }}
                    !important;
                background-color:
                    {{ $pdf_settings['backgroundColor'] ?? '#ffffff' }}
                    !important;
            }

            .header h2 {
                font-size: 13px !important;
                color:
                    {{ $pdf_settings['primaryColor'] ?? '#2c5aa0' }}
                    !important;
                font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
            }

            .section-title {
                font-size: 13px !important;
                background:
                    {{ $pdf_settings['primaryColor'] ?? '#2c5aa0' }}
                    !important;
                font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
            }

            .title h3 {
                font-size: 12px !important;
                color:
                    {{ $pdf_settings['primaryColor'] ?? '#2c5aa0' }}
                    !important;
                font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
            }

            .header p,
            .info p,
            table,
            table th,
            table td,
            .footer p,
            .money-in-words,
            .money-label,
            .money-words {
                font-size: 10px !important;
                color:
                    {{ $pdf_settings['fontColor'] ?? '#000000' }}
                    !important;
                font-family: DejaVu Sans, "Times New Roman", Arial, sans-serif !important;
            }
        }
    </style>
</head>

<body>
    <div class="page no-break">
        <!-- 🔥 WATERMARK - REAL-TIME SETTINGS -->
        @if(isset($watermark_data) && !empty($watermark_data) && isset($watermark_data['type']))
            @if($watermark_data['type'] === 'text')
                <div class="watermark-text">{{ $watermark_data['text'] ?? 'MẪU BẢN QUYỀN' }}</div>
            @elseif($watermark_data['type'] === 'image' && isset($watermark_data['url']))
                <img src="{{ $watermark_data['url'] }}" class="watermark-image"
                    style="width: {{ $watermark_data['width'] ?? '200px' }}; height: {{ $watermark_data['height'] ?? '200px' }};"
                    alt="Watermark">
            @endif
        @elseif(isset($pdf_settings['watermark']['enabled']) && $pdf_settings['watermark']['enabled'])
            @if(!empty($pdf_settings['watermark']['url']))
                <img src="{{ $pdf_settings['watermark']['url'] }}" class="watermark-image"
                    style="width: {{ $pdf_settings['watermark']['width'] ?? '200px' }}; height: {{ $pdf_settings['watermark']['height'] ?? '200px' }};"
                    alt="Watermark">
            @else
                <div class="watermark-text">{{ $pdf_settings['watermark']['text'] ?? 'MẪU BẢN QUYỀN' }}</div>
            @endif
        @endif

        <!-- 🔥 HEADER VỚI REAL-TIME LOGO -->
        <div class="header">
            <div class="header-container">
                <div class="logo-section">
                    @if(isset($logo_data) && !empty($logo_data) && !empty($logo_data['url']))
                        <img src="{{ $logo_data['url'] }}" class="logo-img" alt="Clinic Logo"
                            style="width: {{ $logo_data['width'] ?? '60px' }}; height: {{ $logo_data['height'] ?? '60px' }}; opacity: {{ $logo_data['opacity'] ?? 0.8 }};">
                    @elseif(isset($pdf_settings['logo']['enabled']) && $pdf_settings['logo']['enabled'] && !empty($pdf_settings['logo']['url']))
                        <img src="{{ $pdf_settings['logo']['url'] }}" class="logo-img" alt="Clinic Logo"
                            style="width: {{ $pdf_settings['logo']['width'] ?? '60px' }}; height: {{ $pdf_settings['logo']['height'] ?? '60px' }}; opacity: {{ $pdf_settings['logo']['opacity'] ?? 0.8 }};">
                    @endif
                </div>

                <div class="header-content">
                    <h2>{{ $pdf_settings['clinicName'] ?? $clinic_name ?? 'Phòng Khám Đa Khoa VitaCare' }}</h2>
                    <p>Địa chỉ:
                        {{ $pdf_settings['clinicAddress'] ?? $clinic_address ?? '123 Đường Sức Khỏe, Phường An Lành, Quận Bình Yên, TP. Hồ Chí Minh' }}
                    </p>
                    <p>Điện thoại: {{ $pdf_settings['clinicPhone'] ?? $clinic_phone ?? '(028) 3812 3456' }}</p>
                </div>

                <div class="header-placeholder"></div>
            </div>
        </div>

        <!-- 🔥 TITLE VỚI REAL-TIME SETTINGS -->
        <div class="title">
            <h3>{{ $pdf_settings['customTitle'] ?? $title ?? 'PHIẾU CHỈ ĐỊNH DỊCH VỤ' }}</h3>
        </div>

        <!-- 🔥 PATIENT INFO VỚI REAL-TIME FONTS -->
        <div class="info">
            <div class="info-row">
                <div class="info-cell">
                    <p><strong>Họ tên:</strong> {{ $patient_name ?? 'N/A' }}</p>
                    <p><strong>Tuổi:</strong> {{ $age ?? 'N/A' }}</p>
                    <p><strong>Giới tính:</strong> {{ $gender ?? 'N/A' }}</p>
                    <p><strong>Điện thoại:</strong> {{ $phone ?? 'N/A' }}</p>
                </div>
                <div class="info-cell">
                    <p><strong>Mã phiếu dịch vụ:</strong> {{ $medical_record_code ?? ($code ?? 'AUTO') }}</p>
                    <p><strong>Ngày chỉ định:</strong> {{ $appointment_date ?? ($date ?? date('d/m/Y')) }}</p>
                    <p><strong>Giờ chỉ định:</strong> {{ $appointment_time ?? 'N/A' }}</p>
                    <p><strong>Bác sĩ chỉ định:</strong>
                        {{ $doctor_name ?? ($pdf_settings['doctorName'] ?? 'Bác sĩ chưa rõ') }}</p>
                </div>
            </div>
        </div>

        <!-- 🔥 THÔNG TIN CHẨN ĐOÁN VỚI REAL-TIME FONTS -->
        @if(!empty($diagnoses) || !empty($diagnosis) || !empty($symptoms))
            <div class="diagnosis-info">
                <div class="section-title">THÔNG TIN CHẨN ĐOÁN</div>

                @if(!empty($symptoms))
                    <div class="diagnosis-row">
                        <span class="diagnosis-label">Triệu chứng:</span>
                        <span>{{ $symptoms }}</span>
                    </div>
                @endif

                @if(!empty($diagnosis))
                    <div class="diagnosis-row">
                        <span class="diagnosis-label">Chẩn đoán:</span>
                        <span>{{ $diagnosis }}</span>
                    </div>
                @endif

                @if(!empty($diagnoses) && is_array($diagnoses))
                    @foreach($diagnoses as $diag)
                        @if(!empty($diag['Symptoms']))
                            <div class="diagnosis-row">
                                <span class="diagnosis-label">Triệu chứng:</span>
                                <span>{{ $diag['Symptoms'] }}</span>
                            </div>
                        @endif
                        @if(!empty($diag['Diagnosis']))
                            <div class="diagnosis-row">
                                <span class="diagnosis-label">Chẩn đoán:</span>
                                <span>{{ $diag['Diagnosis'] }}</span>
                            </div>
                        @endif
                    @endforeach
                @endif
            </div>
        @endif

        <!-- 🔥 PHẦN DỊCH VỤ VỚI REAL-TIME SETTINGS -->
        @php
            $hasServices = !empty($services) && is_array($services) && count($services) > 0;
            $totalServiceAmount = 0;
        @endphp

        @if($hasServices)
            <div class="section-title">DANH SÁCH DỊCH VỤ CHỈ ĐỊNH</div>
            <table class="no-break">
                <thead>
                    <tr>
                        <th width="5%">STT</th>
                        <th width="45%">Tên dịch vụ</th>
                        <th width="15%">Đơn giá</th>
                        <th width="10%">Số lượng</th>
                        <th width="15%">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    @php $i = 1; @endphp
                    @foreach ($services as $service)
                        @php
                            $price = $service['Price'] ?? $service['price'] ?? 0;
                            $quantity = $service['Quantity'] ?? $service['quantity'] ?? 1;
                            $amount = $price * $quantity;
                            $totalServiceAmount += $amount;
                            $serviceName = $service['ServiceName'] ?? $service['service_name'] ?? 'N/A';
                        @endphp
                        <tr>
                            <td class="text-center">{{ $i++ }}</td>
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
                        <td class="text-right">{{ number_format($totalServiceAmount, 0, ',', '.') }} VNĐ</td>
                    </tr>
                </tfoot>
            </table>

            <!-- 🔥 PHẦN ĐỌC SỐ TIỀN THÀNH CHỮ VỚI REAL-TIME FONTS -->
            @if($totalServiceAmount > 0)
                <div class="money-in-words">
                    <span class="money-label">Tổng tiền bằng chữ:</span>
                    <span class="money-words">
                        @php
                            function numberToWordsService($number)
                            {
                                $number = intval($number);
                                if ($number == 0)
                                    return "không đồng";

                                $ones = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
                                $teens = ["mười", "mười một", "mười hai", "mười ba", "mười bốn", "mười lăm", "mười sáu", "mười bảy", "mười tám", "mười chín"];
                                $tens = ["", "", "hai mươi", "ba mươi", "bốn mươi", "năm mươi", "sáu mươi", "bảy mươi", "tám mươi", "chín mươi"];

                                if ($number < 10) {
                                    return $ones[$number];
                                } elseif ($number < 20) {
                                    return $teens[$number - 10];
                                } elseif ($number < 100) {
                                    return $tens[floor($number / 10)] . ($number % 10 != 0 ? " " . $ones[$number % 10] : "");
                                } elseif ($number < 1000) {
                                    return $ones[floor($number / 100)] . " trăm" . ($number % 100 != 0 ? " " . numberToWordsService($number % 100) : "");
                                } elseif ($number < 1000000) {
                                    return numberToWordsService(floor($number / 1000)) . " nghìn" . ($number % 1000 != 0 ? " " . numberToWordsService($number % 1000) : "");
                                } elseif ($number < 1000000000) {
                                    return numberToWordsService(floor($number / 1000000)) . " triệu" . ($number % 1000000 != 0 ? " " . numberToWordsService($number % 1000000) : "");
                                } else {
                                    return numberToWordsService(floor($number / 1000000000)) . " tỷ" . ($number % 1000000000 != 0 ? " " . numberToWordsService($number % 1000000000) : "");
                                }
                            }
                        @endphp
                        {{ ucfirst(numberToWordsService($totalServiceAmount)) }} đồng
                    </span>
                </div>
            @endif

        @else
            <div class="section-title">DANH SÁCH DỊCH VỤ CHỈ ĐỊNH</div>
            <div style="text-align: center; padding: 15px; color: #666;">
                <p>Chưa có dịch vụ nào được chỉ định</p>
            </div>
        @endif

        <!-- 🔥 HƯỚNG DẪN THỰC HIỆN VỚI REAL-TIME FONTS -->
        @if(!empty($instructions))
            <div class="diagnosis-info">
                <div class="section-title">HƯỚNG DẪN THỰC HIỆN</div>
                <div class="diagnosis-row">
                    <span>{{ $instructions }}</span>
                </div>
            </div>
        @endif

        <!-- 🔥 NOTE VỚI REAL-TIME FONTS -->
        <div class="note">
            <p><strong>Ghi chú:</strong>
                @if(!empty($pdf_settings['customNote']))
                    {{ $pdf_settings['customNote'] }}
                @else
                    Bệnh nhân vui lòng đến phòng dịch vụ để thực hiện các xét nghiệm và chẩn đoán hình ảnh đã được chỉ định.
                    Mang theo phiếu này khi đến làm dịch vụ.
                @endif
            </p>
        </div>

        <!-- 🔥 FOOTER VỚI REAL-TIME FONTS -->
        <div class="footer no-break">
            <div class="footer-content">
                <div class="footer-column">
                    <p><strong>Bệnh nhân/Khách hàng</strong></p>
                    <p>(Ký và ghi rõ họ tên)</p>
                    <div class="signature"></div>
                    <p
                        style="margin-top: 8px; font-weight: bold; font-family: DejaVu Sans, 'Times New Roman', Arial, sans-serif !important;">
                        {{ $patient_name ?? 'N/A' }}
                    </p>
                </div>
                <div class="footer-column">
                    <p><strong>Bác sĩ chỉ định</strong></p>
                    <p>(Ký và ghi rõ họ tên)</p>
                    <div class="signature"></div>
                    <p
                        style="margin-top: 8px; font-weight: bold; font-family: DejaVu Sans, 'Times New Roman', Arial, sans-serif !important;">
                        {{ $pdf_settings['doctorName'] ?? $doctor_name ?? 'Bác sĩ chưa rõ' }}
                    </p>
                </div>
            </div>
        </div>
    </div>
</body>

</html>