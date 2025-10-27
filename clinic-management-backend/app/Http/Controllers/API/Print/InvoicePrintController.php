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
            'patient_name' => 'required|string',
            'age' => 'nullable|string',
            'gender' => 'nullable|string',
            'phone' => 'nullable|string',
            'appointment_date' => 'required|string',
            'appointment_time' => 'required|string',
            'doctor_name' => 'nullable|string',
            'prescriptions' => 'required|array',
            'prescriptions.*.details' => 'required|array',
            'prescriptions.*.details.*.medicine' => 'required|string',
            'prescriptions.*.details.*.quantity' => 'required|integer|min:1',
            'prescriptions.*.details.*.dosage' => 'required|string',
            'prescriptions.*.details.*.unitPrice' => 'required|numeric|min:0',
            'diagnoses' => 'nullable|array',
            'diagnoses.*.Symptoms' => 'nullable|string',
            'diagnoses.*.Diagnosis' => 'nullable|string',
            'services' => 'nullable|array',
        ], [
            'patient_name.required' => 'Tên bệnh nhân là bắt buộc.',
            'prescriptions.required' => 'Đơn thuốc là bắt buộc.',
            'prescriptions.*.details.required' => 'Chi tiết đơn thuốc là bắt buộc.',
        ]);

        $pdfData = [
            'title' => 'TOA THUỐC',
            'clinic_name' => 'PHÒNG KHÁM ĐA KHOA ABC',
            'clinic_address' => 'Số 53 Võ Văn Ngân, TP. Thủ Đức', // Giá trị mặc định
            'clinic_phone' => '0123 456 789', // Giá trị mặc định
            'medical_record_code' => 'AUTO-' . Str::random(8), // Mã ngẫu nhiên
            'doctor_name' => $data['doctor_name'] ?? 'Bác sĩ chưa rõ',
            'patient_name' => $data['patient_name'],
            'age' => $data['age'] ?? 'N/A',
            'gender' => $data['gender'] ?? 'N/A',
            'phone' => $data['phone'] ?? 'N/A',
            'appointment_date' => $data['appointment_date'],
            'appointment_time' => $data['appointment_time'],
            'prescriptions' => collect($data['prescriptions'])->map(function ($prescription) {
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
            })->toArray(),
            'diagnoses' => $data['diagnoses'] ?? [],
            'services' => $data['services'] ?? [],
        ];

        try {
            $pdf = Pdf::loadView('pdf.invoice_pdf', $pdfData)
                ->setPaper('a4', 'portrait');

            return $pdf->download('TOA_THUOC_PREVIEW.pdf');
        } catch (\Exception $e) {
            Log::error('Error generating PDF: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tạo PDF: ' . $e->getMessage(),
            ], 500);
        }
    }

}
