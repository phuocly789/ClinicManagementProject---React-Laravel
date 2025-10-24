<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\ScheduleService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class ScheduleController extends Controller
{
    protected $scheduleService;

    public function __construct(ScheduleService $scheduleService)
    {
        $this->scheduleService = $scheduleService;
    }

    public function index(Request $request): JsonResponse
    {
        $result = $this->scheduleService->index();

        $statusCode = match ($result['status']) {
            'Success' => 200,
            'Error' => 500,
            default => 500,
        };

        return response()->json([
            'data' => $result['data'],
            'status' => $result['status'],
            'message' => $result['message']
        ], $statusCode);
    }

    public function createSchedule(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'StaffId' => ['required', 'integer', 'exists:MedicalStaff,StaffId'],
            'WorkDate' => ['required', 'date_format:Y-m-d'],
            'StartTime' => ['required', 'date_format:H:i:s'],
            'EndTime' => ['required', 'date_format:H:i:s', 'after:StartTime'],
            'IsAvailable' => ['required', 'boolean'],
        ], [
            'StaffId.required' => 'Vui lòng cung cấp StaffId.',
            'StaffId.integer' => 'StaffId phải là số nguyên.',
            'StaffId.exists' => 'StaffId không tồn tại trong hệ thống.',
            'WorkDate.required' => 'Vui lòng cung cấp ngày làm việc.',
            'WorkDate.date_format' => 'Ngày làm việc phải có định dạng YYYY-MM-DD.',
            'StartTime.required' => 'Vui lòng cung cấp giờ bắt đầu.',
            'StartTime.date_format' => 'Giờ bắt đầu phải có định dạng HH:MM:SS.',
            'EndTime.required' => 'Vui lòng cung cấp giờ kết thúc.',
            'EndTime.date_format' => 'Giờ kết thúc phải có định dạng HH:MM:SS.',
            'EndTime.after' => 'Giờ kết thúc phải sau giờ bắt đầu.',
            'IsAvailable.required' => 'Vui lòng cung cấp trạng thái có sẵn.',
            'IsAvailable.boolean' => 'Trạng thái có sẵn phải là true hoặc false.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dữ liệu đầu vào không hợp lệ',
                'errors' => $validator->errors()
            ], 422);
        }

        $result = $this->scheduleService->createSchedule($request->all());

        $statusCode = match ($result['status']) {
            'Success' => 201,
            'BadRequest' => 400,
            'Error' => 500,
            default => 500,
        };

        return response()->json([
            'data' => $result['data'],
            'status' => $result['status'],
            'message' => $result['message']
        ], $statusCode);
    }

    public function updateSchedule(Request $request, $scheduleId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'WorkDate' => ['required', 'date_format:Y-m-d'],
            'StartTime' => ['required', 'date_format:H:i:s'],
            'EndTime' => ['required', 'date_format:H:i:s', 'after:StartTime'],
            'IsAvailable' => ['required', 'boolean'],
        ], [
            'WorkDate.required' => 'Vui lòng cung cấp ngày làm việc.',
            'WorkDate.date_format' => 'Ngày làm việc phải có định dạng YYYY-MM-DD.',
            'StartTime.required' => 'Vui lòng cung cấp giờ bắt đầu.',
            'StartTime.date_format' => 'Giờ bắt đầu phải có định dạng HH:MM:SS.',
            'EndTime.required' => 'Vui lòng cung cấp giờ kết thúc.',
            'EndTime.date_format' => 'Giờ kết thúc phải có định dạng HH:MM:SS.',
            'EndTime.after' => 'Giờ kết thúc phải sau giờ bắt đầu.',
            'IsAvailable.required' => 'Vui lòng cung cấp trạng thái có sẵn.',
            'IsAvailable.boolean' => 'Trạng thái có sẵn phải là true hoặc false.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dữ liệu đầu vào không hợp lệ',
                'errors' => $validator->errors()
            ], 422);
        }

        $result = $this->scheduleService->updateSchedule($scheduleId, $request->all());

        $statusCode = match ($result['status']) {
            'Success' => 200,
            'BadRequest' => 400,
            'NotFound' => 404,
            'Error' => 500,
            default => 500,
        };

        return response()->json([
            'data' => $result['data'],
            'status' => $result['status'],
            'message' => $result['message']
        ], $statusCode);
    }

    public function deleteSchedule($scheduleId): JsonResponse
    {
        $result = $this->scheduleService->deleteSchedule($scheduleId);

        $statusCode = match ($result['status']) {
            'Success' => 200,
            'NotFound' => 404,
            'Error' => 500,
            default => 500,
        };

        return response()->json([
            'data' => $result['data'],
            'status' => $result['status'],
            'message' => $result['message']
        ], $statusCode);
    }
}
