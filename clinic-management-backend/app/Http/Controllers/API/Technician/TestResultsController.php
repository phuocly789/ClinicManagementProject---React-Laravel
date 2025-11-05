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
            Log::info('🔄 updateServiceStatus - START', [
                'service_order_id' => $serviceOrderId,
                'technician_id' => $this->technicianId
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
                    'message' => 'Thiếu trường status trong request body'
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
            $newStatus = $status;

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
            $updateData = ['Status' => $newStatus];

            // ✅ THÊM THỜI GIAN HOÀN THÀNH NẾU LÀ TRẠNG THÁI HOÀN THÀNH
            if ($newStatus === 'Hoàn thành') {
                $updateData['CompletedAt'] = now();
            }

            $serviceOrder->update($updateData);

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
     * ✅ CẬP NHẬT KẾT QUẢ XÉT NGHIỆM - CHỈ LƯU KẾT QUẢ, KHÔNG ĐỔI TRẠNG THÁI
     */
    public function updateServiceResult(Request $request, $serviceOrderId)
    {
        DB::beginTransaction();

        try {
            Log::info('🔄 updateServiceResult - START', [
                'service_order_id' => $serviceOrderId,
                'technician_id' => $this->technicianId
            ]);

            // ✅ LẤY DỮ LIỆU TỪ REQUEST
            $result = $request->input('result');

            Log::info('🔍 Extracted data:', [
                'result' => $result ? 'CÓ - Length: ' . strlen($result) : 'KHÔNG',
            ]);

            // ✅ VALIDATION
            if (empty($result)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kết quả xét nghiệm không được để trống'
                ], 400);
            }

            $trimmedResult = trim($result);
            if (empty($trimmedResult)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kết quả xét nghiệm không được để trống (chỉ chứa khoảng trắng)'
                ], 400);
            }

            // ✅ TÌM DỊCH VỤ
            $serviceOrder = ServiceOrder::where('ServiceOrderId', $serviceOrderId)
                ->where('AssignedStaffId', $this->technicianId)
                ->first();

            if (!$serviceOrder) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy dịch vụ được chỉ định hoặc không có quyền truy cập'
                ], 404);
            }

            $currentStatus = $serviceOrder->Status;
            Log::info('📊 Current service status:', ['status' => $currentStatus]);

            // ✅ CHỈ CHO PHÉP LƯU KẾT QUẢ KHI ĐANG Ở TRẠNG THÁI "Đang thực hiện"
            if ($currentStatus !== 'Đang thực hiện') {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể nhập kết quả khi dịch vụ đang ở trạng thái "Đang thực hiện"'
                ], 400);
            }

            // ✅ CẬP NHẬT DỮ LIỆU - CHỈ CẬP NHẬT KẾT QUẢ, KHÔNG ĐỔI TRẠNG THÁI
            $updateData = [
                'Result' => $trimmedResult,
                'UpdatedAt' => now()
            ];

            // ✅ KHÔNG TỰ ĐỘNG CHUYỂN TRẠNG THÁI - CHỈ LƯU KẾT QUẢ
            $serviceOrder->update($updateData);

            DB::commit();

            Log::info("✅ Service result updated SUCCESS", [
                'service_order_id' => $serviceOrderId,
                'result_length' => strlen($trimmedResult),
                'status' => $currentStatus // Vẫn giữ nguyên trạng thái
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Đã lưu kết quả xét nghiệm thành công',
                'data' => [
                    'service_order_id' => $serviceOrderId,
                    'result_preview' => substr($trimmedResult, 0, 50) . (strlen($trimmedResult) > 50 ? '...' : ''),
                    'result_length' => strlen($trimmedResult),
                    'status' => $currentStatus, // Trạng thái không thay đổi
                    'updated_at' => now()->format('d/m/Y H:i')
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('❌ ERROR in updateServiceResult: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Lỗi hệ thống khi lưu kết quả: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ✅ LẤY DANH SÁCH KẾT QUẢ XÉT NGHIỆM ĐÃ HOÀN THÀNH
     */
    public function getCompletedServices(Request $request)
    {
        try {
            Log::info('🔄 [CompletedServices] Technician ID:', ['technician_id' => $this->technicianId]);

            // Query lấy dịch vụ đã hoàn thành
            $services = ServiceOrder::with([
                'appointment.patient.user',
                'service',
                'appointment.medical_staff.user'
            ])
                ->where('AssignedStaffId', $this->technicianId)
                ->where('Status', 'Hoàn thành')
                ->get();

            // Format data
            $formattedServices = $services->map(function ($order) {
                return $this->formatCompletedServiceData($order);
            });

            return response()->json([
                'success' => true,
                'data' => $formattedServices,
                'message' => 'Lấy danh sách kết quả xét nghiệm thành công',
                'count' => $formattedServices->count()
            ]);

        } catch (\Exception $e) {
            Log::error('❌ [CompletedServices] Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy danh sách kết quả xét nghiệm: ' . $e->getMessage()
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
            'patient_id' => $order->appointment->patient->PatientId ?? null,
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
            'completed_at' => $order->CompletedAt?->format('d/m/Y H:i'),
            'result_updated_at' => $order->UpdatedAt?->format('d/m/Y H:i')
        ];
    }


    /**
     * Hàm format dữ liệu dịch vụ đã hoàn thành
     */
    private function formatCompletedServiceData($order)
    {
        $user = $order->appointment->patient->user ?? null;

        return [
            'service_order_id' => $order->ServiceOrderId,
            'appointment_id' => $order->AppointmentId,
            'patient_id' => $order->appointment->patient->PatientId ?? null,
            'patient_name' => $user->FullName ?? 'N/A',
            'patient_age' => !empty($user->DateOfBirth)
                ? \Carbon\Carbon::parse($user->DateOfBirth)->age
                : 'N/A',
            'patient_gender' => $user->Gender ?? 'N/A',
            'service_name' => $order->service->ServiceName ?? 'N/A',
            'service_type' => $order->service->ServiceType ?? 'N/A',
            'referring_doctor_name' => $order->appointment->medical_staff->user->FullName ?? 'N/A',
            'order_date' => $order->OrderDate?->format('d/m/Y H:i'),
            'completed_at' => $order->CompletedAt?->format('d/m/Y H:i'),
            'result' => $order->Result,
            'status' => $order->Status
        ];
    }
}