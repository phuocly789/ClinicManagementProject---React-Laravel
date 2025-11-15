<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Notification;
use Carbon\Carbon;
use App\Jobs\SendAppointmentReminderJob;

class SendAppointmentReminder extends Command
{
    protected $signature = 'appointment:reminder';
    protected $description = 'Gửi email nhắc lịch hẹn trước 2 ngày';

    public function handle()
    {
        $targetDate = Carbon::now('Asia/Ho_Chi_Minh')->addDays(2)->toDateString();

        $notifications = Notification::with([
            'user:UserId,FullName,Email',
            'appointment.medical_staff.user:UserId,FullName'
        ])
            ->whereHas('appointment', function ($q) use ($targetDate) {
                $q->where('AppointmentDate', $targetDate);
            })
            ->get();

        foreach ($notifications as $notification) {
            $user = $notification->user;
            $appointment = $notification->appointment;
            $doctorUser = $appointment->medical_staff?->user;

            if ($user && $user->Email && $appointment) {
                SendAppointmentReminderJob::dispatch(
                    $user->Email,
                    $user->FullName,
                    $appointment->AppointmentDate->format('d/m/Y'),
                    $appointment->AppointmentTime,
                    $doctorUser?->FullName ?? 'Bác sĩ',
                    $notification->Message ?? 'Không có lời nhắn'
                );
            }
        }

        $this->info('Reminder emails have been queued successfully.');
    }
}
