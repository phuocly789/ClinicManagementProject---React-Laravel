<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * The Artisan commands provided by your application.
     */
    protected $commands = [
        // Đăng ký command gửi mail
        \App\Console\Commands\SendAppointmentReminder::class,
        \App\Console\Commands\CheckMedicineAlerts::class,
    ];

    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule)
    {
        // Chạy command gửi email lúc 7h sáng mỗi ngày
        $schedule->command('appointment:reminder')
            ->dailyAt('07:00')
            ->timezone('Asia/Ho_Chi_Minh');

        $schedule->command('medicine:check-alerts')
            ->dailyAt('08:00')
            ->timezone('Asia/Ho_Chi_Minh');

        $schedule->command('inspire')->hourly();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands()
    {
        $this->load(__DIR__ . '/Commands');

        require base_path('routes/console.php');
    }
}
