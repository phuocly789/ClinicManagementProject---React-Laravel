<?php

namespace App\Http\Controllers\API\Print;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Http\Request; // Import đúng class Request từ Illuminate
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;


class InvoicePrintController extends Controller
{
    public function export($type, $appointment_id)
    {
        // ✅ Lấy dữ liệu chính xác với quan hệ có thật trong model
        $appointment = Appointment::with([
            'patient.user',
            'prescriptions.prescription_details.medicine', // thêm .medicine vào đây
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
        ];

        // ✅ Render view PDF (tạo file resources/views/pdf/prescription.blade.php)
        $pdf = Pdf::loadView('pdf.invoice_pdf', $data)
            ->setPaper('a4', 'portrait');

        return $pdf->download("{$data['title']}.pdf");
    }

    // Phương thức mới để xuất PDF từ dữ liệu FE
    public function previewPrescription(Request $request)
    {
        Log::info('Received previewPrescription data:', $request->all());

        $data = $request->validate([
            'type' => 'required|string|in:prescription,service',
            'patient_name' => 'required|string',
            'age' => 'nullable',
            'gender' => 'nullable|string',
            'phone' => 'nullable|string',
            'appointment_date' => 'required|string',
            'appointment_time' => 'required|string',
            'doctor_name' => 'nullable|string',
            'prescriptions' => 'required_if:type,prescription|array',
            'prescriptions.*.details' => 'required_if:type,prescription|array',
            'prescriptions.*.details.*.medicine' => 'required_if:type,prescription|string',
            'prescriptions.*.details.*.quantity' => 'required_if:type,prescription|integer|min:1',
            'prescriptions.*.details.*.dosage' => 'required_if:type,prescription|string',
            'prescriptions.*.details.*.unitPrice' => 'required_if:type,prescription|numeric|min:0',
            'services' => 'required_if:type,service|array',
            'services.*.ServiceName' => 'required_if:type,service|string',
            'services.*.Price' => 'required_if:type,service|numeric|min:0',
            'services.*.Quantity' => 'nullable|integer|min:1',
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
        ], [
            'type.required' => 'Loại PDF là bắt buộc.',
            'patient_name.required' => 'Tên bệnh nhân là bắt buộc.',
            'prescriptions.required_if' => 'Đơn thuốc là bắt buộc cho toa thuốc.',
            'services.required_if' => 'Danh sách dịch vụ là bắt buộc cho phiếu dịch vụ.',
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
            ]
        ];

        $config = $typeConfig[$data['type']];

        // Chuẩn bị dữ liệu chung
        $pdfData = [
            'title' => $config['title'],
            'clinic_name' => $data['pdf_settings']['clinicName'] ?? 'PHÒNG KHÁM ĐA KHOA ABC',
            'clinic_address' => $data['pdf_settings']['clinicAddress'] ?? 'Số 53 Võ Văn Ngân, TP. Thủ Đức',
            'clinic_phone' => $data['pdf_settings']['clinicPhone'] ?? '0123 456 789',
            'medical_record_code' => strtoupper(substr($data['type'], 0, 3)) . '-' . Str::random(6),
            'doctor_name' => $data['pdf_settings']['doctorName'] ?? $data['doctor_name'] ?? 'Bác sĩ chưa rõ',
            'patient_name' => $data['patient_name'],
            'age' => (string) ($data['age'] ?? 'N/A'),
            'gender' => $data['gender'] ?? 'N/A',
            'phone' => $data['phone'] ?? 'N/A',
            'appointment_date' => $data['appointment_date'],
            'appointment_time' => $data['appointment_time'],
            'diagnoses' => $data['diagnoses'] ?? [],

            // THÊM PDF SETTINGS VÀO DATA
            'pdf_settings' => $data['pdf_settings'] ?? [],
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
        }

        try {
            $pdf = Pdf::loadView($config['template'], $pdfData)
                ->setPaper('a4', 'portrait');

            return $pdf->download($config['filename']);
        } catch (\Exception $e) {
            Log::error('Error generating PDF: ' . $e->getMessage());
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
                    'template' => 'pdf.payment_pdf',
                    'title' => 'PHIẾU THANH TOÁN',
                    'code_prefix' => 'PAY'
                ]
            ];

            $config = $templateConfig[$data['type']];
            Log::info('Template config:', $config);

            // Chuẩn bị dữ liệu cho template
            $pdfData = [
                'title' => $config['title'],
                'clinic_name' => $data['pdf_settings']['clinicName'] ?? 'PHÒNG KHÁM ĐA KHOA ABC',
                'clinic_address' => $data['pdf_settings']['clinicAddress'] ?? 'Số 53 Võ Văn Ngân, TP. Thủ Đức',
                'clinic_phone' => $data['pdf_settings']['clinicPhone'] ?? '0123 456 789',
                'medical_record_code' => $config['code_prefix'] . '-' . Str::random(6),
                'doctor_name' => $data['pdf_settings']['doctorName'] ?? $data['doctor_name'] ?? 'Bác sĩ chưa rõ',
                'patient_name' => $data['patient_name'],
                'age' => (string) ($data['age'] ?? 'N/A'),
                'gender' => $data['gender'] ?? 'N/A',
                'phone' => $data['phone'] ?? 'N/A',
                'appointment_date' => $data['appointment_date'],
                'appointment_time' => $data['appointment_time'],
                'is_preview' => true,

                // THÊM PDF SETTINGS VÀO DATA
                'pdf_settings' => $data['pdf_settings'] ?? [],
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
}
