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
            // ✅ FIX: ĐỔI 'services' THÀNH 'selectedServices'
            $request->validate([
                'selectedServices' => 'required|array|min:1', // ✅ ĐÃ SỬA
                'selectedServices.*' => 'integer|exists:Services,ServiceId', // ✅ ĐÃ SỬA
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

            $assignedServices = [];
            $serviceNames = [];

            // ✅ FIX: ĐỔI $request->services THÀNH $request->selectedServices
            foreach ($request->selectedServices as $serviceId) { // ✅ ĐÃ SỬA
                $service = Service::find($serviceId);

                if (!$service) {
                    continue; // ✅ BỎ QUA NẾU KHÔNG TÌM THẤY
                }

                // ✅ KIỂM TRA DỊCH VỤ ĐÃ CHỈ ĐỊNH CHƯA
                $existingOrder = ServiceOrder::where('AppointmentId', $appointmentId)
                    ->where('ServiceId', $serviceId)
                    ->whereIn('Status', ['Đã chỉ định', 'Đang chờ'])
                    ->first();

                if ($existingOrder) {
                    continue; // ✅ BỎ QUA NẾU ĐÃ CHỈ ĐỊNH
                }

                // ✅ TẠO SERVICE ORDER
                $serviceOrder = ServiceOrder::create([
                    'AppointmentId' => $appointmentId,
                    'ServiceId' => $serviceId,
                    'AssignedStaffId' => $this->staffId,
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
                    'status' => 'Đang chờ'
                ];

                $serviceNames[] = $service->ServiceName;
            }

            if (count($assignedServices) === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tất cả dịch vụ đã được chỉ định trước đó'
                ], 400);
            }


            DB::commit();

            // ✅ LOG HOẠT ĐỘNG
            Log::info("Bác sĩ chỉ định dịch vụ", [
                'staff_id' => $this->staffId,
                'appointment_id' => $appointmentId,
                'patient_id' => $appointment->PatientId,
                'services_count' => count($assignedServices)
            ]);

            return response()->json([
                'success' => true,
                'message' => '✅ Đã chỉ định ' . count($assignedServices) . ' dịch vụ thành công. Kỹ thuật viên đã nhận được thông báo!',
                'data' => [
                    'appointment_id' => $appointmentId,
                    'patient_id' => $appointment->PatientId,
                    'patient_name' => $appointment->patient->user->FullName ?? 'N/A',
                    'services_count' => count($assignedServices),
                    'services' => $serviceNames,
                    'assigned_services' => $assignedServices,
                    'order_date' => now()->format('d/m/Y H:i')
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            // ✅ LOG LỖI
            Log::error('Error assigning services - Staff: ' . $this->staffId . ' - Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi hệ thống khi chỉ định dịch vụ: ' . $e->getMessage()
            ], 500);
        }
    }


}