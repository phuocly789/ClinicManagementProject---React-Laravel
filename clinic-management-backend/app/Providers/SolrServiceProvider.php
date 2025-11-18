<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Solarium\Client;
use Solarium\Core\Client\Adapter\Curl;
use Symfony\Component\EventDispatcher\EventDispatcher;

class SolrServiceProvider extends ServiceProvider
{
    public function register()
    {
        $this->app->singleton(Client::class, function ($app) {
            $adapter = new Curl();
            $eventDispatcher = new EventDispatcher();

            $config = [
                'endpoint' => [
                    'localhost' => [
                        'host' => config('solr.host'),
                        'port' => config('solr.port'),
                        'path' => config('solr.path'),
                        'core' => config('solr.core'),
                        'timeout' => config('solr.timeout'),
                    ]
                ]
            ];

            return new Client($adapter, $eventDispatcher, $config);
        });

        // Đăng ký SolrService
        $this->app->singleton(\App\Services\SolrService::class, function ($app) {
            return new \App\Services\SolrService($app->make(Client::class));
        });
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Public config
        $this->publishes([
            __DIR__.'/../../config/solr.php' => config_path('solr.php'),
        ], 'solr-config');
    }
}