<?php

namespace App\Services;

use App\Models\MedicalStaff;
use App\Models\StaffSchedule;
use App\Models\User;
use Carbon\Carbon;
use Exception;
use GuzzleHttp\Promise\Create;
use GuzzleHttp\Psr7\Request;
use Illuminate\Container\Attributes\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ScheduleService
{
    public function index()
    {
        try {
            $query = StaffSchedule::with(['medical_staff.user.roles'])->orderBy('ScheduleId')->get()->map(function ($schedule) {
                $user = $schedule->medical_staff?->User;
                return [
                    'ScheduleId' => $schedule->ScheduleId,
                    'StaffId' => $schedule->StaffId,
                    'StaffName' => $user?->FullName ?? '(Không xác định)',
                    'Role' => $user?->roles?->first()?->RoleName,
                    'WorkDate' => $schedule->WorkDate->format('Y-m-d'),
                    'StartTime' => $schedule->StartTime,
                    'EndTime' => $schedule->EndTime,
                    'IsAvailable' => $schedule->IsAvailable,
                ];
            });
            //
            $schedules = $query;
            $totalItems = $schedules->count();
            //
            $responseData = [
                'TotalItems' => $totalItems,
                'Page' => 0,
                'PegeSize' => 0,
                'Items' => $schedules,

            ];
            return response()->json([
                'data' => $responseData,
                'status' => 'success',
                'message' => 'Lấy lịch làm việc thành công'
            ], 200);
        } catch (\Exception $ex) {
            return response()->json([
                'data' => null,
                'status' => 'error',
                'message' => 'An error occurred while processing your request: ' . $ex->getMessage()
            ], 500);
        }
    }
    public function createSchedule(array $data):array
    {
        try {
            $workDate = Carbon::parse($data['WorkDate']);
            $startTime = Carbon::parse($data['StartTime'])->toTimeString();
            $endTime = Carbon::parse($data['EndTime'])->toTimeString();

            if ($startTime >= $endTime) {
                return [
                    'data' => null,
                    'status' => 'BadRequest',
                    'message' => 'Giờ bắt đầu phải trước giờ kết thúc.'
                ];
            }

            // Check if staff is not a patient
            $isNotPatient = MedicalStaff::where('StaffId', $data['StaffId'])
                ->where('StaffType', '!=', 'Patient')
                ->exists();

            if (!$isNotPatient) {
                return [
                    'data' => null,
                    'status' => 'BadRequest',
                    'message' => 'StaffId là bệnh nhân, không thể thêm lịch.'
                ];
            }

            // Check for overlapping schedules
            $hasOverlappingSchedule = StaffSchedule::where('StaffId', $data['StaffId'])
                ->where('WorkDate', $workDate->toDateString())
                ->where(function ($query) use ($startTime, $endTime) {
                    $query->whereBetween('StartTime', [$startTime, $endTime])
                        ->orWhereBetween('EndTime', [$startTime, $endTime])
                        ->orWhere(function ($q) use ($startTime, $endTime) {
                            $q->where('StartTime', '<=', $startTime)
                                ->where('EndTime', '>=', $endTime);
                        });
                })
                ->exists();

            if ($hasOverlappingSchedule) {
                return [
                    'data' => null,
                    'status' => 'BadRequest',
                    'message' => 'Lịch mới trùng với lịch hiện có.'
                ];
            }

            // Create schedule
            DB::beginTransaction();

            $schedule = StaffSchedule::create([
                'StaffId' => $data['StaffId'],
                'WorkDate' => $workDate->toDateString(),
                'StartTime' => $startTime,
                'EndTime' => $endTime,
                'IsAvailable' => $data['IsAvailable'],
            ]);

            DB::commit();

            return [
                'data' => [
                    'StaffId' => $schedule->StaffId,
                    'WorkDate' => $schedule->WorkDate,
                    'StartTime' => $schedule->StartTime,
                    'EndTime' => $schedule->EndTime,
                    'IsAvailable' => $schedule->IsAvailable,
                ],
                'status' => 'Success',
                'message' => 'Tạo lịch thành công.'
            ];
        } catch (\Exception $ex) {
            return [
                'data' => null,
                'status' => 'Error',
                'message' => 'Đã xảy ra lỗi khi tạo lịch: ' . $ex->getMessage()
            ];
        }
    }
}
