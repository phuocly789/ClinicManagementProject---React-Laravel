<?php

namespace App\Http\Controllers\API\Receptionist;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Queue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QueueController extends Controller
{
    // Thêm AppointmentId vào hàng chờ
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
        $lastQueue = Queue::where('RoomId', $roomId)->whereDate('QueueDate', $queueDate)->max('QueueNumber');

        $newQueueNumber = $lastQueue ? $lastQueue + 1 : 1;
        try {
            DB::beginTransaction();
            $queue = Queue::create([
                'PatientId' => $patientId,
                'AppointmentId' => $appointmentId,
                'RecordId' => $recordId,
                'QueueNumber' => $newQueueNumber,
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
                    'QueueNumber' => $queue->QueueNumber,
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
    //Lấy danh sách hàng chờ theo room id và ngày
    public function GetQueueByRoomAndDate($room_id)
    {
        $today = now('Asia/Ho_Chi_Minh')->toDateString();

        $queues = Queue::where('RoomId', $room_id)
            ->where('QueueDate', $today)
            ->orderBy('QueueNumber', 'asc')
            ->get()
            ->map(function ($queue) {
                return [
                    'PatientId' => $queue->PatientId,
                    'PatientName' => $queue->user ? $queue->user->FullName : null,
                    'AppointmentId' => $queue->AppointmentId,
                    'RecordId' => $queue->RecordId,
                    'QueueNumber' => $queue->QueueNumber,
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
    public function UpdateQueueStatus($queueId) {}
    //Xóa hàng chờ
    public function DeleteQueue( $queueId) {
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
    public function PrioritizeQueue($queueId) {
        $queue = Queue::find($queueId);
        if (!$queue) {
            return response()->json([
                'success' => false,
                'message' => 'Hàng chờ không tồn tại.'
            ], 404);
        }

        if ($queue->QueueNumber == 1) {
            return response()->json([
                'success' => false,
                'message' => 'Hàng chờ đã ở vị trí ưu tiên nhất.'
            ], 400);
        }

        try {
            DB::beginTransaction();

            $roomId = $queue->RoomId;
            $queueDate = $queue->QueueDate;

            // ✅ Lấy toàn bộ queue cùng phòng và ngày
            $queues = Queue::where('RoomId', $roomId)
                ->whereDate('QueueDate', $queueDate)
                ->orderBy('QueueNumber')
                ->get();

            $queue->QueueNumber = 1;
            $queue->save();

            $currentNumber = 2;
            foreach ($queues as $q) {
                if ($q->QueueId != $queue->QueueId) {
                    $q->QueueNumber = $currentNumber;
                    $q->save();
                    $currentNumber++;
                }
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
