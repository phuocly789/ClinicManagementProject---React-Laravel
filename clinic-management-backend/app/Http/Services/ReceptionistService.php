<?php

namespace App\Http\Services;

use App\Exceptions\AppErrors;
use App\Mail\AccountActivationMail;
use App\Models\Appointment;
use App\Models\MedicalRecord;
use App\Models\Notification;
use App\Models\Patient;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class ReceptionistService
{
    public function handleGetNotification(int $current = 1, int $pageSize = 10)
    {
        $user = Auth::user();

        if (!$user) {
            throw new AppErrors("Không tìm thấy người dùng", 404);
        }

        $current = max(1, $current);
        $pageSize = max(10, $pageSize);

        $today = now()->toDateString();

        // Query với eager loading
        $query = Notification::with([
            'user:UserId,FullName',
            'appointment:AppointmentId,AppointmentDate,AppointmentTime'
        ])
            ->whereHas('appointment', function ($q) use ($today) {
                $q->where('AppointmentDate', '>=', $today);
            })
            ->orderBy(Appointment::select('AppointmentDate')
                ->whereColumn('AppointmentId', 'Notifications.AppointmentId')
                ->limit(1), 'asc')
            ->orderBy(Appointment::select('AppointmentTime')
                ->whereColumn('AppointmentId', 'Notifications.AppointmentId')
                ->limit(1), 'asc');

        $totalItems = $query->count();

        $notifications = $query
            ->skip(($current - 1) * $pageSize)
            ->take($pageSize)
            ->get()
            ->map(function ($item) {
                return [
                    'notification_id' => $item->NotificationId,
                    'message'         => $item->Message,
                    'full_name'       => $item->user?->FullName ?? 'N/A',
                    'date'            => $item->appointment?->AppointmentDate ?? null,
                    'time'            => $item->appointment?->AppointmentTime ?? null,
                ];
            });;

        return [
            'current' => $current,
            'totalItems' => $totalItems,
            'totalPages' => ceil($totalItems / $pageSize),
            'data' => $notifications,
        ];
    }
}