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
            'age' => 'nullable', // SỬA: bỏ 'string' để nhận cả number và string
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
        ], [
            'type.required' => 'Loại PDF là bắt buộc.',
            'patient_name.required' => 'Tên bệnh nhân là bắt buộc.',
            'prescriptions.required_if' => 'Đơn thuốc là bắt buộc cho toa thuốc.',
            'services.required_if' => 'Danh sách dịch vụ là bắt buộc cho phiếu dịch vụ.',
        ]);

        // Xác định title và template dựa trên type
        $typeConfig = [
            'prescription' => [
                'title' => 'TOA THUỐC',
                'template' => 'pdf.invoice_pdf',
                'filename' => 'TOA_THUOC.pdf'
            ],
            'service' => [
                'title' => 'PHIẾU CHỈ ĐỊNH DỊCH VỤ',
                'template' => 'pdf.service_pdf',
                'filename' => 'PHIEU_DICH_VU.pdf'
            ]
        ];

        $config = $typeConfig[$data['type']];

        // Chuẩn bị dữ liệu chung
        $pdfData = [
            'title' => $config['title'],
            'clinic_name' => 'PHÒNG KHÁM ĐA KHOA ABC',
            'clinic_address' => 'Số 53 Võ Văn Ngân, TP. Thủ Đức',
            'clinic_phone' => '0123 456 789',
            'medical_record_code' => strtoupper(substr($data['type'], 0, 3)) . '-' . Str::random(6),
            'doctor_name' => $data['doctor_name'] ?? 'Bác sĩ chưa rõ',
            'patient_name' => $data['patient_name'],
            'age' => (string) ($data['age'] ?? 'N/A'), // ÉP KIỂU VỀ STRING
            'gender' => $data['gender'] ?? 'N/A',
            'phone' => $data['phone'] ?? 'N/A',
            'appointment_date' => $data['appointment_date'],
            'appointment_time' => $data['appointment_time'],
            'diagnoses' => $data['diagnoses'] ?? [],
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

}
