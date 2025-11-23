<?php

namespace App\Services;

use Solarium\Client;
use Solarium\Core\Client\Adapter\Curl;
use Symfony\Component\EventDispatcher\EventDispatcher;
use Illuminate\Support\Facades\Log;

class SolrService
{
    protected $client;

    public function __construct()
    {
        $this->initializeClient();
    }

    protected function initializeClient()
    {
        $adapter = new Curl();
        $eventDispatcher = new EventDispatcher();

        $config = [
            'endpoint' => [
                'localhost' => [
                    'host' => config('solr.endpoint.localhost.host', 'solr'),
                    'port' => config('solr.endpoint.localhost.port', 8983),
                    'path' => config('solr.endpoint.localhost.path', '/solr'),
                    'core' => config('solr.endpoint.localhost.core', 'clinic_management'),
                    'timeout' => config('solr.endpoint.localhost.timeout', 30),
                ]
            ]
        ];

        $this->client = new Client($adapter, $eventDispatcher, $config);
    }

    public function search($query = '', $filters = [], $page = 1, $perPage = 10)
    {
        try {
            // Tạo query
            $solrQuery = $this->client->createSelect();
            
            // Thiết lập query string
            if (!empty($query)) {
                $solrQuery->setQuery($query);
            } else {
                $solrQuery->setQuery('*:*');
            }

            // Thiết lập phân trang
            $solrQuery->setStart(($page - 1) * $perPage);
            $solrQuery->setRows($perPage);

            // Thêm filters
            if (!empty($filters)) {
                foreach ($filters as $field => $value) {
                    $solrQuery->createFilterQuery($field)
                        ->setQuery("$field:\"$value\"");
                }
            }

            // Thực thi query
            $resultset = $this->client->select($solrQuery);

            // Format kết quả
            return [
                'success' => true,
                'results' => $this->formatResults($resultset),
                'total' => $resultset->getNumFound(),
                'pages' => ceil($resultset->getNumFound() / $perPage),
                'current_page' => $page,
                'per_page' => $perPage,
                'facets' => []
            ];

        } catch (\Exception $e) {
            Log::error('Solr search error: ' . $e->getMessage());
            throw $e;
        }
    }

    protected function formatResults($resultset)
{
    $results = [];
    foreach ($resultset as $document) {
        $fields = $document->getFields();

        $results[] = [
            'id'              => $fields['id'] ?? null,
            'title'           => $fields['title'] ?? $fields['service_name'] ?? $fields['medicine_name'] ?? $fields['full_name'] ?? 'Không có tiêu đề',
            'content'         => $fields['content'] ?? $fields['description'] ?? '',
            'type'            => $fields['type'] ?? '',
            'service_type'    => $fields['service_type'] ?? null,
            'service_name'    => $fields['service_name'] ?? null,
            'price'           => $fields['price'] ?? 0,
            'description'     => $fields['description'] ?? '',
            'medicine_name'   => $fields['medicine_name'] ?? null,
            'full_name'       => $fields['full_name'] ?? null,
            'phone'           => $fields['phone'] ?? null,
            'patient_name'    => $fields['patient_name'] ?? null,
            'doctor_name'     => $fields['doctor_name'] ?? null,
            'score'           => $fields['score'] ?? 0,
            // Lấy tất cả field còn lại (rất quan trọng cho debug)
            '_all_fields'     => $fields,
        ];
    }
    return $results;
}

    public function healthCheck()
    {
        try {
            $ping = $this->client->createPing();
            $result = $this->client->ping($ping);
            return $result->getStatus() === 0;
        } catch (\Exception $e) {
            Log::error('Solr health check failed: ' . $e->getMessage());
            return false;
        }
    }

    public function indexDocument($document)
    {
        try {
            $update = $this->client->createUpdate();
            $doc = $update->createDocument();
            
            foreach ($document as $field => $value) {
                $doc->$field = $value;
            }
            
            $update->addDocument($doc);
            $update->addCommit();
            
            $result = $this->client->update($update);
            return $result->getStatus() === 0;
        } catch (\Exception $e) {
            Log::error('Solr index error: ' . $e->getMessage());
            return false;
        }
    }

    public function deleteDocument($id)
    {
        try {
            $update = $this->client->createUpdate();
            $update->addDeleteById($id);
            $update->addCommit();
            
            $result = $this->client->update($update);
            return $result->getStatus() === 0;
        } catch (\Exception $e) {
            Log::error('Solr delete error: ' . $e->getMessage());
            return false;
        }
    }
}