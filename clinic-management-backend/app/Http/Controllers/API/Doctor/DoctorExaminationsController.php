<?php

namespace App\Http\Controllers\API\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Queue;
use App\Models\Diagnosis;
use App\Models\ServiceOrder;
use App\Models\Prescription;
use App\Models\PrescriptionDetail;
use App\Models\Medicine;
use App\Models\Service;
use App\Models\MedicalRecord;
use App\Models\Invoice;
use App\Models\InvoiceDetail;
use App\Models\MedicalStaff;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class DoctorExaminationsController extends Controller
{
    /**
     * Lấy thông tin bác sĩ đang đăng nhập
     */
    private function getAuthenticatedDoctor()
    {
        try {
            $staffId = Auth::id();

            $doctor = MedicalStaff::with(['user'])
                ->where('StaffId', $staffId)
                ->first();

            if (!$doctor) {
                throw new \Exception('Không tìm thấy thông tin bác sĩ. Vui lòng kiểm tra tài khoản.');
            }

            return $doctor;
        } catch (\Exception $e) {
            Log::error('Error getting authenticated doctor: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Kiểm tra xem có bệnh nhân đang khám không
     */
    private function getCurrentExaminingPatient()
    {
        return Queue::where('Status', 'Đang khám')
            ->whereDate('QueueDate', today())
            ->first();
    }

    /**
     * Bắt đầu khám - DÙNG QUEUE ID
     */
    public function start($queueId)
    {
        try {
            DB::beginTransaction();

            // ✅ Lấy thông tin bác sĩ từ Auth
            $doctor = $this->getAuthenticatedDoctor();
            $doctorId = $doctor->StaffId;

            Log::info('🩺 Bắt đầu khám bệnh nhân', [
                'doctor_id' => $doctorId,
                'doctor_name' => $doctor->user->FullName ?? 'N/A',
                'queue_id' => $queueId
            ]);

            // Kiểm tra xem có bệnh nhân đang khám không
            $currentExamining = $this->getCurrentExaminingPatient();
            if ($currentExamining && $currentExamining->QueueId != $queueId) {
                $patientName = $currentExamining->patient->user->FullName ?? 'Bệnh nhân';
                return response()->json([
                    'success' => false,
                    'error' => "Đang khám $patientName. Vui lòng hoàn thành khám hiện tại trước khi bắt đầu khám bệnh nhân mới."
                ], 400);
            }

            $queue = Queue::with('appointment')->findOrFail($queueId);

            if ($queue->Status === 'Đang khám') {
                return response()->json([
                    'success' => false,
                    'error' => 'Đang khám bệnh nhân này rồi'
                ], 400);
            }

            if ($queue->Status === 'Đã khám') {
                return response()->json([
                    'success' => false,
                    'error' => 'Bệnh nhân này đã được khám xong'
                ], 400);
            }

            // Cập nhật queue
            $queue->update(['Status' => 'Đang khám']);

            // Cập nhật appointment
            if ($queue->appointment) {
                $queue->appointment->update(['Status' => 'Đang khám']);
            }

            DB::commit();

            Log::info('✅ Bắt đầu khám thành công', [
                'queue_id' => $queueId,
                'appointment_id' => $queue->AppointmentId,
                'doctor_id' => $doctorId
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Đã bắt đầu khám',
                'data' => [
                    'queue_id' => $queueId,
                    'appointment_id' => $queue->AppointmentId,
                    'doctor_info' => [
                        'staff_id' => $doctorId,
                        'doctor_name' => $doctor->user->FullName ?? 'N/A'
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('❌ Lỗi bắt đầu khám: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Lỗi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Hoàn thành khám - DÙNG QUEUE ID
     */
    public function complete(Request $request, $queueId)
    {
        try {
            // ✅ FIX: Chuyển đổi services sang integer trước khi validate
            if ($request->has('services') && is_array($request->services)) {
                $fixedServices = [];
                foreach ($request->services as $service) {
                    $fixedServices[] = (int)$service;
                }
                $request->merge(['services' => $fixedServices]);
            }

            // ✅ RÀNG BUỘC DỮ LIỆU ĐẦU VÀO
            $validator = Validator::make($request->all(), [
                'symptoms' => 'nullable|string|max:2000',
                'diagnosis' => 'nullable|string|max:2000',
                'instructions' => 'nullable|string|max:1000',
                'services' => 'nullable|array',
                'services.*' => 'integer|exists:Services,ServiceId',
                'prescriptions' => 'nullable|array',
                'prescriptions.*.medicineId' => 'nullable|integer|exists:Medicines,MedicineId',
                'prescriptions.*.medicine' => 'required_without:prescriptions.*.medicineId|string|max:255',
                'prescriptions.*.quantity' => 'required|integer|min:1|max:1000',
                'prescriptions.*.dosage' => 'required|string|max:500',
                'prescriptions.*.unitPrice' => 'required|numeric|min:0|max:100000000',
                'prescriptions.*.totalPrice' => 'required|numeric|min:0|max:100000000',
            ], [
                'symptoms.string' => 'Triệu chứng phải là chuỗi ký tự',
                'symptoms.max' => 'Triệu chứng không được vượt quá 2000 ký tự',
                'diagnosis.string' => 'Chẩn đoán phải là chuỗi ký tự',
                'diagnosis.max' => 'Chẩn đoán không được vượt quá 2000 ký tự',
                'instructions.string' => 'Hướng dẫn phải là chuỗi ký tự',
                'instructions.max' => 'Hướng dẫn không được vượt quá 1000 ký tự',
                'services.array' => 'Dịch vụ phải là mảng',
                'services.*.integer' => 'Mã dịch vụ phải là số nguyên',
                'services.*.exists' => 'Dịch vụ không tồn tại',
                'prescriptions.array' => 'Đơn thuốc phải là mảng',
                'prescriptions.*.medicineId.integer' => 'Mã thuốc phải là số nguyên',
                'prescriptions.*.medicineId.exists' => 'Thuốc không tồn tại',
                'prescriptions.*.medicine.required_without' => 'Tên thuốc là bắt buộc khi không có mã thuốc',
                'prescriptions.*.medicine.string' => 'Tên thuốc phải là chuỗi ký tự',
                'prescriptions.*.medicine.max' => 'Tên thuốc không được vượt quá 255 ký tự',
                'prescriptions.*.quantity.required' => 'Số lượng thuốc là bắt buộc',
                'prescriptions.*.quantity.integer' => 'Số lượng thuốc phải là số nguyên',
                'prescriptions.*.quantity.min' => 'Số lượng thuốc phải lớn hơn 0',
                'prescriptions.*.quantity.max' => 'Số lượng thuốc quá lớn',
                'prescriptions.*.dosage.required' => 'Hướng dẫn sử dụng là bắt buộc',
                'prescriptions.*.dosage.string' => 'Hướng dẫn sử dụng phải là chuỗi ký tự',
                'prescriptions.*.dosage.max' => 'Hướng dẫn sử dụng không được vượt quá 500 ký tự',
                'prescriptions.*.unitPrice.required' => 'Đơn giá thuốc là bắt buộc',
                'prescriptions.*.unitPrice.numeric' => 'Đơn giá thuốc phải là số',
                'prescriptions.*.unitPrice.min' => 'Đơn giá thuốc không được âm',
                'prescriptions.*.unitPrice.max' => 'Đơn giá thuốc quá lớn',
                'prescriptions.*.totalPrice.required' => 'Tổng giá thuốc là bắt buộc',
                'prescriptions.*.totalPrice.numeric' => 'Tổng giá thuốc phải là số',
                'prescriptions.*.totalPrice.min' => 'Tổng giá thuốc không được âm',
                'prescriptions.*.totalPrice.max' => 'Tổng giá thuốc quá lớn',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // ✅ Lấy thông tin bác sĩ từ Auth
            $doctor = $this->getAuthenticatedDoctor();
            $doctorId = $doctor->StaffId;

            Log::info('🩺 Hoàn thành khám bệnh nhân', [
                'doctor_id' => $doctorId,
                'doctor_name' => $doctor->user->FullName ?? 'N/A',
                'queue_id' => $queueId
            ]);

            // Tìm queue và các relationship cần thiết
            $queue = Queue::with([
                'appointment.patient.user',
                'appointment.service_orders.service'
            ])->findOrFail($queueId);

            // Kiểm tra xem queue này có đang ở trạng thái khám không
            if ($queue->Status !== 'Đang khám') {
                return response()->json([
                    'success' => false,
                    'error' => 'Chỉ có thể hoàn thành khám cho bệnh nhân đang trong trạng thái khám'
                ], 400);
            }

            $appointment = $queue->appointment;
            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'error' => 'Không tìm thấy thông tin lịch hẹn'
                ], 404);
            }

            // 1. Cập nhật trạng thái queue và appointment
            $queue->update(['Status' => 'Đã khám']);
            $appointment->update(['Status' => 'Đã khám']);

            // 2. Tạo hoặc cập nhật medical record
            $recordId = $appointment->RecordId;
            if (!$recordId) {
                $medicalRecord = MedicalRecord::create([
                    'PatientId' => $appointment->PatientId,
                    'RecordNumber' => 'REC-' . time(),
                    'IssuedDate' => now(),
                    'Status' => 'Active',
                    'CreatedBy' => $doctorId,
                ]);
                $recordId = $medicalRecord->RecordId;
                $appointment->update(['RecordId' => $recordId]);
            }

            // 3. Tạo invoice (quan trọng - phải tạo trước)
            $invoice = $this->createInvoice($appointment, $doctorId, $request);

            // 4. Tạo diagnosis nếu có thông tin
            if ($request->symptoms || $request->diagnosis) {
                Diagnosis::updateOrCreate(
                    ['AppointmentId' => $appointment->AppointmentId],
                    [
                        'StaffId' => $doctorId,
                        'RecordId' => $recordId,
                        'Symptoms' => $request->symptoms,
                        'Diagnosis' => $request->diagnosis,
                        'DiagnosisDate' => now(),
                    ]
                );
            }

            // 5. Tạo service orders với invoiceId
            if ($request->services && is_array($request->services)) {
                foreach ($request->services as $serviceId) {
                    $serviceId = (int)$serviceId; // ✅ Đảm bảo là integer
                    
                    if (!$serviceId || $serviceId == 0) {
                        continue;
                    }

                    $service = Service::find($serviceId);
                    if (!$service) {
                        continue;
                    }

                    ServiceOrder::create([
                        'AppointmentId' => $appointment->AppointmentId,
                        'ServiceId' => $serviceId,
                        'AssignedStaffId' => $doctorId,
                        'PrescribingDoctorId' => $doctorId,
                        'OrderDate' => now(),
                        'Status' => 'Đã chỉ định',
                        'InvoiceId' => $invoice->InvoiceId,
                    ]);
                }
            }

            // 6. Tạo prescription nếu có
            if ($request->prescriptions && count($request->prescriptions) > 0) {
                $patientName = 'Bệnh nhân';
                if ($appointment->patient && $appointment->patient->user) {
                    $patientName = $appointment->patient->user->FullName;
                }

                $instructions = $request->instructions ?? "Đơn thuốc cho bệnh nhân {$patientName}";

                $prescription = Prescription::create([
                    'AppointmentId' => $appointment->AppointmentId,
                    'StaffId' => $doctorId,
                    'RecordId' => $recordId,
                    'Instructions' => $instructions,
                    'PrescriptionDate' => now(),
                ]);

                foreach ($request->prescriptions as $med) {
                    $medicineId = $med['medicineId'] ?? null;
                    if (!$medicineId) {
                        $medicine = Medicine::where('MedicineName', $med['medicine'])->first();
                        if (!$medicine) {
                            throw new \Exception("Không tìm thấy thuốc: " . $med['medicine']);
                        }
                        $medicineId = $medicine->MedicineId;
                    }

                    PrescriptionDetail::create([
                        'PrescriptionId' => $prescription->PrescriptionId,
                        'MedicineId' => $medicineId,
                        'Quantity' => $med['quantity'],
                        'DosageInstruction' => $med['dosage'],
                        'UnitPrice' => $med['unitPrice'] ?? 0,
                        'TotalPrice' => $med['totalPrice'] ?? 0,
                    ]);
                }
            }

            DB::commit();

            Log::info('✅ Hoàn thành khám thành công', [
                'queue_id' => $queueId,
                'appointment_id' => $appointment->AppointmentId,
                'invoice_id' => $invoice->InvoiceId,
                'doctor_id' => $doctorId
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Hoàn tất khám thành công và đã tạo hóa đơn',
                'data' => [
                    'queue_id' => $queueId,
                    'appointment_id' => $appointment->AppointmentId,
                    'invoice_id' => $invoice->InvoiceId,
                    'has_invoice' => true,
                    'doctor_info' => [
                        'staff_id' => $doctorId,
                        'doctor_name' => $doctor->user->FullName ?? 'N/A'
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('❌ Lỗi hoàn thành khám: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Lỗi lưu dữ liệu: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Tạo invoice cho cuộc hẹn - ĐÃ SỬA LỖI CHECK CONSTRAINT
     */
    private function createInvoice($appointment, $doctorId, $request)
    {
        // Tính tổng tiền
        $totalAmount = 0;
        $invoiceDetails = [];

        // Tính tiền dịch vụ
        if ($request->services && is_array($request->services)) {
            foreach ($request->services as $serviceId) {
                $serviceId = (int)$serviceId; // ✅ Đảm bảo là integer
                
                if (!$serviceId || $serviceId == 0) {
                    continue;
                }

                $service = Service::find($serviceId);
                if ($service && $service->Price) {
                    $subTotal = $service->Price;
                    $totalAmount += $subTotal;

                    $invoiceDetails[] = [
                        'ServiceId' => $serviceId,
                        'MedicineId' => null,
                        'Quantity' => 1,
                        'UnitPrice' => $service->Price,
                        'Description' => $service->ServiceName ?? 'Dịch vụ khám bệnh',
                    ];
                }
            }
        }

        // Tính tiền thuốc
        if ($request->prescriptions && count($request->prescriptions) > 0) {
            foreach ($request->prescriptions as $med) {
                $medicineId = $med['medicineId'] ?? null;
                $medicineName = $med['medicine'] ?? '';

                if (!$medicineId && $medicineName) {
                    $medicine = Medicine::where('MedicineName', $medicineName)->first();
                    if ($medicine) {
                        $medicineId = $medicine->MedicineId;
                    }
                }

                if ($medicineId) {
                    $quantity = $med['quantity'] ?? 1;
                    $unitPrice = $med['unitPrice'] ?? 0;
                    $totalPrice = $med['totalPrice'] ?? ($quantity * $unitPrice);

                    $totalAmount += $totalPrice;

                    $invoiceDetails[] = [
                        'ServiceId' => null,
                        'MedicineId' => $medicineId,
                        'Quantity' => $quantity,
                        'UnitPrice' => $unitPrice,
                        'Description' => $medicineName ?: 'Thuốc kê đơn',
                    ];
                }
            }
        }

        // ✅ FIX LỖI CHECK CONSTRAINT: Nếu không có dịch vụ hay thuốc, tìm dịch vụ khám bệnh mặc định
        if ($totalAmount === 0) {
            $totalAmount = 100000;

            // Tìm dịch vụ khám bệnh mặc định
            $defaultService = Service::where('ServiceName', 'like', '%khám%bệnh%')
                ->orWhere('ServiceName', 'like', '%Khám%bệnh%')
                ->orWhere('ServiceName', 'like', '%phí%khám%')
                ->first();

            if ($defaultService) {
                $invoiceDetails[] = [
                    'ServiceId' => $defaultService->ServiceId,
                    'MedicineId' => null,
                    'Quantity' => 1,
                    'UnitPrice' => $totalAmount,
                    'Description' => $defaultService->ServiceName,
                ];
                
                Log::info('✅ Sử dụng dịch vụ khám mặc định:', [
                    'service_id' => $defaultService->ServiceId,
                    'service_name' => $defaultService->ServiceName
                ]);
            } else {
                // Nếu không tìm thấy dịch vụ khám, lấy dịch vụ đầu tiên
                $fallbackService = Service::first();
                if ($fallbackService) {
                    $invoiceDetails[] = [
                        'ServiceId' => $fallbackService->ServiceId,
                        'MedicineId' => null,
                        'Quantity' => 1,
                        'UnitPrice' => $totalAmount,
                        'Description' => 'Phí khám bệnh',
                    ];
                    
                    Log::info('✅ Sử dụng dịch vụ fallback:', [
                        'service_id' => $fallbackService->ServiceId,
                        'service_name' => $fallbackService->ServiceName
                    ]);
                } else {
                    throw new \Exception('Không tìm thấy dịch vụ nào trong hệ thống. Vui lòng liên hệ quản trị viên.');
                }
            }
        }

        // Tạo invoice
        $invoice = Invoice::create([
            'AppointmentId' => $appointment->AppointmentId,
            'PatientId' => $appointment->PatientId,
            'TotalAmount' => $totalAmount,
            'InvoiceDate' => now('Asia/Ho_Chi_Minh'),
            'Status' => 'Chờ thanh toán',
            'CreatedBy' => $doctorId,
        ]);

        Log::info('💰 Đã tạo invoice:', [
            'invoice_id' => $invoice->InvoiceId,
            'total_amount' => $totalAmount,
            'details_count' => count($invoiceDetails)
        ]);

        // ✅ FIX QUAN TRỌNG: Kiểm tra invoice details trước khi tạo
        $createdDetails = 0;
        foreach ($invoiceDetails as $detail) {
            // ✅ ĐẢM BẢO KHÔNG VI PHẠM CHECK CONSTRAINT: ServiceId HOẶC MedicineId phải có giá trị
            if (empty($detail['ServiceId']) && empty($detail['MedicineId'])) {
                Log::error('❌ Invoice detail không hợp lệ: cả ServiceId và MedicineId đều null', $detail);
                continue;
            }

            InvoiceDetail::create(array_merge($detail, ['InvoiceId' => $invoice->InvoiceId]));
            $createdDetails++;
            
            Log::info('✅ Đã tạo invoice detail:', [
                'service_id' => $detail['ServiceId'],
                'medicine_id' => $detail['MedicineId'],
                'quantity' => $detail['Quantity'],
                'unit_price' => $detail['UnitPrice']
            ]);
        }

        // ✅ KIỂM TRA XEM CÓ INVOICE DETAIL NÀO ĐƯỢC TẠO KHÔNG
        if ($createdDetails === 0) {
            Log::warning('⚠️ Không có invoice detail nào được tạo, xóa invoice trống', [
                'invoice_id' => $invoice->InvoiceId
            ]);
            $invoice->delete();
            throw new \Exception('Không thể tạo hóa đơn do thiếu thông tin dịch vụ hoặc thuốc.');
        }

        return $invoice;
    }

    /**
     * Kiểm tra trạng thái khám hiện tại
     */
    public function checkExaminingStatus()
    {
        try {
            $currentExamining = $this->getCurrentExaminingPatient();

            if ($currentExamining) {
                $patientInfo = [
                    'queue_id' => $currentExamining->QueueId,
                    'patient_name' => $currentExamining->patient->user->FullName ?? 'Bệnh nhân',
                    'started_at' => $currentExamining->updated_at->format('H:i:s'),
                    'queue_position' => $currentExamining->QueuePosition,
                    'ticket_number' => $currentExamining->TicketNumber,
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'is_examining' => !empty($currentExamining),
                    'current_patient' => $currentExamining ? $patientInfo : null,
                    'can_start_new' => empty($currentExamining),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Lỗi kiểm tra trạng thái khám: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Lỗi kiểm tra trạng thái: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Lấy danh sách bệnh nhân có thể khám tiếp theo
     */
    public function getNextAvailablePatients()
    {
        try {
            $currentExamining = $this->getCurrentExaminingPatient();

            // Lấy danh sách bệnh nhân đang chờ, sắp xếp theo thứ tự ưu tiên
            $waitingPatients = Queue::with('patient.user')
                ->where('Status', 'Đang chờ')
                ->whereDate('QueueDate', today())
                ->orderBy('QueuePosition')
                ->orderBy('QueueTime')
                ->get()
                ->map(function ($queue) {
                    return [
                        'queue_id' => $queue->QueueId,
                        'patient_name' => $queue->patient->user->FullName ?? 'N/A',
                        'queue_position' => $queue->QueuePosition,
                        'ticket_number' => $queue->TicketNumber,
                        'queue_time' => $queue->QueueTime,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'current_examining' => $currentExamining ? [
                        'queue_id' => $currentExamining->QueueId,
                        'patient_name' => $currentExamining->patient->user->FullName ?? 'Bệnh nhân',
                    ] : null,
                    'waiting_patients' => $waitingPatients,
                    'can_start_new' => empty($currentExamining),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Lỗi lấy danh sách bệnh nhân: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Lỗi lấy danh sách bệnh nhân: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Hủy khám
     */
    public function cancel(Request $request, $queueId)
    {
        try {
            // ✅ RÀNG BUỘC DỮ LIỆU ĐẦU VÀO
            $validator = Validator::make($request->all(), [
                'reason' => 'required|string|max:1000'
            ], [
                'reason.required' => 'Lý do hủy khám là bắt buộc',
                'reason.string' => 'Lý do hủy khám phải là chuỗi ký tự',
                'reason.max' => 'Lý do hủy khám không được vượt quá 1000 ký tự'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // ✅ Lấy thông tin bác sĩ từ Auth
            $doctor = $this->getAuthenticatedDoctor();
            $doctorId = $doctor->StaffId;

            $queue = Queue::with('appointment')->findOrFail($queueId);
            $reason = $request->input('reason', 'Lý do không xác định');

            $queue->update([
                'Status' => 'Hủy',
                'CancelledReason' => $reason,
            ]);

            if ($queue->appointment) {
                $queue->appointment->update([
                    'Status' => 'Hủy',
                    'CancelledReason' => $reason,
                ]);
            }

            DB::commit();

            Log::info('✅ Hủy khám thành công', [
                'queue_id' => $queueId,
                'reason' => $reason,
                'doctor_id' => $doctorId
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Đã hủy khám thành công'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('❌ Lỗi hủy khám: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Lỗi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Lấy thông tin khám chi tiết - DÙNG QUEUE ID
     */
    public function show($queueId)
    {
        try {
            $queue = Queue::with([
                'appointment.diagnoses',
                'appointment.service_orders.service',
                'appointment.prescriptions.prescription_details.medicine',
                'patient.user',
            ])->findOrFail($queueId);

            $appointment = $queue->appointment;

            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'error' => 'Không tìm thấy thông tin lịch hẹn'
                ], 404);
            }

            $data = [
                'queue_id' => $queueId,
                'appointment_id' => $appointment->AppointmentId,
                'queue_status' => $queue->Status,
                'appointment_status' => $appointment->Status,
                'patient_info' => [
                    'name' => $queue->patient->user->FullName ?? 'N/A',
                    'gender' => $queue->patient->user->Gender ?? 'N/A',
                    'age' => $queue->patient->user->DateOfBirth ?
                        \Carbon\Carbon::parse($queue->patient->user->DateOfBirth)->age : 'N/A',
                    'phone' => $queue->patient->user->Phone ?? 'N/A',
                    'address' => $queue->patient->user->Address ?? 'N/A',
                ],
                'medical_info' => [
                    'symptoms' => $appointment->diagnoses->first()->Symptoms ?? '',
                    'diagnosis' => $appointment->diagnoses->first()->Diagnosis ?? '',
                ],
                'services' => $appointment->service_orders->map(function ($serviceOrder) {
                    return [
                        'service_id' => $serviceOrder->ServiceId,
                        'service_name' => $serviceOrder->service->ServiceName ?? 'N/A',
                        'price' => $serviceOrder->service->Price ?? 0,
                    ];
                }),
                'prescriptions' => $appointment->prescriptions->flatMap(function ($pres) {
                    return $pres->prescription_details->map(function ($detail) {
                        return [
                            'medicine' => $detail->medicine->MedicineName,
                            'quantity' => $detail->Quantity,
                            'dosage' => $detail->DosageInstruction,
                            'unitPrice' => $detail->UnitPrice ?? 0,
                            'totalPrice' => $detail->TotalPrice ?? 0,
                        ];
                    });
                })->toArray(),
            ];

            return response()->json([
                'success' => true,
                'data' => $data
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Lỗi khi lấy thông tin khám: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cập nhật thông tin chẩn đoán
     */
    public function updateDiagnosis(Request $request, $queueId)
    {
        try {
            DB::beginTransaction();

            $queue = Queue::with('appointment')->findOrFail($queueId);
            $appointment = $queue->appointment;

            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'error' => 'Không tìm thấy lịch hẹn'
                ], 404);
            }

            $diagnosis = Diagnosis::where('AppointmentId', $appointment->AppointmentId)->first();

            if ($diagnosis) {
                $diagnosis->update([
                    'Symptoms' => $request->input('symptoms', $diagnosis->Symptoms),
                    'Diagnosis' => $request->input('diagnosis', $diagnosis->Diagnosis),
                    'Notes' => $request->input('notes', $diagnosis->Notes),
                ]);
            } else {
                Diagnosis::create([
                    'AppointmentId' => $appointment->AppointmentId,
                    'Symptoms' => $request->symptoms,
                    'Diagnosis' => $request->diagnosis,
                    'DiagnosisDate' => now(),
                    'Notes' => $request->notes,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật thông tin chẩn đoán'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'error' => 'Lỗi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Tạm lưu thông tin khám
     */
    public function tempSave(Request $request, $queueId)
    {
        try {
            $queue = Queue::with('appointment')->findOrFail($queueId);

            // Lưu tạm thông tin chẩn đoán mà không thay đổi trạng thái
            if ($queue->appointment && ($request->filled('symptoms') || $request->filled('diagnosis'))) {
                $this->updateDiagnosis($request, $queueId);
            }

            return response()->json([
                'success' => true,
                'message' => 'Đã lưu tạm thông tin khám'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Lỗi: ' . $e->getMessage()
            ], 500);
        }
    }
}