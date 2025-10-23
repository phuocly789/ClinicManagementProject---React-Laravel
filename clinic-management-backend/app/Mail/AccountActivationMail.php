<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AccountActivationMail extends Mailable
{
    use Queueable, SerializesModels;

    public $fullName;
    public $codeId;
    public $codeExpired;

    /**
     * Create a new message instance.
     */
    public function __construct($fullName, $codeId, $codeExpired)
    {
        $this->fullName = $fullName;
        $this->codeId = $codeId;
        $this->codeExpired = $codeExpired;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        return $this->view('email.account_activation')
            ->subject('Kích hoạt tài khoản của bạn')
            ->with([
                'fullName' => $this->fullName,
                'codeId' => $this->codeId,
                'codeExpired' => $this->codeExpired,
            ]);
    }
}
