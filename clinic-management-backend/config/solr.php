<?php

return [
    'endpoint' => [
        '125.212.218.44' => [
            'host' => env('SOLR_HOST', 'solr'),
            'port' => (int) env('SOLR_PORT', 8983),
            'path' => env('SOLR_PATH', '/'),
            'core' => env('SOLR_CORE', 'clinic_management'),
            'scheme' => env('SOLR_SCHEME', 'http'),
            'timeout' => (int) env('SOLR_TIMEOUT', 30),
        ]
    ]
];
