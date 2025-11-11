<?php

namespace App\Providers;

// use Illuminate\Support\Facades\Gate;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Laravel\Passport\Passport;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        // 'App\Models\Model' => 'App\Policies\ModelPolicy',
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // Passport::routes();
        // Access token hết hạn sau 1 ngày
        Passport::tokensExpireIn(now()->addDays(1));

        // Refresh token hết hạn sau 30 ngày
        Passport::refreshTokensExpireIn(now()->addDays(30));

        // Personal access token hết hạn sau 1 năm
        Passport::personalAccessTokensExpireIn(now()->addYear());
    }
}
