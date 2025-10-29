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
     * Lấy dịch vụ theo trạng thái
     */
    public function getServicesByStatus(Request $request, $status)
    {
        try {
            // Validate status
            $validStatuses = ['Đã chỉ định', 'Đang chờ', 'Đang thực hiện', 'Hoàn thành', 'Đã hủy'];
            if (!in_array($status, $validStatuses)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Trạng thái không hợp lệ'
                ], 400);
            }

            $services = ServiceOrder::with([
                'appointment.patient.user',
                'service',
                'medical_staff.user', // ✅ SỬA
                'appointment.medical_staff.user' // ✅ THÊM
            ])
                ->where('AssignedStaffId', $this->technicianId)
                ->where('Status', $status)
                ->orderBy('OrderDate', 'desc')
                ->paginate(10);

            $formattedServices = $services->map(function ($order) {
                return $this->formatServiceData($order);
            });

            return response()->json(
                PaginationHelper::createPaginatedResponse(
                    $formattedServices,
                    $services,
                    "Lấy danh sách {$status} thành công"
                )
            );

        } catch (\Exception $e) {
            Log::error('Error getting services by status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy danh sách dịch vụ'
            ], 500);
        }
    }

    /**
     * Tìm kiếm dịch vụ theo tên bệnh nhân
     */
    public function searchServices(Request $request)
    {
        try {
            $search = $request->get('search', '');

            $services = ServiceOrder::with([
                'appointment.patient.user',
                'service',
                'medical_staff.user', // ✅ SỬA
                'appointment.medical_staff.user' // ✅ THÊM
            ])
                ->where('AssignedStaffId', $this->technicianId)
                ->whereIn('Status', ['Đã chỉ định', 'Đang chờ', 'Đang thực hiện'])
                ->whereHas('appointment.patient.user', function ($query) use ($search) {
                    $query->where('FullName', 'like', "%{$search}%");
                })
                ->orderBy('OrderDate', 'desc')
                ->paginate(10);

            $formattedServices = $services->map(function ($order) {
                return $this->formatServiceData($order);
            });

            return response()->json(
                PaginationHelper::createPaginatedResponse(
                    $formattedServices,
                    $services,
                    'Tìm kiếm thành công'
                )
            );

        } catch (\Exception $e) {
            Log::error('Error searching services: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tìm kiếm'
            ], 500);
        }
    }

    /**
     * Hàm format dữ liệu dịch vụ - ĐÃ SỬA
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

    /**
     * DEBUG: Kiểm tra dữ liệu thô
     */
    public function debugData()
    {
        try {
            // Lấy tất cả technician có service orders
            $techniciansWithOrders = ServiceOrder::select('AssignedStaffId')
                ->distinct()
                ->with('medical_staff.user')
                ->get()
                ->map(function ($order) {
                    return [
                        'assigned_staff_id' => $order->AssignedStaffId,
                        'staff_name' => $order->medical_staff->user->FullName ?? 'N/A',
                        'order_count' => ServiceOrder::where('AssignedStaffId', $order->AssignedStaffId)->count()
                    ];
                });

            return response()->json([
                'success' => true,
                'technicians_with_orders' => $techniciansWithOrders,
                'all_technicians' => \App\Models\MedicalStaff::with('user')->get()->map(function ($staff) {
                    return [
                        'staff_id' => $staff->StaffId,
                        'user_id' => $staff->UserId,
                        'staff_name' => $staff->user->FullName ?? 'N/A',
                        'role' => $staff->Role ?? 'N/A'
                    ];
                })
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}