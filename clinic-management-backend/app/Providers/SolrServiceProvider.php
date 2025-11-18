<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Solarium\Client;
use Solarium\Core\Client\Adapter\Curl;
use Symfony\Component\EventDispatcher\EventDispatcher;

class SolrServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(Client::class, function ($app) {
            $adapter = new Curl();
            $eventDispatcher = new EventDispatcher();
            
            $config = [
                'endpoint' => [
                    'localhost' => [
                        'host' => env('SOLR_HOST', 'solr'),
                        'port' => (int) env('SOLR_PORT', 8983),
                        'path' => env('SOLR_PATH', '/solr/'),
                        'core' => env('SOLR_CORE', 'clinic_management'),
                        'scheme' => env('SOLR_SCHEME', 'http'),
                        'timeout' => (int) env('SOLR_TIMEOUT', 30),
                    ]
                ]
            ];
            
            // Bỏ dòng Log::info
            
            return new Client($adapter, $eventDispatcher, $config);
        });
    }

    public function boot(): void
    {
        //
    }
}