<?php

namespace App\Services;

use Solarium\Client;
use Solarium\Core\Query\Helper;
use Illuminate\Support\Facades\Log;

class SolrService
{
    protected $client;

    public function __construct(Client $client)
    {
        $this->client = $client;
    }

    /**
     * Tìm kiếm nâng cao cho clinic management
     */
    public function search(string $query, array $filters = [], int $page = 1, int $perPage = 10, array $sort = []): array
    {
        try {
            $select = $this->client->createSelect();

            // Xây dựng query
            if (!empty($query) && $query !== '*:*') {
                $select->setQuery($query);
                $edismax = $select->getEDisMax();

                // Thiết lập trọng số tìm kiếm theo type
                if (isset($filters['type'])) {
                    switch ($filters['type']) {
                        case 'patient':
                            $edismax->setQueryFields('patient_code^3 full_name^2 phone^2 email^1 address^1');
                            break;
                        case 'medicine':
                            $edismax->setQueryFields('medicine_name^3 category^2 description^1 supplier^1');
                            break;
                        case 'appointment':
                            $edismax->setQueryFields('patient_name^2 doctor_name^2 symptoms^1 diagnosis^1');
                            break;
                        case 'service':
                            $edismax->setQueryFields('service_name^3 service_type^2 description^1');
                            break;
                        case 'staff':
                            $edismax->setQueryFields('full_name^2 email^1 phone^1 role^1.5 department^1');
                            break;
                        case 'user':
                            $edismax->setQueryFields('username^3 full_name^2 email^2 phone^1 address^1 user_role^1.5');
                            break;
                        case 'supplier':
                            $edismax->setQueryFields('supplier_name^3 contact_person^2 phone^1 email^1 address^1');
                            break;
                        case 'invoice':
                            $edismax->setQueryFields('invoice_code^3 patient_name^2 services^1 payment_status^1');
                            break;
                        case 'test_result':
                            $edismax->setQueryFields('patient_name^2 test_name^2 result^1 notes^1');
                            break;
                        default:
                            $edismax->setQueryFields('title^2 content^1.5 category^1 type^1');
                    }
                } else {
                    $edismax->setQueryFields('title^2 content^1 type^1 category^1');
                }
                
                // Thiết lập các cài đặt tìm kiếm nâng cao
                $edismax->setPhraseFields('full_name^3 medicine_name^3 service_name^3 patient_name^2');
                $edismax->setPhraseSlop(2);
                $edismax->setQueryParser('edismax');
            } else {
                $select->setQuery('*:*');
            }

            // Phân trang
            $select->setStart(($page - 1) * $perPage);
            $select->setRows($perPage);

            // Xử lý filters - ĐÃ SỬA LỖI
            $this->applyFilters($select, $filters);

            // Sắp xếp
            $this->applySorting($select, $sort);

            // Highlighting
            $this->applyHighlighting($select);

            // Facets cho filter
            $this->applyFacets($select, $filters);

            // Execute query
            $resultset = $this->client->select($select);
            $highlighting = $resultset->getHighlighting();

            // Format results
            $results = $this->formatSearchResults($resultset, $highlighting);

            // Facets data
            $facets = $this->extractFacets($resultset);

            // Debug info (chỉ trong môi trường development)
            $debugInfo = [];
            if (config('app.debug')) {
                $debugInfo = [
                    'query_time' => $resultset->getQueryTime(),
                    'solr_query' => $select->getQuery(),
                    'filters_applied' => $filters
                ];
            }

            return [
                'success' => true,
                'results' => $results,
                'total' => $resultset->getNumFound(),
                'pages' => ceil($resultset->getNumFound() / $perPage),
                'current_page' => $page,
                'per_page' => $perPage,
                'facets' => $facets,
                'debug' => $debugInfo,
            ];

        } catch (\Exception $e) {
            Log::error('Solr search error: ' . $e->getMessage(), [
                'query' => $query,
                'filters' => $filters,
                'trace' => $e->getTraceAsString()
            ]);
            
            return [
                'success' => false,
                'error' => 'Search service temporarily unavailable',
                'message' => config('app.debug') ? $e->getMessage() : 'Search service error',
                'results' => [],
                'total' => 0,
                'pages' => 0,
                'facets' => []
            ];
        }
    }

    /**
     * Áp dụng filters vào query
     */
    private function applyFilters($select, array $filters): void
    {
        $helper = new Helper();

        foreach ($filters as $field => $value) {
            if (empty($value) || $value === 'all') {
                continue;
            }

            try {
                switch ($field) {
                    case 'date_from':
                        if (!empty($value)) {
                            $escapedDate = $helper->escapeTerm($value);
                            $select->createFilterQuery('date_range_from')
                                   ->setQuery("appointment_date:[{$escapedDate}T00:00:00Z TO *]");
                        }
                        break;

                    case 'date_to':
                        if (!empty($value)) {
                            $escapedDate = $helper->escapeTerm($value);
                            $select->createFilterQuery('date_range_to')
                                   ->setQuery("appointment_date:[* TO {$escapedDate}T23:59:59Z]");
                        }
                        break;

                    case 'type':
                        // Filter type luôn được áp dụng
                        if ($value !== 'all') {
                            $escapedValue = $helper->escapePhrase($value);
                            $select->createFilterQuery('type_filter')
                                   ->setQuery("type:{$escapedValue}");
                        }
                        break;

                    case 'status':
                    case 'category':
                    case 'user_role':
                    case 'payment_status':
                    case 'department':
                        // Xử lý multiple values
                        if (is_array($value)) {
                            $escapedValues = array_map([$helper, 'escapePhrase'], $value);
                            $filterQuery = $field . ':(' . implode(' OR ', $escapedValues) . ')';
                        } else {
                            $escapedValue = $helper->escapePhrase($value);
                            $filterQuery = $field . ':' . $escapedValue;
                        }
                        $select->createFilterQuery('fq_' . $field)
                               ->setQuery($filterQuery);
                        break;

                    default:
                        // Xử lý các field khác
                        if (!in_array($field, ['page', 'per_page', 'sort'])) {
                            $escapedValue = $helper->escapePhrase($value);
                            $select->createFilterQuery('fq_' . $field)
                                   ->setQuery("{$field}:{$escapedValue}");
                        }
                        break;
                }
            } catch (\Exception $e) {
                Log::warning("Failed to apply filter {$field}={$value}: " . $e->getMessage());
                continue;
            }
        }
    }

    /**
     * Áp dụng sắp xếp
     */
    private function applySorting($select, array $sort): void
    {
        if (empty($sort)) {
            // Mặc định sắp xếp theo score và created_at
            $select->addSort('score', $select::SORT_DESC);
            $select->addSort('created_at', $select::SORT_DESC);
        } else {
            foreach ($sort as $field => $direction) {
                $sortDirection = $direction === 'asc' ? $select::SORT_ASC : $select::SORT_DESC;
                $select->addSort($field, $sortDirection);
            }
        }
    }

    /**
     * Áp dụng highlighting
     */
    private function applyHighlighting($select): void
    {
        $highlighting = $select->getHighlighting();
        $highlighting->setFields(
            'title', 'content', 'full_name', 'medicine_name', 'service_name', 
            'username', 'email', 'patient_name', 'doctor_name', 'description',
            'symptoms', 'diagnosis', 'contact_person', 'address', 'result', 'notes'
        );
        $highlighting->setSimplePrefix('<mark class="bg-yellow-200">');
        $highlighting->setSimplePostfix('</mark>');
        $highlighting->setFragSize(200);
        $highlighting->setSnippets(3);
        $highlighting->setMergeContiguous(true);
    }

    /**
     * Áp dụng facets
     */
    private function applyFacets($select, array $filters): void
    {
        $facetSet = $select->getFacetSet();
        
        // Facet chung cho type
        $facetSet->createFacetField('type')
                 ->setField('type')
                 ->setMinCount(1)
                 ->setLimit(20);

        // Facets theo type cụ thể
        $currentType = $filters['type'] ?? null;
        
        switch ($currentType) {
            case 'patient':
                $facetSet->createFacetField('status')
                         ->setField('status')
                         ->setMinCount(1);
                $facetSet->createFacetField('gender')
                         ->setField('gender')
                         ->setMinCount(1);
                break;

            case 'medicine':
                $facetSet->createFacetField('category')
                         ->setField('category')
                         ->setMinCount(1)
                         ->setLimit(15);
                $facetSet->createFacetField('supplier')
                         ->setField('supplier')
                         ->setMinCount(1);
                $facetSet->createFacetField('is_active')
                         ->setField('is_active')
                         ->setMinCount(1);
                break;

            case 'appointment':
                $facetSet->createFacetField('status')
                         ->setField('status')
                         ->setMinCount(1);
                $facetSet->createFacetField('doctor_name')
                         ->setField('doctor_name')
                         ->setMinCount(1);
                $facetSet->createFacetField('appointment_type')
                         ->setField('appointment_type')
                         ->setMinCount(1);
                break;

            case 'user':
                $facetSet->createFacetField('user_role')
                         ->setField('user_role')
                         ->setMinCount(1);
                $facetSet->createFacetField('is_active')
                         ->setField('is_active')
                         ->setMinCount(1);
                $facetSet->createFacetField('email_verified')
                         ->setField('email_verified')
                         ->setMinCount(1);
                break;

            case 'invoice':
                $facetSet->createFacetField('payment_status')
                         ->setField('payment_status')
                         ->setMinCount(1);
                $facetSet->createFacetField('status')
                         ->setField('status')
                         ->setMinCount(1);
                break;

            case 'staff':
                $facetSet->createFacetField('department')
                         ->setField('department')
                         ->setMinCount(1);
                $facetSet->createFacetField('role')
                         ->setField('role')
                         ->setMinCount(1);
                $facetSet->createFacetField('is_active')
                         ->setField('is_active')
                         ->setMinCount(1);
                break;
        }

        // Date range facet cho các bản ghi có ngày tháng
        if (in_array($currentType, ['appointment', 'invoice', 'test_result'])) {
            $facetSet->createFacetRange('created_year')
                     ->setField('created_at')
                     ->setStart('NOW/YEAR-5YEARS')
                     ->setEnd('NOW/YEAR+1YEAR')
                     ->setGap('+1YEAR');
        }
    }

    /**
     * Định dạng kết quả tìm kiếm
     */
    private function formatSearchResults($resultset, $highlighting): array
    {
        $results = [];

        foreach ($resultset as $document) {
            $item = [
                'id' => $document->id,
                'type' => $document->type ?? 'unknown',
                'score' => round($document->score, 2),
            ];

            // Thêm các field chung
            $commonFields = [
                'title', 'content', 'category', 'status', 'created_at', 
                'updated_at', 'description', 'is_active'
            ];
            
            foreach ($commonFields as $field) {
                if (isset($document->$field)) {
                    $item[$field] = $document->$field;
                }
            }

            // Thêm các field đặc thù theo type
            $typeSpecificFields = $this->getTypeSpecificFields($document);
            $item = array_merge($item, $typeSpecificFields);

            // Áp dụng highlighting
            $this->applyResultHighlighting($item, $highlighting, $document->id);

            $results[] = $item;
        }

        return $results;
    }

    /**
     * Lấy các field đặc thù theo loại dữ liệu
     */
    private function getTypeSpecificFields($document): array
    {
        $type = $document->type ?? 'unknown';
        $fields = [];

        switch ($type) {
            case 'patient':
                $fields = [
                    'patient_code' => $document->patient_code ?? '',
                    'full_name' => $document->full_name ?? $document->title ?? '',
                    'phone' => $document->phone ?? '',
                    'email' => $document->email ?? '',
                    'address' => $document->address ?? '',
                    'date_of_birth' => $document->date_of_birth ?? '',
                    'gender' => $document->gender ?? '',
                    'emergency_contact' => $document->emergency_contact ?? '',
                ];
                break;

            case 'medicine':
                $fields = [
                    'medicine_name' => $document->medicine_name ?? $document->title ?? '',
                    'medicine_code' => $document->medicine_code ?? '',
                    'category' => $document->category ?? '',
                    'price' => $document->price ?? 0,
                    'stock_quantity' => $document->stock_quantity ?? 0,
                    'supplier' => $document->supplier ?? '',
                    'description' => $document->description ?? $document->content ?? '',
                    'unit' => $document->unit ?? '',
                    'expiry_date' => $document->expiry_date ?? '',
                ];
                break;

            case 'appointment':
                $fields = [
                    'appointment_code' => $document->appointment_code ?? '',
                    'patient_name' => $document->patient_name ?? '',
                    'doctor_name' => $document->doctor_name ?? '',
                    'appointment_date' => $document->appointment_date ?? '',
                    'symptoms' => $document->symptoms ?? $document->content ?? '',
                    'diagnosis' => $document->diagnosis ?? '',
                    'status' => $document->status ?? '',
                    'appointment_type' => $document->appointment_type ?? '',
                    'duration' => $document->duration ?? 0,
                ];
                break;

            case 'service':
                $fields = [
                    'service_name' => $document->service_name ?? $document->title ?? '',
                    'service_code' => $document->service_code ?? '',
                    'service_type' => $document->service_type ?? '',
                    'price' => $document->price ?? 0,
                    'description' => $document->description ?? $document->content ?? '',
                    'duration' => $document->duration ?? 0,
                    'category' => $document->category ?? '',
                ];
                break;

            case 'staff':
                $fields = [
                    'full_name' => $document->full_name ?? $document->title ?? '',
                    'staff_code' => $document->staff_code ?? '',
                    'email' => $document->email ?? '',
                    'phone' => $document->phone ?? '',
                    'role' => $document->role ?? '',
                    'department' => $document->department ?? '',
                    'specialization' => $document->specialization ?? '',
                    'qualification' => $document->qualification ?? '',
                ];
                break;

            case 'user':
                $fields = [
                    'username' => $document->username ?? '',
                    'full_name' => $document->full_name ?? $document->title ?? '',
                    'email' => $document->email ?? '',
                    'phone' => $document->phone ?? '',
                    'address' => $document->address ?? '',
                    'user_role' => $document->user_role ?? '',
                    'is_active' => $document->is_active ?? true,
                    'email_verified' => $document->email_verified ?? false,
                    'date_of_birth' => $document->date_of_birth ?? '',
                    'last_login' => $document->last_login ?? '',
                ];
                break;

            case 'supplier':
                $fields = [
                    'supplier_name' => $document->supplier_name ?? $document->title ?? '',
                    'supplier_code' => $document->supplier_code ?? '',
                    'contact_person' => $document->contact_person ?? '',
                    'phone' => $document->phone ?? '',
                    'email' => $document->email ?? '',
                    'address' => $document->address ?? $document->content ?? '',
                    'status' => $document->status ?? 'active',
                    'tax_code' => $document->tax_code ?? '',
                ];
                break;

            case 'invoice':
                $fields = [
                    'invoice_code' => $document->invoice_code ?? '',
                    'patient_name' => $document->patient_name ?? '',
                    'total_amount' => $document->total_amount ?? 0,
                    'payment_status' => $document->payment_status ?? '',
                    'services' => $document->services ?? $document->content ?? '',
                    'created_date' => $document->created_date ?? '',
                    'due_date' => $document->due_date ?? '',
                    'tax_amount' => $document->tax_amount ?? 0,
                    'discount_amount' => $document->discount_amount ?? 0,
                ];
                break;

            case 'test_result':
                $fields = [
                    'test_name' => $document->test_name ?? $document->title ?? '',
                    'test_code' => $document->test_code ?? '',
                    'patient_name' => $document->patient_name ?? '',
                    'result' => $document->result ?? '',
                    'notes' => $document->notes ?? $document->content ?? '',
                    'test_date' => $document->test_date ?? '',
                    'status' => $document->status ?? '',
                    'normal_range' => $document->normal_range ?? '',
                    'unit' => $document->unit ?? '',
                ];
                break;
        }

        return $fields;
    }

    /**
     * Áp dụng highlighting cho kết quả
     */
    private function applyResultHighlighting(array &$item, $highlighting, string $documentId): void
    {
        $highlightedDoc = $highlighting->getResult($documentId);
        if ($highlightedDoc) {
            $item['highlighting'] = [];
            foreach ($highlightedDoc as $field => $highlights) {
                if (!empty($highlights)) {
                    $item['highlighting'][$field] = $highlights;
                    // Giữ highlight đầu tiên cho field chính
                    if (!isset($item[$field . '_highlighted'])) {
                        $item[$field . '_highlighted'] = $highlights[0];
                    }
                }
            }
        }
    }

    /**
     * Trích xuất facets
     */
    private function extractFacets($resultset): array
    {
        $facets = [];
        $facetSet = $resultset->getFacetSet();

        if ($facetSet) {
            foreach ($facetSet->getFacets() as $facetName => $facet) {
                $facets[$facetName] = [];
                foreach ($facet as $value => $count) {
                    if ($count > 0 && !empty($value) && $value !== '') {
                        $facets[$facetName][] = [
                            'value' => $value,
                            'count' => $count,
                            'label' => $this->formatFacetLabel($facetName, $value)
                        ];
                    }
                }
                
                // Sắp xếp facets theo count giảm dần
                usort($facets[$facetName], function ($a, $b) {
                    return $b['count'] - $a['count'];
                });
            }
        }

        return $facets;
    }

    /**
     * Định dạng label cho facet
     */
    private function formatFacetLabel(string $facetName, string $value): string
    {
        // Xử lý boolean values
        if ($value === 'true') return 'Yes';
        if ($value === 'false') return 'No';
        
        // Xử lý các field cụ thể
        switch ($facetName) {
            case 'is_active':
            case 'email_verified':
                return $value === 'true' ? 'Active' : 'Inactive';
            case 'user_role':
            case 'role':
                return ucwords(str_replace('_', ' ', $value));
            default:
                return ucfirst($value);
        }
    }

    /**
     * Index một document
     */
    public function indexDocument(array $document): bool
    {
        try {
            $update = $this->client->createUpdate();

            // Chuẩn hóa dữ liệu
            $document = $this->normalizeDocument($document);

            $doc = $update->createDocument($document);
            $update->addDocument($doc);
            $update->addCommit(true, true, false);

            $result = $this->client->update($update);
            
            $success = $result->getStatus() === 0;
            if ($success) {
                Log::info('Solr document indexed successfully', ['id' => $document['id']]);
            } else {
                Log::warning('Solr indexing returned non-zero status', ['status' => $result->getStatus()]);
            }
            
            return $success;

        } catch (\Exception $e) {
            Log::error('Solr indexing error: ' . $e->getMessage(), [
                'document_id' => $document['id'] ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    /**
     * Index nhiều documents
     */
    public function indexDocuments(array $documents): bool
    {
        try {
            $update = $this->client->createUpdate();

            foreach ($documents as $document) {
                $document = $this->normalizeDocument($document);
                $doc = $update->createDocument($document);
                $update->addDocument($doc);
            }

            $update->addCommit(true, true, false);
            $result = $this->client->update($update);
            
            $success = $result->getStatus() === 0;
            if ($success) {
                Log::info('Solr bulk indexing completed', ['count' => count($documents)]);
            }
            
            return $success;

        } catch (\Exception $e) {
            Log::error('Solr bulk indexing error: ' . $e->getMessage(), [
                'document_count' => count($documents),
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    /**
     * Chuẩn hóa document trước khi index
     */
    private function normalizeDocument(array $document): array
    {
        // Đảm bảo có ID
        if (!isset($document['id'])) {
            $type = $document['type'] ?? 'unknown';
            $document['id'] = $type . '_' . uniqid();
        }

        // Timestamps
        if (!isset($document['created_at'])) {
            $document['created_at'] = now()->toISOString();
        }
        $document['updated_at'] = now()->toISOString();

        // Chuẩn hóa boolean fields
        $booleanFields = ['is_active', 'email_verified', 'status'];
        foreach ($booleanFields as $field) {
            if (isset($document[$field])) {
                $document[$field] = boolval($document[$field]) ? 'true' : 'false';
            }
        }

        // Chuẩn hóa text fields - đảm bảo là string
        $textFields = ['title', 'content', 'description', 'full_name', 'medicine_name', 'service_name'];
        foreach ($textFields as $field) {
            if (isset($document[$field]) && !is_string($document[$field])) {
                $document[$field] = (string) $document[$field];
            }
        }

        return $document;
    }

    /**
     * Xóa document theo ID
     */
    public function deleteDocument(string $id): bool
    {
        try {
            $update = $this->client->createUpdate();
            $update->addDeleteById($id);
            $update->addCommit(true, true, false);

            $result = $this->client->update($update);
            
            $success = $result->getStatus() === 0;
            if ($success) {
                Log::info('Solr document deleted', ['id' => $id]);
            }
            
            return $success;

        } catch (\Exception $e) {
            Log::error('Solr delete error: ' . $e->getMessage(), [
                'id' => $id,
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    /**
     * Xóa document theo query
     */
    public function deleteByQuery(string $query): bool
    {
        try {
            $update = $this->client->createUpdate();
            $update->addDeleteQuery($query);
            $update->addCommit(true, true, false);

            $result = $this->client->update($update);
            
            $success = $result->getStatus() === 0;
            if ($success) {
                Log::info('Solr documents deleted by query', ['query' => $query]);
            }
            
            return $success;

        } catch (\Exception $e) {
            Log::error('Solr delete by query error: ' . $e->getMessage(), [
                'query' => $query,
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    /**
     * Xóa tất cả documents
     */
    public function deleteAll(): bool
    {
        return $this->deleteByQuery('*:*');
    }

    /**
     * Kiểm tra kết nối Solr
     */
    public function healthCheck(): bool
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

    /**
     * Lấy thông tin core Solr
     */
    public function getCoreInfo(): array
    {
        try {
            $coreAdmin = $this->client->createCoreAdmin();
            $statusAction = $coreAdmin->createStatus();
            $coreAdmin->setAction($statusAction);
            $response = $this->client->coreAdmin($coreAdmin);
            
            $status = $response->getStatus();
            $data = $response->getData();
            
            return [
                'success' => $status === 0,
                'status' => $status,
                'data' => $data
            ];
            
        } catch (\Exception $e) {
            Log::error('Solr core info error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Tìm kiếm gợi ý (autocomplete)
     */
    public function suggest(string $query, string $type = null, int $limit = 10): array
    {
        try {
            $suggestq = $this->client->createSuggester();
            $suggestq->setQuery($query);
            $suggestq->setDictionary('default');
            $suggestq->setCount($limit);
            $suggestq->setOnlyMorePopular(true);
            
            if ($type) {
                $suggestq->addParam('fq', 'type:' . $type);
            }

            $resultset = $this->client->suggester($suggestq);
            $suggestions = [];
            
            foreach ($resultset as $term => $termResult) {
                foreach ($termResult as $suggestion) {
                    $suggestions[] = [
                        'term' => $suggestion->getWord(),
                        'weight' => $suggestion->getWeight(),
                        'payload' => $suggestion->getPayload()
                    ];
                }
            }

            return [
                'success' => true,
                'suggestions' => $suggestions
            ];

        } catch (\Exception $e) {
            Log::error('Solr suggest error: ' . $e->getMessage());
            return [
                'success' => false,
                'suggestions' => []
            ];
        }
    }
}