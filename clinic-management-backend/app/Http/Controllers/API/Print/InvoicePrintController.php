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
            'Times New Roman' => 'dejavu sans', // Dùng DejaVu Sans thay vì times
            'Arial' => 'dejavu sans',
            'Helvetica' => 'dejavu sans',
            'Verdana' => 'dejavu sans',
            'Georgia' => 'dejavu sans',
            'Courier New' => 'dejavu sans',
            'DejaVu Sans' => 'dejavu sans',
            // Thêm các font hỗ trợ tiếng Việt
            'Tahoma' => 'dejavu sans',
            'Segoe UI' => 'dejavu sans',
            'Roboto' => 'dejavu sans',
            'Open Sans' => 'dejavu sans',
        ];

        return $fontMap[$fontFamily] ?? 'dejavu sans'; // Mặc định dùng DejaVu Sans
    }

    /**
     * Tạo safe font CSS cho template
     */
    private function getSafeFontCSS($fontFamily)
    {
        $fontMapping = [
            'Times New Roman' => '"DejaVu Sans", "Times New Roman", serif',
            'Arial' => '"DejaVu Sans", Arial, sans-serif',
            'Helvetica' => '"DejaVu Sans", Helvetica, sans-serif',
            'Verdana' => '"DejaVu Sans", Verdana, sans-serif',
            'Georgia' => '"DejaVu Sans", Georgia, serif',
            'Courier New' => '"DejaVu Sans", "Courier New", monospace',
            'DejaVu Sans' => '"DejaVu Sans", sans-serif',
            'Tahoma' => '"DejaVu Sans", Tahoma, sans-serif',
            'Segoe UI' => '"DejaVu Sans", "Segoe UI", sans-serif',
            'Roboto' => '"DejaVu Sans", "Roboto", sans-serif',
            'Open Sans' => '"DejaVu Sans", "Open Sans", sans-serif',
        ];

        return $fontMapping[$fontFamily] ?? '"DejaVu Sans", sans-serif';
    }

    /**
     * Xử lý ảnh (dùng chung cho cả logo và watermark)
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

            // TRƯỜNG HỢP 2: Public URL - QUAN TRỌNG: SỬA ĐƯỜNG DẪN NÀY
            if (strpos($url, '/temp_logo/') !== false || strpos($url, 'temp_logo/') === 0) {
                Log::info("🔄 Processing public temp_logo URL for {$type}");

                $filename = basename($url);
                $publicPath = public_path("temp_logo/{$filename}");

                Log::info("📁 Looking for file: " . $publicPath);

                if (file_exists($publicPath)) {
                    Log::info("✅ Public file found for {$type}: " . $publicPath);

                    $fileContent = file_get_contents($publicPath);
                    $mimeType = $this->getImageMimeType($publicPath);
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

                Log::error("❌ Không tìm thấy file {$type} trong thư mục public: " . $publicPath);
                return null;
            }

            // TRƯỜNG HỢP 3: Storage URL (nếu có)
            if (strpos($url, '/storage/') !== false) {
                Log::info("🔄 Processing storage URL for {$type}");

                $filename = basename($url);
                $storagePath = "public/logos/{$filename}"; // Đúng cấu trúc Laravel

                if (Storage::exists($storagePath)) {
                    Log::info("✅ Storage file found for {$type}: " . $storagePath);

                    $fileContent = Storage::get($storagePath);
                    $mimeType = $this->getImageMimeType($storagePath);
                    $base64Image = 'data:' . $mimeType . ';base64,' . base64_encode($fileContent);

                    return array_merge([
                        'url' => $base64Image,
                        'width' => $imageData['width'] ?? $defaults['width'] ?? '50px',
                        'height' => $imageData['height'] ?? $defaults['height'] ?? '50px',
                        'opacity' => $imageData['opacity'] ?? $defaults['opacity'] ?? 1,
                    ], $defaults);
                }

                Log::error("❌ Không tìm thấy file {$type} trong storage: " . $storagePath);
                return null;
            }

            // TRƯỜNG HỢP 4: Direct HTTP URL
            if (strpos($url, 'http') === 0) {
                Log::info("🌐 Using direct HTTP URL for {$type}: " . $url);
                return array_merge([
                    'url' => $url,
                    'width' => $imageData['width'] ?? $defaults['width'] ?? '50px',
                    'height' => $imageData['height'] ?? $defaults['height'] ?? '50px',
                    'opacity' => $imageData['opacity'] ?? $defaults['opacity'] ?? 1,
                ], $defaults);
            }

            Log::warning("⚠️ Định dạng URL {$type} không được hỗ trợ: " . $url);
            return null;

        } catch (\Exception $e) {
            Log::error("❌ Lỗi xử lý {$type}: " . $e->getMessage());
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
            'opacity' => $logoData['opacity'] ?? 0.8,
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
                'opacity' => $watermarkData['opacity'] ?? 0.1
            ]);

            if ($imageWatermark) {
                $result = array_merge($imageWatermark, [
                    'type' => 'image',
                    'rotation' => $watermarkData['rotation'] ?? -45,
                    'opacity' => $watermarkData['opacity'] ?? 0.1
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
                'opacity' => $watermarkData['opacity'] ?? 0.1,
                'fontSize' => $watermarkData['fontSize'] ?? 48,
                'color' => $watermarkData['color'] ?? '#cccccc',
                'rotation' => $watermarkData['rotation'] ?? -45,
            ];
        }

        Log::warning('⚠️ Không tìm thấy dữ liệu watermark hợp lệ');
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
                    Log::info('Đã dọn dẹp file tạm: ' . $file['temp_file']);
                } catch (\Exception $e) {
                    Log::warning('Không thể xóa file tạm: ' . $file['temp_file']);
                }
            }
        }

        // Cleanup old temp files in storage
        $this->cleanupOldTempFiles();
    }

    private function cleanupOldTempFiles()
    {
        $tempDir = storage_path('app/temp_pdf_logos');
        if (!is_dir($tempDir)) {
            Log::info('Thư mục tạm không tồn tại: ' . $tempDir);
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
            Log::info("✅ Đã dọn dẹp {$deletedCount} file tạm cũ từ temp_pdf_logos");
        }
    }

    /**
     * 🔥 PHƯƠNG THỨC CHÍNH: XỬ LÝ REAL-TIME SETTINGS TỪ FE
     */
    public function previewPrescription(Request $request)
    {
        Log::info('🎯 === START previewPrescription - REAL-TIME SETTINGS ===');
        Log::info('📥 Received data from FE:', $request->all());

        try {
            $data = $request->all();

            // 🔥 VALIDATION FIXED - PHÙ HỢP VỚI JSON THỰC TẾ
            $validated = $request->validate([
                'type' => 'required|string|in:prescription,service,payment,test_result',
                'patient_name' => 'required|string',

                // 🔥 FIX: THÊM CÁC TRƯỜNG THIẾU TỪ JSON
                'patient_age' => 'nullable|integer',
                'patient_gender' => 'nullable|string',
                'patient_phone' => 'nullable|string',
                'patient_address' => 'nullable|string',
                'lab_number' => 'nullable|string', // Thêm cho test_result
                'department' => 'nullable|string', // Thêm cho test_result
                'technician_name' => 'nullable|string', // Thêm cho test_result
                'doctor_name' => 'nullable|string', // Có trong JSON
                'appointment_date' => 'nullable|string', // Có trong JSON
                'appointment_time' => 'nullable|string', // Có trong JSON

                // 🔥 QUAN TRỌNG: VALIDATE PDF SETTINGS TỪ FE
                'pdf_settings' => 'required|array',
                'pdf_settings.fontFamily' => 'nullable|string',
                'pdf_settings.fontSize' => 'nullable|string',
                'pdf_settings.fontColor' => 'nullable|string',
                'pdf_settings.primaryColor' => 'nullable|string',
                'pdf_settings.backgroundColor' => 'nullable|string',
                'pdf_settings.borderColor' => 'nullable|string',
                'pdf_settings.headerBgColor' => 'nullable|string',
                'pdf_settings.lineHeight' => 'nullable|numeric',
                'pdf_settings.fontStyle' => 'nullable|string',
                'pdf_settings.fontWeight' => 'nullable|string',

                'pdf_settings.logo' => 'nullable|array',
                'pdf_settings.logo.enabled' => 'nullable|boolean',
                'pdf_settings.logo.url' => 'nullable|string',
                'pdf_settings.logo.width' => 'nullable|string',
                'pdf_settings.logo.height' => 'nullable|string',
                'pdf_settings.logo.position' => 'nullable|string',
                'pdf_settings.logo.opacity' => 'nullable|numeric|min:0|max:1',

                'pdf_settings.watermark' => 'nullable|array',
                'pdf_settings.watermark.enabled' => 'nullable|boolean',
                'pdf_settings.watermark.text' => 'nullable|string',
                'pdf_settings.watermark.url' => 'nullable|string',
                'pdf_settings.watermark.opacity' => 'nullable|numeric|min:0|max:1',
                'pdf_settings.watermark.fontSize' => 'nullable|integer',
                'pdf_settings.watermark.color' => 'nullable|string',
                'pdf_settings.watermark.rotation' => 'nullable|numeric',

                'pdf_settings.clinicName' => 'required|string',
                'pdf_settings.clinicAddress' => 'required|string',
                'pdf_settings.clinicPhone' => 'required|string',
                'pdf_settings.doctorName' => 'required|string',
                'pdf_settings.customTitle' => 'required|string',

                'pdf_settings.pageOrientation' => 'required|string|in:portrait,landscape',
                'pdf_settings.pageSize' => 'required|string',
                'pdf_settings.marginTop' => 'required|string',
                'pdf_settings.marginBottom' => 'required|string',
                'pdf_settings.marginLeft' => 'required|string',
                'pdf_settings.marginRight' => 'required|string',

                // Các trường dữ liệu khác - FIX TÊN CHO ĐÚNG
                'prescriptions' => 'nullable|array',
                'services' => 'nullable|array',
                'test_results' => 'nullable|array', // Có trong JSON
            ]);

            Log::info('✅ Validation passed for real-time settings');

            // 🔥 LẤY REAL-TIME SETTINGS TỪ FE
            $pdfSettings = $data['pdf_settings'];
            Log::info('🎨 REAL-TIME SETTINGS from FE:', $pdfSettings);

            // 🔥 XÁC ĐỊNH TEMPLATE
            $templateConfig = [
                'prescription' => [
                    'template' => 'pdf.invoice_pdf',
                    'filename' => 'TOA_THUOC_' . date('Ymd_His') . '.pdf'
                ],
                'service' => [
                    'template' => 'pdf.service_pdf',
                    'filename' => 'PHIEU_DICH_VU_' . date('Ymd_His') . '.pdf'
                ],
                'payment' => [
                    'template' => 'pdf.payment_invoice_pdf',
                    'filename' => 'HOA_DON_' . date('Ymd_His') . '.pdf'
                ],
                'test_result' => [
                    'template' => 'pdf.result_pdf',
                    'filename' => 'KET_QUA_XET_NGHIEM_' . date('Ymd_His') . '.pdf'
                ],
            ];

            $config = $templateConfig[$data['type']];
            Log::info('📄 Template config:', $config);

            // 🔥 XỬ LÝ FONT CHỮ REAL-TIME
            $fontFamily = $data['pdf_settings']['fontFamily'] ?? 'Times New Roman';
            $safeFontFamily = $this->getSafeFontFamily($fontFamily);
            $safeFontCSS = $this->getSafeFontCSS($fontFamily);

            Log::info('🔤 Font processing for Vietnamese:', [
                'original' => $fontFamily,
                'safe_font' => $safeFontFamily,
                'safe_css' => $safeFontCSS
            ]);

            // 🔥 XỬ LÝ LOGO & WATERMARK REAL-TIME
            $logoData = $this->processLogo($pdfSettings['logo'] ?? []);
            $watermarkData = $this->processWatermark($pdfSettings['watermark'] ?? []);

            Log::info('🖼️ Real-time media processing:', [
                'has_logo' => !empty($logoData),
                'has_watermark' => !empty($watermarkData),
                'logo_enabled' => $pdfSettings['logo']['enabled'] ?? false,
                'watermark_enabled' => $pdfSettings['watermark']['enabled'] ?? false
            ]);

            // 🔥 CHUẨN BỊ DATA CHO TEMPLATE VỚI REAL-TIME SETTINGS - FIX MAPPING
            $pdfData = [
                // Thông tin cơ bản
                'title' => $pdfSettings['customTitle'],
                'type' => $data['type'],

                // Thông tin phòng khám từ real-time settings
                'clinic_name' => $pdfSettings['clinicName'],
                'clinic_address' => $pdfSettings['clinicAddress'],
                'clinic_phone' => $pdfSettings['clinicPhone'],
                'doctor_name' => $pdfSettings['doctorName'],

                // 🔥 FIX: ÁNH XẠ ĐÚNG TÊN TRƯỜNG TỪ JSON
                'patient_name' => $data['patient_name'],
                'age' => $data['patient_age'] ?? $data['age'] ?? 'N/A', // Map cả 2 tên
                'gender' => $data['patient_gender'] ?? $data['gender'] ?? 'N/A',
                'phone' => $data['patient_phone'] ?? $data['phone'] ?? 'N/A',
                'address' => $data['patient_address'] ?? $data['address'] ?? '',

                // Thông tin hẹn - FIX MAPPING
                'medical_record_code' => $data['lab_number'] ?? $data['code'] ?? match ($data['type']) {
                    'prescription' => 'TT' . date('YmdHis'),
                    'service' => 'DV' . date('YmdHis'),
                    'payment' => 'HD' . date('YmdHis'),
                    'test_result' => 'XN' . date('YmdHis'),
                    default => 'HS' . date('YmdHis')
                },
                'appointment_date' => $data['appointment_date'] ?? now()->format('d/m/Y'),
                'appointment_time' => $data['appointment_time'] ?? now()->format('H:i'),
                'patient_code' => $data['patient_code'] ?? 'N/A',

                // 🔥 THÊM CÁC TRƯỜNG MỚI CHO TEST_RESULT
                'lab_number' => $data['lab_number'] ?? '',
                'department' => $data['department'] ?? '',
                'technician_name' => $data['technician_name'] ?? '',

                // Thông tin y tế
                'symptoms' => $data['symptoms'] ?? '',
                'diagnosis' => $data['diagnosis'] ?? '',
                'instructions' => $data['instructions'] ?? '',

                // 🔥 QUAN TRỌNG: TRUYỀN REAL-TIME SETTINGS VÀO TEMPLATE
                'pdf_settings' => $pdfSettings,
                'logo_data' => $logoData,
                'watermark_data' => $watermarkData,

                // Font settings
                'safe_font_family' => $safeFontFamily,
                'safe_font_css' => $safeFontCSS,

                // Các biến dự phòng
                'code' => $data['code'] ?? 'AUTO',
                'date' => $data['date'] ?? now('Asia/Ho_Chi_Minh')->format('d/m/Y'),
            ];

            // 🔥 XỬ LÝ DỮ LIỆU THEO TYPE VỚI REAL-TIME SETTINGS
            if ($data['type'] === 'prescription') {
                Log::info('💊 Processing PRESCRIPTION with real-time settings');
                $prescriptionSource = $data['prescriptions'] ?? [];
                $pdfData['prescriptions'] = $this->processPrescriptionData($prescriptionSource, 'original');
                $pdfData['services'] = [];

            } else if ($data['type'] === 'service') {
                Log::info('🔧 Processing SERVICE with real-time settings');
                $pdfData['services'] = $this->processServiceData($data['services'] ?? []);
                $pdfData['prescriptions'] = [];

            } else if ($data['type'] === 'payment') {
                Log::info('💰 Processing PAYMENT with real-time settings');
                $processedData = $this->processPaymentData($data);
                $pdfData = array_merge($pdfData, $processedData);

            } else if ($data['type'] === 'test_result') {
                Log::info('🔬 Processing TEST_RESULT with real-time settings');
                // 🔥 FIX: SỬ DỤNG ĐÚNG TÊN TRƯỜNG 'test_results' từ JSON
                $pdfData['test_results'] = $this->processTestResultData($data['test_results'] ?? []);
                $pdfData['prescriptions'] = [];
                $pdfData['services'] = [];

                Log::info('🔬 Test results data:', [
                    'count' => count($pdfData['test_results']),
                    'data' => $pdfData['test_results']
                ]);
            }

            // 🔥 DEBUG: LOG TẤT CẢ REAL-TIME SETTINGS ĐƯỢC ÁP DỤNG
            Log::info('🎨 REAL-TIME SETTINGS APPLIED:', [
                'font_family' => $pdfSettings['fontFamily'],
                'font_size' => $pdfSettings['fontSize'],
                'font_color' => $pdfSettings['fontColor'],
                'primary_color' => $pdfSettings['primaryColor'],
                'background_color' => $pdfSettings['backgroundColor'],
                'border_color' => $pdfSettings['borderColor'],
                'line_height' => $pdfSettings['lineHeight'],
                'logo_enabled' => $pdfSettings['logo']['enabled'] ?? false,
                'watermark_enabled' => $pdfSettings['watermark']['enabled'] ?? false,
                'page_orientation' => $pdfSettings['pageOrientation'],
                'margins' => [
                    'top' => $pdfSettings['marginTop'],
                    'bottom' => $pdfSettings['marginBottom'],
                    'left' => $pdfSettings['marginLeft'],
                    'right' => $pdfSettings['marginRight']
                ]
            ]);

            // 🔥 LOG DATA TRƯỚC KHI TẠO PDF ĐỂ DEBUG
            Log::info('📊 FINAL PDF DATA STRUCTURE:', [
                'type' => $pdfData['type'],
                'patient_name' => $pdfData['patient_name'],
                'patient_age' => $pdfData['age'],
                'patient_gender' => $pdfData['gender'],
                'test_results_count' => isset($pdfData['test_results']) ? count($pdfData['test_results']) : 0,
                'has_pdf_settings' => !empty($pdfData['pdf_settings'])
            ]);

            // 🔥 KIỂM TRA TEMPLATE
            if (!view()->exists($config['template'])) {
                throw new \Exception("Không tìm thấy template {$config['template']}");
            }

            Log::info('🚀 Generating PDF with REAL-TIME settings...');

            // 🔥 TẠO PDF VỚI REAL-TIME SETTINGS
            $pdf = Pdf::loadView($config['template'], $pdfData)
                ->setPaper($pdfSettings['pageSize'] ?? 'a4', $pdfSettings['pageOrientation'] ?? 'portrait')
                ->setOptions([
                    'defaultFont' => $safeFontFamily,
                    'isHtml5ParserEnabled' => true,
                    'isRemoteEnabled' => true,
                    'isPhpEnabled' => true,
                    'chroot' => public_path(),
                    'dpi' => 96,
                    'fontHeightRatio' => 1.1,
                    // Áp dụng margins từ real-time settings
                    'margin-top' => $pdfSettings['marginTop'] ?? '15mm',
                    'margin-bottom' => $pdfSettings['marginBottom'] ?? '15mm',
                    'margin-left' => $pdfSettings['marginLeft'] ?? '10mm',
                    'margin-right' => $pdfSettings['marginRight'] ?? '10mm',
                ]);

            $pdfContent = $pdf->output();

            Log::info('✅ PDF generated successfully with REAL-TIME settings', [
                'file_size' => strlen($pdfContent),
                'filename' => $config['filename'],
                'settings_applied' => true
            ]);

            // Clean up
            $this->cleanupTempFiles([$logoData, $watermarkData]);

            Log::info('🎯 === END previewPrescription - REAL-TIME SUCCESS ===');

            return response()->make($pdfContent, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="' . $config['filename'] . '"',
                'X-Filename' => $config['filename'],
                'X-Generated-At' => now()->toISOString(),
                'X-Real-Time-Settings' => 'applied',
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('❌ Lỗi xác thực real-time settings:', $e->errors());
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu cấu hình không hợp lệ',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            Log::error('❌ Lỗi tạo PDF với real-time settings: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Không thể tạo PDF với cấu hình hiện tại: ' . $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ], 500);
        }
    }


    /**
     * 🔥 XỬ LÝ PRESCRIPTION DATA - XỬ LÝ ĐÚNG CẢ 2 TRƯỜNG HỢP
     */
    private function processPrescriptionData($prescriptions, $sourceType = 'simple')
    {
        $result = [];

        foreach ($prescriptions as $index => $prescription) {
            if ($sourceType === 'original') {
                // 🔥 XỬ LÝ TOA THUỐC: prescriptions có cấu trúc [{details: [{medicine, quantity, dosage, unitPrice}]}]
                if (isset($prescription['details']) && is_array($prescription['details'])) {
                    foreach ($prescription['details'] as $detail) {
                        $result[] = [
                            'MedicineName' => $detail['medicine'] ?? 'Thuốc',
                            'Price' => floatval($detail['unitPrice'] ?? 0),
                            'Quantity' => intval($detail['quantity'] ?? 1),
                            'Usage' => $detail['dosage'] ?? 'Theo chỉ định',
                            'SubTotal' => floatval(($detail['quantity'] ?? 1) * ($detail['unitPrice'] ?? 0)),
                        ];
                    }
                }
                // 🔥 XỬ LÝ TRƯỜNG HỢP DIRECT ARRAY (fallback)
                else {
                    $result[] = [
                        'MedicineName' => $prescription['MedicineName'] ?? $prescription['medicine'] ?? 'Thuốc',
                        'Price' => floatval($prescription['Price'] ?? $prescription['unitPrice'] ?? 0),
                        'Quantity' => intval($prescription['Quantity'] ?? $prescription['quantity'] ?? 1),
                        'Usage' => $prescription['Usage'] ?? $prescription['dosage'] ?? 'Theo chỉ định',
                        'SubTotal' => floatval(($prescription['Quantity'] ?? $prescription['quantity'] ?? 1) * ($prescription['Price'] ?? $prescription['unitPrice'] ?? 0)),
                    ];
                }
            } else {
                // 🔥 XỬ LÝ THANH TOÁN (SIMPLE): prescriptions có cấu trúc [{MedicineName, Price, Quantity, Usage}]
                $result[] = [
                    'MedicineName' => $prescription['MedicineName'] ?? 'Thuốc',
                    'Price' => floatval($prescription['Price'] ?? 0),
                    'Quantity' => intval($prescription['Quantity'] ?? 1),
                    'Usage' => $prescription['Usage'] ?? 'Theo chỉ định',
                    'SubTotal' => floatval(($prescription['Quantity'] ?? 1) * ($prescription['Price'] ?? 0)),
                ];
            }
        }

        Log::info('💊 Processed prescription data:', [
            'source_type' => $sourceType,
            'input_structure' => $prescriptions[0] ?? 'empty',
            'output_count' => count($result),
            'output_sample' => $result[0] ?? 'empty'
        ]);

        return $result;
    }
    /**
     * 🔥 XỬ LÝ SERVICE DATA
     */
    private function processServiceData($services)
    {
        return collect($services)->map(function ($service, $index) {
            $quantity = intval($service['Quantity'] ?? 1);
            $price = floatval($service['Price'] ?? 0);

            return [
                'ServiceName' => $service['ServiceName'] ?? 'Dịch vụ',
                'Price' => $price,
                'Quantity' => $quantity,
                'SubTotal' => $quantity * $price,
                'Index' => $index + 1
            ];
        })->toArray();
    }

    /**
     * 🔥 XỬ LÝ PAYMENT DATA
     */
    private function processPaymentData($data)
    {
        $services = $this->processServiceData($data['services'] ?? []);
        $prescriptions = $this->processPrescriptionData($data['prescriptions'] ?? [], 'simple');

        // Tính toán tổng tiền
        $servicesTotal = collect($services)->sum('SubTotal');
        $prescriptionsTotal = collect($prescriptions)->sum('SubTotal');
        $totalAmount = $servicesTotal + $prescriptionsTotal;

        $discount = floatval($data['discount'] ?? 0);
        $tax = floatval($data['tax'] ?? 0);

        $discountAmount = $totalAmount * ($discount / 100);
        $taxAmount = $totalAmount * ($tax / 100);
        $finalAmount = $totalAmount - $discountAmount + $taxAmount;

        Log::info('💰 Payment calculations:', [
            'services_total' => $servicesTotal,
            'prescriptions_total' => $prescriptionsTotal,
            'total_amount' => $totalAmount,
            'discount' => $discount,
            'tax' => $tax,
            'discount_amount' => $discountAmount,
            'tax_amount' => $taxAmount,
            'final_amount' => $finalAmount
        ]);

        return [
            'services' => $services,
            'prescriptions' => $prescriptions,
            'payment_method' => $data['payment_method'] ?? 'cash',
            'payment_status' => $data['payment_status'] ?? 'paid',
            'discount' => $discount,
            'tax' => $tax,
            'invoice_code' => $data['invoice_code'] ?? 'INV_' . date('YmdHis'),
            'services_total' => $servicesTotal,
            'prescriptions_total' => $prescriptionsTotal,
            'total_amount' => $totalAmount,
            'discount_amount' => $discountAmount,
            'tax_amount' => $taxAmount,
            'final_amount' => $finalAmount,
            'appointmentDate' => $data['appointment_date'] ?? now()->format('d/m/Y H:i'),
            'payment_date' => $data['date'] ?? now()->format('d/m/Y H:i'),
            'paid' => $data['paid_at'] ?? now()->format('d/m/Y'),
        ];
    }

    /**
     * 🔥 XỬ LÝ TEST RESULT DATA
     */
    private function processTestResultData($testResults)
    {
        return collect($testResults)->map(function ($test, $index) {
            return [
                'test_name' => $test['test_name'] ?? 'Xét nghiệm',
                'result' => $test['result'] ?? 'Chưa có kết quả',
                'unit' => $test['unit'] ?? '',
                'reference_range' => $test['reference_range'] ?? '',
                'method' => $test['method'] ?? 'OTSH.B-01(1)',
                'is_normal' => $test['is_normal'] ?? true,
            ];
        })->toArray();
    }

    /**
     * 🔥 PREVIEW HTML VỚI REAL-TIME SETTINGS
     */
    public function previewHTML(Request $request)
    {
        Log::info('=== PDF Preview HTML with REAL-TIME SETTINGS ===');

        try {
            $data = $request->all();

            // Xử lý tương tự previewPrescription nhưng trả về HTML
            $pdfSettings = $data['pdf_settings'] ?? [];

            // Xác định template
            $templateConfig = [
                'prescription' => ['template' => 'pdf.invoice_pdf'],
                'service' => ['template' => 'pdf.service_pdf'],
                'payment' => ['template' => 'pdf.payment_invoice_pdf'],
                'test_result' => ['template' => 'pdf.result_pdf'],
            ];

            $config = $templateConfig[$data['type'] ?? 'prescription'];

            // Xử lý font
            $fontFamily = $pdfSettings['fontFamily'] ?? 'Times New Roman';
            $safeFontFamily = $this->getSafeFontFamily($fontFamily);
            $safeFontCSS = $this->getSafeFontCSS($fontFamily);

            // Xử lý logo & watermark
            $logoData = $this->processLogo($pdfSettings['logo'] ?? []);
            $watermarkData = $this->processWatermark($pdfSettings['watermark'] ?? []);

            // Chuẩn bị data
            $pdfData = [
                'title' => $pdfSettings['customTitle'] ?? 'DOCUMENT',
                'type' => $data['type'] ?? 'prescription',
                'clinic_name' => $pdfSettings['clinicName'] ?? 'Phòng Khám',
                'clinic_address' => $pdfSettings['clinicAddress'] ?? '',
                'clinic_phone' => $pdfSettings['clinicPhone'] ?? '',
                'doctor_name' => $pdfSettings['doctorName'] ?? 'Bác sĩ',
                'patient_name' => $data['patient_name'] ?? 'Bệnh nhân',
                'age' => $data['age'] ?? 'N/A',
                'gender' => $data['gender'] ?? 'N/A',
                'phone' => $data['phone'] ?? 'N/A',

                // 🔥 REAL-TIME SETTINGS
                'pdf_settings' => $pdfSettings,
                'logo_data' => $logoData,
                'watermark_data' => $watermarkData,
                'safe_font_family' => $safeFontFamily,
                'safe_font_css' => $safeFontCSS,

                'is_preview' => true,
            ];

            // Render HTML
            $html = view($config['template'], $pdfData)->render();

            Log::info('✅ HTML preview generated with REAL-TIME settings');

            return response()->json([
                'success' => true,
                'html' => $html,
                'settings_applied' => $pdfSettings
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Lỗi xem trước HTML với real-time settings: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Không thể tạo xem trước: ' . $e->getMessage()
            ], 500);
        }
    }

    // Hàm tạo mã ngắn
    function generateShortCode($type = 'TT', $length = 5)
    {
        $characters = '0123456789';
        $randomString = '';
        for ($i = 0; $i < $length; $i++) {
            $randomString .= $characters[rand(0, strlen($characters) - 1)];
        }
        return $type . $randomString;
    }





    public function export($type, $appointment_id)
    {
        $appointment = Appointment::with([
            'patient.user',
            'prescriptions.prescription_details.medicine',
            'service_orders',
            'diagnoses',
            'medical_staff',
        ])->findOrFail($appointment_id);

        $patient = $appointment->patient?->user;
        $doctor = $appointment->medical_staff?->FullName ?? 'Bác sĩ chưa rõ';

        $data = [
            'title' => match ($type) {
                'prescription' => 'TOA THUỐC',
                'service' => 'PHIẾU DỊCH VỤ',
                default => 'HÓA ĐƠN KHÁM BỆNH',
            },
            'clinic_name' => 'Phòng Khám Đa Khoa VitaCare',
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

        $pdf = Pdf::loadView('pdf.invoice_pdf', $data)
            ->setPaper('a4', 'portrait');

        return $pdf->download("{$data['title']}.pdf");
    }


    /**
     * Lưu ảnh (dùng chung cho cả logo và watermark)
     */
    public function saveImage(Request $request)
    {
        try {
            $request->validate([
                'image' => 'required|string',
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

                // LƯU VÀO PUBLIC/TEMP_LOGO (hiện tại)
                $tempLogoPath = public_path("temp_logo/{$filename}");

                // Đảm bảo thư mục tồn tại
                if (!is_dir(public_path('temp_logo'))) {
                    mkdir(public_path('temp_logo'), 0755, true);
                }

                // Lưu file
                file_put_contents($tempLogoPath, $imageData);

                // Tạo URL
                $publicUrl = "/temp_logo/{$filename}";
                $fullUrl = url($publicUrl);

                Log::info("{$type} saved successfully", [
                    'clinic_id' => $clinicId,
                    'filename' => $filename,
                    'url' => $fullUrl,
                    'path' => $tempLogoPath
                ]);

                return response()->json([
                    'success' => true,
                    'message' => ucfirst($type) . ' đã được lưu thành công',
                    'url' => $fullUrl,
                    'filename' => $filename
                ]);

            } else {
                throw new \Exception('Định dạng ảnh không hợp lệ');
            }

        } catch (\Exception $e) {
            Log::error("Lỗi lưu {$request->type}: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Không thể lưu ' . $request->type . ': ' . $e->getMessage()
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
            Log::error("Lỗi lấy {$type}: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => "Không thể lấy {$type}"
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
            Log::error('Lỗi xóa logo: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa logo'
            ], 500);
        }
    }
}