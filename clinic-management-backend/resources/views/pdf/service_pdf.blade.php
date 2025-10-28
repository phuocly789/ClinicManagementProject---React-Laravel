<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8" />
    <title>{{ $title ?? 'PHIẾU DỊCH VỤ' }}</title>
    <style>
        @page { size: A4; margin: 20px; }
        body { font-family: "DejaVu Sans", "Times New Roman", serif; background: #fff; color: #000; font-size: 12px; line-height: 1.3; margin: 0; padding: 0; }
        .page { border: 1.5px solid #333; border-radius: 4px; padding: 15px 20px; position: relative; page-break-inside: avoid; }
        .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 50px; color: rgba(0, 0, 0, 0.08); font-weight: bold; text-transform: uppercase; pointer-events: none; z-index: -1; white-space: nowrap; }
        .header { text-align: center; border-bottom: 1.5px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
        .header h2 { margin: 0; font-size: 16px; text-transform: uppercase; font-weight: bold; }
        .header p { margin: 2px 0; font-size: 11px; }
        .title { text-align: center; margin: 8px 0 12px; font-size: 15px; font-weight: bold; text-transform: uppercase; }
        .info { display: table; width: 100%; font-size: 12px; margin-bottom: 12px; }
        .info-row { display: table-row; }
        .info-cell { display: table-cell; width: 50%; vertical-align: top; padding: 2px 5px; }
        .info p { margin: 2px 0; }
        .diagnosis-section { font-size: 12px; margin-bottom: 12px; text-align: left; }
        .diagnosis-item { padding: 5px; background: #f9f9f9; border: 1px solid #ddd; margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
        table th, table td { border: 1px solid #333; padding: 4px 6px; text-align: left; }
        table th { background: #f0f0f0; font-weight: bold; text-align: center; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .total { text-align: right; font-weight: bold; background: #fafafa; padding: 6px; }
        .real-money { text-align: left; margin-bottom: 15px; padding: 5px; font-size: 11px; }
        .footer-content { display: table; width: 100%; margin-top: 30px; }
        .footer-column { display: table-cell; width: 50%; text-align: center; vertical-align: top; }
        .footer p { margin: 0; font-size: 11px; }
        .signature { margin-top: 15px; border-top: 1px solid #000; width: 150px; margin-left: auto; margin-right: auto; height: 40px; }
        .clearfix::after { content: ""; clear: both; display: table; }
        .page-break { page-break-before: always; }
        .no-break { page-break-inside: avoid; }
        .note { font-style: italic; color: #666; margin-top: 10px; }
    </style>
</head>

<body>
    <div class="page no-break">
        <div class="watermark">{{ $clinic_name ?? 'PHÒNG KHÁM' }}</div>

        <div class="header">
            <h2>{{ $clinic_name ?? 'PHÒNG KHÁM ĐA KHOA ABC' }}</h2>
            <p>Địa chỉ: {{ $clinic_address ?? 'Số 53 Võ Văn Ngân, TP. Thủ Đức' }}</p>
            <p>Điện thoại: {{ $clinic_phone ?? '0123 456 789' }}</p>
        </div>

        <div class="title">
            <h3>{{ $title ?? 'PHIẾU CHỈ ĐỊNH DỊCH VỤ' }}</h3>
        </div>

        <div class="info">
            <div class="info-row">
                <div class="info-cell">
                    <p><strong>Họ tên:</strong> {{ $patient_name ?? 'N/A' }}</p>
                    <p><strong>Tuổi:</strong> {{ $age ?? 'N/A' }}</p>
                    <p><strong>Giới tính:</strong> {{ $gender ?? 'N/A' }}</p>
                    <p><strong>Điện thoại:</strong> {{ $phone ?? 'N/A' }}</p>
                </div>
                <div class="info-cell">
                    <p><strong>Mã hồ sơ:</strong> {{ $medical_record_code ?? 'AUTO' }}</p>
                    <p><strong>Ngày khám:</strong> {{ $appointment_date ?? date('d/m/Y') }}</p>
                    <p><strong>Giờ khám:</strong> {{ $appointment_time ?? date('H:i') }}</p>
                    <p><strong>Bác sĩ chỉ định:</strong> {{ $doctor_name ?? 'N/A' }}</p>
                </div>
            </div>
        </div>

        @php
            $diagnosesData = !empty($diagnoses) && is_array($diagnoses) ? $diagnoses : [];
        @endphp

        @if(!empty($diagnosesData))
        <div class="diagnosis-section">
            <strong>THÔNG TIN CHẨN ĐOÁN:</strong>
            @foreach ($diagnosesData as $diagnosis)
            <div class="diagnosis-item">
                @if(isset($diagnosis['Symptoms']))
                <p><strong>Triệu chứng:</strong> {{ $diagnosis['Symptoms'] }}</p>
                @endif
                @if(isset($diagnosis['Diagnosis']))
                <p><strong>Chẩn đoán:</strong> {{ $diagnosis['Diagnosis'] }}</p>
                @endif
            </div>
            @endforeach
        </div>
        @endif

        @php
            $i = 1;
            $tong = 0;
            $hasServices = !empty($services) && is_array($services) && count($services) > 0;
        @endphp

        @if($hasServices)
        <table class="no-break">
            <thead>
                <tr>
                    <th width="5%">STT</th>
                    <th width="45%">Tên dịch vụ</th>
                    <th width="20%">Đơn giá</th>
                    <th width="15%">Số lượng</th>
                    <th width="15%">Thành tiền</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($services as $service)
                    @php
                        $price = $service['Price'] ?? $service['price'] ?? 0;
                        $quantity = $service['Quantity'] ?? $service['quantity'] ?? 1;
                        $amount = $price * $quantity;
                        $tong += $amount;
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
                    <td colspan="4" class="total">Tổng cộng:</td>
                    <td class="text-right">{{ number_format($tong, 0, ',', '.') }} VNĐ</td>
                </tr>
            </tfoot>
        </table>
        @else
        <div class="diagnosis-item">
            <strong>DỊCH VỤ CHỈ ĐỊNH:</strong> Không có dịch vụ nào được chỉ định
        </div>
        @endif

        @if($hasServices && $tong > 0)
        <div class="real-money">
            <p><strong>Số tiền viết bằng chữ:</strong> {{ $tong > 0 ? \App\Helpers\NumberHelper::convertToWords($tong) : 'Không có' }}</p>
        </div>
        @endif

        <div class="note">
            <p><strong>Ghi chú:</strong> Bệnh nhân vui lòng đến phòng dịch vụ để thực hiện các xét nghiệm và chẩn đoán hình ảnh đã được chỉ định.</p>
        </div>

        <div class="footer no-break">
            <div class="footer-content">
                <div class="footer-column">
                    <p><strong>Bệnh nhân</strong></p>
                    <p>(Ký và ghi rõ họ tên)</p>
                    <div class="signature"></div>
                </div>
                <div class="footer-column">
                    <p><strong>Bác sĩ chỉ định</strong></p>
                    <p>(Ký và ghi rõ họ tên)</p>
                    <div class="signature"></div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>