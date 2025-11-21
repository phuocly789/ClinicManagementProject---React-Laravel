<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AppointmentUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $appointment;
    public $action;

    /**
     * Create a new event instance.
     */
    public function __construct($appointment, $action = 'updated')
    {
        $this->appointment = $appointment;
        $this->action = $action;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('appointments'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'appointment.updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->appointment->id,
            'patient_name' => $this->appointment->patient_name,
            'doctor_id' => $this->appointment->doctor_id ?? null,
            'user_id' => $this->appointment->user_id ?? null,
            'appointment_date' => $this->appointment->appointment_date,
            'status' => $this->appointment->status,
            'action' => $this->action,
            'timestamp' => now()->toISOString(),
        ];
    }
}
