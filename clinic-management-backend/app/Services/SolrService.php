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
                '125.212.218.44' => [
                    'host' => config('solr.endpoint.125.212.218.44.host', '127.0.0.1'),
                    'port' => config('solr.endpoint.125.212.218.44.port', 8983),
                    'path' => config('solr.endpoint.125.212.218.44.path', '/solr'),
                    'core' => config('solr.endpoint.125.212.218.44.core', 'clinic_management'),
                    'timeout' => config('solr.endpoint.125.212.218.44.timeout', 30),
                ]
            ]
        ];

        $this->client = new Client($adapter, $eventDispatcher, $config);
    }

    public function search($query = '', $filters = [], $page = 1, $perPage = 10, $sort = 'score desc, id asc')
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

            // Thiết lập sorting
            if (!empty($sort)) {
                $sortParts = array_map('trim', explode(',', $sort));
                foreach ($sortParts as $part) {
                    $part = trim($part);
                    if (empty($part)) continue;

                    $pieces = preg_split('/\s+/', $part);
                    $field = $pieces[0];
                    $direction = isset($pieces[1]) ? strtolower($pieces[1]) : 'asc';

                    if (in_array($direction, ['asc', 'desc'])) {
                        $solrQuery->addSort($field, $direction);
                    } else {
                        $solrQuery->addSort($field, 'asc');
                    }
                }
            } else {
                // Default sort nếu không có
                $solrQuery->addSort('score', 'desc');
            }

            // Thêm filters
            if (!empty($filters)) {
                foreach ($filters as $field => $value) {
                    if (!empty($value)) {
                        $solrQuery->createFilterQuery($field)
                            ->setQuery("$field:\"$value\"");
                    }
                }
            }

            // Thêm các field cần trả về
            $solrQuery->setFields(['*']);

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
            throw new \Exception('Solr search failed: ' . $e->getMessage());
        }
    }

    protected function formatResults($resultset)
    {
        $results = [];
        foreach ($resultset as $document) {
            $fields = $document->getFields();

            // Helper function để xử lý cả single value và multi-value fields
            $getFieldValue = function ($fieldName, $default = '') use ($fields) {
                $value = $fields[$fieldName] ?? $default;
                if (is_array($value)) {
                    return !empty($value) ? $value[0] : $default;
                }
                return $value !== null ? $value : $default;
            };

            $results[] = [
                'id'             => $getFieldValue('id'),
                'type'           => $getFieldValue('type'),

                // User fields
                'full_name'      => $getFieldValue('full_name'),
                'username'       => $getFieldValue('username'),
                'email'          => $getFieldValue('email'),
                'phone'          => $getFieldValue('phone'),
                'gender'         => $getFieldValue('gender'),
                'address'        => $getFieldValue('address'),
                'user_role'      => $getFieldValue('user_role'),
                'is_active'      => $getFieldValue('is_active', true),
                'specialty'      => $getFieldValue('specialty'),
                'license_number' => $getFieldValue('license_number'),
                'date_of_birth'  => $getFieldValue('date_of_birth'),

                // Service fields
                'service_name'   => $getFieldValue('service_name'),
                'service_type'   => $getFieldValue('service_type'),
                'price'          => $getFieldValue('price', 0),
                'description'    => $getFieldValue('description'),

                // Common fields
                'title'          => $getFieldValue('title'),
                'content'        => $getFieldValue('content'),
                'status'         => $getFieldValue('status'),
                'created_at'     => $getFieldValue('created_at'),
                'updated_at'     => $getFieldValue('updated_at'),
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
                // Xử lý boolean values
                if (is_bool($value)) {
                    $value = $value ? 'true' : 'false';
                }
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

    public function indexDocuments(array $documents)
    {
        if (empty($documents)) {
            return true;
        }

        try {
            $update = $this->client->createUpdate();

            foreach ($documents as $documentData) {
                $doc = $update->createDocument();
                foreach ($documentData as $field => $value) {
                    // Xử lý boolean values
                    if (is_bool($value)) {
                        $value = $value ? 'true' : 'false';
                    }
                    $doc->$field = $value;
                }
                $update->addDocument($doc);
            }

            $update->addCommit();
            $result = $this->client->update($update);

            return $result->getStatus() === 0;
        } catch (\Exception $e) {
            Log::error('Solr batch index error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Search users với các filter cụ thể
     */
    public function searchUsers($query = '', $filters = [], $page = 1, $perPage = 10)
    {
        $baseFilters = ['type' => 'user'];
        $mergedFilters = array_merge($baseFilters, $filters);

        return $this->search($query, $mergedFilters, $page, $perPage, 'score desc, full_name asc');
    }

    /**
     * Search services với các filter cụ thể
     */
    public function searchServices($query = '', $filters = [], $page = 1, $perPage = 10)
    {
        $baseFilters = ['type' => 'service'];
        $mergedFilters = array_merge($baseFilters, $filters);

        return $this->search($query, $mergedFilters, $page, $perPage, 'score desc, service_name asc');
    }

    /**
     * Kiểm tra xem core có tồn tại không
     */
    public function checkCoreExists($coreName = null)
    {
        try {
            $coreAdmin = $this->client->createCoreAdmin();
            $statusAction = $coreAdmin->createStatus();

            if ($coreName) {
                $statusAction->setCore($coreName);
            } else {
                $statusAction->setCore(config('solr.endpoint.125.212.218.44.core', 'clinic_management'));
            }

            $coreAdmin->setAction($statusAction);
            $response = $coreAdmin->execute();

            return $response->getStatusResult()->getUptime() > 0;
        } catch (\Exception $e) {
            Log::error('Solr core check failed: ' . $e->getMessage());
            return false;
        }
    }
}
