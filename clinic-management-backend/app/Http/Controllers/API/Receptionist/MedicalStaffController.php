<?php

namespace App\Http\Controllers\API\Receptionist;

use App\Http\Controllers\Controller;
use App\Models\MedicalStaff;
use Illuminate\Http\Request;

class MedicalStaffController extends Controller
{
    //
    public function getDoctorsWithSchedules(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'room_id' => 'nullable|integer|exists:Rooms,RoomId'
        ]);

        $date = $request->input('date');
        $roomId = $request->input('room_id');

        $query = MedicalStaff::with(['user', 'schedules' => function ($query) use ($date) {
            $query->where('WorkDate', $date)
                ->where('IsAvailable', true);
        }])
            ->where('StaffType', 'Bác sĩ')
            ->whereHas('schedules', function ($query) use ($date) {
                $query->where('WorkDate', $date)
                    ->where('IsAvailable', true);
            });

        if ($roomId) {
            $query->whereHas('schedules', function ($query) use ($roomId) {
                $query->where('RoomId', $roomId);
            });
        }

        $doctors = $query->get()->map(function ($doctor) {
            return [
                'StaffId' => $doctor->StaffId,
                'FullName' => $doctor->user->FullName,
                'Specialty' => $doctor->Specialty,
                'LicenseNumber' => $doctor->LicenseNumber,
                'StaffType' => $doctor->StaffType,
                'schedules' => $doctor->schedules->map(function ($schedule) {
                    return [
                        'ScheduleId' => $schedule->ScheduleId,
                        'RoomId' => $schedule->RoomId,
                        'WorkDate' => $schedule->WorkDate,
                        'StartTime' => $schedule->StartTime,
                        'EndTime' => $schedule->EndTime,
                        'IsAvailable' => $schedule->IsAvailable
                    ];
                })
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $doctors,
            'message' => 'Danh sách bác sĩ và lịch làm việc được tải thành công.'
        ]);
    }

    public function getDoctorsByRoom(Request $request, $roomId)
    {
        $request->validate([
            'date' => 'required|date'
        ]);

        $date = $request->input('date');

        $doctors = MedicalStaff::with(['user', 'schedules' => function ($query) use ($date, $roomId) {
            $query->where('WorkDate', $date)
                ->where('RoomId', $roomId)
                ->where('IsAvailable', true);
        }])
            ->where('StaffType', 'Bác sĩ')
            ->whereHas('schedules', function ($query) use ($date, $roomId) {
                $query->where('WorkDate', $date)
                    ->where('RoomId', $roomId)
                    ->where('IsAvailable', true);
            })
            ->get()
            ->map(function ($doctor) {
                return [
                    'StaffId' => $doctor->StaffId,
                    'FullName' => $doctor->user->FullName,
                    'Specialty' => $doctor->Specialty,
                    'schedules' => $doctor->schedules
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $doctors,
            'message' => 'Danh sách bác sĩ theo phòng được tải thành công.'
        ]);
    }
}
