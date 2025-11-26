<?php

namespace App\Http\Services;

use App\Models\MedicalStaff;
use App\Models\StaffSchedule;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ScheduleService
{
    private function getRoleName($roleId)
    {
        return match ((int)$roleId) {
            3 => 'Lễ tân',
            4 => 'Bác sĩ',
            5 => 'Kĩ thuật viên',
            6 => 'Y tá',
            default => 'Không xác định',
        };
    }
    public function index(): array
    {
        try {
            $schedules = DB::table('StaffSchedules')
                ->select([
                    'StaffSchedules.ScheduleId',
                    'StaffSchedules.StaffId',
                    'StaffSchedules.WorkDate',
                    'StaffSchedules.StartTime',
                    'StaffSchedules.EndTime',
                    'StaffSchedules.IsAvailable',
                    'StaffSchedules.RoomId',
                    'StaffSchedules.UpdatedAt',
                    'Users.FullName as StaffName',
                    'UserRoles.RoleId', // Lấy RoleId từ bảng UserRoles
                    'Roles.RoleName', // Lấy trực tiếp tên role
                    'MedicalStaff.StaffType',
                    'Rooms.RoomName',
                    'Rooms.Description as RoomDescription'
                ])
                ->leftJoin('MedicalStaff', 'StaffSchedules.StaffId', '=', 'MedicalStaff.StaffId')
                ->leftJoin('Users', 'MedicalStaff.StaffId', '=', 'Users.UserId')
                ->leftJoin('UserRoles', 'Users.UserId', '=', 'UserRoles.UserId') // JOIN với UserRoles
                ->leftJoin('Roles', 'UserRoles.RoleId', '=', 'Roles.RoleId') // JOIN với Roles
                ->leftJoin('Rooms', 'StaffSchedules.RoomId', '=', 'Rooms.RoomId')
                ->get();

            $formatted = $schedules->map(function ($sched) {
                return [
                    'ScheduleId' => $sched->ScheduleId,
                    'StaffId' => $sched->StaffId,
                    'StaffName' => $sched->StaffName ?? 'NV' . $sched->StaffId,
                    'Role' => $sched->RoleName ?? $this->getRoleName($sched->StaffType) ?? 'Không xác định',
                    'WorkDate' => Carbon::parse($sched->WorkDate)->format('Y-m-d'),
                    'StartTime' => $sched->StartTime,
                    'EndTime' => $sched->EndTime,
                    'IsAvailable' => (bool)$sched->IsAvailable,
                    'RoomId' => $sched->RoomId,
                    'RoomName' => $sched->RoomName,
                    'RoomDescription' => $sched->RoomDescription,
                    'UpdatedAt' => $sched->UpdatedAt ? Carbon::parse($sched->UpdatedAt)->timezone('UTC')->toISOString() : null,
                ];
            });

            return [
                'data' => [
                    'Items' => $formatted,
                    'TotalItems' => $formatted->count(),
                ],
                'status' => 'Success',
                'message' => 'Lấy lịch thành công'
            ];
        } catch (\Exception $ex) {

            return [
                'data' => null,
                'status' => 'Error',
                'message' => $ex->getMessage()
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

            // Kiểm tra RoomId nếu có
            if (isset($data['RoomId'])) {
                $roomExists = DB::table('Rooms')->where('RoomId', $data['RoomId'])->exists();
                if (!$roomExists) {
                    return [
                        'data' => null,
                        'status' => 'BadRequest',
                        'message' => 'RoomId không tồn tại.'
                    ];
                }
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
                'RoomId' => $data['RoomId'] ?? null, // THÊM RoomId
            ]);

            DB::commit();

            return [
                'data' => [
                    'ScheduleId' => $schedule->ScheduleId, // THÊM ScheduleId
                    'StaffId' => $schedule->StaffId,
                    'WorkDate' => $schedule->WorkDate,
                    'StartTime' => $schedule->StartTime,
                    'EndTime' => $schedule->EndTime,
                    'IsAvailable' => $schedule->IsAvailable,
                    'RoomId' => $schedule->RoomId, // THÊM RoomId
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

            $clientUpdatedAt = $data['UpdatedAt'] ?? null;

            // SO SÁNH: Nếu DB mới hơn → có người đã sửa trước!
            if ($clientUpdatedAt && $schedule->UpdatedAt && $schedule->UpdatedAt->greaterThan($clientUpdatedAt)) {
                return [
                    'status' => 'Conflict',
                    'message' => 'Lịch này đã được sửa bởi người khác!',
                    'data' => null
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

            // Kiểm tra RoomId nếu có
            if (isset($data['RoomId'])) {
                $roomExists = DB::table('Rooms')->where('RoomId', $data['RoomId'])->exists();
                if (!$roomExists) {
                    return [
                        'data' => null,
                        'status' => 'BadRequest',
                        'message' => 'RoomId không tồn tại.'
                    ];
                }
            }

            // Sửa điều kiện kiểm tra trùng lịch
            $hasOverlappingSchedule = StaffSchedule::where('StaffId', $data['StaffId'])
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

            $schedule->fill([
                'StaffId' => $data['StaffId'],
                'WorkDate' => $workDate->toDateString(),
                'StartTime' => $startTime,
                'EndTime' => $endTime,
                'IsAvailable' => $data['IsAvailable'],
                'RoomId' => $data['RoomId'] ?? $schedule->RoomId,
            ]);

            $schedule->save();
            DB::commit();

            return [
                'data' => [
                    'ScheduleId' => $schedule->ScheduleId,
                    'StaffId' => $schedule->StaffId,
                    'WorkDate' => $schedule->WorkDate,
                    'StartTime' => $schedule->StartTime,
                    'EndTime' => $schedule->EndTime,
                    'IsAvailable' => $schedule->IsAvailable,
                    'RoomId' => $schedule->RoomId,
                    'UpdatedAt' => $schedule->UpdatedAt->timezone('UTC')->toISOString()
                ],
                'status' => 'Success',
                'message' => 'Cập nhật lịch thành công.'
            ];
        } catch (\Exception $ex) {
            DB::rollBack();
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

            // KIỂM TRA có appointment nào đang sử dụng schedule này không
            $hasAppointments = DB::table('Appointments')
                ->where('ScheduleId', $scheduleId)
                ->exists();

            if ($hasAppointments) {
                return [
                    'data' => false,
                    'status' => 'BadRequest',
                    'message' => 'Không thể xóa lịch đã có lịch hẹn.'
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
            DB::rollBack();
            Log::error('Lỗi khi xóa lịch: ' . $ex->getMessage());
            return [
                'data' => false,
                'status' => 'Error',
                'message' => 'Đã xảy ra lỗi khi xóa lịch: ' . $ex->getMessage()
            ];
        }
    }
}
