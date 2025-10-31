<?php

namespace App\Http\Controllers\API\Doctor;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\ServiceOrder;
use App\Models\Appointment;
use App\Models\Service;
use App\Models\Notification;
use Illuminate\Support\Facades\Log;


class ServiceController extends Controller
{
    private $staffId = 4; // ✅ BÁC SĨ CỐ ĐỊNH

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
     * Bác sĩ (ID = 4) chỉ định dịch vụ - BẢO MẬT
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

            // ✅ KIỂM TRA CUỘC HẸN TỒN TẠI
            $appointment = Appointment::with(['patient.user', 'medical_staff.user'])->find($appointmentId);

            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy cuộc hẹn'
                ], 404);
            }

            // ✅ TÌM KTV RẢNH NHẤT (ÍT ĐƠN NHẤT)
            $availableTechnician = $this->findAvailableTechnician();

            if (!$availableTechnician) {
                DB::rollback();
                return response()->json([
                    'success' => false,
                    'message' => 'Hiện không có kỹ thuật viên nào khả dụng. Vui lòng thử lại sau.'
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

                // ✅ TẠO SERVICE ORDER - TỰ ĐỘNG GÁN KTV RẢNH NHẤT
                $serviceOrder = ServiceOrder::create([
                    'AppointmentId' => $appointmentId,
                    'ServiceId' => $serviceId,
                    'AssignedStaffId' => $availableTechnician->StaffId, // ✅ GÁN KTV THAY VÌ BÁC SĨ
                    'OrderDate' => now(),
                    'Status' => 'Đã chỉ định',
                    'Notes' => $request->notes
                ]);

                $assignedServices[] = [
                    'service_order_id' => $serviceOrder->ServiceOrderId,
                    'service_id' => $serviceId,
                    'service_name' => $service->ServiceName,
                    'service_type' => $service->ServiceType,
                    'price' => $service->Price,
                    'status' => 'Đã chỉ định',
                    'assigned_technician' => [
                        'staff_id' => $availableTechnician->StaffId,
                        'staff_name' => $availableTechnician->user->FullName ?? 'N/A',
                        'specialty' => $availableTechnician->Specialty ?? 'N/A'
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

            // ✅ TẠO THÔNG BÁO CHO KTV (TÙY CHỌN - COMMENT NẾU KHÔNG CẦN)
            // $this->notifyTechnician($availableTechnician->StaffId, $appointmentId, count($assignedServices));

            DB::commit();

            // ✅ LOG HOẠT ĐỘNG
            Log::info("Bác sĩ chỉ định dịch vụ - Tự động gán KTV", [
                'doctor_id' => $this->staffId,
                'technician_id' => $availableTechnician->StaffId,
                'technician_name' => $availableTechnician->user->FullName ?? 'N/A',
                'appointment_id' => $appointmentId,
                'patient_id' => $appointment->PatientId,
                'services_count' => count($assignedServices)
            ]);

            return response()->json([
                'success' => true,
                'message' => '✅ Đã chỉ định ' . count($assignedServices) . ' dịch vụ thành công! Đã giao cho KTV ' . ($availableTechnician->user->FullName ?? 'N/A'),
                'data' => [
                    'appointment_id' => $appointmentId,
                    'patient_id' => $appointment->PatientId,
                    'patient_name' => $appointment->patient->user->FullName ?? 'N/A',
                    'services_count' => count($assignedServices),
                    'services' => $serviceNames,
                    'assigned_technician' => [
                        'staff_id' => $availableTechnician->StaffId,
                        'staff_name' => $availableTechnician->user->FullName ?? 'N/A',
                        'specialty' => $availableTechnician->Specialty ?? 'N/A',
                        'pending_orders' => $availableTechnician->pending_orders_count ?? 0
                    ],
                    'assigned_services' => $assignedServices,
                    'order_date' => now()->format('d/m/Y H:i')
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error assigning services - Staff: ' . $this->staffId . ' - Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi hệ thống khi chỉ định dịch vụ: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Tìm KTV rảnh nhất - cố định
     */

    /**
     * Tìm KTV rảnh nhất - VERSION CHÍNH XÁC
     */
    private function findAvailableTechnician()
    {
        try {
            Log::info('Finding available technician...');

            // ✅ TÌM HOÀNG VĂN ĐỨC (StaffId = 5) - ĐẢM BẢO TÌM THẤY
            $technician = \App\Models\MedicalStaff::with([
                'user' => function ($query) {
                    $query->select('UserId', 'FullName');
                }
            ])
                ->withCount([
                    'service_orders as pending_orders_count' => function ($q) {
                        $q->whereIn('Status', ['Đã chỉ định', 'Đang chờ', 'Đang thực hiện']);
                    }
                ])
                ->find(5); // Hoàng Văn Đức

            if ($technician) {
                Log::info('✅ FOUND Technician Hoàng Văn Đức:', [
                    'technician_id' => $technician->StaffId,
                    'technician_name' => $technician->user->FullName ?? 'N/A',
                    'staff_type' => $technician->StaffType,
                    'pending_orders' => $technician->pending_orders_count
                ]);
                return $technician;
            }

            // ✅ FALLBACK: TÌM CÁC KTV KHÁC NẾU HOÀNG VĂN ĐỨC KHÔNG TỒN TẠI
            Log::info('Hoàng Văn Đức not found, searching for other technicians...');

            $otherTechnicians = \App\Models\MedicalStaff::whereHas('user', function ($query) {
                $query->where('IsActive', true)
                    ->whereHas('roles', function ($q) {
                        $q->where('RoleId', 5); // Role Kĩ thuật viên
                    });
            })
                ->with([
                    'user' => function ($query) {
                        $query->select('UserId', 'FullName');
                    }
                ])
                ->withCount([
                    'service_orders as pending_orders_count' => function ($q) {
                        $q->whereIn('Status', ['Đã chỉ định', 'Đang chờ', 'Đang thực hiện']);
                    }
                ])
                ->get();

            if ($otherTechnicians->isEmpty()) {
                Log::warning('No other technicians found');
                return null;
            }

            $leastBusy = $otherTechnicians->sortBy('pending_orders_count')->first();
            Log::info('✅ FOUND Alternative Technician:', [
                'technician_id' => $leastBusy->StaffId,
                'technician_name' => $leastBusy->user->FullName ?? 'N/A',
                'staff_type' => $leastBusy->StaffType,
                'pending_orders' => $leastBusy->pending_orders_count
            ]);

            return $leastBusy;

        } catch (\Exception $e) {
            Log::error('Error finding technician: ' . $e->getMessage());
            return null;
        }
    }
    /**
     * Tìm KTV rảnh nhất 
     */
    private function findAvailableTechnicianv1()
    {
        try {
            Log::info('Finding available technician with correct StaffType...');

            // ✅ TÌM KTV VỚI STAFFTYPE CHÍNH XÁC
            $technicians = \App\Models\MedicalStaff::where('StaffType', 'Kĩ thuật viên')
                ->whereHas('user', function ($query) {
                    $query->where('IsActive', true);
                })
                ->with([
                    'user' => function ($query) {
                        $query->select('UserId', 'FullName');
                    }
                ])
                ->withCount([
                    'service_orders as pending_orders_count' => function ($q) {
                        $q->whereIn('Status', ['Đã chỉ định', 'Đang chờ', 'Đang thực hiện']);
                    }
                ])
                ->get();

            Log::info('Technicians found:', $technicians->map(function ($tech) {
                return [
                    'staff_id' => $tech->StaffId,
                    'staff_type' => $tech->StaffType,
                    'user_name' => $tech->user->FullName ?? 'N/A',
                    'pending_orders' => $tech->pending_orders_count
                ];
            })->toArray());

            if ($technicians->isEmpty()) {
                Log::warning('No technicians found with StaffType = "Kĩ thuật viên"');
                return null;
            }

            $leastBusy = $technicians->sortBy('pending_orders_count')->first();

            Log::info('✅ SELECTED Technician:', [
                'technician_id' => $leastBusy->StaffId,
                'technician_name' => $leastBusy->user->FullName ?? 'N/A',
                'staff_type' => $leastBusy->StaffType,
                'pending_orders' => $leastBusy->pending_orders_count
            ]);

            return $leastBusy;

        } catch (\Exception $e) {
            Log::error('Error finding technician: ' . $e->getMessage());
            return null;
        }
    }

}