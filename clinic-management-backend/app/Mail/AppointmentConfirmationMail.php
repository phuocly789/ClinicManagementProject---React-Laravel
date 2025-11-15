<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AppointmentConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public $userName;
    public $date;
    public $time;
    public $doctorName;
    public $messageFromDoctor;

    public function __construct($userName, $date, $time, $doctorName, $messageFromDoctor)
    {
        $this->userName = $userName;
        $this->date = $date;
        $this->time = $time;
        $this->doctorName = $doctorName;
        $this->messageFromDoctor = $messageFromDoctor;
    }

    public function build()
    {
        return $this->subject('Xác nhận lịch hẹn')
            ->view('email.appointment-confirmation')
            ->with([
                'userName' => $this->userName,
                'date' => $this->date,
                'time' => $this->time,
                'doctorName' => $this->doctorName,
                'messageFromDoctor' => $this->messageFromDoctor,
            ]);
    }
}
