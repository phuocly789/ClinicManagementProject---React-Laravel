<?php

namespace App\Observers;

use App\Events\DashboardStatsUpdated;
use App\Models\Invoice;
use App\Services\DashboardStatsService;

class InvoiceObserver
{
    protected $statsService;

    public function __construct(DashboardStatsService $statsService)
    {
        $this->statsService = $statsService;
    }
    public function updated(Invoice $invoice)
    {
        if ($invoice->isDirty('Status') || $invoice->isDirty('TotalAmount') || $invoice->isDirty('InvoiceDate')) {
            $this->broadcastStats();
        }
    }

    public function created(Invoice $invoice)
    {
        $this->broadcastStats();
    }
    public function deleted(Invoice $invoice)
    {
        $this->broadcastStats();
    }
    protected function broadcastStats()
    {
        $stats = $this->statsService->getRealtimeStats();
        broadcast(new DashboardStatsUpdated($stats));
    }
}
