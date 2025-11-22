<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class QueueStatusUpdated implements ShouldBroadcast
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
