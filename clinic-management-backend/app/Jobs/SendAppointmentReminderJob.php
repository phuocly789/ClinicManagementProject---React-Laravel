<?php

namespace App\Jobs;

use App\Mail\AppointmentConfirmationMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendAppointmentReminderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $userEmail;
    protected $userName;
    protected $date;
    protected $time;
    protected $doctorName;
    protected $messageFromDoctor;

    public function __construct($userEmail, $userName, $date, $time, $doctorName, $messageFromDoctor)
    {
        $this->userEmail = $userEmail;
        $this->userName = $userName;
        $this->date = $date;
        $this->time = $time;
        $this->doctorName = $doctorName;
        $this->messageFromDoctor = $messageFromDoctor;
    }

    public function handle()
    {
        Mail::to($this->userEmail)
            ->send(new AppointmentConfirmationMail(
                $this->userName,
                $this->date,
                $this->time,
                $this->doctorName,
                $this->messageFromDoctor
            ));
    }
}
