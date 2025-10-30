<?php

namespace App\Http\Controllers\API\Technician;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ServiceOrder;
use Illuminate\Support\Facades\Log;
use App\Helpers\PaginationHelper;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class TestResultsController extends Controller
{
    private $technicianId = 5; // ✅ ID KỸ THUẬT VIÊN

    /**
     * Lấy danh sách dịch vụ được chỉ định với phân trang
     */
    public function getAssignedServices(Request $request)
    {
        try {
            Log::info('🔄 Technician ID:', ['technician_id' => $this->technicianId]);

            // Query lấy dịch vụ
            $services = ServiceOrder::with([
                'appointment.patient.user',
                'service',
                'medical_staff.user',
                'appointment.medical_staff.user'
            ])
                ->where('AssignedStaffId', $this->technicianId)
                ->whereIn('Status', ['Đã chỉ định', 'Đang chờ', 'Đang thực hiện'])
                ->orderBy('OrderDate', 'desc')
                ->paginate(10);

            // Format data
            $formattedServices = $services->map(function ($order) {
                return $this->formatServiceData($order);
            });

            // ✅ Kiểm tra nếu không có dữ liệu
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
            Log::error('❌ Error getting assigned services: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy danh sách dịch vụ: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cập nhật trạng thái dịch vụ
     */
    public function updateServiceStatus(Request $request, $serviceOrderId)
    {
        DB::beginTransaction();

        try {
            // ✅ DEBUG: Xem chính xác dữ liệu nhận được
            Log::info('🔄 updateServiceStatus - SUPPORT BOTH PUT/POST', [
                'method' => $request->method(),
                'service_order_id' => $serviceOrderId
            ]);

            // ✅ XỬ LÝ RAW JSON BODY
            $rawContent = $request->getContent();
            $data = [];

            if (!empty($rawContent)) {
                $data = json_decode($rawContent, true) ?? [];
            }

            // ✅ KẾT HỢP DỮ LIỆU TỪ NHIỀU NGUỒN
            $status = $data['status'] ?? $request->input('status');

            Log::info('🔍 Status extracted:', ['status' => $status]);

            if (!$status) {
                return response()->json([
                    'success' => false,
                    'message' => 'Thiếu trường status trong request body',
                    'debug' => [
                        'raw_content' => $rawContent,
                        'request_all' => $request->all()
                    ]
                ], 400);
            }
            $serviceOrder = ServiceOrder::where('ServiceOrderId', $serviceOrderId)
                ->where('AssignedStaffId', $this->technicianId)
                ->first();

            if (!$serviceOrder) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy dịch vụ được chỉ định'
                ], 404);
            }

            $oldStatus = $serviceOrder->Status;
            $newStatus = $request->status;

            // ✅ LOGIC CHUYỂN TRẠNG THÁI
            $validTransitions = [
                'Đã chỉ định' => ['Đang thực hiện', 'Đang chờ', 'Đã hủy'],
                'Đang chờ' => ['Đang thực hiện', 'Đã chỉ định', 'Đã hủy'],
                'Đang thực hiện' => ['Hoàn thành', 'Đang chờ', 'Đã hủy'],
                'Hoàn thành' => []
            ];

            if (!isset($validTransitions[$oldStatus]) || !in_array($newStatus, $validTransitions[$oldStatus])) {
                return response()->json([
                    'success' => false,
                    'message' => "Không thể chuyển từ '$oldStatus' sang '$newStatus'"
                ], 400);
            }

            // ✅ Cập nhật status
            $serviceOrder->update([
                'Status' => $newStatus
            ]);

            DB::commit();

            Log::info("✅ Status updated SUCCESS", [
                'service_order_id' => $serviceOrderId,
                'old_status' => $oldStatus,
                'new_status' => $newStatus
            ]);

            return response()->json([
                'success' => true,
                'message' => "Đã cập nhật trạng thái từ '$oldStatus' sang '$newStatus'",
                'data' => [
                    'service_order_id' => $serviceOrderId,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'timestamp' => now()->format('d/m/Y H:i')
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('❌ ERROR in updateServiceStatus: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Lỗi hệ thống: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Hàm format dữ liệu dịch vụ 
     */
    private function formatServiceData($order)
    {
        $user = $order->appointment->patient->user ?? null;

        return [
            'service_order_id' => $order->ServiceOrderId,
            'appointment_id' => $order->AppointmentId,
            'patient_name' => $user->FullName ?? 'N/A',
            'patient_age' => !empty($user->DateOfBirth)
                ? \Carbon\Carbon::parse($user->DateOfBirth)->age
                : 'N/A',
            'patient_gender' => $user->Gender ?? 'N/A',
            'patient_phone' => $user->Phone ?? 'N/A',
            'service_name' => $order->service->ServiceName ?? 'N/A',
            'service_type' => $order->service->ServiceType ?? 'N/A',
            'price' => $order->service->Price ?? 0,
            'order_date' => $order->OrderDate?->format('d/m/Y H:i'),
            'status' => $order->Status,
            'assigned_technician_name' => $order->medical_staff->user->FullName ?? 'N/A',
            'referring_doctor_name' => $order->appointment->medical_staff->user->FullName ?? 'N/A',
            'notes' => $order->Notes,
            'result' => $order->Result,
            'completed_at' => $order->CompletedAt?->format('d/m/Y H:i')
        ];
    }
}