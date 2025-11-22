<?php

namespace App\Observers;

use App\Events\DashboardStatsUpdated;
use App\Models\Appointment;
use App\Services\DashboardStatsService;

class AppointmentObserver
{
    protected $statsService;

    public function __construct(DashboardStatsService $statsService)
    {
        $this->statsService = $statsService;
    }

    public function created(Appointment $appointment)
    {
        $this->broadcastStats();
    }

    public function updated(Appointment $appointment)
    {
        if ($appointment->isDirty('Status') || $appointment->isDirty('AppointmentDate')) {
            $this->broadcastStats();
        }
    }

    public function deleted(Appointment $appointment)
    {
        $this->broadcastStats();
    }

    protected function broadcastStats()
    {
        $stats = $this->statsService->getRealtimeStats();
        broadcast(new DashboardStatsUpdated($stats));
    }
}
