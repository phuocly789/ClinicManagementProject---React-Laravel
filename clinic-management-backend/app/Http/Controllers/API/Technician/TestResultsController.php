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

            Log::info('🔍 SQL Query Result:', [
                'total' => $services->total(),
                'count' => $services->count(),
                'has_data' => !$services->isEmpty()
            ]);

            // Debug first item
            if (!$services->isEmpty()) {
                $firstItem = $services->first();
                Log::info('📋 First Item Debug:', [
                    'ServiceOrderId' => $firstItem->ServiceOrderId,
                    'AssignedStaffId' => $firstItem->AssignedStaffId,
                    'Status' => $firstItem->Status,
                    'has_appointment' => !is_null($firstItem->appointment),
                    'has_patient' => !is_null($firstItem->appointment?->patient),
                    'has_service' => !is_null($firstItem->service)
                ]);
            }

            // Format data
            $formattedServices = $services->map(function ($order) {
                return $this->formatServiceData($order);
            });

            Log::info('📊 Formatted Data:', $formattedServices->toArray());

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
            Log::error('❌ Error getting assigned services: ' . $e->getMessage());
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
        // ✅ DEBUG ĐỂ XÁC NHẬN CẤU TRÚC
        Log::info('🔍 Formatting Service Order:', [
            'service_order_id' => $order->ServiceOrderId,
            'has_appointment' => !is_null($order->appointment),
            'has_patient' => !is_null($order->appointment?->patient),
            'has_patient_user' => !is_null($order->appointment?->patient?->user),
            'patient_user_fields' => $order->appointment?->patient?->user ? array_keys($order->appointment->patient->user->getAttributes()) : 'no user'
        ]);

        // ✅ LẤY USER TỪ PATIENT (THEO CẤU TRÚC todayPatients)
        $user = $order->appointment->patient->user ?? null;

        return [
            'service_order_id' => $order->ServiceOrderId,
            'appointment_id' => $order->AppointmentId,
            'patient_name' => $user->FullName ?? 'N/A',
            'patient_age' => !empty($user->DateOfBirth)
                ? \Carbon\Carbon::parse($user->DateOfBirth)->age
                : 'N/A',
            'patient_gender' => $user->Gender ?? 'N/A',
            'patient_phone' => $user->Phone ?? 'N/A', // ✅ SỬA: Phone (không phải PhoneNumber)
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