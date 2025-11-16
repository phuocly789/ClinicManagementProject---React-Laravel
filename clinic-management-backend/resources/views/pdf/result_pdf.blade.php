<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="utf-8" />
    <title>{{ $pdf_settings['customTitle'] ?? $title ?? 'PHIẾU KẾT QUẢ XÉT NGHIỆM' }}</title>
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

        /* NOTE SECTION */
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
            .footer p {
                font-size: 12px !important;
                font-style:
                    {{ $pdf_settings['fontStyle'] ?? 'normal' }}
                ;
                font-weight:
                    {{ $pdf_settings['fontWeight'] ?? 'normal' }}
                ;
            }
        }

        /* LAB TEST SPECIFIC STYLES */
        .lab-info {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            margin: 15px 0;
            font-size: 12px !important;
        }

        .lab-row {
            margin-bottom: 5px;
        }

        .lab-label {
            font-weight: bold;
        }

        .test-results-table th {
            background: #e9ecef;
        }

        .normal-result {
            color: #28a745;
            font-weight: bold;
        }

        .abnormal-result {
            color: #dc3545;
            font-weight: bold;
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
                    <h2>{{ $pdf_settings['clinicName'] ?? $clinic_name ?? 'PHÒNG KHÁM XYZ' }}</h2>
                    <p>Địa chỉ:
                        {{ $pdf_settings['clinicAddress'] ?? $clinic_address ?? 'Số 53 Võ Văn Nghị, Từ Thủ Đức, TRNCM' }}
                    </p>
                </div>

                <div class="header-placeholder"></div>
            </div>
        </div>

        <!-- TITLE -->
        <div class="title">
            <h3>{{ $pdf_settings['customTitle'] ?? $title ?? 'PHIẾU KẾT QUẢ XÉT NGHIỆM' }}</h3>
        </div>

        <!-- PATIENT INFO -->
        <div class="info">
            <div class="info-row">
                <div class="info-cell">
                    <p><strong>Mã BN:</strong> {{ $patient_code ?? 'LC001' }}</p>
                    <p><strong>Họ tên BN:</strong> {{ $patient_name ?? 'Nguyễn Văn A' }}</p>
                </div>
                <div class="info-cell">
                    <p><strong>Số Xử:</strong> {{ $lab_number ?? 'BN. 03-0701_54' }}</p>
                    <p><strong>Khoa chỉ định:</strong> {{ $department ?? 'KHOA XÉT NGHIỆM' }}</p>
                </div>
            </div>
        </div>

        <!-- LAB TECHNICIAN INFO -->
        <div class="info">
            <div class="info-row">
                <div class="info-cell">
                    <p><strong>Điện vực Xét nghiệm màu</strong></p>
                    <p><strong>Kỹ thuật viên:</strong> {{ $technician_name ?? 'Trần Văn Hùng' }}</p>
                </div>
                <div class="info-cell">
                    <p><strong>Ngày in:</strong> {{ $print_date ?? \Carbon\Carbon::now()->format('d/m/Y') }}</p>
                </div>
            </div>
        </div>

        <!-- TEST RESULTS TABLE -->
        <table class="test-results-table no-break">
            <thead>
                <tr>
                    <th width="30%">XÉT NGHIỆM</th>
                    <th width="25%">KẾT QUẢ</th>
                    <th width="10%">ĐƠN VỊ</th>
                    <th width="20%">GIÁ TRỊ THAM CHIẾU</th>
                    <th width="15%">PHƯƠNG PHÁP</th>
                </tr>
            </thead>
            <tbody>
                @if(!empty($test_results) && is_array($test_results))
                    @foreach($test_results as $test)
                        <tr>
                            <td>{{ $test['test_name'] ?? 'Xét nghiệm màu' }}</td>
                            <td class="{{ $test['is_normal'] ?? true ? 'normal-result' : 'abnormal-result' }}">
                                {{ $test['result'] ?? 'Bình thường' }}
                            </td>
                            <td>{{ $test['unit'] ?? '' }}</td>
                            <td>{{ $test['reference_range'] ?? '' }}</td>
                            <td>{{ $test['method'] ?? 'OTSH.B-02(1)' }}</td>
                        </tr>
                    @endforeach
                @else
                    <!-- Default test result row -->
                    <tr>
                        <td>Xét nghiệm màu</td>
                        <td class="normal-result">Bình thường</td>
                        <td></td>
                        <td></td>
                        <td>OTSH.B-02(1)</td>
                    </tr>
                @endif
            </tbody>
        </table>

        <!-- NOTE -->
        <div class="note">
            <p><strong>Ghi chú:</strong>
                @if(!empty($pdf_settings['customNote']))
                    {{ $pdf_settings['customNote'] }}
                @else
                    Kết quả chỉ có giá trị khi phiếu còn nguyên vẹn và có chữ ký xác nhận.
                @endif
            </p>
        </div>

        <!-- SIGNATURE -->
        <div class="footer no-break">
            <div class="footer-content">
                <div class="footer-column">
                    <p><strong>Kỹ thuật viên</strong></p>
                    <p>(Ký, ghi rõ họ tên)</p>
                    <div class="signature"></div>
                    <p style="margin-top: 10px; font-weight: bold;">
                        {{ $technician_name ?? 'Trần Văn Hùng' }}
                    </p>
                </div>
                <div class="footer-column">
                    <!-- Có thể thêm chữ ký bác sĩ nếu cần -->
                </div>
            </div>
        </div>
    </div>
</body>

</html>