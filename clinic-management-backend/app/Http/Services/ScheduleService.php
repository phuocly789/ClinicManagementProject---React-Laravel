<?php

namespace App\Http\Services;

use App\Models\MedicalStaff;
use App\Models\StaffSchedule;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ScheduleService
{
    public function index(): array
    {
        try {
            $schedules = StaffSchedule::with(['medical_staff.user.roles'])
                ->orderBy('ScheduleId')
                ->get()
                ->map(function ($schedule) {
                    $user = $schedule->medical_staff?->user;
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

            $totalItems = $schedules->count();

            $responseData = [
                'TotalItems' => $totalItems,
                'Page' => 0,
                'PageSize' => 0,
                'Items' => $schedules,
            ];

            return [
                'data' => $responseData,
                'status' => 'Success',
                'message' => 'Lấy lịch làm việc thành công.'
            ];
        } catch (\Exception $ex) {
            Log::error('Lỗi khi lấy danh sách lịch: ' . $ex->getMessage());
            return [
                'data' => null,
                'status' => 'Error',
                'message' => 'Đã xảy ra lỗi khi lấy danh sách lịch: ' . $ex->getMessage()
            ];
        }
    }

    public function createSchedule(array $data): array
    {
        try {
            $workDate = Carbon::parse($data['WorkDate']);
            $startTime = Carbon::parse($data['StartTime'])->toTimeString();
            $endTime = Carbon::parse($data['EndTime'])->toTimeString();

            Log::info('Input data', $data);
            if ($startTime >= $endTime) {
                return [
                    'data' => null,
                    'status' => 'BadRequest',
                    'message' => 'Giờ bắt đầu phải trước giờ kết thúc.'
                ];
            }

            $staffExists = MedicalStaff::where('StaffId', $data['StaffId'])->exists();
            if (!$staffExists) {
                return [
                    'data' => null,
                    'status' => 'BadRequest',
                    'message' => 'StaffId không tồn tại trong danh sách nhân viên y tế.'
                ];
            }

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
            DB::rollBack();
            Log::error('Lỗi khi tạo lịch: ' . $ex->getMessage());
            return [
                'data' => null,
                'status' => 'Error',
                'message' => 'Đã xảy ra lỗi khi tạo lịch: ' . $ex->getMessage()
            ];
        }
    }

    public function updateSchedule(int $scheduleId, array $data): array
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

            $schedule = StaffSchedule::find($scheduleId);
            if (!$schedule) {
                return [
                    'data' => null,
                    'status' => 'NotFound',
                    'message' => 'Không tìm thấy lịch.'
                ];
            }

            if ($schedule->WorkDate->toDateString() !== $workDate->toDateString()) {
                return [
                    'data' => null,
                    'status' => 'BadRequest',
                    'message' => 'Chỉ có thể cập nhật lịch trong cùng ngày.'
                ];
            }

            $staffExists = MedicalStaff::where('StaffId', $data['StaffId'])->exists();
            if (!$staffExists) {
                return [
                    'data' => null,
                    'status' => 'BadRequest',
                    'message' => 'StaffId không tồn tại trong danh sách nhân viên y tế.'
                ];
            }


            $hasOverlappingSchedule = StaffSchedule::where('StaffId', $schedule->StaffId)
                ->where('ScheduleId', '!=', $scheduleId)
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

            DB::beginTransaction();

            $schedule->update([
                'WorkDate' => $workDate->toDateString(),
                'StartTime' => $startTime,
                'EndTime' => $endTime,
                'IsAvailable' => $data['IsAvailable'],
            ]);

            DB::commit();

            return [
                'data' => [
                    'WorkDate' => $schedule->WorkDate,
                    'StartTime' => $schedule->StartTime,
                    'EndTime' => $schedule->EndTime,
                    'IsAvailable' => $schedule->IsAvailable,
                ],
                'status' => 'Success',
                'message' => 'Cập nhật lịch thành công.'
            ];
        } catch (\Exception $ex) {
            Log::error("Lỗi khi cập nhật lịch {$scheduleId}: " . $ex->getMessage());
            return [
                'data' => null,
                'status' => 'Error',
                'message' => 'Đã xảy ra lỗi khi cập nhật lịch: ' . $ex->getMessage()
            ];
        }
    }

    public function deleteSchedule(int $scheduleId): array
    {
        try {
            $schedule = StaffSchedule::find($scheduleId);
            if (!$schedule) {
                return [
                    'data' => false,
                    'status' => 'NotFound',
                    'message' => 'Không tìm thấy lịch.'
                ];
            }

            DB::beginTransaction();
            $schedule->delete();
            DB::commit();

            return [
                'data' => true,
                'status' => 'Success',
                'message' => 'Xóa lịch thành công.'
            ];
        } catch (\Exception $ex) {
            Log::error('Lỗi khi xóa lịch: ' . $ex->getMessage());
            return [
                'data' => false,
                'status' => 'Error',
                'message' => 'Đã xảy ra lỗi khi xóa lịch: ' . $ex->getMessage()
            ];
        }
    }
}
