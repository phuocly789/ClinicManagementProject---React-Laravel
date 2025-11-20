<?php

namespace App\Http\Controllers\API\Receptionist;

use App\Events\QueueStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\MedicalRecord;
use App\Models\Queue;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QueueController extends Controller
{
    // Thêm Khách kh có lịch hẹn trước vào hàng đợi
    public function CreateDicrectAppointment(Request $request)
    {
        $request->validate([
            'PatientId' => 'required|integer|exists:Patients,PatientId',
            'StaffId' => 'required|integer|exists:MedicalStaff,StaffId',
            'Notes' => 'nullable|string',
            'RoomId' => 'required|integer|exists:Rooms,RoomId'
        ]);
        try {

            // if(!auth()->check()){
            //     return response()->json([
            //         'success' => false,
            //         'message' => 'Bạn không có quyền'
            //     ],401);
            // }
            DB::beginTransaction();

            $today = now('Asia/Ho_Chi_Minh')->toDateString();
            $time = now('Asia/Ho_Chi_Minh')->format('H:i:s');
            $CreatedBy = auth()->id();
            // $CreatedBy = 3;

            // 1. Lấy hồ sơ bệnh án của bệnh nhân RecordId
            $record = MedicalRecord::where('PatientId', $request->input('PatientId'))->where('Status', 'Hoạt động')->first();
            if ($record == null) {
                $record = MedicalRecord::create([
                    'PatientId' => $request->input('PatientId'),
                    'RecordNumber' => 'MR-' . date('Ymd') . '-' . $request->input('PatientId'),
                    'IssuedDate' => $today,
                    'Status' => 'Hoạt động',
                    'Notes' => 'Cấp hồ sơ bệnh nhân ' . $request->input('PatientId'),
                    'CreatedBy' => $CreatedBy,
                ]);
            }
            // 2. Tạo Appointment
            $appointment = Appointment::create([
                'PatientId' => $request->input('PatientId'),
                'StaffId' => $request->StaffId,
                'RecordId' => $record->RecordId,
                'ScheduleId' => null,
                'AppointmentDate' => $today,
                'AppointmentTime' => $time,
                'Status' => 'Đang chờ',
                'CreatedBy' => $CreatedBy,
                'Notes' => $request->Notes
            ]);
            // 3. Tạo ticket Number
            $lastTicket = Queue::where('QueueDate', $today)->max('TicketNumber');
            $newTicketNumber = $lastTicket ? $lastTicket + 1 : 1;

            // 4. lấy QueuePosition cuối hàng
            $lastQueue = Queue::where('QueueDate', $today)->max('QueuePosition');
            $newQueuePosition = $lastQueue ? $lastQueue + 1 : 1;

            //5. Tạo Queue
            $queue = Queue::create([
                'PatientId' => $request->input('PatientId'),
                'AppointmentId' => $appointment->AppointmentId,
                'RecordId' => $appointment->RecordId,
                'RoomId' => $request->RoomId,
                'QueueDate' => $today,
                'QueueTime' => $time,
                'Status' => $appointment->Status,
                'CreatedBy' => $CreatedBy,
                'TicketNumber' => $newTicketNumber,
                'QueuePosition' => $newQueuePosition
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Lịch hẹn được tạo thành công.',
                'data' => [
                    'Record' => $record,
                    'Appointment' => $appointment,
                    'Queue' => $queue
                ]
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tạo lịch hẹn: ' . $e->getMessage()
            ], 500);
        }
    }

    public function CreateQueue(Request $request)
    {
        $request->validate([
            'RoomId' => 'required|integer|exists:Rooms,RoomId',
            'AppointmentId' => 'required|integer|exists:Appointments,AppointmentId'
        ]);

        $appointmentId = $request->input('AppointmentId');
        $roomId = $request->input('RoomId');
        $queueDate = now('Asia/Ho_Chi_Minh')->format('Y-m-d');
        $queueTime = now('Asia/Ho_Chi_Minh')->format('H:i:s');

        //lấy patientId và recordId từ appointmentId
        $appointment = Appointment::with('medical_record')->find($appointmentId);
        if (!$appointment) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy lịch hẹn với ID đã cho.'
            ], 404);
        }
        $patientId = $appointment->PatientId;
        $recordId = $appointment->RecordId;
        $status = $appointment->Status;
        $createdBy = $appointment->CreatedBy;
        //lấy số thứ tự hàng chờ lớn nhất trong ngày và phòng
        $lastTicket = Queue::where('QueueDate', $queueDate)->max('TicketNumber');
        $newTicketNumber = $lastTicket ? $lastTicket + 1 : 1;

        $lastQueue = Queue::where('RoomId', $roomId)->whereDate('QueueDate', $queueDate)->max('QueuePosition');
        $newQueuePosition = $lastQueue ? $lastQueue + 1 : 1;

        try {
            DB::beginTransaction();
            $queue = Queue::create([
                'PatientId' => $patientId,
                'AppointmentId' => $appointmentId,
                'RecordId' => $recordId,
                'TicketNumber' => $newTicketNumber,
                'QueuePosition' => $newQueuePosition,
                'RoomId' => $roomId,
                'QueueDate' => $queueDate,
                'QueueTime' => $queueTime,
                'Status' => $status,
                'CreatedBy' => $createdBy //giả sử userId=3
            ]);
            DB::commit();
            return response()->json([
                'status' => 'success',
                'data' => [
                    'QueueId' => $queue->QueueId,
                    'PatientId' => $queue->PatientId,
                    'AppointmentId' => $queue->AppointmentId,
                    'RecordId' => $queue->RecordId,
                    'TicketNumber' => $queue->TicketNumber,
                    'QueuePosition' => $queue->QueuePosition,
                    'RoomId' => $queue->RoomId,
                    'QueueDate' => $queue->QueueDate,
                    'QueueTime' => $queue->QueueTime,
                    'Status' => $queue->Status,
                    'CreatedBy' => $queue->CreatedBy
                ],
                'message' => 'Thêm hàng chờ thành công.'
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi thêm hàng chờ: ' . $e->getMessage()
            ], 400);
        }
    }
    //Lấy tất cả các queue room
    public function GetQueueByDate()
    {
        $today = now('Asia/Ho_Chi_Minh')->toDateString();

        $queues = Queue::with([
            'user:UserId,FullName',
            'room:RoomId,RoomName'
        ])
            ->where('QueueDate', $today)
            ->orderBy('QueuePosition', 'asc')
            ->get()
            ->map(function ($queue) {
                return [
                    'QueueId' => $queue->QueueId,
                    'PatientId' => $queue->PatientId,
                    'PatientName' => optional($queue->user)->FullName,
                    'AppointmentId' => $queue->AppointmentId,
                    'RecordId' => $queue->RecordId,
                    'TicketNumber' => $queue->TicketNumber,
                    'QueuePosition' => $queue->QueuePosition,
                    'RoomId' => $queue->RoomId,
                    'RoomName' => optional($queue->room)->RoomName,
                    'QueueDate' => $queue->QueueDate,
                    'QueueTime' => $queue->QueueTime,
                    'Status' => $queue->Status,
                    'CreatedBy' => $queue->CreatedBy,
                ];
            });
        return response()->json([
            'status' => 'success',
            'data' => $queues,
            'message' => 'Danh sách hàng chờ được tải thành công.'
        ], 200);
    }
    //Lấy danh sách hàng chờ theo room id và ngày
    public function GetQueueByRoomAndDate($room_id)
    {
        $today = now('Asia/Ho_Chi_Minh')->toDateString();

        $queues = Queue::where('RoomId', $room_id)
            ->where('QueueDate', $today)
            ->orderBy('QueuePosition', 'asc')
            ->get()
            ->map(function ($queue) {
                return [
                    'QueueId' => $queue->QueueId,
                    'PatientId' => $queue->PatientId,
                    'PatientName' => $queue->user ? $queue->user->FullName : null,
                    'AppointmentId' => $queue->AppointmentId,
                    'RecordId' => $queue->RecordId,
                    'TicketNumber' => $queue->TicketNumber,
                    'QueuePosition' => $queue->QueuePosition,
                    'RoomId' => $queue->RoomId,
                    'RoomName' => $queue->room ? $queue->room->RoomName : null,
                    'QueueDate' => $queue->QueueDate,
                    'QueueTime' => $queue->QueueTime,
                    'Status' => $queue->Status,
                    'CreatedBy' => $queue->CreatedBy,
                ];
            });
        return response()->json([
            'status' => 'success',
            'data' => $queues,
            'message' => 'Danh sách hàng chờ được tải thành công.'
        ], 200);
    }
    //Cập nhật trạng thái hàng chờ
    public function UpdateQueueStatus(Request $request, $queueId)
    {
        $request->validate([
            'Status' => 'required|string|in:Đã đặt,Đang chờ,Đang khám,Đã khám,Hủy'
        ]);

        $queue = Queue::find($queueId);
        if (!$queue) {
            return response()->json([
                'success' => false,
                'message' => 'Hàng chờ không tồn tại.'
            ], 404);
        }

        $appointment = Appointment::find($queue->AppointmentId);
        if (!$appointment) {
            return response()->json([
                'success' => false,
                'message' => 'Lịch hẹn không tồn tại.'
            ], 404);
        }

        $queue->Status = $request->input('Status');
        $queue->save();

        $appointment->Status = $request->input('Status');
        $appointment->save();

        if ($request->input('Status') === "Đang khám") {
            // Full data bác sĩ cần
            $patient = \App\Models\Patient::with('user')->find($queue->PatientId);

            $doctorData = [
                'id' => $queue->AppointmentId,
                'date' => $queue->QueueDate,
                'time' => $queue->QueueTime,
                'name' => $patient->user->FullName,
                'status' => $queue->Status,
                'patient_id' => $queue->PatientId,
                'gender' => $patient->user->Gender,
                'age' => Carbon::parse($patient->user->DateOfBirth)->age,
                'phone' => $patient->user->Phone,
                'address' => $patient->user->Address,
                // 'notes' => $patient->Note,
            ];

            // Payload lễ tân
            $receptionistData = [
                'QueueId'       => $queue->QueueId,
                'PatientId'     => $queue->PatientId,
                'PatientName'   => $patient->name,
                'AppointmentId' => $queue->AppointmentId,
                'QueueDate'     => $queue->QueueDate,
                'QueueTime'     => $queue->QueueTime,
                'QueuePosition' => $queue->QueuePosition,
                'RoomId'        => $queue->RoomId,
                'Status'        => $queue->Status
            ];

            broadcast(new QueueStatusUpdated(
                doctor: $doctorData,
                receptionist: $receptionistData,
                roomId: $queue->RoomId,
                action: 'updated'
            ))->toOthers();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'QueueId' => $queue->QueueId,
                'Status' => $queue->Status,
            ],
            'message' => 'Cập nhật trạng thái hàng chờ thành công.'
        ]);
    }
    //Xóa hàng chờ
    public function DeleteQueue($queueId)
    {
        $queue = Queue::find($queueId);
        if (!$queue) {
            return response()->json([
                'success' => false,
                'message' => 'Hàng chờ không tồn tại.'
            ], 404);
        }
        $queue->delete();
        return response()->json([
            'success' => true,
            'message' => 'Xóa hàng chờ thành công.'
        ], 200);
    }
    //ưu tiên hàng chờ
    public function PrioritizeQueue($queueId)
    {
        $queue = Queue::find($queueId);
        if (!$queue) {
            return response()->json([
                'success' => false,
                'message' => 'Hàng chờ không tồn tại.'
            ], 404);
        }

        if ($queue->QueuePosition == 1) {
            return response()->json([
                'success' => false,
                'message' => 'Hàng chờ đã ở vị trí ưu tiên nhất.'
            ], 400);
        }

        try {
            DB::beginTransaction();

            $roomId = $queue->RoomId;
            $queueDate = $queue->QueueDate;


            $otherQueues = Queue::where('RoomId', $roomId)
                ->whereDate('QueueDate', $queueDate)
                ->where('QueueId', '!=', $queue->QueueId)
                ->orderBy('QueuePosition')
                ->get();

            $queue->QueuePosition = 1;
            $queue->save();

            $currentPos = 2;
            foreach ($otherQueues as $q) {
                $q->QueuePosition = $currentPos++;
                $q->save();
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã ưu tiên bệnh nhân lên đầu hàng chờ.'
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi ưu tiên hàng chờ: ' . $e->getMessage()
            ], 500);
        }
    }
}