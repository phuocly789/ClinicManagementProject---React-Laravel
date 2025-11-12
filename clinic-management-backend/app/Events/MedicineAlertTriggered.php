<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MedicineAlertTriggered implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public $alertId;
    public $medicineId;

    public function __construct($alertId, $medicineId)
    {
        $this->alertId = $alertId;
        $this->medicineId = $medicineId;
    }

    public function broadcastOn()
    {
        return new Channel('admin-alerts');
    }

    public function broadcastAs()
    {
        return 'medicine.alert';
    }

    public function broadcastWith()
    {
        $alert = \App\Models\Alert::find($this->alertId);
        $medicine = \App\Models\Medicine::find($this->medicineId);

        return [
            'alert' => $alert,
            'medicine' => $medicine,
        ];
    }
}