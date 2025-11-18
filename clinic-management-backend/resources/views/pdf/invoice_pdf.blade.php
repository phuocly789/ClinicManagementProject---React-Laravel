<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="utf-8" />
    <title>{{ $pdf_settings['customTitle'] ?? $title ?? 'TOA THUỐC' }}</title>
    <style>
        @page {
            size: A4;
            margin: 20px;
        }

        body {
            font-family:
                {{ $pdf_settings['fontFamily'] ?? 'Times New Roman' }}
                , "DejaVu Sans", sans-serif;
            background: #fff;
            color:
                {{ $pdf_settings['fontColor'] ?? '#000000' }}
            ;
            font-size:
                {{ $pdf_settings['fontSize'] ?? '12px' }}
                !important;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
            ;
            font-weight:
                {{ $pdf_settings['fontWeight'] ?? 'normal' }}
            ;
            line-height:
                {{ $pdf_settings['lineHeight'] ?? 1.3 }}
            ;
            margin: 0;
            padding: 0;
        }

        .page {
            border: 1.5px solid
                {{ $pdf_settings['borderColor'] ?? '#333' }}
            ;
            border-radius: 4px;
            padding: 15px 20px;
            position: relative;
            page-break-inside: avoid;
            background:
                {{ $pdf_settings['backgroundColor'] ?? '#ffffff' }}
            ;
        }

        /* HEADER */
        .header {
            border-bottom: 1.5px solid
                {{ $pdf_settings['borderColor'] ?? '#000' }}
            ;
            padding-bottom: 8px;
            margin-bottom: 12px;
            background:
                {{ $pdf_settings['headerBgColor'] ?? 'transparent' }}
            ;
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
            font-size: 18px !important;
            text-transform: uppercase;
            font-weight: bold;
            line-height: 1.2;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
            ;
            color:
                {{ $pdf_settings['primaryColor'] ?? '#2c5aa0' }}
            ;
        }

        .header p {
            margin: 1px 0 !important;
            font-size: 11px !important;
            line-height: 1.2;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
            ;
            font-weight:
                {{ $pdf_settings['fontWeight'] ?? 'normal' }}
            ;
            color:
                {{ $pdf_settings['fontColor'] ?? '#000000' }}
            ;
        }

        /* SECTION TITLE */
        .section-title {
            background:
                {{ $pdf_settings['primaryColor'] ?? '#2c5aa0' }}
            ;
            color: white;
            padding: 6px 10px;
            margin: 15px 0 10px 0;
            font-weight: bold;
            font-size: 16px !important;
            text-align: center;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
            ;
        }

        .title {
            text-align: center;
            margin: 10px 0 15px;
            font-size: 18px !important;
            font-weight: bold;
            text-transform: uppercase;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
            ;
            color:
                {{ $pdf_settings['primaryColor'] ?? '#2c5aa0' }}
            ;
        }

        .title h3 {
            margin: 0;
            font-size: 18px !important;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
            ;
        }

        /* INFO SECTION */
        .info {
            display: table;
            width: 100%;
            margin-bottom: 15px;
            font-size:
                {{ $pdf_settings['fontSize'] ?? '12px' }}
                !important;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
            ;
            font-weight:
                {{ $pdf_settings['fontWeight'] ?? 'normal' }}
            ;
            line-height:
                {{ $pdf_settings['lineHeight'] ?? 1.3 }}
            ;
            color:
                {{ $pdf_settings['fontColor'] ?? '#000000' }}
            ;
        }

        .info-row {
            display: table-row;
        }

        .info-cell {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding: 2px 6px;
        }

        .info p {
            margin: 2px 0;
            font-size: 12px !important;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
            ;
            font-weight:
                {{ $pdf_settings['fontWeight'] ?? 'normal' }}
            ;
            line-height:
                {{ $pdf_settings['lineHeight'] ?? 1.3 }}
            ;
        }

        /* TABLES */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 12px !important;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
            ;
            font-weight:
                {{ $pdf_settings['fontWeight'] ?? 'normal' }}
            ;
            line-height:
                {{ $pdf_settings['lineHeight'] ?? 1.3 }}
            ;
            color:
                {{ $pdf_settings['fontColor'] ?? '#000000' }}
            ;
        }

        table th,
        table td {
            border: 1px solid
                {{ $pdf_settings['borderColor'] ?? '#333' }}
            ;
            padding: 4px 6px;
            text-align: left;
            font-size: 12px !important;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
            ;
            font-weight:
                {{ $pdf_settings['fontWeight'] ?? 'normal' }}
            ;
        }

        table th {
            background:
                {{ $pdf_settings['headerBgColor'] ?? '#f0f0f0' }}
            ;
            font-weight: bold;
            text-align: center;
        }

        .text-center {
            text-align: center;
            font-size: 12px !important;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
            ;
        }

        .text-right {
            text-align: right;
            font-size: 12px !important;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
            ;
        }

        .text-left {
            text-align: left;
            font-size: 12px !important;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
            ;
        }

        .total {
            text-align: right;
            font-weight: bold;
            background: #fafafa;
            padding: 6px;
            font-size: 12px !important;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
            ;
        }

        /* FOOTER */
        .footer-content {
            display: table;
            width: 100%;
            margin-top: 25px;
        }

        .footer-column {
            display: table-cell;
            width: 50%;
            text-align: center;
            vertical-align: top;
        }

        .footer p {
            margin: 0;
            font-size: 12px !important;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
            ;
            font-weight:
                {{ $pdf_settings['fontWeight'] ?? 'normal' }}
            ;
            color:
                {{ $pdf_settings['fontColor'] ?? '#000000' }}
            ;
        }

        .signature {
            margin-top: 15px;
            border-top: 1px solid
                {{ $pdf_settings['borderColor'] ?? '#000' }}
            ;
            width: 150px;
            margin-left: auto;
            margin-right: auto;
            height: 40px;
        }

        .no-break {
            page-break-inside: avoid;
        }

        /* DIAGNOSIS SECTION */
        .diagnosis-info {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            margin: 15px 0;
            font-size: 12px !important;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
            ;
            font-weight:
                {{ $pdf_settings['fontWeight'] ?? 'normal' }}
            ;
            line-height:
                {{ $pdf_settings['lineHeight'] ?? 1.3 }}
            ;
        }

        .diagnosis-row {
            margin-bottom: 5px;
        }

        .diagnosis-label {
            font-weight: bold;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
            ;
        }

        /* MONEY IN WORDS SECTION */
        .money-in-words {
            background: #f0f8ff;
            padding: 8px 12px;
            border-radius: 4px;
            margin: 12px 0;
            border-left: 4px solid #2c5aa0;
            font-size: 12px !important;
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
            ;
            font-weight:
                {{ $pdf_settings['fontWeight'] ?? 'normal' }}
            ;
        }

        .money-label {
            font-weight: bold;
            color: #2c5aa0;
            margin-right: 5px;
            font-size: 12px !important;
        }

        .money-words {
            font-style: italic;
            color: #d9534f;
            font-size: 12px !important;
        }

        .note {
            font-style: italic;
            color: #666;
            margin-top: 10px;
            font-size: 11px !important;
            font-weight:
                {{ $pdf_settings['fontWeight'] ?? 'normal' }}
            ;
        }

        /* WATERMARK STYLES */
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
            font-style:
                {{ $pdf_settings['fontStyle'] ?? 'normal' }}
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
                font-size:
                    {{ $pdf_settings['fontSize'] ?? '12px' }}
                    !important;
                font-style:
                    {{ $pdf_settings['fontStyle'] ?? 'normal' }}
                ;
                font-weight:
                    {{ $pdf_settings['fontWeight'] ?? 'normal' }}
                ;
                line-height:
                    {{ $pdf_settings['lineHeight'] ?? 1.3 }}
                ;
                color:
                    {{ $pdf_settings['fontColor'] ?? '#000000' }}
                ;
            }

            .header h2 {
                font-size: 18px !important;
                font-style:
                    {{ $pdf_settings['fontStyle'] ?? 'normal' }}
                ;
            }

            .section-title {
                font-size: 16px !important;
                font-style:
                    {{ $pdf_settings['fontStyle'] ?? 'normal' }}
                ;
            }

            .title h3 {
                font-size: 18px !important;
                font-style:
                    {{ $pdf_settings['fontStyle'] ?? 'normal' }}
                ;
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
                font-size: 12px !important;
                font-style:
                    {{ $pdf_settings['fontStyle'] ?? 'normal' }}
                ;
                font-weight:
                    {{ $pdf_settings['fontWeight'] ?? 'normal' }}
                ;
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
                                                            height: {{ $watermark_data['height'] ?? '200px' }};"
                    alt="Watermark">
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
                    <h2>{{ $pdf_settings['clinicName'] ?? $clinic_name ?? 'Phòng Khám Đa Khoa VitaCare' }}</h2>
                    <p>Địa chỉ:
                        {{ $pdf_settings['clinicAddress'] ?? $clinic_address ?? '123 Đường Sức Khỏe, Phường An Lành, Quận Bình Yên, TP. Hồ Chí Minh' }}
                    </p>
                    <p>Điện thoại: {{ $pdf_settings['clinicPhone'] ?? $clinic_phone ?? '(028) 3812 3456' }}</p>
                </div>

                <div class="header-placeholder"></div>
            </div>
        </div>

        <!-- TITLE -->
        <div class="title">
            <h3>{{ $pdf_settings['customTitle'] ?? $title ?? 'TOA THUỐC' }}</h3>
        </div>

        <!-- PATIENT INFO -->
        <div class="info">
            <div class="info-row">
                <div class="info-cell">
                    <p><strong>Họ tên bệnh nhân:</strong> {{ $patient_name ?? 'N/A' }}</p>
                    <p><strong>Tuổi:</strong> {{ $age ?? 'N/A' }}</p>
                    <p><strong>Giới tính:</strong> {{ $gender ?? 'N/A' }}</p>
                    <p><strong>Điện thoại:</strong> {{ $phone ?? 'N/A' }}</p>

                </div>
                <div class="info-cell">
                    <p><strong>Mã toa thuốc:</strong> {{ $medical_record_code ?? 'AUTO' }}</p>
                    <p><strong>Ngày khám:</strong> {{ $appointment_date ?? date('d/m/Y') }}</p>
                    <p><strong>Giờ khám:</strong> {{ $appointment_time ?? date('H:i') }}</p>
                    <p><strong>Bác sĩ kê đơn:</strong> {{ $doctor_name ?? 'Bác sĩ chưa rõ' }}</p>
                </div>
            </div>
        </div>

        <!-- THÔNG TIN CHẨN ĐOÁN -->
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
            </div>
        @endif

        <!-- PHẦN THUỐC -->
        @php
            $hasMedicines = !empty($prescriptions) && is_array($prescriptions) && count($prescriptions) > 0;
            $totalMedicineAmount = 0;
        @endphp

        @if($hasMedicines)
            <div class="section-title">ĐƠN THUỐC</div>
            <table class="no-break">
                <thead>
                    <tr>
                        <th width="5%">STT</th>
                        <th width="35%">Tên thuốc</th>
                        <th width="10%">Số lượng</th>
                        <th width="30%">Liều dùng</th>
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
                                    $price = $detail->medicine->Price ?? $detail->medicine->price ?? 0;
                                    $quantity = $detail->Quantity ?? $detail->quantity ?? 1;
                                    $amount = $price * $quantity;
                                    $totalMedicineAmount += $amount;
                                    $medicineName = $detail->medicine->MedicineName ?? $detail->medicine->medicine_name ?? 'N/A';
                                    $usage = $detail->Usage ?? $detail->dosage ?? 'Theo chỉ định của bác sĩ';
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
                        <td class="text-right">{{ number_format($totalMedicineAmount, 0, ',', '.') }} VNĐ</td>
                    </tr>
                </tfoot>
            </table>

            <!-- PHẦN ĐỌC SỐ TIỀN THÀNH CHỮ -->
            @if($totalMedicineAmount > 0)
                <div class="money-in-words">
                    <span class="money-label">Tổng tiền bằng chữ:</span>
                    <span class="money-words">
                        {{ \App\Helpers\NumberHelper::convertToWords($totalMedicineAmount) }} đồng
                    </span>
                </div>
            @endif

        @else
            <div class="section-title">ĐƠN THUỐC</div>
            <div style="text-align: center; padding: 20px; color: #666;">
                <p>Chưa có thông tin thuốc trong đơn</p>
            </div>
        @endif

        <!-- HƯỚNG DẪN SỬ DỤNG -->
        @if(!empty($instructions))
            <div class="diagnosis-info">
                <div class="section-title">HƯỚNG DẪN SỬ DỤNG</div>
                <div class="diagnosis-row">
                    <span>{{ $instructions }}</span>
                </div>
            </div>
        @endif

        <div class="note">
            <p><strong>Ghi chú:</strong>
                @if(!empty($pdf_settings['customNote']))
                    {{ $pdf_settings['customNote'] }}
                @else
                    Tuân thủ đúng liều lượng và thời gian sử dụng thuốc. Tái khám theo lịch hẹn của bác sĩ.
                @endif
            </p>
        </div>

        <div class="footer no-break">
            <div class="footer-content">
                <div class="footer-column">
                    <p><strong>Bệnh nhân/Khách hàng</strong></p>
                    <p>(Ký và ghi rõ họ tên)</p>
                    </strong> {{ $patient_name ?? 'N/A' }}
                </div>
                <div class="footer-column">
                    <p><strong>Bác sĩ kê đơn</strong></p>
                    <p>(Ký và ghi rõ họ tên)</p>
                    <p style="margin-top: 10px; font-weight: bold;">
                        {{ $pdf_settings['doctorName'] ?? $doctor_name ?? 'Bác sĩ chưa rõ' }}
                    </p>
                </div>
            </div>
        </div>
    </div>
</body>

</html>