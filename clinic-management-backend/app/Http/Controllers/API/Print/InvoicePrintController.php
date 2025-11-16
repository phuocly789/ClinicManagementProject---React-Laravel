<?php

namespace App\Http\Controllers\API\Print;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Invoice;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class InvoicePrintController extends Controller
{
    /**
     * Map font family từ frontend sang font an toàn cho DomPDF
     */
    private function getSafeFontFamily($fontFamily)
    {
        $fontMap = [
            'Times New Roman' => 'times',
            'Arial' => 'arial',
            'Helvetica' => 'helvetica',
            'Verdana' => 'verdana',
            'Georgia' => 'georgia',
            'Courier New' => 'courier',
            'DejaVu Sans' => 'dejavu sans',
        ];

        return $fontMap[$fontFamily] ?? 'times';
    }

    /**
     * Tạo safe font CSS cho template
     */
    private function getSafeFontCSS($fontFamily)
    {
        $fontMapping = [
            'Times New Roman' => 'times, "Times New Roman", serif',
            'Arial' => 'arial, "DejaVu Sans", sans-serif',
            'Helvetica' => 'helvetica, "DejaVu Sans", sans-serif',
            'Verdana' => 'verdana, "DejaVu Sans", sans-serif',
            'Georgia' => 'georgia, serif',
            'Courier New' => 'courier, monospace',
            'DejaVu Sans' => '"DejaVu Sans", sans-serif',
        ];

        return $fontMapping[$fontFamily] ?? 'times, "Times New Roman", serif';
    }

    /**
     * Xử lý ảnh (dùng chung cho cả logo và watermark) - SỬA LẠI
     */
    private function processImage($imageData, $defaults = [])
    {
        if (empty($imageData['url']) || !($imageData['enabled'] ?? false)) {
            return null;
        }

        try {
            $url = $imageData['url'];
            $type = $defaults['type'] ?? 'logo';

            Log::info("🔍 Processing {$type} URL: " . $url);

            // TRƯỜNG HỢP 1: Base64 image
            if (strpos($url, 'data:image') === 0) {
                Log::info("🔄 Processing base64 {$type}");
                return array_merge([
                    'url' => $url,
                    'width' => $imageData['width'] ?? $defaults['width'] ?? '50px',
                    'height' => $imageData['height'] ?? $defaults['height'] ?? '50px',
                    'opacity' => $imageData['opacity'] ?? $defaults['opacity'] ?? 1,
                ], $defaults);
            }

            // TRƯỜNG HỢP 2: Storage URL - CHUYỂN SANG BASE64
            if (strpos($url, '/storage/') !== false) {
                Log::info("🔄 Processing storage URL for {$type}");

                $filename = basename($url);

                // QUAN TRỌNG: Chỉ tìm trong thư mục tương ứng với type
                $directory = "public/{$type}s"; // logos hoặc watermarks
                $storagePath = $directory . '/' . $filename;

                if (Storage::exists($storagePath)) {
                    Log::info("✅ Storage file found for {$type}: " . $storagePath);

                    $fileContent = Storage::get($storagePath);
                    $mimeType = $this->getImageMimeType($storagePath);
                    $base64Image = 'data:' . $mimeType . ';base64,' . base64_encode($fileContent);

                    $result = array_merge([
                        'url' => $base64Image,
                        'width' => $imageData['width'] ?? $defaults['width'] ?? '50px',
                        'height' => $imageData['height'] ?? $defaults['height'] ?? '50px',
                        'opacity' => $imageData['opacity'] ?? $defaults['opacity'] ?? 1,
                    ], $defaults);

                    Log::info("✅ {$type} processing SUCCESS");
                    return $result;
                }

                Log::error("❌ Storage file not found for {$type}: " . $storagePath);
                return null;
            }

            // TRƯỜNG HỢP 3: Direct HTTP URL - Giữ nguyên
            if (strpos($url, 'http') === 0) {
                Log::info("🌐 Using direct HTTP URL for {$type}: " . $url);
                return array_merge([
                    'url' => $url,
                    'width' => $imageData['width'] ?? $defaults['width'] ?? '50px',
                    'height' => $imageData['height'] ?? $defaults['height'] ?? '50px',
                    'opacity' => $imageData['opacity'] ?? $defaults['opacity'] ?? 1,
                ], $defaults);
            }

            Log::warning("⚠️ Unhandled {$type} URL type: " . $url);
            return null;

        } catch (\Exception $e) {
            Log::error("❌ Error processing {$type}: " . $e->getMessage());
            return null;
        }
    }


    /**
     * Xử lý logo - GỌI processImage
     */
    private function processLogo($logoData)
    {
        return $this->processImage($logoData, [
            'type' => 'logo',
            'width' => '50px',
            'height' => '50px',
            'opacity' => $logoData['opacity'] ?? 0.8, // ĐỒNG BỘ OPACITY
            'position' => 'left',
            'marginTop' => '0px'
        ]);
    }

    /**
     * Xác định MIME type của image
     */
    private function getImageMimeType($filePath)
    {
        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

        $mimeMap = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'svg' => 'image/svg+xml',
        ];

        return $mimeMap[$extension] ?? 'image/jpeg';
    }

    /**
     * Xử lý watermark - ĐÃ SỬA ĐỂ NHẬN OPACITY TỪ FE
     */
    private function processWatermark($watermarkData)
    {
        if (empty($watermarkData['enabled']) || !$watermarkData['enabled']) {
            return null;
        }

        Log::info('🔍 Processing watermark data:', $watermarkData);

        // Nếu có URL ảnh, xử lý như watermark ảnh
        if (!empty($watermarkData['url'])) {
            $imageWatermark = $this->processImage($watermarkData, [
                'type' => 'watermark',
                'width' => '200px',
                'height' => '200px',
                'opacity' => $watermarkData['opacity'] ?? 0.1 // ✅ SỬA: nhận opacity từ FE
            ]);

            if ($imageWatermark) {
                $result = array_merge($imageWatermark, [
                    'type' => 'image',
                    'rotation' => $watermarkData['rotation'] ?? -45,
                    'opacity' => $watermarkData['opacity'] ?? 0.1 // ✅ THÊM opacity vào result
                ]);
                Log::info('✅ Image watermark processed successfully with opacity: ' . ($watermarkData['opacity'] ?? 0.1));
                return $result;
            }
        }

        // Nếu không có URL nhưng có text, xử lý watermark text
        if (!empty($watermarkData['text'])) {
            Log::info('📝 Processing text watermark');
            return [
                'type' => 'text',
                'text' => $watermarkData['text'],
                'opacity' => $watermarkData['opacity'] ?? 0.1, // ✅ SỬA: nhận opacity từ FE
                'fontSize' => $watermarkData['fontSize'] ?? 48,
                'color' => $watermarkData['color'] ?? '#cccccc',
                'rotation' => $watermarkData['rotation'] ?? -45,
            ];
        }

        Log::warning('⚠️ No valid watermark data found');
        return null;
    }

    /**
     * Dọn dẹp file tạm
     */
    private function cleanupTempFiles($files)
    {
        foreach ($files as $file) {
            if (!$file)
                continue;

            // Cleanup temp files in storage temp directory
            if (isset($file['temp_file']) && file_exists($file['temp_file'])) {
                try {
                    unlink($file['temp_file']);
                    Log::info('Cleaned up temp file: ' . $file['temp_file']);
                } catch (\Exception $e) {
                    Log::warning('Could not delete temp file: ' . $file['temp_file']);
                }
            }
        }

        // Cleanup old temp files in storage
        $this->cleanupOldTempFiles();
    }

    private function cleanupOldTempFiles()
    {
        // SỬA: Dùng storage path thay vì public path
        $tempDir = storage_path('app/temp_pdf_logos');
        if (!is_dir($tempDir)) {
            Log::info('Temp directory does not exist: ' . $tempDir);
            return;
        }

        $files = glob($tempDir . '/*');
        $now = time();
        $deletedCount = 0;

        foreach ($files as $file) {
            if (is_file($file)) {
                // Delete files older than 1 hour
                if ($now - filemtime($file) >= 3600) {
                    unlink($file);
                    $deletedCount++;
                }
            }
        }

        if ($deletedCount > 0) {
            Log::info("✅ Cleaned up $deletedCount old temp files from temp_pdf_logos");
        }
    }


    public function export($type, $appointment_id)
    {
        // ✅ Lấy dữ liệu chính xác với quan hệ có thật trong model
        $appointment = Appointment::with([
            'patient.user',
            'prescriptions.prescription_details.medicine',
            'service_orders',
            'diagnoses',
            'medical_staff',
        ])->findOrFail($appointment_id);

        $patient = $appointment->patient?->user;
        $doctor = $appointment->medical_staff?->FullName ?? 'Bác sĩ chưa rõ';

        // ✅ Chuẩn bị dữ liệu
        $data = [
            'title' => match ($type) {
                'prescription' => 'TOA THUỐC',
                'service' => 'PHIẾU DỊCH VỤ',
                default => 'HÓA ĐƠN KHÁM BỆNH',
            },
            'clinic_name' => 'PHÒNG KHÁM ĐA KHOA ABC',
            'doctor_name' => $doctor,
            'patient_name' => $patient?->FullName ?? 'Không rõ',
            'age' => $patient?->DateOfBirth ? \Carbon\Carbon::parse($patient->DateOfBirth)->age : 'N/A',
            'gender' => $patient?->Gender ?? 'N/A',
            'phone' => $patient?->Phone ?? 'N/A',
            'appointment_date' => $appointment->AppointmentDate->format('d/m/Y'),
            'appointment_time' => $appointment->AppointmentTime,
            'prescriptions' => $appointment->prescriptions,
            'services' => $appointment->service_orders,
            'diagnoses' => $appointment->diagnoses,
            'safe_font_family' => 'times',
        ];

        // ✅ Render view PDF
        $pdf = Pdf::loadView('pdf.invoice_pdf', $data)
            ->setPaper('a4', 'portrait');

        return $pdf->download("{$data['title']}.pdf");
    }

    // Phương thức mới để xuất PDF từ dữ liệu FE
    public function previewPrescription(Request $request)
    {
        Log::info('🎯 === START previewPrescription ===');
        Log::info('Received previewPrescription data:', $request->all());

        try {
            // Validate dữ liệu đầu vào
            $data = $request->validate([
                'type' => 'required|string|in:prescription,service,payment',
                'patient_name' => 'required|string',
                'age' => 'nullable',
                'gender' => 'nullable|string',
                'phone' => 'nullable|string',
                'address' => 'nullable|string',
                'appointment_date' => 'required|string',
                'appointment_time' => 'required|string',
                'doctor_name' => 'nullable|string',
                'symptoms' => 'nullable|string',
                'instructions' => 'nullable|string',
                'diagnosis' => 'nullable|string',

                // Cho toa thuốc
                'prescriptions' => 'required_if:type,prescription|array',
                'prescriptions.*.details' => 'required_if:type,prescription|array',
                'prescriptions.*.details.*.medicine' => 'required_if:type,prescription|string',
                'prescriptions.*.details.*.quantity' => 'required_if:type,prescription|integer|min:1',
                'prescriptions.*.details.*.dosage' => 'required_if:type,prescription|string',
                'prescriptions.*.details.*.unitPrice' => 'required_if:type,prescription|numeric|min:0',

                // Cho dịch vụ
                'services' => 'required_if:type,service|array',
                'services.*.ServiceName' => 'required_if:type,service|string',
                'services.*.Price' => 'required_if:type,service|numeric|min:0',
                'services.*.Quantity' => 'nullable|integer|min:1',

                // Cho thanh toán
                'payment_method' => 'required_if:type,payment|string',
                'payment_status' => 'required_if:type,payment|string',
                'discount' => 'nullable|numeric|min:0',
                'tax' => 'nullable|numeric|min:0',
                'invoice_code' => 'nullable|string',
                'total_amount' => 'nullable|numeric|min:0',

                // Chẩn đoán
                'diagnoses' => 'nullable|array',
                'diagnoses.*.Symptoms' => 'nullable|string',
                'diagnoses.*.Diagnosis' => 'nullable|string',

                // THÊM VALIDATION CHO PDF SETTINGS - BỔ SUNG LOGO VÀ WATERMARK
                'pdf_settings' => 'required|array',
                'pdf_settings.logo' => 'nullable|array',
                'pdf_settings.logo.enabled' => 'nullable|boolean',
                'pdf_settings.logo.url' => 'nullable|string',
                'pdf_settings.logo.width' => 'nullable|string',
                'pdf_settings.logo.height' => 'nullable|string',
                'pdf_settings.logo.position' => 'nullable|string',
                'pdf_settings.logo.opacity' => 'nullable|numeric|min:0|max:1',
                'pdf_settings.logo.marginTop' => 'nullable|string',
                'pdf_settings.logo.marginBottom' => 'nullable|string',

                'pdf_settings.watermark' => 'nullable|array',
                'pdf_settings.watermark.enabled' => 'nullable|boolean',
                'pdf_settings.watermark.text' => 'nullable|string',
                'pdf_settings.watermark.url' => 'nullable|string',
                'pdf_settings.watermark.opacity' => 'nullable|numeric|min:0|max:1',
                'pdf_settings.watermark.fontSize' => 'nullable|integer|min:10|max:100',
                'pdf_settings.watermark.color' => 'nullable|string',
                'pdf_settings.watermark.rotation' => 'nullable|numeric|min:-180|max:180',

                'pdf_settings.fontFamily' => 'nullable|string',
                'pdf_settings.fontSize' => 'nullable|string',
                'pdf_settings.lineHeight' => 'nullable|numeric',
                'pdf_settings.fontColor' => 'nullable|string',
                'pdf_settings.clinicName' => 'nullable|string',
                'pdf_settings.clinicAddress' => 'nullable|string',
                'pdf_settings.clinicPhone' => 'nullable|string',
                'pdf_settings.clinicTax' => 'nullable|string',
                'pdf_settings.doctorName' => 'nullable|string',
                'pdf_settings.doctorDegree' => 'nullable|string',
                'pdf_settings.customTitle' => 'nullable|string',

                'pdf_settings.marginTop' => 'nullable|string',
                'pdf_settings.marginRight' => 'nullable|string',
                'pdf_settings.marginBottom' => 'nullable|string',
                'pdf_settings.marginLeft' => 'nullable|string',
                'pdf_settings.pageOrientation' => 'nullable|string',
                'pdf_settings.pageSize' => 'nullable|string',
                'pdf_settings.primaryColor' => 'nullable|string',

                // THÊM CÁC TRƯỜNG MỚI ĐỂ ĐẢM BẢO TƯƠNG THÍCH
                'patient_age' => 'nullable',
                'patient_gender' => 'nullable|string',
                'patient_phone' => 'nullable|string',
                'code' => 'nullable|string',
                'date' => 'nullable|string',

            ], [
                'type.required' => 'Loại PDF là bắt buộc.',
                'patient_name.required' => 'Tên bệnh nhân là bắt buộc.',
                'prescriptions.required_if' => 'Đơn thuốc là bắt buộc cho toa thuốc.',
                'services.required_if' => 'Danh sách dịch vụ là bắt buộc cho phiếu dịch vụ.',
                'payment_method.required_if' => 'Phương thức thanh toán là bắt buộc cho hóa đơn.',
                'payment_status.required_if' => 'Trạng thái thanh toán là bắt buộc cho hóa đơn.',
                'pdf_settings.required' => 'Cài đặt PDF là bắt buộc.',
            ]);

            Log::info('✅ Validation passed');

            // Xác định title và template dựa trên type
            $typeConfig = [
                'prescription' => [
                    'title' => $data['pdf_settings']['customTitle'] ?? 'TOA THUỐC',
                    'template' => 'pdf.invoice_pdf',
                    'filename' => 'TOA_THUOC_' . date('Ymd_His') . '.pdf'
                ],
                'service' => [
                    'title' => $data['pdf_settings']['customTitle'] ?? 'PHIẾU CHỈ ĐỊNH DỊCH VỤ',
                    'template' => 'pdf.service_pdf',
                    'filename' => 'PHIEU_DICH_VU_' . date('Ymd_His') . '.pdf'
                ],
                'payment' => [
                    'template' => 'pdf.payment_invoice_pdf',
                    'title' => $data['pdf_settings']['customTitle'] ?? 'HÓA ĐƠN THANH TOÁN',
                    'filename' => 'HOA_DON_' . date('Ymd_His') . '.pdf'
                ]
            ];

            $config = $typeConfig[$data['type']];
            Log::info('📄 PDF Config:', $config);

            // Xử lý font chữ an toàn
            $fontFamily = $data['pdf_settings']['fontFamily'] ?? 'Times New Roman';
            $safeFontFamily = $this->getSafeFontFamily($fontFamily);
            $safeFontCSS = $this->getSafeFontCSS($fontFamily);

            Log::info('🔤 Font processing:', [
                'original' => $fontFamily,
                'safe_font' => $safeFontFamily,
                'safe_css' => $safeFontCSS
            ]);

            // Xử lý logo và watermark
            $logoData = $this->processLogo($data['pdf_settings']['logo'] ?? []);
            $watermarkData = $this->processWatermark($data['pdf_settings']['watermark'] ?? []);

            Log::info('🖼️ Media processing:', [
                'has_logo' => !empty($logoData),
                'has_watermark' => !empty($watermarkData),
                'logo_enabled' => $data['pdf_settings']['logo']['enabled'] ?? false,
                'watermark_enabled' => $data['pdf_settings']['watermark']['enabled'] ?? false
            ]);

            // 🔥 XỬ LÝ DỮ LIỆU BỆNH NHÂN - ĐẢM BẢO ĐÚNG FORMAT TEMPLATE
            $patientName = $data['patient_name'] ?? 'Không rõ';
            $patientAge = $data['patient_age'] ?? $data['age'] ?? 'N/A';
            $patientGender = $data['patient_gender'] ?? $data['gender'] ?? 'N/A';
            $patientPhone = $data['patient_phone'] ?? $data['phone'] ?? 'N/A';
            $patientAddress = $data['address'] ?? '';

            // Xử lý ngày tháng - ĐẢM BẢO ĐÚNG FORMAT
            $appointmentDate = $data['appointment_date'] ?? $data['date'] ?? now()->format('Y-m-d');
            $appointmentTime = $data['appointment_time'] ?? 'N/A';

            // Format date cho đẹp - chuyển sang d/m/Y
            $formattedDate = $appointmentDate;
            if ($appointmentDate) {
                try {
                    if (strpos($appointmentDate, '-') !== false) {
                        $formattedDate = \Carbon\Carbon::parse($appointmentDate)->format('d/m/Y');
                    } elseif (strpos($appointmentDate, '/') !== false) {
                        // Nếu đã là format d/m/Y thì giữ nguyên
                        $formattedDate = $appointmentDate;
                    }
                } catch (\Exception $e) {
                    Log::warning('Date parsing error: ' . $e->getMessage());
                    $formattedDate = date('d/m/Y');
                }
            }

            // Tạo mã hồ sơ
            $medicalRecordCode = $data['code'] ?? strtoupper(substr($data['type'], 0, 3)) . '_' . date('YmdHis');

            // 🔥 CHUẨN BỊ DỮ LIỆU CHUNG - DÙNG ĐÚNG TÊN BIẾN NHƯ TRONG TEMPLATE
            $pdfData = [
                // Thông tin cơ bản
                'title' => $config['title'],
                'type' => $data['type'],

                // Thông tin phòng khám
                'clinic_name' => $data['pdf_settings']['clinicName'] ?? 'PHÒNG KHÁM ĐA KHOA XYZ',
                'clinic_address' => $data['pdf_settings']['clinicAddress'] ?? 'Số 53 Võ Văn Ngân, TP. Thủ Đức',
                'clinic_phone' => $data['pdf_settings']['clinicPhone'] ?? '0123 456 789',
                'clinic_tax' => $data['pdf_settings']['clinicTax'] ?? '',

                // ✅ QUAN TRỌNG: Thông tin bệnh nhân - DÙNG ĐÚNG TÊN BIẾN TEMPLATE
                'patient_name' => $patientName,
                'age' => (string) $patientAge,
                'gender' => $patientGender,
                'phone' => $patientPhone,
                'address' => $patientAddress,

                // Thông tin hẹn và mã
                'medical_record_code' => $medicalRecordCode,
                'appointment_date' => $formattedDate,
                'appointment_time' => $appointmentTime,
                'doctor_name' => $data['pdf_settings']['doctorName'] ?? $data['doctor_name'] ?? 'Bác sĩ chưa rõ',
                'doctor_degree' => $data['pdf_settings']['doctorDegree'] ?? '',

                // Thông tin y tế
                'diagnoses' => $data['diagnoses'] ?? [],
                'symptoms' => $data['symptoms'] ?? '',
                'instructions' => $data['instructions'] ?? '',
                'diagnosis' => $data['diagnosis'] ?? '',

                // PDF Settings
                'pdf_settings' => $data['pdf_settings'] ?? [],

                // Media
                'logo_data' => $logoData,
                'watermark_data' => $watermarkData,

                // Font
                'safe_font_family' => $safeFontFamily,
                'safe_font_css' => $safeFontCSS,

                // ✅ THÊM CÁC BIẾN DỰ PHÒNG ĐỂ TEMPLATE CÓ THỂ DÙNG
                'code' => $medicalRecordCode,
                'date' => $formattedDate,
                'patient_age' => (string) $patientAge,
                'patient_gender' => $patientGender,
                'patient_phone' => $patientPhone,
            ];

            // 🔥 DEBUG CHI TIẾT: Log dữ liệu đang gửi đến template
            Log::info('📋 PDF Data being sent to template:', [
                'patient_info' => [
                    'name' => $pdfData['patient_name'],
                    'age' => $pdfData['age'],
                    'gender' => $pdfData['gender'],
                    'phone' => $pdfData['phone'],
                    'address' => $pdfData['address']
                ],
                'appointment_info' => [
                    'date' => $pdfData['appointment_date'],
                    'time' => $pdfData['appointment_time'],
                    'code' => $pdfData['medical_record_code']
                ],
                'medical_info' => [
                    'doctor' => $pdfData['doctor_name'],
                    'symptoms' => $pdfData['symptoms'],
                    'diagnosis' => $pdfData['diagnosis'],
                    'instructions' => $pdfData['instructions']
                ],
                'clinic_info' => [
                    'name' => $pdfData['clinic_name'],
                    'address' => $pdfData['clinic_address'],
                    'phone' => $pdfData['clinic_phone']
                ]
            ]);

            // 🔥 XỬ LÝ DỮ LIỆU RIÊNG THEO TYPE
            if ($data['type'] === 'prescription') {
                Log::info('💊 Processing PRESCRIPTION data');

                $pdfData['prescriptions'] = collect($data['prescriptions'])->map(function ($prescription, $index) {
                    $details = collect($prescription['details'] ?? [])->map(function ($detail, $detailIndex) {
                        return (object) [
                            'medicine' => (object) [
                                'MedicineName' => $detail['medicine'] ?? 'Thuốc chưa đặt tên',
                                'Price' => floatval($detail['unitPrice'] ?? 0),
                            ],
                            'Quantity' => intval($detail['quantity'] ?? 1),
                            'Usage' => $detail['dosage'] ?? 'Theo chỉ dẫn của bác sĩ',
                            'SubTotal' => floatval(($detail['quantity'] ?? 1) * ($detail['unitPrice'] ?? 0)),
                        ];
                    })->toArray();

                    return (object) [
                        'prescription_details' => $details,
                        'total_amount' => collect($details)->sum('SubTotal')
                    ];
                })->toArray();

                $pdfData['services'] = [];

                Log::info('💊 Prescription data processed:', [
                    'prescription_count' => count($pdfData['prescriptions']),
                    'total_prescriptions' => collect($pdfData['prescriptions'])->sum(function ($prescription) {
                        return count($prescription->prescription_details);
                    })
                ]);

            } else if ($data['type'] === 'service') {
                Log::info('🔧 Processing SERVICE data');

                $pdfData['services'] = collect($data['services'])->map(function ($service, $index) {
                    $quantity = intval($service['Quantity'] ?? 1);
                    $price = floatval($service['Price'] ?? 0);

                    return [
                        'ServiceName' => $service['ServiceName'] ?? 'Dịch vụ chưa đặt tên',
                        'Price' => $price,
                        'Quantity' => $quantity,
                        'SubTotal' => $quantity * $price,
                        'Index' => $index + 1
                    ];
                })->toArray();

                $pdfData['prescriptions'] = [];

                Log::info('🔧 Service data processed:', [
                    'service_count' => count($pdfData['services']),
                    'total_services' => count($pdfData['services']),
                    'total_amount' => collect($pdfData['services'])->sum('SubTotal')
                ]);

            } else if ($data['type'] === 'payment') {
                Log::info('💰 Processing PAYMENT data');

                // Xử lý dữ liệu cho payment
                $pdfData['services'] = collect($data['services'])->map(function ($service, $index) {
                    $quantity = intval($service['Quantity'] ?? 1);
                    $price = floatval($service['Price'] ?? 0);

                    return [
                        'ServiceName' => $service['ServiceName'] ?? 'Dịch vụ khám bệnh',
                        'Price' => $price,
                        'Quantity' => $quantity,
                        'SubTotal' => $quantity * $price,
                        'Index' => $index + 1
                    ];
                })->toArray();

                $pdfData['prescriptions'] = [];

                // Thêm payment data
                $pdfData['payment_method'] = $data['payment_method'] ?? 'Tiền mặt';
                $pdfData['payment_status'] = $data['payment_status'] ?? 'Đã thanh toán';
                $pdfData['discount'] = floatval($data['discount'] ?? 0);
                $pdfData['tax'] = floatval($data['tax'] ?? 0);
                $pdfData['payment_date'] = now()->format('d/m/Y H:i');
                $pdfData['invoice_code'] = $data['invoice_code'] ?? 'INV_' . date('YmdHis');
                $pdfData['total_amount'] = floatval($data['total_amount'] ?? 0);

                // Tính toán các khoản tiền
                $servicesTotal = collect($pdfData['services'])->sum('SubTotal');
                $discountAmount = $servicesTotal * ($pdfData['discount'] / 100);
                $taxAmount = $servicesTotal * ($pdfData['tax'] / 100);
                $finalAmount = $servicesTotal - $discountAmount + $taxAmount;

                $pdfData['services_total'] = $servicesTotal;
                $pdfData['discount_amount'] = $discountAmount;
                $pdfData['tax_amount'] = $taxAmount;
                $pdfData['final_amount'] = $finalAmount;

                Log::info('💰 Payment data processed:', [
                    'invoice_code' => $pdfData['invoice_code'],
                    'services_count' => count($pdfData['services']),
                    'services_total' => $servicesTotal,
                    'discount' => $pdfData['discount'],
                    'tax' => $pdfData['tax'],
                    'final_amount' => $finalAmount
                ]);
            }

            // 🔥 KIỂM TRA VÀ TẠO PDF
            Log::info('🔍 Final PDF Generation Config:', [
                'type' => $data['type'],
                'template' => $config['template'],
                'filename' => $config['filename'],
                'has_logo' => !is_null($logoData),
                'has_watermark' => !is_null($watermarkData),
                'template_exists' => view()->exists($config['template']),
                'all_template_variables' => array_keys($pdfData)
            ]);

            // ✅ KIỂM TRA TEMPLATE CÓ TỒN TẠI KHÔNG
            if (!view()->exists($config['template'])) {
                throw new \Exception("Template {$config['template']} không tồn tại. Các template có sẵn: " .
                    implode(', ', ['pdf.invoice_pdf', 'pdf.service_pdf', 'pdf.payment_invoice_pdf']));
            }

            Log::info('🚀 Starting PDF generation...');

            // Tạo PDF
            $pdf = Pdf::loadView($config['template'], $pdfData)
                ->setPaper($data['pdf_settings']['pageSize'] ?? 'a4', $data['pdf_settings']['pageOrientation'] ?? 'portrait')
                ->setOptions([
                    'defaultFont' => $safeFontFamily,
                    'isHtml5ParserEnabled' => true,
                    'isRemoteEnabled' => true,
                    'chroot' => public_path(),
                ]);

            $pdfContent = $pdf->output();

            Log::info('✅ PDF generated successfully', [
                'file_size' => strlen($pdfContent),
                'filename' => $config['filename']
            ]);

            // Clean up temporary files
            $this->cleanupTempFiles([$logoData, $watermarkData]);

            Log::info('🎯 === END previewPrescription - SUCCESS ===');

            return response()->make($pdfContent, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="' . $config['filename'] . '"',
                'X-Filename' => $config['filename'],
                'X-Generated-At' => now()->toISOString(),
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('❌ Validation Error in previewPrescription:', $e->errors());

            return response()->json([
                'success' => false,
                'message' => 'Lỗi validation dữ liệu',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            Log::error('❌ Error generating PDF: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            // Clean up temp files even on error
            $this->cleanupTempFiles([
                $logoData ?? [],
                $watermarkData ?? []
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tạo PDF: ' . $e->getMessage(),
                'template' => $config['template'] ?? 'unknown',
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ], 500);
        }
    }



    public function previewHTML(Request $request)
    {
        Log::info('=== PDF Preview HTML Request START ===');

        try {
            // Log toàn bộ request
            Log::info('Raw Request Data:', $request->all());

            $data = $request->validate([
                'type' => 'required|string|in:prescription,service,payment',
                'patient_name' => 'required|string',
                'age' => 'nullable',
                'gender' => 'nullable|string',
                'phone' => 'nullable|string',
                'appointment_date' => 'required|string',
                'appointment_time' => 'required|string',
                'doctor_name' => 'nullable|string',

                // Cho toa thuốc
                'prescriptions' => 'nullable|array',
                'prescriptions.*.details' => 'nullable|array',
                'prescriptions.*.details.*.medicine' => 'nullable|string',
                'prescriptions.*.details.*.quantity' => 'nullable|integer|min:1',
                'prescriptions.*.details.*.dosage' => 'nullable|string',
                'prescriptions.*.details.*.unitPrice' => 'nullable|numeric|min:0',

                // Cho dịch vụ
                'services' => 'nullable|array',
                'services.*.ServiceName' => 'nullable|string',
                'services.*.Price' => 'nullable|numeric|min:0',
                'services.*.Quantity' => 'nullable|integer|min:1',

                // Cho thanh toán
                'payment_method' => 'nullable|string',
                'payment_status' => 'nullable|string',
                'discount' => 'nullable|numeric|min:0',

                // Chẩn đoán
                'diagnoses' => 'nullable|array',
                'diagnoses.*.Symptoms' => 'nullable|string',
                'diagnoses.*.Diagnosis' => 'nullable|string',

                // THÊM VALIDATION CHO PDF SETTINGS
                'pdf_settings' => 'nullable|array',
                'pdf_settings.watermark' => 'nullable|array',
                'pdf_settings.watermark.enabled' => 'nullable|boolean',
                'pdf_settings.watermark.text' => 'nullable|string',
                'pdf_settings.watermark.opacity' => 'nullable|numeric|min:0|max:1',
                'pdf_settings.watermark.fontSize' => 'nullable|integer|min:10|max:100',
                'pdf_settings.watermark.color' => 'nullable|string',
                'pdf_settings.watermark.rotation' => 'nullable|numeric|min:-180|max:180',
                'pdf_settings.fontFamily' => 'nullable|string',
                'pdf_settings.fontSize' => 'nullable|string',
                'pdf_settings.clinicName' => 'nullable|string',
                'pdf_settings.clinicAddress' => 'nullable|string',
                'pdf_settings.clinicPhone' => 'nullable|string',
                'pdf_settings.doctorName' => 'nullable|string',
                'pdf_settings.customTitle' => 'nullable|string',
            ]);

            Log::info('Validation passed:', $data);

            // Xác định template và cấu hình
            $templateConfig = [
                'prescription' => [
                    'template' => 'pdf.invoice_pdf',
                    'title' => $data['pdf_settings']['customTitle'] ?? 'TOA THUỐC',
                    'code_prefix' => 'PRE'
                ],
                'service' => [
                    'template' => 'pdf.service_pdf',
                    'title' => $data['pdf_settings']['customTitle'] ?? 'PHIẾU CHỈ ĐỊNH DỊCH VỤ',
                    'code_prefix' => 'SRV'
                ],
                'payment' => [
                    'template' => 'pdf.payment_invoice_pdf',
                    'title' => $data['pdf_settings']['customTitle'] ?? 'HÓA ĐƠN THANH TOÁN',
                    'code_prefix' => 'INV'
                ]
            ];

            $config = $templateConfig[$data['type']];
            Log::info('Template config:', $config);

            // Xử lý font chữ an toàn
            $fontFamily = $data['pdf_settings']['fontFamily'] ?? 'Times New Roman';
            $safeFontFamily = $this->getSafeFontFamily($fontFamily);
            $safeFontCSS = $this->getSafeFontCSS($fontFamily);

            // Chuẩn bị dữ liệu cho template
            $pdfData = [
                'title' => $config['title'],
                'clinic_name' => $data['pdf_settings']['clinicName'] ?? 'PHÒNG KHÁM ĐA KHOA ABC',
                'clinic_address' => $data['pdf_settings']['clinicAddress'] ?? 'Số 53 Võ Văn Ngân, TP. Thủ Đức',
                'clinic_phone' => $data['pdf_settings']['clinicPhone'] ?? '0123 456 789',
                'medical_record_code' => $config['code_prefix'] . '-' . Str::random(6),
                'doctor_name' => $data['pdf_settings']['doctorName'] ?? $data['doctor_name'] ?? 'Bác sĩ chưa rõ',
                'patient_name' => $data['patient_name'],
                'age' => (string) ($data['patient_age'] ?? $data['age'] ?? 'N/A'),
                'gender' => $data['patient_gender'] ?? $data['gender'] ?? 'N/A',
                'phone' => $data['phone'] ?? 'N/A',
                'appointment_date' => $data['appointment_date'],
                'appointment_time' => $data['appointment_time'],
                'is_preview' => true,

                // THÊM PDF SETTINGS VÀO DATA
                'pdf_settings' => $data['pdf_settings'] ?? [],

                // THÊM FONT AN TOÀN
                'safe_font_family' => $safeFontFamily,
                'safe_font_css' => $safeFontCSS,
            ];

            Log::info('Base PDF data prepared:', $pdfData);

            // Xử lý prescriptions nếu có
            if (!empty($data['prescriptions'])) {
                Log::info('Processing prescriptions:', $data['prescriptions']);
                $pdfData['prescriptions'] = collect($data['prescriptions'])->map(function ($prescription) {
                    $details = collect($prescription['details'] ?? [])->map(function ($detail) {
                        return (object) [
                            'medicine' => (object) [
                                'MedicineName' => $detail['medicine'] ?? 'N/A',
                                'Price' => $detail['unitPrice'] ?? 0,
                            ],
                            'Quantity' => $detail['quantity'] ?? 1,
                            'Usage' => $detail['dosage'] ?? 'N/A',
                        ];
                    })->toArray();

                    return (object) [
                        'prescription_details' => $details,
                    ];
                })->toArray();
            } else {
                $pdfData['prescriptions'] = [];
            }

            Log::info('Prescriptions processed:', $pdfData['prescriptions']);

            // Xử lý services nếu có
            if (!empty($data['services'])) {
                Log::info('Processing services:', $data['services']);
                $pdfData['services'] = collect($data['services'])->map(function ($service) {
                    return [
                        'ServiceName' => $service['ServiceName'] ?? 'N/A',
                        'Price' => $service['Price'] ?? 0,
                        'Quantity' => $service['Quantity'] ?? 1,
                    ];
                })->toArray();
            } else {
                $pdfData['services'] = [];
            }

            Log::info('Services processed:', $pdfData['services']);

            // Xử lý diagnoses nếu có
            if (!empty($data['diagnoses'])) {
                Log::info('Processing diagnoses:', $data['diagnoses']);
                $pdfData['diagnoses'] = $data['diagnoses'];
            } else {
                $pdfData['diagnoses'] = [];
            }

            Log::info('Diagnoses processed:', $pdfData['diagnoses']);

            // Xử lý payment data nếu có
            if ($data['type'] === 'payment') {
                $pdfData['payment_method'] = $data['payment_method'] ?? 'Tiền mặt';
                $pdfData['payment_status'] = $data['payment_status'] ?? 'Đã thanh toán';
                $pdfData['discount'] = $data['discount'] ?? 0;
                $pdfData['payment_date'] = now()->format('d/m/Y H:i');
                Log::info('Payment data processed:', [
                    'payment_method' => $pdfData['payment_method'],
                    'payment_status' => $pdfData['payment_status'],
                    'discount' => $pdfData['discount']
                ]);
            }

            // Kiểm tra template tồn tại
            if (!view()->exists($config['template'])) {
                throw new \Exception("Template {$config['template']} không tồn tại");
            }

            Log::info('Rendering template: ' . $config['template']);

            // Render HTML từ template
            $html = view($config['template'], $pdfData)->render();

            Log::info('=== PDF Preview HTML Request SUCCESS ===');

            return response()->json([
                'success' => true,
                'html' => $html,
                'data' => $pdfData,
                'original_data' => $data
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation Error:', $e->errors());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi validation',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            Log::error('PDF Preview HTML Error: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi server: ' . $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    /**
     * Lưu ảnh (dùng chung cho cả logo và watermark)
     */
    public function saveImage(Request $request)
    {
        try {
            $request->validate([
                'image' => 'required|string', // base64 image
                'type' => 'required|string|in:logo,watermark',
                'clinic_id' => 'nullable|integer'
            ]);

            $base64Image = $request->image;
            $type = $request->type;
            $clinicId = $request->clinic_id ?? 1;

            if (preg_match('/^data:image\/(\w+);base64,/', $base64Image, $matches)) {
                $imageType = $matches[1];
                $imageData = substr($base64Image, strpos($base64Image, ',') + 1);
                $imageData = base64_decode($imageData);

                // Tạo tên file
                $filename = "clinic_{$type}_{$clinicId}_" . time() . '.' . $imageType;
                $directory = "public/{$type}s";
                $filePath = $directory . '/' . $filename;

                // Đảm bảo thư mục tồn tại
                if (!Storage::exists($directory)) {
                    Storage::makeDirectory($directory, 0755, true);
                }

                // Lưu file
                Storage::put($filePath, $imageData);

                // Tạo URL public
                $publicUrl = Storage::url($filePath);
                $fullUrl = url($publicUrl);

                Log::info("{$type} saved successfully", [
                    'clinic_id' => $clinicId,
                    'filename' => $filename,
                    'url' => $fullUrl
                ]);

                return response()->json([
                    'success' => true,
                    'message' => ucfirst($type) . ' đã được lưu thành công',
                    'url' => $fullUrl,
                    'filename' => $filename
                ]);

            } else {
                throw new \Exception('Định dạng base64 không hợp lệ');
            }

        } catch (\Exception $e) {
            Log::error("Error saving {$request->type}: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lưu ' . $request->type . ': ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Lấy ảnh (dùng chung cho cả logo và watermark)
     */
    public function getImage($type, $clinicId = 1)
    {
        try {
            $directory = "public/{$type}s";

            // Tìm file mới nhất của clinic
            $files = Storage::files($directory);
            $imageFile = null;
            $latestTime = 0;

            foreach ($files as $file) {
                if (str_contains($file, "clinic_{$type}_{$clinicId}_")) {
                    $time = Storage::lastModified($file);
                    if ($time > $latestTime) {
                        $latestTime = $time;
                        $imageFile = $file;
                    }
                }
            }

            if ($imageFile) {
                $url = Storage::url($imageFile);
                return response()->json([
                    'success' => true,
                    'url' => url($url),
                    'filename' => basename($imageFile)
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => "Không tìm thấy {$type}"
            ], 404);

        } catch (\Exception $e) {
            Log::error("Error getting {$type}: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => "Lỗi khi lấy {$type}"
            ], 500);
        }
    }

    /**
     * Xóa logo
     */
    public function deleteLogo(Request $request)
    {
        try {
            $request->validate([
                'clinic_id' => 'nullable|integer'
            ]);

            $clinicId = $request->clinic_id ?? 1;

            // Xóa tất cả logo của clinic
            $directory = 'public/logos';
            $files = Storage::files($directory);
            $deletedCount = 0;

            foreach ($files as $file) {
                if (str_contains($file, "clinic_logo_{$clinicId}_")) {
                    Storage::delete($file);
                    $deletedCount++;
                }
            }

            Log::info('Logo deleted', ['clinic_id' => $clinicId, 'deleted_count' => $deletedCount]);

            return response()->json([
                'success' => true,
                'message' => 'Đã xóa ' . $deletedCount . ' logo thành công',
                'deleted_count' => $deletedCount
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting logo: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi xóa logo'
            ], 500);
        }
    }



}