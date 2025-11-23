<?php

namespace App\Providers;

use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\ServiceOrder;
use App\Observers\AppointmentObserver;
use App\Observers\InvoiceObserver;
use App\Observers\ServiceOrderObserver;
use Illuminate\Support\ServiceProvider;
use Solarium\Client;

class AppServiceProvider extends ServiceProvider
{
    public function register()
    {

    }

    public function boot()
    {
        Appointment::observe(AppointmentObserver::class);
        Invoice::observe(InvoiceObserver::class);
        ServiceOrder::observe(ServiceOrderObserver::class);
    }
}
