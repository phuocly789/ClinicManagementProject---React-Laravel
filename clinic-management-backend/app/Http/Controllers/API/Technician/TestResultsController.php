<?php

namespace App\Http\Controllers\API\Technician;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ServiceOrder;
use Illuminate\Support\Facades\Log;
use App\Helpers\PaginationHelper;

class TestResultsController extends Controller
{
    private $technicianId = 5; // ✅ ID KỸ THUẬT VIÊN

    /**
     * Lấy danh sách dịch vụ được chỉ định với phân trang
     */
    public function getAssignedServices(Request $request)
    {
        try {
            // Query lấy dịch vụ - ĐÃ SỬA QUAN HỆ
            $services = ServiceOrder::with([
                'appointment.patient.user',    // ✅
                'service',                     // ✅
                'medical_staff.user',          // ✅ SỬA: 'doctor.user' -> 'medical_staff.user'
                'appointment.medical_staff.user' // ✅ THÊM: để lấy thông tin bác sĩ chỉ định
            ])
                ->where('AssignedStaffId', $this->technicianId)
                ->whereIn('Status', ['Đã chỉ định', 'Đang chờ', 'Đang thực hiện'])
                ->orderBy('OrderDate', 'desc')
                ->paginate(10);

            // Format data
            $formattedServices = $services->map(function ($order) {
                return $this->formatServiceData($order);
            });

            // ✅ SỬA: Kiểm tra nếu không có dữ liệu
            if ($formattedServices->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => 'Không có dịch vụ nào được chỉ định',
                    'pagination' => [
                        'current_page' => 1,
                        'last_page' => 1,
                        'per_page' => 10,
                        'total' => 0,
                        'from' => null,
                        'to' => null,
                        'has_more_pages' => false
                    ]
                ]);
            }

            return response()->json(
                PaginationHelper::createPaginatedResponse(
                    $formattedServices,
                    $services,
                    'Lấy danh sách dịch vụ thành công'
                )
            );

        } catch (\Exception $e) {
            Log::error('Error getting assigned services: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy danh sách dịch vụ: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Hàm format dữ liệu dịch vụ 
     */
    private function formatServiceData($order)
    {
        return [
            'service_order_id' => $order->ServiceOrderId,
            'appointment_id' => $order->AppointmentId,
            'patient_name' => $order->appointment->patient->user->FullName ?? 'N/A',
            'patient_age' => $order->appointment->patient->DateOfBirth
                ? now()->diffInYears($order->appointment->patient->DateOfBirth)
                : 'N/A',
            'patient_gender' => $order->appointment->patient->Gender ?? 'N/A',
            'patient_phone' => $order->appointment->patient->PhoneNumber ?? 'N/A',
            'service_name' => $order->service->ServiceName ?? 'N/A',
            'service_type' => $order->service->ServiceType ?? 'N/A',
            'price' => $order->service->Price ?? 0,
            'order_date' => $order->OrderDate?->format('d/m/Y H:i'),
            'status' => $order->Status,
            'assigned_technician_name' => $order->medical_staff->user->FullName ?? 'N/A', // ✅ SỬA
            'referring_doctor_name' => $order->appointment->medical_staff->user->FullName ?? 'N/A', // ✅ THÊM: Bác sĩ chỉ định
            'notes' => $order->Notes,
            'result' => $order->Result,
            'completed_at' => $order->CompletedAt?->format('d/m/Y H:i')
        ];
    }

  
}