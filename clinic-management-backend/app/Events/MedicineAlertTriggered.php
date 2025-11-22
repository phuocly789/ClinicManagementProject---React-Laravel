<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class MedicineAlertTriggered implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $alertId;
    public $medicineId;

    public function __construct($alertId, $medicineId)
    {
        $this->alertId = $alertId;
        $this->medicineId = $medicineId;
    }

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('admin-alerts');
    }

    public function broadcastAs(): string
    {
        return 'MedicineAlertTriggered';
    }

    public function broadcastWith(): array
    {
        $alert = \App\Models\Alert::find($this->alertId);
        $medicine = \App\Models\Medicine::find($this->medicineId);

        if (!$alert || !$medicine) {
            Log::warning("Broadcast failed: Alert ID {$this->alertId} or Medicine ID {$this->medicineId} not found");
            return [];
        }

        return [
            'alert' => $alert->toArray(),
            'medicine' => $medicine->toArray(),
        ];
    }
}