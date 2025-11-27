<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

// ✅ ShouldBroadcastNow = broadcast ngay lập tức, không qua queue
class QueueStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $doctor;
    public $receptionist;
    public $roomId;
    public $action;

    public function __construct($doctor, $receptionist, $roomId, $action)
    {
        $this->doctor = $doctor;
        $this->receptionist = $receptionist;
        $this->roomId = $roomId;
        $this->action = $action;
    }

    public function broadcastOn()
    {
        return [
            new Channel("room.{$this->roomId}"),
            new Channel("receptionist")
        ];
    }

    public function broadcastAs()
    {
        return 'queue.status.updated';
    }

    public function broadcastWith()
    {
        return [
            'doctor' => $this->doctor,
            'receptionist' => $this->receptionist,
            'action' => $this->action,
        ];
    }
}
