<?php

namespace App\Http\Controllers\API\Technician;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ServiceOrder;
use Illuminate\Support\Facades\Log;
use App\Helpers\PaginationHelper;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\StaffSchedule;
use App\Models\MedicalStaff;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class TestResultsController extends Controller
{
    /**
     * ✅ METHOD TRUNG TÂM: Lấy thông tin technician từ Auth
     */
    private function getAuthenticatedTechnician()
    {
        $technician = MedicalStaff::where('StaffId', Auth::id())->first();

        if (!$technician) {
            throw new \Exception('Không tìm thấy thông tin kỹ thuật viên.');
        }

        return $technician;
    }

    /**
     * Lấy danh sách dịch vụ được chỉ định với phân trang
     */
    public function getAssignedServices(Request $request)
    {
        try {
            // ✅ GỌI METHOD TRUNG TÂM
            $technician = $this->getAuthenticatedTechnician();
            $technicianId = $technician->StaffId;

            Log::info('🔄 Technician ID từ Auth:', ['technician_id' => $technicianId]);

            // Query lấy dịch vụ
            $services = ServiceOrder::with([
                'appointment.patient.user',
                'service',
                'medical_staff.user',
                'appointment.medical_staff.user'
            ])
                ->where('AssignedStaffId', $technicianId)
                ->whereIn('Status', ['Đã chỉ định', 'Đang chờ', 'Đang thực hiện'])
                ->orderBy('OrderDate', 'asc')
                ->paginate(perPage: 100);

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
                    'technician_info' => [
                        'staff_id' => $technician->StaffId,
                        'position' => $technician->medical_staff->user->FullName ?? 'Kỹ thuật viên',
                        'department' => $technician->Department ?? 'N/A',
                    ],
                    'pagination' => [
                        'current_page' => 1,
                        'last_page' => 1,
                        'per_page' => 5,
                        'total' => 0,
                        'from' => null,
                        'to' => null,
                        'has_more_pages' => false
                    ]
                ]);
            }

            $response = PaginationHelper::createPaginatedResponse(
                $formattedServices,
                $services,
                'Lấy danh sách dịch vụ thành công'
            );

            // ✅ THÊM THÔNG TIN TECHNICIAN VÀO RESPONSE (giống doctor)
            $response['technician_info'] = [
                'staff_id' => $technician->StaffId,
                'position' => $technician->medical_staff->user->FullName ?? 'Kỹ thuật viên',
                'department' => $technician->Department ?? 'N/A',
                'license_number' => $technician->LicenseNumber ?? 'N/A',
            ];

            return response()->json($response);

        } catch (\Exception $e) {
            Log::error('  Error getting assigned services: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy danh sách dịch vụ: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cập nhật trạng thái dịch vụ - ĐÃ THÊM RÀNG BUỘC
     */
    public function updateServiceStatus(Request $request, $serviceOrderId)
    {
        DB::beginTransaction();

        try {
            // ✅ GỌI METHOD TRUNG TÂM
            $technician = $this->getAuthenticatedTechnician();
            $technicianId = $technician->StaffId;

            Log::info('🔄 updateServiceStatus - START', [
                'service_order_id' => $serviceOrderId,
                'technician_id' => $technicianId
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

            // ✅ TÌM DỊCH VỤ VÀ KIỂM TRA TỒN TẠI
            $serviceOrder = ServiceOrder::with(['appointment.patient.user'])
                ->where('ServiceOrderId', $serviceOrderId)
                ->where('AssignedStaffId', $technicianId)
                ->first();

            if (!$serviceOrder) {
                Log::warning('  Service order not found or no permission', [
                    'service_order_id' => $serviceOrderId,
                    'technician_id' => $technicianId
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy dịch vụ được chỉ định hoặc không có quyền truy cập'
                ], 404);
            }

            // ✅ KIỂM TRA BỆNH NHÂN CÓ TỒN TẠI KHÔNG
            if (!$serviceOrder->appointment || !$serviceOrder->appointment->patient) {
                Log::error('  Patient or appointment not found', [
                    'service_order_id' => $serviceOrderId,
                    'appointment_id' => $serviceOrder->AppointmentId,
                    'patient_id' => $serviceOrder->appointment->PatientId ?? 'N/A'
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy thông tin bệnh nhân. Vui lòng kiểm tra lại dữ liệu.'
                ], 404);
            }

            $patientName = $serviceOrder->appointment->patient->user->FullName ?? 'Không xác định';
            $oldStatus = $serviceOrder->Status;
            $newStatus = $status;

            Log::info('👤 Patient info:', [
                'patient_name' => $patientName,
                'patient_id' => $serviceOrder->appointment->PatientId
            ]);

            // ✅ RÀNG BUỘC: KHÔNG CHO THỰC HIỆN 2 BỆNH NHÂN CÙNG LÚC
            if ($newStatus === 'Đang thực hiện') {
                $currentlyServing = ServiceOrder::where('AssignedStaffId', $technicianId)
                    ->where('Status', 'Đang thực hiện')
                    ->where('ServiceOrderId', '!=', $serviceOrderId)
                    ->with(['appointment.patient.user'])
                    ->first();

                if ($currentlyServing) {
                    $currentPatientName = $currentlyServing->appointment->patient->user->FullName ?? 'Không xác định';
                    Log::warning('🚫 Technician is already serving another patient', [
                        'technician_id' => $technicianId,
                        'current_patient' => $currentPatientName,
                        'new_patient' => $patientName,
                        'current_service_order' => $currentlyServing->ServiceOrderId
                    ]);

                    return response()->json([
                        'success' => false,
                        'message' => "Bạn đang thực hiện dịch vụ cho bệnh nhân {$currentPatientName}. Không thể thực hiện cùng lúc 2 bệnh nhân.",
                        'data' => [
                            'current_patient' => $currentPatientName,
                            'current_service_order_id' => $currentlyServing->ServiceOrderId,
                            'new_patient' => $patientName
                        ]
                    ], 400);
                }
            }

            // ✅ RÀNG BUỘC: KHÔNG CHO CHUYỂN TRẠNG THÁI KHI BỆNH NHÂN KHÔNG TỒN TẠI
            if (!$this->isPatientValid($serviceOrder->appointment->PatientId)) {
                Log::error('  Invalid patient data', [
                    'patient_id' => $serviceOrder->appointment->PatientId,
                    'service_order_id' => $serviceOrderId
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Thông tin bệnh nhân không hợp lệ. Không thể cập nhật trạng thái.'
                ], 400);
            }

            // ✅ LOGIC CHUYỂN TRẠNG THÁI
            $validTransitions = [
                'Đã chỉ định' => ['Đang thực hiện', 'Đang chờ', 'Đã hủy'],
                'Đang chờ' => ['Đang thực hiện', 'Đã chỉ định', 'Đã hủy'],
                'Đang thực hiện' => ['Hoàn thành', 'Đang chờ', 'Đã hủy'],
                'Hoàn thành' => []
            ];

            if (!isset($validTransitions[$oldStatus]) || !in_array($newStatus, $validTransitions[$oldStatus])) {
                Log::warning('🚫 Invalid status transition', [
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'allowed_transitions' => $validTransitions[$oldStatus] ?? []
                ]);
                return response()->json([
                    'success' => false,
                    'message' => "Không thể chuyển từ '$oldStatus' sang '$newStatus. Vui lòng tải lại trang."
                ], 400);
            }

            // ✅ Cập nhật status - GIỜ ĐÃ CÓ UpdatedAt trong DB
            $updateData = [
                'Status' => $newStatus,
                'UpdatedAt' => now('Asia/Ho_Chi_Minh')
            ];

            // ✅ THÊM THỜI GIAN HOÀN THÀNH NẾU LÀ TRẠNG THÁI HOÀN THÀNH
            if ($newStatus === 'Hoàn thành') {
                $updateData['completed_at'] = now('Asia/Ho_Chi_Minh');

                Log::info('✅ Đã thêm completed_at cho dịch vụ hoàn thành', [
                    'service_order_id' => $serviceOrderId,
                    'completed_at' => now('Asia/Ho_Chi_Minh')->format('d/m/Y H:i')
                ]);
            }

            // ✅ DEBUG: Kiểm tra dữ liệu trước khi update
            Log::info('🔍 [DEBUG] Update data:', $updateData);

            $serviceOrder->update($updateData);

            DB::commit();

            // ✅ DEBUG: Kiểm tra giá trị sau khi update
            $updatedService = ServiceOrder::find($serviceOrderId);
            Log::info('🔍 [DEBUG] After update - actual values:', [
                'Status' => $updatedService->Status,
                'completed_at' => $updatedService->completed_at,
                'UpdatedAt' => $updatedService->UpdatedAt
            ]);

            Log::info("✅ Status updated SUCCESS", [
                'service_order_id' => $serviceOrderId,
                'patient_name' => $patientName,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'completed_at' => $newStatus === 'Hoàn thành' ? now('Asia/Ho_Chi_Minh')->format('d/m/Y H:i') : 'N/A',
                'updated_at' => now('Asia/Ho_Chi_Minh')->format('d/m/Y H:i')
            ]);

            return response()->json([
                'success' => true,
                'message' => "Đã cập nhật trạng thái từ '$oldStatus' sang '$newStatus' cho bệnh nhân {$patientName}",
                'data' => [
                    'service_order_id' => $serviceOrderId,
                    'patient_name' => $patientName,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'completed_at' => $newStatus === 'Hoàn thành' ? now('Asia/Ho_Chi_Minh')->format('d/m/Y H:i') : null,
                    'updated_at' => now('Asia/Ho_Chi_Minh')->format('d/m/Y H:i'),
                    'technician_busy' => false // ✅ Thông báo KTV không bận
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('  ERROR in updateServiceStatus: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Lỗi hệ thống: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ✅ KIỂM TRA BỆNH NHÂN CÓ HỢP LỆ KHÔNG
     */
    private function isPatientValid($patientId)
    {
        try {
            $patient = \App\Models\Patient::with(['user'])
                ->where('PatientId', $patientId)
                ->first();

            if (!$patient) {
                Log::error(' Patient not found in database', ['patient_id' => $patientId]);
                return false;
            }

            if (!$patient->user) {
                Log::error('  Patient user data not found', ['patient_id' => $patientId]);
                return false;
            }

            // ✅ Kiểm tra các trường bắt buộc
            if (empty($patient->user->FullName)) {
                Log::error(' Patient name is empty', ['patient_id' => $patientId]);
                return false;
            }

            return true;

        } catch (\Exception $e) {
            Log::error(' Error checking patient validity: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * ✅ KIỂM TRA KTV ĐANG THỰC HIỆN BỆNH NHÂN NÀO (cho debug/monitoring)
     */
    public function getCurrentServingPatient()
    {
        try {
            $technician = $this->getAuthenticatedTechnician();
            $technicianId = $technician->StaffId;

            $currentlyServing = ServiceOrder::where('AssignedStaffId', $technicianId)
                ->where('Status', 'Đang thực hiện')
                ->with(['appointment.patient.user'])
                ->first();

            if ($currentlyServing) {
                $patientName = $currentlyServing->appointment->patient->user->FullName ?? 'Không xác định';
                return response()->json([
                    'success' => true,
                    'data' => [
                        'is_serving' => true,
                        'patient_name' => $patientName,
                        'service_order_id' => $currentlyServing->ServiceOrderId,
                        'started_at' => $currentlyServing->UpdatedAt?->format('d/m/Y H:i')
                    ]
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'is_serving' => false,
                    'message' => 'KTV hiện không thực hiện bệnh nhân nào'
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('  Error getting current serving patient: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy thông tin bệnh nhân hiện tại'
            ], 500);
        }
    }

    /**
     *  CẬP NHẬT KẾT QUẢ XÉT NGHIỆM - CHỈ LƯU KẾT QUẢ, KHÔNG ĐỔI TRẠNG THÁI
     *  CHỈ CHO PHÉP NHẬP CHỮ, KHÔNG CHO NHẬP SỐ VÀ KÝ TỰ ĐẶC BIỆT
     *  KIỂM TRA TRÙNG KẾT QUẢ
     */
    public function updateServiceResult(Request $request, $serviceOrderId)
    {
        DB::beginTransaction();

        try {
            // ✅ GỌI METHOD TRUNG TÂM
            $technician = $this->getAuthenticatedTechnician();
            $technicianId = $technician->StaffId;

            Log::info('🔄 updateServiceResult - START', [
                'service_order_id' => $serviceOrderId,
                'technician_id' => $technicianId
            ]);

            // ✅ LẤY DỮ LIỆU TỪ REQUEST
            $result = $request->input('result');

            Log::info('🔍 Extracted data:', [
                'result' => $result ? 'CÓ - Length: ' . strlen($result) : 'KHÔNG',
            ]);

            // ✅ VALIDATION CƠ BẢN
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

            // ✅ RÀNG BUỘC CHỈ ĐƯỢC NHẬP CHỮ - KHÔNG CHO NHẬP SỐ VÀ KÝ TỰ ĐẶC BIỆT
            if (!$this->isValidTextInput($trimmedResult)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kết quả xét nghiệm chỉ được chứa chữ cái, khoảng trắng và các ký tự: ,.-()/\\'
                ], 400);
            }

            // ✅ KIỂM TRA ĐỘ DÀI
            if (strlen($trimmedResult) > 2000) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kết quả xét nghiệm quá dài (tối đa 2000 ký tự)'
                ], 400);
            }

            // ✅ TÌM DỊCH VỤ
            $serviceOrder = ServiceOrder::where('ServiceOrderId', $serviceOrderId)
                ->where('AssignedStaffId', $technicianId)
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

            // ✅ KIỂM TRA TRÙNG KẾT QUẢ - SO SÁNH KHÔNG PHÂN BIỆT HOA THƯỜNG
            $currentResult = $serviceOrder->Result;
            if ($currentResult && $this->isDuplicateResult($currentResult, $trimmedResult)) {
                Log::warning('🚫 Duplicate result detected', [
                    'current_result' => $currentResult,
                    'new_result' => $trimmedResult,
                    'service_order_id' => $serviceOrderId
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Kết quả này đã được lưu trước đó. Vui lòng nhập kết quả khác.',
                    'data' => [
                        'current_result_preview' => substr($currentResult, 0, 50) . (strlen($currentResult) > 50 ? '...' : ''),
                        'new_result_preview' => substr($trimmedResult, 0, 50) . (strlen($trimmedResult) > 50 ? '...' : '')
                    ]
                ], 400);
            }

            // ✅ KIỂM TRA KẾT QUẢ CHỈ KHÁC KHOẢNG TRẮNG
            if ($currentResult && $this->isOnlyWhitespaceDifferent($currentResult, $trimmedResult)) {
                Log::warning('🚫 Result only differs by whitespace', [
                    'current_result' => $currentResult,
                    'new_result' => $trimmedResult,
                    'service_order_id' => $serviceOrderId
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Kết quả mới chỉ khác kết quả cũ về khoảng trắng. Vui lòng nhập nội dung khác biệt thực sự.',
                    'data' => [
                        'current_result_preview' => substr($currentResult, 0, 50) . (strlen($currentResult) > 50 ? '...' : ''),
                        'new_result_preview' => substr($trimmedResult, 0, 50) . (strlen($trimmedResult) > 50 ? '...' : '')
                    ]
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
                'status' => $currentStatus, // Vẫn giữ nguyên trạng thái
                'result_preview' => substr($trimmedResult, 0, 100),
                'is_duplicate_checked' => true,
                'was_duplicate' => false
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Đã lưu kết quả xét nghiệm thành công',
                'data' => [
                    'service_order_id' => $serviceOrderId,
                    'result_preview' => substr($trimmedResult, 0, 50) . (strlen($trimmedResult) > 50 ? '...' : ''),
                    'result_length' => strlen($trimmedResult),
                    'status' => $currentStatus, // Trạng thái không thay đổi
                    'updated_at' => now()->format('d/m/Y H:i'),
                    'is_new_result' => empty($currentResult) ? true : !$this->isDuplicateResult($currentResult, $trimmedResult)
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('  ERROR in updateServiceResult: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Lỗi hệ thống khi lưu kết quả: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     *  KIỂM TRA TRÙNG KẾT QUẢ (KHÔNG PHÂN BIỆT HOA THƯỜNG VÀ KHOẢNG TRẮNG)
     */
    private function isDuplicateResult($currentResult, $newResult)
    {
        // Chuẩn hóa cả hai kết quả: lowercase và remove extra whitespace
        $normalizedCurrent = $this->normalizeText($currentResult);
        $normalizedNew = $this->normalizeText($newResult);

        $isDuplicate = $normalizedCurrent === $normalizedNew;

        Log::info('🔍 Duplicate check:', [
            'original_current' => $currentResult,
            'original_new' => $newResult,
            'normalized_current' => $normalizedCurrent,
            'normalized_new' => $normalizedNew,
            'is_duplicate' => $isDuplicate
        ]);

        return $isDuplicate;
    }

    /**
     * KIỂM TRA CHỈ KHÁC NHAU VỀ KHOẢNG TRẮNG
     */
    private function isOnlyWhitespaceDifferent($currentResult, $newResult)
    {
        // Remove tất cả whitespace và so sánh
        $currentWithoutSpaces = preg_replace('/\s+/', '', $currentResult);
        $newWithoutSpaces = preg_replace('/\s+/', '', $newResult);

        $isOnlyWhitespaceDiff = $currentWithoutSpaces === $newWithoutSpaces;

        Log::info('🔍 Whitespace difference check:', [
            'current_without_spaces' => $currentWithoutSpaces,
            'new_without_spaces' => $newWithoutSpaces,
            'is_only_whitespace_diff' => $isOnlyWhitespaceDiff
        ]);

        return $isOnlyWhitespaceDiff;
    }

    /**
     *  CHUẨN HÓA TEXT ĐỂ SO SÁNH (lowercase + trim whitespace)
     */
    private function normalizeText($text)
    {
        return trim(mb_strtolower($text, 'UTF-8'));
    }

    /**
     * ✅ KIỂM TRA INPUT CHỈ ĐƯỢC CHỨA CHỮ VÀ MỘT SỐ KÝ TỰ CHO PHÉP
     */
    private function isValidTextInput($text)
    {
        // ✅ PATTERN: Chỉ cho phép:
        // - Chữ cái (tiếng Việt có dấu và không dấu)
        // - Khoảng trắng
        // - Các ký tự cho phép: , . - ( ) / \
        $pattern = '/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂẾưăạảấầẩẫậắằẳẵặẹẻẽềềểếỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s\,\-\.\(\)\/\\\\]+$/u';

        return preg_match($pattern, $text) === 1;
    }


    /**
     * ✅ LẤY DANH SÁCH KẾT QUẢ XÉT NGHIỆM ĐÃ HOÀN THÀNH
     */
    public function getCompletedServices(Request $request)
    {
        try {
            // ✅ GỌI METHOD TRUNG TÂM
            $technician = $this->getAuthenticatedTechnician();
            $technicianId = $technician->StaffId;

            Log::info('🔄 [CompletedServices] Technician ID:', ['technician_id' => $technicianId]);

            // Query lấy dịch vụ đã hoàn thành
            $services = ServiceOrder::with([
                'appointment.patient.user',
                'service',
                'appointment.medical_staff.user'
            ])
                ->where('AssignedStaffId', $technicianId)
                ->where('Status', 'Hoàn thành')
                ->orderBy('OrderDate', 'desc')
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
            Log::error('  [CompletedServices] Error: ' . $e->getMessage());
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
     * ✅ LẤY LỊCH LÀM VIỆC CỦA KỸ THUẬT VIÊN - ĐÃ THÊM THÔNG TIN PHÒNG
     */
    public function getWorkSchedule(Request $request)
    {
        try {
            // ✅ GỌI METHOD TRUNG TÂM
            $technician = $this->getAuthenticatedTechnician();
            $technicianId = $technician->StaffId;

            Log::info(' [WorkSchedule] Getting work schedule for technician:', ['technician_id' => $technicianId]);

            // Lấy toàn bộ lịch làm việc của KTV với thông tin phòng
            $schedules = StaffSchedule::with(['room']) // ✅ THÊM QUAN HỆ ROOM
                ->where('StaffId', $technicianId)
                ->orderBy('WorkDate')
                ->orderBy('StartTime')
                ->get()
                ->map(function ($item) {
                    $workDate = Carbon::parse($item->WorkDate);
                    $now = Carbon::now();

                    // Xác định trạng thái
                    $status = 'upcoming';
                    if ($workDate->isToday()) {
                        $status = 'active';
                    } elseif ($workDate->isPast()) {
                        $status = 'completed';
                    }

                    // ✅ LẤY THÔNG TIN PHÒNG
                    $roomInfo = $this->getRoomInfo($item);

                    return [
                        'schedule_id' => $item->ScheduleId,
                        'date' => $item->WorkDate->format('Y-m-d'),
                        'start_time' => $item->StartTime,
                        'end_time' => $item->EndTime,
                        'time' => $item->StartTime . ' - ' . $item->EndTime,
                        'room_id' => $item->RoomId,
                        'room_name' => $roomInfo['name'],
                        'room_description' => $roomInfo['description'],
                        'room_is_active' => $roomInfo['is_active'],
                        'room_status' => $roomInfo['status'],
                        'location' => $roomInfo['name'] ?? ($item->Location ?? 'Phòng Kỹ Thuật Xét Nghiệm'),
                        'type' => $item->IsAvailable ? 'Làm việc toàn thời gian' : 'Làm việc bán thời gian',
                        'status' => $status,
                        'is_available' => (bool) $item->IsAvailable,
                        'notes' => $item->Notes,
                        'work_date_formatted' => $item->WorkDate->format('d/m/Y'),
                        'day_of_week' => $this->getVietnameseDayOfWeek($item->WorkDate->dayOfWeek),
                        'is_today' => $workDate->isToday()
                    ];
                });

            // Lấy thông tin KTV
            $technicianInfo = [
                'staff_id' => $technician->StaffId,
                'full_name' => $technician->user->FullName ?? 'N/A',
                'position' => $technician->Position ?? 'Kỹ Thuật Viên',
                'department' => $technician->Department ?? 'Phòng Kỹ Thuật',
                'hire_date' => $technician->HireDate ? $technician->HireDate->format('d/m/Y') : 'N/A',
                'phone' => $technician->user->Phone ?? 'N/A',
                'email' => $technician->user->Email ?? 'N/A',
                'specialty' => $technician->Specialty ?? 'N/A'
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'technician_info' => $technicianInfo,
                    'schedules' => $schedules,
                    'statistics' => [
                        'total_schedules' => $schedules->count(),
                        'active_schedules' => $schedules->where('status', 'active')->count(),
                        'upcoming_schedules' => $schedules->where('status', 'upcoming')->count(),
                        'completed_schedules' => $schedules->where('status', 'completed')->count(),
                        'schedules_with_room' => $schedules->where('room_id', '!=', null)->count(),
                        'schedules_today' => $schedules->where('is_today', true)->count()
                    ]
                ],
                'message' => 'Lấy lịch làm việc thành công'
            ]);

        } catch (\Exception $e) {
            Log::error('  [WorkSchedule] Error getting work schedule: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy lịch làm việc: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ✅ LẤY LỊCH LÀM VIỆC THEO THÁNG - ĐÃ THÊM THÔNG TIN PHÒNG
     */
    public function getWorkScheduleByMonth(Request $request, $year, $month)
    {
        try {
            // ✅ GỌI METHOD TRUNG TÂM
            $technician = $this->getAuthenticatedTechnician();
            $technicianId = $technician->StaffId;

            Log::info('🔄 [WorkSchedule] Getting monthly schedule:', [
                'technician_id' => $technicianId,
                'year' => $year,
                'month' => $month
            ]);

            $startDate = Carbon::create($year, $month, 1)->startOfMonth();
            $endDate = Carbon::create($year, $month, 1)->endOfMonth();

            $schedules = StaffSchedule::with(['room']) // ✅ THÊM QUAN HỆ ROOM
                ->where('StaffId', $technicianId)
                ->whereBetween('WorkDate', [$startDate, $endDate])
                ->orderBy('WorkDate')
                ->orderBy('StartTime')
                ->get()
                ->map(function ($item) {
                    $workDate = Carbon::parse($item->WorkDate);
                    $now = Carbon::now();

                    $status = 'upcoming';
                    if ($workDate->isToday()) {
                        $status = 'active';
                    } elseif ($workDate->isPast()) {
                        $status = 'completed';
                    }

                    // ✅ LẤY THÔNG TIN PHÒNG
                    $roomInfo = $this->getRoomInfo($item);

                    return [
                        'schedule_id' => $item->ScheduleId,
                        'date' => $item->WorkDate->format('Y-m-d'),
                        'start_time' => $item->StartTime,
                        'end_time' => $item->EndTime,
                        'time' => $item->StartTime . ' - ' . $item->EndTime,
                        'room_id' => $item->RoomId,
                        'room_name' => $roomInfo['name'],
                        'room_description' => $roomInfo['description'],
                        'room_is_active' => $roomInfo['is_active'],
                        'room_status' => $roomInfo['status'],
                        'location' => $roomInfo['name'] ?? ($item->Location ?? 'Phòng Kỹ Thuật Xét Nghiệm'),
                        'type' => $item->IsAvailable ? 'Làm việc toàn thời gian' : 'Làm việc bán thời gian',
                        'status' => $status,
                        'is_available' => (bool) $item->IsAvailable,
                        'notes' => $item->Notes,
                        'is_today' => $workDate->isToday()
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $schedules,
                'message' => 'Lấy lịch làm việc theo tháng thành công',
                'period' => [
                    'month' => (int) $month,
                    'year' => (int) $year,
                    'month_name' => $this->getVietnameseMonthName($month)
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('  [WorkSchedule] Error getting monthly schedule: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy lịch làm việc theo tháng: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ✅ LẤY THÔNG TIN PHÒNG TỪ SCHEDULE
     */
    private function getRoomInfo($schedule)
    {
        // Trường hợp 1: Không có RoomId
        if (empty($schedule->RoomId)) {
            return [
                'name' => 'Chưa phân công phòng',
                'description' => null,
                'is_active' => false,
                'status' => 'chưa phân công'
            ];
        }

        // Trường hợp 2: Có quan hệ room và room tồn tại
        if ($schedule->relationLoaded('room') && $schedule->room) {
            return [
                'name' => $schedule->room->RoomName ?? 'Phòng khám',
                'description' => $schedule->room->Description,
                'is_active' => (bool) ($schedule->room->IsActive ?? false),
                'status' => ($schedule->room->IsActive ?? false) ? 'hoạt động' : 'ngừng hoạt động'
            ];
        }

        // Trường hợp 3: Quan hệ không tồn tại, thử query trực tiếp
        try {
            $room = \App\Models\Room::find($schedule->RoomId);
            if ($room) {
                return [
                    'name' => $room->RoomName,
                    'description' => $room->Description,
                    'is_active' => (bool) $room->IsActive,
                    'status' => $room->IsActive ? 'hoạt động' : 'ngừng hoạt động'
                ];
            }
        } catch (\Exception $e) {
            // Log lỗi nhưng không làm crash app
            Log::warning("Không thể lấy thông tin phòng: " . $e->getMessage());
        }

        // Trường hợp 4: RoomId không hợp lệ
        return [
            'name' => 'Phòng không tồn tại',
            'description' => 'RoomId: ' . $schedule->RoomId . ' không tìm thấy',
            'is_active' => false,
            'status' => 'không tìm thấy'
        ];
    }

    /**
     * ✅ LẤY THÔNG TIN PHÒNG LÀM VIỆC HIỆN TẠI
     */
    public function getCurrentRoom()
    {
        try {
            $technician = $this->getAuthenticatedTechnician();
            $technicianId = $technician->StaffId;

            $today = Carbon::today()->toDateString();
            $now = Carbon::now()->format('H:i:s');

            // Lấy lịch làm việc hiện tại
            $currentSchedule = StaffSchedule::with(['room'])
                ->where('StaffId', $technicianId)
                ->whereDate('WorkDate', $today)
                ->where('StartTime', '<=', $now)
                ->where('EndTime', '>=', $now)
                ->where('IsAvailable', true)
                ->first();

            if (!$currentSchedule) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hiện tại không có lịch làm việc'
                ], 404);
            }

            $roomInfo = $this->getRoomInfo($currentSchedule);

            return response()->json([
                'success' => true,
                'message' => 'Thông tin phòng làm việc hiện tại',
                'data' => [
                    'schedule_id' => $currentSchedule->ScheduleId,
                    'room_id' => $currentSchedule->RoomId,
                    'room_name' => $roomInfo['name'],
                    'room_description' => $roomInfo['description'],
                    'room_status' => $roomInfo['status'],
                    'work_date' => $currentSchedule->WorkDate->format('Y-m-d'),
                    'start_time' => $currentSchedule->StartTime,
                    'end_time' => $currentSchedule->EndTime,
                    'time_slot' => $currentSchedule->StartTime . ' - ' . $currentSchedule->EndTime,
                    'is_current' => true
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('❌ Error getting current room: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy thông tin phòng hiện tại'
            ], 500);
        }
    }

    /**
     * ✅ Hàm helper: Chuyển đổi thứ tiếng Việt
     */
    private function getVietnameseDayOfWeek($dayOfWeek)
    {
        $days = [
            0 => 'Chủ Nhật',
            1 => 'Thứ Hai',
            2 => 'Thứ Ba',
            3 => 'Thứ Tư',
            4 => 'Thứ Năm',
            5 => 'Thứ Sáu',
            6 => 'Thứ Bảy'
        ];

        return $days[$dayOfWeek] ?? 'N/A';
    }

    /**
     * ✅ Hàm helper: Chuyển đổi tên tháng tiếng Việt - ĐÃ SỬA LỖI
     */
    private function getVietnameseMonthName($month)
    {
        $months = [
            1 => 'Tháng Một',
            2 => 'Tháng Hai',
            3 => 'Tháng Ba',
            4 => 'Tháng Tư',
            5 => 'Tháng Năm',
            6 => 'Tháng Sáu',
            7 => 'Tháng Bảy',
            8 => 'Tháng Tám',
            9 => 'Tháng Chín',
            10 => 'Tháng Mười', // ✅ SỬA: Tháng 10 bị trùng key 5
            11 => 'Tháng Mười Một',
            12 => 'Tháng Mười Hai'
        ];

        return $months[(int) $month] ?? 'N/A';
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
            'patient_phone' => $user->Phone ?? 'N/A',
            'patient_address' => $user->Address ?? 'N/A',
            'patient_gender' => $user->Gender ?? 'N/A',
            'service_name' => $order->service->ServiceName ?? 'N/A',
            'service_type' => $order->service->ServiceType ?? 'N/A',
            'price' => $order->service->Price ?? 0, // ✅ THÊM GIÁ
            'referring_doctor_name' => $order->appointment->medical_staff->user->FullName ?? 'N/A',
            'assigned_technician_name' => $order->medical_staff->user->FullName ?? 'N/A', // ✅ THÊM KTV
            'order_date' => $order->OrderDate?->format('d/m/Y H:i'),
            'completed_at' => $order->completed_at?->format('d/m/Y H:i'), // ✅ SỬA LỖI: order->completed_at
            'result' => $order->Result,
            'status' => $order->Status,
            'updated_at' => $order->UpdatedAt?->format('d/m/Y H:i') // ✅ THÊM
        ];
    }
}