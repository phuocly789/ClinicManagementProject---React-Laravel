<?php

return [
    'host' => env('SOLR_HOST', 'solr-app'),
    'port' => env('SOLR_PORT', 8983),
    'path' => env('SOLR_PATH', '/solr'),
    'core' => env('SOLR_CORE', 'clinic_management'),
    'timeout' => env('SOLR_TIMEOUT', 30),
];