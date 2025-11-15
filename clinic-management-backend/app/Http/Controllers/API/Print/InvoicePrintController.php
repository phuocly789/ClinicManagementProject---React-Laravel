<?php

namespace App\Http\Controllers\API\Print;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
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
     * Xử lý logo từ base64 sang file temporary
     */
    private function processLogo($logoData)
    {
        if (empty($logoData['url']) || !($logoData['enabled'] ?? false)) {
            Log::info('❌ Logo disabled or no URL');
            return null;
        }

        try {
            $url = $logoData['url'];
            Log::info('🔍 Processing logo URL: ' . $url);

            // TRƯỜNG HỢP 1: Base64 image - ĐÃ CÓ
            if (strpos($url, 'data:image') === 0) {
                Log::info('🔄 Processing base64 image');
                // ... code base64 exists
            }

            // TRƯỜNG HỢP 2: Storage URL - SỬA LẠI THÀNH BASE64
            if (strpos($url, '/storage/logos/') !== false) {
                Log::info('🔄 Processing storage URL');

                // Extract filename từ storage URL
                $filename = basename($url);
                $storagePath = 'public/logos/' . $filename;

                Log::info('📁 Storage path: ' . $storagePath);
                Log::info('📁 Storage exists: ' . (Storage::exists($storagePath) ? 'YES' : 'NO'));

                if (Storage::exists($storagePath)) {
                    Log::info('✅ Storage file found');

                    try {
                        $fileContent = Storage::get($storagePath);

                        // QUAN TRỌNG: Chuyển sang base64 để DomPDF hiểu
                        $mimeType = $this->getImageMimeType($storagePath);
                        $base64Image = 'data:' . $mimeType . ';base64,' . base64_encode($fileContent);

                        $result = [
                            'url' => $base64Image, // Dùng base64 thay vì file path
                            'width' => $logoData['width'] ?? '50px',
                            'height' => $logoData['height'] ?? '50px',
                            'position' => $logoData['position'] ?? 'left',
                            'opacity' => $logoData['opacity'] ?? 1,
                            'marginTop' => $logoData['marginTop'] ?? '0px',
                        ];

                        Log::info('✅ Logo processing SUCCESS - Using base64');
                        return $result;

                    } catch (\Exception $fileError) {
                        Log::error('❌ File processing error: ' . $fileError->getMessage());
                        return null;
                    }
                } else {
                    Log::error('❌ Storage file not found: ' . $storagePath);
                    return null;
                }
            }

            // TRƯỜNG HỢP 3: Direct HTTP URL - Giữ nguyên
            if (strpos($url, 'http') === 0 && strpos($url, '/storage/') === false) {
                Log::info('🌐 Using direct HTTP URL: ' . $url);
                return [
                    'url' => $url,
                    'width' => $logoData['width'] ?? '50px',
                    'height' => $logoData['height'] ?? '50px',
                    'position' => $logoData['position'] ?? 'left',
                    'opacity' => $logoData['opacity'] ?? 1,
                    'marginTop' => $logoData['marginTop'] ?? '0px',
                ];
            }

            Log::warning('⚠️ Unhandled logo URL type: ' . $url);
            return null;

        } catch (\Exception $e) {
            Log::error('❌ Error processing logo: ' . $e->getMessage());
            return null;
        }
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
     * Xử lý watermark
     */
    private function processWatermark($watermarkData)
    {
        if (empty($watermarkData['enabled']) || !$watermarkData['enabled']) {
            return null;
        }

        Log::info('🔍 Processing watermark data:', $watermarkData);

        // Nếu có URL ảnh, xử lý như watermark ảnh
        if (!empty($watermarkData['url']) && filter_var($watermarkData['url'], FILTER_VALIDATE_URL)) {
            Log::info('🖼️ Processing image watermark');

            try {
                // Xử lý ảnh watermark tương tự như logo
                $watermarkResult = $this->processLogo([
                    'url' => $watermarkData['url'],
                    'enabled' => true,
                    'width' => $watermarkData['imageWidth'] ?? '200px',
                    'height' => $watermarkData['imageHeight'] ?? '200px',
                    'opacity' => $watermarkData['opacity'] ?? 0.1
                ]);

                if ($watermarkResult) {
                    $result = [
                        'type' => 'image',
                        'url' => $watermarkResult['url'],
                        'opacity' => $watermarkData['opacity'] ?? 0.1,
                        'width' => $watermarkData['imageWidth'] ?? '200px',
                        'height' => $watermarkData['imageHeight'] ?? '200px',
                        'rotation' => $watermarkData['rotation'] ?? -45,
                    ];

                    Log::info('✅ Image watermark processed successfully:', $result);
                    return $result;
                }
            } catch (\Exception $e) {
                Log::error('❌ Error processing image watermark: ' . $e->getMessage());
            }
        }

        // Nếu không có URL nhưng có text, xử lý watermark text
        if (!empty($watermarkData['text'])) {
            Log::info('📝 Processing text watermark');
            $result = [
                'type' => 'text',
                'text' => $watermarkData['text'],
                'opacity' => $watermarkData['opacity'] ?? 0.1,
                'fontSize' => $watermarkData['fontSize'] ?? 48,
                'color' => $watermarkData['color'] ?? '#cccccc',
                'rotation' => $watermarkData['rotation'] ?? -45,
            ];

            Log::info('✅ Text watermark processed successfully:', $result);
            return $result;
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
        Log::info('Received previewPrescription data:', $request->all());

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
            'pdf_settings.watermark.url' => 'nullable|string', // Hỗ trợ ảnh watermark
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
        ], [
            'type.required' => 'Loại PDF là bắt buộc.',
            'patient_name.required' => 'Tên bệnh nhân là bắt buộc.',
            'prescriptions.required_if' => 'Đơn thuốc là bắt buộc cho toa thuốc.',
            'services.required_if' => 'Danh sách dịch vụ là bắt buộc cho phiếu dịch vụ.',
            'payment_method.required_if' => 'Phương thức thanh toán là bắt buộc cho hóa đơn.',
            'payment_status.required_if' => 'Trạng thái thanh toán là bắt buộc cho hóa đơn.',
        ]);

        // Xác định title và template dựa trên type
        $typeConfig = [
            'prescription' => [
                'title' => $data['pdf_settings']['customTitle'] ?? 'TOA THUỐC',
                'template' => 'pdf.invoice_pdf',
                'filename' => 'TOA_THUOC.pdf'
            ],
            'service' => [
                'title' => $data['pdf_settings']['customTitle'] ?? 'PHIẾU CHỈ ĐỊNH DỊCH VỤ',
                'template' => 'pdf.service_pdf',
                'filename' => 'PHIEU_DICH_VU.pdf'
            ],
            'payment' => [
                'template' => 'pdf.payment_invoice_pdf',
                'title' => $data['pdf_settings']['customTitle'] ?? 'HÓA ĐƠN THANH TOÁN',
                'filename' => 'HOA_DON_THANH_TOAN.pdf'
            ]
        ];

        $config = $typeConfig[$data['type']];

        // Xử lý font chữ an toàn
        $fontFamily = $data['pdf_settings']['fontFamily'] ?? 'Times New Roman';
        $safeFontFamily = $this->getSafeFontFamily($fontFamily);
        $safeFontCSS = $this->getSafeFontCSS($fontFamily);

        // Xử lý logo và watermark
        $logoData = $this->processLogo($data['pdf_settings']['logo'] ?? []);
        $watermarkData = $this->processWatermark($data['pdf_settings']['watermark'] ?? []);

        // Chuẩn bị dữ liệu chung
        $pdfData = [
            'title' => $config['title'],
            'clinic_name' => $data['pdf_settings']['clinicName'] ?? 'PHÒNG KHÁM ĐA KHOA ABC',
            'clinic_address' => $data['pdf_settings']['clinicAddress'] ?? 'Số 53 Võ Văn Ngân, TP. Thủ Đức',
            'clinic_phone' => $data['pdf_settings']['clinicPhone'] ?? '0123 456 789',
            'medical_record_code' => strtoupper(substr($data['type'], 0, 3)) . '-' . Str::random(6),
            'doctor_name' => $data['pdf_settings']['doctorName'] ?? $data['doctor_name'] ?? 'Bác sĩ chưa rõ',
            'patient_name' => $data['patient_name'],
            'age' => (string) ($data['patient_age'] ?? $data['age'] ?? 'N/A'),
            'gender' => $data['patient_gender'] ?? $data['gender'] ?? 'N/A',
            'phone' => $data['phone'] ?? 'N/A',
            'address' => $data['address'] ?? '',
            'appointment_date' => $data['appointment_date'],
            'appointment_time' => $data['appointment_time'],
            'diagnoses' => $data['diagnoses'] ?? [],
            'symptoms' => $data['symptoms'] ?? '',
            'instructions' => $data['instructions'] ?? '',
            'diagnosis' => $data['diagnosis'] ?? '',

            // THÊM PDF SETTINGS VÀO DATA
            'pdf_settings' => $data['pdf_settings'] ?? [],

            // THÊM LOGO VÀ WATERMARK DATA
            'logo_data' => $logoData,
            'watermark_data' => $watermarkData,

            // THÊM FONT AN TOÀN
            'safe_font_family' => $safeFontFamily,
            'safe_font_css' => $safeFontCSS,
        ];

        // Thêm dữ liệu riêng theo type
        if ($data['type'] === 'prescription') {
            $pdfData['prescriptions'] = collect($data['prescriptions'])->map(function ($prescription) {
                return (object) [
                    'prescription_details' => collect($prescription['details'])->map(function ($detail) {
                        return (object) [
                            'medicine' => (object) [
                                'MedicineName' => $detail['medicine'],
                                'Price' => $detail['unitPrice'],
                            ],
                            'Quantity' => $detail['quantity'],
                            'Usage' => $detail['dosage'],
                        ];
                    })->toArray(),
                ];
            })->toArray();
            $pdfData['services'] = [];
        } else if ($data['type'] === 'service') {
            $pdfData['services'] = collect($data['services'])->map(function ($service) {
                return [
                    'ServiceName' => $service['ServiceName'],
                    'Price' => $service['Price'],
                    'Quantity' => $service['Quantity'] ?? 1,
                ];
            })->toArray();
            $pdfData['prescriptions'] = [];
        } else if ($data['type'] === 'payment') {
            // Xử lý dữ liệu cho payment
            $pdfData['services'] = collect($data['services'])->map(function ($service) {
                return [
                    'ServiceName' => $service['ServiceName'] ?? 'Dịch vụ khám bệnh',
                    'Price' => $service['Price'] ?? 0,
                    'Quantity' => $service['Quantity'] ?? 1,
                ];
            })->toArray();
            $pdfData['prescriptions'] = [];

            // Thêm payment data
            $pdfData['payment_method'] = $data['payment_method'] ?? 'Tiền mặt';
            $pdfData['payment_status'] = $data['payment_status'] ?? 'Đã thanh toán';
            $pdfData['discount'] = $data['discount'] ?? 0;
            $pdfData['tax'] = $data['tax'] ?? 0;
            $pdfData['payment_date'] = now()->format('d/m/Y H:i');
            $pdfData['invoice_code'] = $data['invoice_code'] ?? 'INV_' . Str::random(6);
            $pdfData['total_amount'] = $data['total_amount'] ?? 0;
        }

        try {
            Log::info('🔍 Generating PDF with config:', [
                'type' => $data['type'],
                'template' => $config['template'],
                'filename' => $config['filename'],
                'has_logo' => !is_null($logoData),
                'has_watermark' => !is_null($watermarkData)
            ]);

            $pdf = Pdf::loadView($config['template'], $pdfData)
                ->setPaper('a4', 'portrait');

            $pdfContent = $pdf->output();

            // Clean up temporary files
            $this->cleanupTempFiles([$logoData, $watermarkData]);

            return response()->make($pdfContent, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="' . $config['filename'] . '"',
            ]);

        } catch (\Exception $e) {
            Log::error('Error generating PDF: ' . $e->getMessage());

            // Clean up temp files even on error
            $this->cleanupTempFiles([$logoData, $watermarkData]);

            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tạo PDF: ' . $e->getMessage(),
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
     * Lưu logo từ FE vào storage
     */
    public function saveLogo(Request $request)
    {
        try {
            $request->validate([
                'logo' => 'required|string', // base64 image
                'clinic_id' => 'nullable|integer'
            ]);

            $base64Image = $request->logo;
            $clinicId = $request->clinic_id ?? 1;

            // Xử lý base64 image
            if (preg_match('/^data:image\/(\w+);base64,/', $base64Image, $matches)) {
                $imageType = $matches[1];
                $imageData = substr($base64Image, strpos($base64Image, ',') + 1);
                $imageData = base64_decode($imageData);

                // Tạo tên file
                $filename = 'clinic_logo_' . $clinicId . '_' . time() . '.' . $imageType;
                $directory = 'public/logos';
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

                Log::info('Logo saved successfully', [
                    'clinic_id' => $clinicId,
                    'filename' => $filename,
                    'url' => $fullUrl
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Logo đã được lưu thành công',
                    'logo_url' => $fullUrl,
                    'filename' => $filename
                ]);

            } else {
                throw new \Exception('Định dạng base64 không hợp lệ');
            }

        } catch (\Exception $e) {
            Log::error('Error saving logo: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lưu logo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Lấy logo đã lưu
     */
    public function getLogo($clinicId = 1)
    {
        try {
            $directory = 'public/logos';

            // Tìm file logo mới nhất của clinic
            $files = Storage::files($directory);
            $logoFile = null;
            $latestTime = 0;

            foreach ($files as $file) {
                if (str_contains($file, "clinic_logo_{$clinicId}_")) {
                    $time = Storage::lastModified($file);
                    if ($time > $latestTime) {
                        $latestTime = $time;
                        $logoFile = $file;
                    }
                }
            }

            if ($logoFile) {
                $url = Storage::url($logoFile);
                return response()->json([
                    'success' => true,
                    'logo_url' => url($url),
                    'filename' => basename($logoFile)
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy logo'
            ], 404);

        } catch (\Exception $e) {
            Log::error('Error getting logo: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy logo'
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

    /**
     * Debug logo processing với storage URL
     */
    public function debugLogoStorage(Request $request)
    {
        try {
            // Lấy logo mới nhất
            $files = Storage::files('public/logos');
            $latestFile = null;
            $latestTime = 0;

            foreach ($files as $file) {
                if (str_contains($file, 'clinic_logo_1_')) {
                    $time = Storage::lastModified($file);
                    if ($time > $latestTime) {
                        $latestTime = $time;
                        $latestFile = $file;
                    }
                }
            }

            if (!$latestFile) {
                return response()->json(['success' => false, 'message' => 'No logo found']);
            }

            $logoUrl = url(Storage::url($latestFile));

            Log::info('=== DEBUG STORAGE LOGO PROCESSING ===');
            Log::info('Latest logo: ' . $latestFile);
            Log::info('Input URL: ' . $logoUrl);

            $logoData = [
                'url' => $logoUrl,
                'enabled' => true,
                'width' => '100px',
                'height' => '100px'
            ];

            // Test processLogo
            $result = $this->processLogo($logoData);

            Log::info('Processing result:');
            Log::info('Final URL: ' . ($result['url'] ?? 'NULL'));
            Log::info('Result exists: ' . ($result ? 'YES' : 'NO'));

            if (!$result) {
                Log::error('❌ processLogo returned null');
                return response()->json([
                    'success' => false,
                    'message' => 'Logo processing failed - processLogo returned null'
                ]);
            }

            // Test tạo PDF
            Log::info('🔄 Generating PDF...');

            try {
                $pdf = Pdf::loadView('pdf.payment_invoice_pdf', [
                    'title' => 'DEBUG STORAGE LOGO',
                    'clinic_name' => 'Test Clinic',
                    'patient_name' => 'Test Patient',
                    'logo_data' => $result
                ]);

                Log::info('✅ PDF generated successfully');

                $pdfContent = $pdf->output();

                // Cleanup
                $this->cleanupTempFiles([$result]);

                return response($pdfContent, 200, [
                    'Content-Type' => 'application/pdf',
                    'Content-Disposition' => 'inline; filename="debug_storage_logo.pdf"'
                ]);

            } catch (\Exception $pdfError) {
                Log::error('❌ PDF generation error: ' . $pdfError->getMessage());
                Log::error('❌ PDF error trace: ' . $pdfError->getTraceAsString());
                return response()->json([
                    'success' => false,
                    'message' => 'PDF generation failed: ' . $pdfError->getMessage()
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error('Debug storage logo error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }


}