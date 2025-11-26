<?php

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

class QueueUpdated implements ShouldBroadcastNow
{
    public $queue;

    public function __construct($queue)
    {
        $this->queue = $queue;
    }

    public function broadcastOn()
    {
        return new Channel('doctor.queue');
    }
}
