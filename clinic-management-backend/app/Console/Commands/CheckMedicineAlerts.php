<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Medicine;
use App\Models\Alert;
use App\Events\MedicineAlertTriggered;
use Carbon\Carbon;

class CheckMedicineAlerts extends Command
{
    protected $signature = 'medicine:check-alerts';
    protected $description = 'Kiểm tra thuốc hết hạn & tồn kho thấp';

    public function handle()
    {
        $today = Carbon::today();
        $soon = $today->copy()->addDays(30);

        $this->checkExpiring($today, $soon);
        $this->checkExpired($today);
        $this->checkLowStock();

        $this->info('Kiểm tra cảnh báo hoàn tất.');
    }

    private function checkExpiring($today, $soon)
    {
        $medicines = Medicine::whereBetween('ExpiryDate', [$today, $soon])
            ->whereNotNull('ExpiryDate')
            ->get();

        foreach ($medicines as $m) {
            $this->triggerAlert($m, 'expiring_soon', "Sắp hết hạn: {$m->MedicineName}");
        }
    }

    private function checkExpired($today)
    {
        $medicines = Medicine::where('ExpiryDate', '<', $today)
            ->whereNotNull('ExpiryDate')
            ->get();

        foreach ($medicines as $m) {
            $this->triggerAlert($m, 'expired', "ĐÃ HẾT HẠN: {$m->MedicineName}");
        }
    }

    private function checkLowStock()
    {
        $medicines = Medicine::whereColumn('StockQuantity', '<=', 'LowStockThreshold')
            ->where('LowStockThreshold', '>', 0)
            ->get();

        foreach ($medicines as $m) {
            $this->triggerAlert($m, 'low_stock', "Tồn kho thấp: {$m->MedicineName} (còn {$m->StockQuantity})");
        }
    }

    private function triggerAlert($medicine, $type, $message)
    {
        // Kiểm tra tránh gửi trùng trong ngày
        $existing = Alert::where('medicine_id', $medicine->MedicineId)
            ->where('type', $type)
            ->whereDate('created_at', now()->toDateString())
            ->first();

        if (!$existing) {
            // Tạo alert
            $alert = Alert::create([
                'medicine_id' => $medicine->MedicineId,
                'type' => $type,
                'message' => $message,
            ]);

            // GỌI EVENT ĐÚNG CÁCH
            event(new MedicineAlertTriggered($alert->id, $medicine->MedicineId));
        }
    }
}