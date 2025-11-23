<?php

namespace App\Observers;

use App\Events\DashboardStatsUpdated;
use App\Models\ServiceOrder;
use App\Services\DashboardStatsService;

class ServiceOrderObserver
{
    protected $statsService;

    public function __construct(DashboardStatsService $statsService)
    {
        $this->statsService = $statsService;
    }
    public function updated(ServiceOrder $order)
    {
        if ($order->isDirty('Status')) {
            $this->broadcastStats();
        }
    }
    public function created(ServiceOrder $order)
    {
        $this->broadcastStats();
    }
    protected function broadcastStats()
    {
        $stats = $this->statsService->getRealtimeStats();
        broadcast(new DashboardStatsUpdated($stats));
    }
}
