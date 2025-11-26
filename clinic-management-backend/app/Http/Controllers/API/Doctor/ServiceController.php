<?php

namespace App\Http\Controllers\API\Doctor;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\ServiceOrder;
use App\Models\Appointment;
use App\Models\Service;
use App\Models\MedicalStaff;
use App\Models\StaffSchedule;
use App\Models\Notification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class ServiceController extends Controller
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
     * Lấy danh sách các dịch vụ chỉ định
     */
    public function index()
    {
        $services = DB::table('Services')
            ->select('ServiceId', 'ServiceName', 'ServiceType', 'Price', 'Description')
            ->get();

        return response()->json($services);
    }

    /**
     * Bác sĩ chỉ định dịch vụ - PHIÊN BẢN CẢI TIẾN VỚI KTV CÓ LỊCH HÔM NAY
     */
    public function assignServices(Request $request, $appointmentId)
    {
        DB::beginTransaction();

        try {
            $request->validate([
                'selectedServices' => 'required|array|min:1',
                'selectedServices.*' => 'integer|exists:Services,ServiceId',
                'diagnosis' => 'nullable|string|max:1000',
                'symptoms' => 'nullable|string|max:1000',
                'notes' => 'nullable|string|max:500'
            ]);

            // ✅ Lấy thông tin bác sĩ thực tế từ Auth
            $doctor = $this->getAuthenticatedDoctor();
            $doctorId = $doctor->StaffId;

            // ✅ KIỂM TRA CUỘC HẸN TỒN TẠI VÀ THUỘC VỀ BÁC SĨ NÀY
            $appointment = Appointment::with(['patient.user', 'medical_staff.user'])
                ->where('AppointmentId', $appointmentId)
                ->where('StaffId', $doctorId)
                ->first();

            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy cuộc hẹn hoặc bạn không có quyền chỉ định dịch vụ cho cuộc hẹn này'
                ], 404);
            }

            // ✅ TÌM KTV RẢNH NHẤT VÀ CÓ LỊCH LÀM HÔM NAY
            $availableTechnician = $this->findAvailableTechnicianWithSchedule();

            if (!$availableTechnician) {
                DB::rollback();
                return response()->json([
                    'success' => false,
                    'message' => 'Hiện không có kỹ thuật viên nào có lịch làm việc hôm nay. Vui lòng thử lại sau.'
                ], 400);
            }

            $assignedServices = [];
            $serviceNames = [];

            foreach ($request->selectedServices as $serviceId) {
                $service = Service::find($serviceId);

                if (!$service) {
                    continue;
                }

                // ✅ KIỂM TRA DỊCH VỤ ĐÃ CHỈ ĐỊNH CHƯA
                $existingOrder = ServiceOrder::where('AppointmentId', $appointmentId)
                    ->where('ServiceId', $serviceId)
                    ->whereIn('Status', ['Đã chỉ định', 'Đang chờ', 'Đang thực hiện'])
                    ->first();

                if ($existingOrder) {
                    continue;
                }

                // ✅ TẠO SERVICE ORDER
                $serviceOrder = ServiceOrder::create([
                    'AppointmentId' => $appointmentId,
                    'ServiceId' => $serviceId,
                    'PrescribingDoctorId' => $doctorId,
                    'AssignedStaffId' => $availableTechnician->StaffId,
                    'OrderDate' => now(),
                    'Status' => 'Đã chỉ định',
                    'DoctorNotes' => $request->notes,
                    'Diagnosis' => $request->diagnosis,
                    'Symptoms' => $request->symptoms
                ]);

                $assignedServices[] = [
                    'service_order_id' => $serviceOrder->ServiceOrderId,
                    'service_id' => $serviceId,
                    'service_name' => $service->ServiceName,
                    'service_type' => $service->ServiceType,
                    'price' => $service->Price,
                    'status' => 'Đã chỉ định',
                    'prescribing_doctor' => [
                        'staff_id' => $doctorId,
                        'staff_name' => $doctor->user->FullName ?? 'N/A',
                        'specialty' => $doctor->Specialty ?? 'N/A'
                    ],
                    'performing_technician' => [
                        'staff_id' => $availableTechnician->StaffId,
                        'staff_name' => $availableTechnician->user->FullName ?? 'N/A',
                        'specialty' => $availableTechnician->Specialty ?? 'N/A',
                        'schedule_info' => $availableTechnician->today_schedule_info ?? null
                    ]
                ];

                $serviceNames[] = $service->ServiceName;
            }

            if (count($assignedServices) === 0) {
                DB::rollback();
                return response()->json([
                    'success' => false,
                    'message' => 'Tất cả dịch vụ đã được chỉ định trước đó'
                ], 400);
            }

            // ✅ CẬP NHẬT TRẠNG THÁI CUỘC HẸN
            $appointment->update([
                'Status' => 'Đã khám',
                'Diagnosis' => $request->diagnosis,
                'Symptoms' => $request->symptoms
            ]);

            DB::commit();

            // ✅ LOG HOẠT ĐỘNG
            Log::info("Bác sĩ chỉ định dịch vụ - Phân công KTV có lịch hôm nay", [
                'doctor_id' => $doctorId,
                'doctor_name' => $doctor->user->FullName ?? 'N/A',
                'technician_id' => $availableTechnician->StaffId,
                'technician_name' => $availableTechnician->user->FullName ?? 'N/A',
                'technician_schedule' => $availableTechnician->today_schedule_info ?? 'No schedule',
                'appointment_id' => $appointmentId,
                'patient_id' => $appointment->PatientId,
                'services_count' => count($assignedServices)
            ]);

            return response()->json([
                'success' => true,
                'message' => '✅ Đã chỉ định ' . count($assignedServices) . ' dịch vụ thành công!',
                'data' => [
                    'appointment_id' => $appointmentId,
                    'patient_id' => $appointment->PatientId,
                    'patient_name' => $appointment->patient->user->FullName ?? 'N/A',
                    'services_count' => count($assignedServices),
                    'services' => $serviceNames,
                    'prescribing_doctor' => [
                        'staff_id' => $doctorId,
                        'staff_name' => $doctor->user->FullName ?? 'N/A',
                        'specialty' => $doctor->Specialty ?? 'N/A'
                    ],
                    'performing_technician' => [
                        'staff_id' => $availableTechnician->StaffId,
                        'staff_name' => $availableTechnician->user->FullName ?? 'N/A',
                        'specialty' => $availableTechnician->Specialty ?? 'N/A',
                        'pending_orders' => $availableTechnician->pending_orders_count ?? 0,
                        'today_schedule' => $availableTechnician->today_schedule_info ?? 'Không có lịch',
                        'current_work_status' => $this->getCurrentWorkStatus($availableTechnician->today_schedule ?? null)
                    ],
                    'assigned_services' => $assignedServices,
                    'order_date' => now()->format('d/m/Y H:i'),
                    'diagnosis' => $request->diagnosis,
                    'symptoms' => $request->symptoms
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error assigning services - Doctor: ' . ($doctorId ?? 'unknown') . ' - Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi hệ thống khi chỉ định dịch vụ: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * 🎯 Tìm KTV rảnh nhất VÀ CÓ LỊCH LÀM VIỆC HÔM NAY - PHIÊN BẢN MỚI
     */
    private function findAvailableTechnicianWithSchedule()
    {
        try {
            Log::info('Finding available technician WITH SCHEDULE TODAY...');

            $today = Carbon::today()->toDateString();
            $now = Carbon::now()->format('H:i:s');

            // ✅ TÌM KTV CÓ LỊCH LÀM VIỆC HÔM NAY VÀ ĐANG TRONG GIỜ LÀM VIỆC
            $technicians = MedicalStaff::where('StaffType', 'Kĩ thuật viên')
                ->whereHas('user', function ($query) {
                    $query->where('IsActive', true);
                })
                ->whereHas('staff_schedules', function ($query) use ($today, $now) {
                    $query->whereDate('WorkDate', $today)
                        ->where('IsAvailable', true)
                        ->where('StartTime', '<=', $now)
                        ->where('EndTime', '>=', $now);
                })
                ->with([
                    'user' => function ($query) {
                        $query->select('UserId', 'FullName');
                    },
                    'staff_schedules' => function ($query) use ($today) {
                        $query->whereDate('WorkDate', $today)
                            ->where('IsAvailable', true)
                            ->with('room');
                    }
                ])
                ->withCount([
                    'service_orders as pending_orders_count' => function ($q) {
                        $q->whereIn('Status', ['Đã chỉ định', 'Đang chờ', 'Đang thực hiện']);
                    }
                ])
                ->get()
                ->map(function ($tech) {
                    // ✅ Lấy thông tin lịch làm việc hôm nay
                    $todaySchedule = $tech->staff_schedules->first();
                    $tech->today_schedule = $todaySchedule;
                    $tech->today_schedule_info = $todaySchedule ?
                        $todaySchedule->StartTime . ' - ' . $todaySchedule->EndTime .
                        ' tại ' . ($todaySchedule->room->RoomName ?? 'Chưa xác định') :
                        'Không có lịch';

                    return $tech;
                });

            Log::info('Technicians with schedule today found:', $technicians->map(function ($tech) {
                return [
                    'staff_id' => $tech->StaffId,
                    'staff_name' => $tech->user->FullName ?? 'N/A',
                    'pending_orders' => $tech->pending_orders_count,
                    'today_schedule' => $tech->today_schedule_info
                ];
            })->toArray());

            if ($technicians->isEmpty()) {
                Log::warning('No technicians found with schedule today and currently working');

                // ✅ FALLBACK: Tìm KTV có lịch hôm nay (bất kỳ giờ nào)
                return $this->findTechnicianWithAnyScheduleToday();
            }

            // ✅ SẮP XẾP THEO: Số đơn ít nhất -> KTV có sẵn
            $leastBusy = $technicians->sortBy('pending_orders_count')->first();

            Log::info('✅ SELECTED Technician with schedule today:', [
                'technician_id' => $leastBusy->StaffId,
                'technician_name' => $leastBusy->user->FullName ?? 'N/A',
                'pending_orders' => $leastBusy->pending_orders_count,
                'today_schedule' => $leastBusy->today_schedule_info
            ]);

            return $leastBusy;

        } catch (\Exception $e) {
            Log::error('Error finding technician with schedule: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * 🔄 FALLBACK: Tìm KTV có lịch bất kỳ trong ngày hôm nay
     */
    private function findTechnicianWithAnyScheduleToday()
    {
        try {
            Log::info('FALLBACK: Finding technician with ANY schedule today...');

            $today = Carbon::today()->toDateString();

            $technicians = MedicalStaff::where('StaffType', 'Kĩ thuật vien')
                ->whereHas('user', function ($query) {
                    $query->where('IsActive', true);
                })
                ->whereHas('staff_schedules', function ($query) use ($today) {
                    $query->whereDate('WorkDate', $today)
                        ->where('IsAvailable', true);
                })
                ->with([
                    'user' => function ($query) {
                        $query->select('UserId', 'FullName');
                    },
                    'staff_schedules' => function ($query) use ($today) {
                        $query->whereDate('WorkDate', $today)
                            ->where('IsAvailable', true)
                            ->with('room');
                    }
                ])
                ->withCount([
                    'service_orders as pending_orders_count' => function ($q) {
                        $q->whereIn('Status', ['Đã chỉ định', 'Đang chờ', 'Đang thực hiện']);
                    }
                ])
                ->get()
                ->map(function ($tech) {
                    $todaySchedule = $tech->staff_schedules->sortBy('StartTime')->first();
                    $tech->today_schedule = $todaySchedule;
                    $tech->today_schedule_info = $todaySchedule ?
                        $todaySchedule->StartTime . ' - ' . $todaySchedule->EndTime .
                        ' tại ' . ($todaySchedule->room->RoomName ?? 'Chưa xác định') :
                        'Không có lịch';

                    return $tech;
                });

            if ($technicians->isEmpty()) {
                Log::warning('No technicians found with any schedule today');
                return null;
            }

            $leastBusy = $technicians->sortBy('pending_orders_count')->first();

            Log::info('✅ SELECTED Technician with any schedule today:', [
                'technician_id' => $leastBusy->StaffId,
                'technician_name' => $leastBusy->user->FullName ?? 'N/A',
                'pending_orders' => $leastBusy->pending_orders_count,
                'today_schedule' => $leastBusy->today_schedule_info
            ]);

            return $leastBusy;

        } catch (\Exception $e) {
            Log::error('Error in fallback technician search: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * ⏰ Xác định trạng thái làm việc hiện tại của KTV
     */
    private function getCurrentWorkStatus($schedule)
    {
        if (!$schedule) {
            return 'Không có lịch';
        }

        $now = Carbon::now()->format('H:i:s');
        $start = $schedule->StartTime;
        $end = $schedule->EndTime;

        if ($now < $start) {
            return 'Sắp làm việc (bắt đầu lúc ' . substr($start, 0, 5) . ')';
        } elseif ($now >= $start && $now <= $end) {
            return 'Đang làm việc';
        } else {
            return 'Đã kết thúc ca làm';
        }
    }

    /**
     * 📊 Lấy danh sách KTV có lịch hôm nay (cho debug/test)
     */
    public function getAvailableTechniciansToday()
    {
        try {
            $techniciansWithSchedule = $this->findAvailableTechnicianWithSchedule();
            $techniciansAnySchedule = $this->findTechnicianWithAnyScheduleToday();

            return response()->json([
                'success' => true,
                'data' => [
                    'technicians_currently_working' => $techniciansWithSchedule ? [
                        'staff_id' => $techniciansWithSchedule->StaffId,
                        'name' => $techniciansWithSchedule->user->FullName ?? 'N/A',
                        'pending_orders' => $techniciansWithSchedule->pending_orders_count,
                        'schedule' => $techniciansWithSchedule->today_schedule_info
                    ] : null,
                    'technicians_any_schedule' => $techniciansAnySchedule ? [
                        'staff_id' => $techniciansAnySchedule->StaffId,
                        'name' => $techniciansAnySchedule->user->FullName ?? 'N/A',
                        'pending_orders' => $techniciansAnySchedule->pending_orders_count,
                        'schedule' => $techniciansAnySchedule->today_schedule_info
                    ] : null
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy danh sách KTV: ' . $e->getMessage()
            ], 500);
        }
    }
}