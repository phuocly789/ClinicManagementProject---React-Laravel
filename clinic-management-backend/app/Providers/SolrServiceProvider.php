<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Solarium\Client;
use Solarium\Core\Client\Adapter\Curl;
use Symfony\Component\EventDispatcher\EventDispatcher;
use App\Observers\UserSolrObserver;
use App\Models\User;

class SolrServiceProvider extends ServiceProvider
{
   public function register(): void
{
    $this->app->singleton(Client::class, function ($app) {
        $adapter = new Curl();
        $eventDispatcher = new EventDispatcher();
        return new Client($adapter, $eventDispatcher, config('solr')); // ← DÒNG DUY NHẤT QUAN TRỌNG
    });
}

    public function boot(): void
    {
        User::observe(UserSolrObserver::class);
    }
}