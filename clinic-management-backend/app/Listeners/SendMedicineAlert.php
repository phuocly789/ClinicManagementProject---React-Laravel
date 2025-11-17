<?php

namespace App\Listeners;

use App\Events\MedicineAlertTriggered;
use App\Models\Alert;
use App\Models\Medicine;
use Illuminate\Support\Facades\Mail;

class SendMedicineAlert
{
    public function handle(MedicineAlertTriggered $event)
    {
        $alert = Alert::find($event->alertId);
        $medicine = Medicine::find($event->medicineId);

        if (!$alert || !$medicine) return;

        // Gửi email
        try {
            Mail::raw("CẢNH BÁO: {$alert->message}\n\nThuốc: {$medicine->MedicineName}\nTồn kho: {$medicine->StockQuantity}", function ($message) {
                $message->to('admin@clinic.com')
                        ->subject('Cảnh báo thuốc');
            });
            $alert->update(['email_sent' => true]);
        } catch (\Exception $e) {
            \Log::error("Email failed: " . $e->getMessage());
        }
    }
}