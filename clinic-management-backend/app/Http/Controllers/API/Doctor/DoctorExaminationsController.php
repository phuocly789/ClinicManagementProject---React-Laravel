<?php

namespace App\Http\Controllers\API\Doctor;

use App\Events\QueueStatusUpdated;
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

class DoctorExaminationsController extends Controller
{
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

            return response()->json([
                'success' => true,
                'message' => 'Đã bắt đầu khám',
                'data' => [
                    'queue_id' => $queueId,
                    'appointment_id' => $queue->AppointmentId,
                ]
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
     * Hoàn thành khám - DÙNG QUEUE ID
     */
    public function complete(Request $request, $queueId)
    {
        $request->validate([
            'symptoms' => 'nullable|string',
            'diagnosis' => 'nullable|string',
            'services' => 'array',
            'prescriptions' => 'array',
            'instructions' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

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

            if ($request['status'] === 'done') {

                // ✅ Cập nhật Status trong Queue
                DB::table('Queues')
                    ->where('AppointmentId', $queue->AppointmentId)
                    ->update(['Status' => 'Đã khám']);

                // ✅ SỬA: Lấy đúng queue vừa update (không dùng whereNull)
                $queueData = DB::table('Queues')
                    ->join('Rooms', 'Queues.RoomId', '=', 'Rooms.RoomId')
                    ->join('Patients', 'Queues.PatientId', '=', 'Patients.PatientId')
                    ->join('Users as PatientUser', 'Patients.PatientId', '=', 'PatientUser.UserId')
                    ->leftJoin('StaffSchedules', function ($join) {
                        $join->on('Queues.RoomId', '=', 'StaffSchedules.RoomId')
                            ->whereDate('StaffSchedules.WorkDate', now()->toDateString());
                    })
                    ->leftJoin('MedicalStaff', 'StaffSchedules.StaffId', '=', 'MedicalStaff.StaffId')
                    ->leftJoin('Users as DoctorUser', 'MedicalStaff.StaffId', '=', 'DoctorUser.UserId')
                    ->where('Queues.AppointmentId', $queue->AppointmentId)
                    ->select(
                        'Queues.QueueId',
                        'Queues.PatientId',
                        'PatientUser.FullName as PatientName',
                        'Queues.AppointmentId',
                        'Queues.RecordId',
                        'Queues.QueueDate',
                        'Queues.QueueTime',
                        'Queues.QueuePosition',
                        'Queues.RoomId',
                        'Rooms.RoomName',
                        'Queues.Status',
                        'Queues.TicketNumber',
                        'DoctorUser.FullName as DoctorName'
                    )
                    ->first();

                // ✅ Broadcast nếu có data
                if ($queueData) {
                    // Log::info('Broadcasting completed examination', [
                    //     'queueData' => $queueData,
                    //     'appointmentId' => $appointmentId
                    // ]);

                    broadcast(new QueueStatusUpdated(
                        doctor: null,
                        receptionist: (array) $queueData,
                        roomId: $queueData->RoomId,
                        action: 'completed'
                    ))->toOthers();
                }
            }


            $appointment = $queue->appointment;
            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'error' => 'Không tìm thấy thông tin lịch hẹn'
                ], 404);
            }

            $staffId = 4; // Hoặc lấy từ auth

            // Lấy thông tin bác sĩ
            $staff = MedicalStaff::find($staffId);
            if (!$staff) {
                return response()->json([
                    'success' => false,
                    'error' => 'Không tìm thấy thông tin bác sĩ'
                ], 400);
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
                    'CreatedBy' => $staffId,
                ]);
                $recordId = $medicalRecord->RecordId;
                $appointment->update(['RecordId' => $recordId]);
            }

            // 3. Tạo invoice (quan trọng - phải tạo trước)
            $invoice = $this->createInvoice($appointment, $staffId, $request);

            // 4. Tạo diagnosis nếu có thông tin
            if ($request->symptoms || $request->diagnosis) {
                Diagnosis::updateOrCreate(
                    ['AppointmentId' => $appointment->AppointmentId],
                    [
                        'StaffId' => $staffId,
                        'RecordId' => $recordId,
                        'Symptoms' => $request->symptoms,
                        'Diagnosis' => $request->diagnosis,
                        'DiagnosisDate' => now(),
                    ]
                );
            }

            // 5. Tạo service orders với invoiceId
            if ($request->services && is_array($request->services)) {
                foreach ($request->services as $serviceId => $isSelected) {
                    if ($serviceId == 0 || !is_numeric($serviceId) || !$isSelected) {
                        continue;
                    }

                    $service = Service::find($serviceId);
                    if (!$service) {
                        continue;
                    }

                    ServiceOrder::create([
                        'AppointmentId' => $appointment->AppointmentId,
                        'ServiceId' => $serviceId,
                        'AssignedStaffId' => $staffId,
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
                    'StaffId' => $staffId,
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

            return response()->json([
                'success' => true,
                'message' => 'Hoàn tất khám thành công và đã tạo hóa đơn',
                'data' => [
                    'queue_id' => $queueId,
                    'appointment_id' => $appointment->AppointmentId,
                    'invoice_id' => $invoice->InvoiceId,
                    'has_invoice' => true
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'error' => 'Lỗi lưu dữ liệu: ' . $e->getMessage()
            ], 500);
        }
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
            return response()->json([
                'success' => false,
                'error' => 'Lỗi lấy danh sách bệnh nhân: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Tạo invoice cho cuộc hẹn
     */
    private function createInvoice($appointment, $staffId, $request)
    {
        // Tính tổng tiền
        $totalAmount = 0;
        $invoiceDetails = [];

        // Tính tiền dịch vụ
        if ($request->services && is_array($request->services)) {
            foreach ($request->services as $serviceId => $isSelected) {
                if ($serviceId == 0 || !is_numeric($serviceId) || !$isSelected) {
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
                    ];
                }
            }
        }

        // Nếu không có dịch vụ hay thuốc, vẫn tạo invoice với phí khám cơ bản
        if ($totalAmount === 0) {
            $totalAmount = 100000;
            // Thêm phí khám cơ bản vào invoice details
            $invoiceDetails[] = [
                'ServiceId' => null,
                'MedicineId' => null,
                'Quantity' => 1,
                'UnitPrice' => $totalAmount,
                'Description' => 'Phí khám bệnh',
            ];
        }

        // Tạo invoice
        $invoice = Invoice::create([
            'AppointmentId' => $appointment->AppointmentId,
            'PatientId' => $appointment->PatientId,
            'TotalAmount' => $totalAmount,
            'InvoiceDate' => now('Asia/Ho_Chi_Minh'),
            'Status' => 'Chờ thanh toán',
        ]);

        // Tạo invoice details
        foreach ($invoiceDetails as $detail) {
            InvoiceDetail::create(array_merge($detail, ['InvoiceId' => $invoice->InvoiceId]));
        }

        return $invoice;
    }

    /**
     * Hủy khám
     */
    public function cancel(Request $request, $queueId)
    {
        try {
            DB::beginTransaction();

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

            return response()->json([
                'success' => true,
                'message' => 'Đã hủy khám thành công'
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