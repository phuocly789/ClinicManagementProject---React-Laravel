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
        
        /* QUAN TRỌNG: Sửa lỗi font chữ với fallback an toàn */
        body { 
            font-family: "DejaVu Sans", "Times New Roman", Arial, sans-serif; 
            background: #fff; 
            color: #000; 
            font-size: {{ $pdf_settings['fontSize'] ?? '12px' }}; 
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
        
        /* WATERMARK CUSTOM */
        @if(isset($pdf_settings['watermark']['enabled']) && $pdf_settings['watermark']['enabled'])
        .watermark { 
            position: absolute; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%) rotate({{ $pdf_settings['watermark']['rotation'] ?? -45 }}deg); 
            font-size: {{ $pdf_settings['watermark']['fontSize'] ?? 50 }}px; 
            color: {{ $pdf_settings['watermark']['color'] ?? 'rgba(0, 0, 0, 0.08)' }}; 
            font-weight: bold; 
            text-transform: uppercase; 
            pointer-events: none; 
            z-index: -1; 
            white-space: nowrap; 
            opacity: {{ $pdf_settings['watermark']['opacity'] ?? 0.08 }};
            font-family: "DejaVu Sans", sans-serif;
        }
        @else
        .watermark { display: none; }
        @endif
        
        .header { 
            text-align: center; 
            border-bottom: 1.5px solid #000; 
            padding-bottom: 5px; 
            margin-bottom: 10px; 
        }
        .header h2 { 
            margin: 0; 
            font-size: 16px; 
            text-transform: uppercase; 
            font-weight: bold; 
            font-family: "DejaVu Sans", sans-serif;
        }
        .header p { 
            margin: 2px 0; 
            font-size: 11px; 
            font-family: "DejaVu Sans", sans-serif;
        }
        .title { 
            text-align: center; 
            margin: 8px 0 12px; 
            font-size: 15px; 
            font-weight: bold; 
            text-transform: uppercase; 
            font-family: "DejaVu Sans", sans-serif;
        }
        .info { 
            display: table; 
            width: 100%; 
            font-size: 12px; 
            margin-bottom: 12px; 
            font-family: "DejaVu Sans", sans-serif;
        }
        .info-row { display: table-row; }
        .info-cell { display: table-cell; width: 50%; vertical-align: top; padding: 2px 5px; }
        .info p { margin: 2px 0; }
        .diagnosis-section { 
            font-size: 12px; 
            margin-bottom: 12px; 
            text-align: left; 
            font-family: "DejaVu Sans", sans-serif;
        }
        .diagnosis-item { 
            padding: 5px; 
            background: #f9f9f9; 
            border: 1px solid #ddd; 
            margin-bottom: 5px; 
            font-family: "DejaVu Sans", sans-serif;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 12px; 
            font-size: 11px; 
            font-family: "DejaVu Sans", sans-serif;
        }
        table th, table td { 
            border: 1px solid #333; 
            padding: 4px 6px; 
            text-align: left; 
            font-family: "DejaVu Sans", sans-serif;
        }
        table th { 
            background: #f0f0f0; 
            font-weight: bold; 
            text-align: center; 
            font-family: "DejaVu Sans", sans-serif;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .total { 
            text-align: right; 
            font-weight: bold; 
            background: #fafafa; 
            padding: 6px; 
            font-family: "DejaVu Sans", sans-serif;
        }
        .real-money { 
            text-align: left; 
            margin-bottom: 15px; 
            padding: 5px; 
            font-size: 11px; 
            font-family: "DejaVu Sans", sans-serif;
        }
        .footer-content { 
            display: table; 
            width: 100%; 
            margin-top: 30px; 
        }
        .footer-column { 
            display: table-cell; 
            width: 50%; 
            text-align: center; 
            vertical-align: top; 
        }
        .footer p { 
            margin: 0; 
            font-size: 11px; 
            font-family: "DejaVu Sans", sans-serif;
        }
        .signature { 
            margin-top: 15px; 
            border-top: 1px solid #000; 
            width: 150px; 
            margin-left: auto; 
            margin-right: auto; 
            height: 40px; 
        }
        .clearfix::after { content: ""; clear: both; display: table; }
        .page-break { page-break-before: always; }
        .no-break { page-break-inside: avoid; }
        
        /* STYLE MỚI CHO HÓA ĐƠN THANH TOÁN */
        .payment-info { 
            background: #f0f8ff; 
            padding: 10px; 
            border-radius: 5px; 
            margin: 15px 0; 
            font-family: "DejaVu Sans", sans-serif;
        }
        .payment-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 5px; 
            font-family: "DejaVu Sans", sans-serif;
        }
        .payment-label { font-weight: bold; }
        .payment-value { font-weight: bold; color: #d9534f; }
        .section-title { 
            background: #2c5aa0; 
            color: white; 
            padding: 5px 10px; 
            margin: 15px 0 10px 0; 
            font-weight: bold; 
            font-family: "DejaVu Sans", sans-serif;
        }
        .note { 
            font-style: italic; 
            color: #666; 
            margin-top: 10px; 
            font-family: "DejaVu Sans", sans-serif;
        }

        @media screen {
            body {
                background: white;
                margin: 10px;
            }
            .page {
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                margin: 0 auto;
            }
        }
    </style>
</head>

<body>
    <div class="page no-break">
        <!-- WATERMARK CUSTOM -->
        @if(isset($pdf_settings['watermark']['enabled']) && $pdf_settings['watermark']['enabled'])
        <div class="watermark">{{ $pdf_settings['watermark']['text'] ?? 'MẪU BẢN QUYỀN' }}</div>
        @endif

        <div class="header">
            <h2>{{ $pdf_settings['clinicName'] ?? $clinic_name ?? 'PHÒNG KHÁM ĐA KHOA ABC' }}</h2>
            <p>Địa chỉ: {{ $pdf_settings['clinicAddress'] ?? $clinic_address ?? 'Số 53 Võ Văn Ngân, TP. Thủ Đức' }}</p>
            <p>Điện thoại: {{ $pdf_settings['clinicPhone'] ?? $clinic_phone ?? '0123 456 789' }}</p>
        </div>

        <div class="title">
            <h3>{{ $pdf_settings['customTitle'] ?? $title ?? 'HÓA ĐƠN THANH TOÁN' }}</h3>
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
                    <p><strong>Mã hóa đơn:</strong> {{ $invoice_code ?? $medical_record_code ?? 'AUTO' }}</p>
                    <p><strong>Ngày khám:</strong> {{ $appointment_date ?? date('d/m/Y') }}</p>
                    <p><strong>Giờ khám:</strong> {{ $appointment_time ?? date('H:i') }}</p>
                    <p><strong>Bác sĩ:</strong> {{ $pdf_settings['doctorName'] ?? $doctor_name ?? 'N/A' }}</p>
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

        <!-- PHẦN TOA THUỐC -->
        @php
            $hasPrescriptions = !empty($prescriptions) && is_array($prescriptions) && count($prescriptions) > 0;
            $prescriptionTotal = 0;
        @endphp

        @if($hasPrescriptions)
        <div class="section-title">TOA THUỐC</div>
        <table class="no-break">
            <thead>
                <tr>
                    <th width="5%">STT</th>
                    <th width="25%">Tên thuốc</th>
                    <th width="10%">Số lượng</th>
                    <th width="25%">Liều dùng</th>
                    <th width="15%">Đơn giá</th>
                    <th width="20%">Thành tiền</th>
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
                                $prescriptionTotal += $amount;
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
                    <td class="text-right">{{ number_format($prescriptionTotal, 0, ',', '.') }} VNĐ</td>
                </tr>
            </tfoot>
        </table>
        @endif

        <!-- PHẦN DỊCH VỤ -->
        @php
            $hasServices = !empty($services) && is_array($services) && count($services) > 0;
            $serviceTotal = 0;
        @endphp

        @if($hasServices)
        <div class="section-title">DỊCH VỤ Y TẾ</div>
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
                @php $j = 1; @endphp
                @foreach ($services as $service)
                    @php
                        $price = $service['Price'] ?? $service['price'] ?? 0;
                        $quantity = $service['Quantity'] ?? $service['quantity'] ?? 1;
                        $amount = $price * $quantity;
                        $serviceTotal += $amount;
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

        <!-- TỔNG HỢP THANH TOÁN -->
        @php
            $subTotal = $prescriptionTotal + $serviceTotal;
            $discount = $discount ?? 0;
            $totalAmount = $subTotal - $discount;
        @endphp

        <div class="payment-info">
            <div class="section-title">THÔNG TIN THANH TOÁN</div>
            
            @if($prescriptionTotal > 0)
            <div class="payment-row">
                <span class="payment-label">Tổng tiền thuốc:</span>
                <span class="payment-value">{{ number_format($prescriptionTotal, 0, ',', '.') }} VNĐ</span>
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
            
            <div class="payment-row" style="border-top: 1px solid #ccc; padding-top: 5px; margin-top: 5px;">
                <span class="payment-label" style="font-size: 14px;">THÀNH TIỀN:</span>
                <span class="payment-value" style="font-size: 14px; color: #d9534f;">{{ number_format($totalAmount, 0, ',', '.') }} VNĐ</span>
            </div>
            
            <div class="payment-row">
                <span class="payment-label">Phương thức thanh toán:</span>
                <span class="payment-value">{{ $payment_method ?? 'Tiền mặt' }}</span>
            </div>
            
            <div class="payment-row">
                <span class="payment-label">Trạng thái:</span>
                <span class="payment-value" style="color: #5cb85c;">{{ $payment_status ?? 'Đã thanh toán' }}</span>
            </div>
            
            <div class="payment-row">
                <span class="payment-label">Ngày thanh toán:</span>
                <span class="payment-value">{{ $payment_date ?? now()->format('d/m/Y H:i') }}</span>
            </div>
        </div>

        @if($totalAmount > 0)
        <div class="real-money">
            <p><strong>Số tiền viết bằng chữ:</strong> 
                @if(function_exists('convert_number_to_words'))
                    {{ convert_number_to_words($totalAmount) }} đồng
                @elseif(class_exists('App\Helpers\NumberHelper'))
                    {{ \App\Helpers\NumberHelper::convertToWords($totalAmount) }}
                @else
                    {{ $totalAmount > 0 ? self::numberToWords($totalAmount) . ' đồng' : 'Không có' }}
                @endif
            </p>
        </div>
        @endif

        <div class="note">
            <p><strong>Ghi chú:</strong> Hóa đơn này có giá trị thanh toán một lần. Vui lòng giữ lại hóa đơn để đối chiếu khi cần thiết.</p>
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
                    <p style="margin-top: 10px; font-weight: bold;">{{ $pdf_settings['doctorName'] ?? $doctor_name ?? 'N/A' }}</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>