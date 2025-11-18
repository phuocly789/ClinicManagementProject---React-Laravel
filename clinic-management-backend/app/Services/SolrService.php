<?php

namespace App\Services;

use Solarium\Client;
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
            
            // Xây dựng query dựa trên type
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
            } else {
                $select->setQuery('*:*');
            }
            
            // Phân trang
            $select->setStart(($page - 1) * $perPage);
            $select->setRows($perPage);
            
            // Thêm filters - SỬA LỖI QUAN TRỌNG
            foreach ($filters as $field => $value) {
                if (empty($value) || $value === 'all') continue;

                if ($field === 'date_from') {
                    $select->createFilterQuery('date_range_from')
                           ->setQuery("appointment_date:[{$value}T00:00:00Z TO *]");
                } 
                elseif ($field === 'date_to') {
                    $select->createFilterQuery('date_range_to')
                           ->setQuery("appointment_date:[* TO {$value}T23:59:59Z]");
                }
                elseif ($field === 'type') {
                    // Filter type luôn được áp dụng
                    $select->createFilterQuery('type_filter')
                           ->setQuery("type:\"$value\"");
                }
                else {
                    // Sửa lỗi: Thêm dấu ngoặc kép cho giá trị
                    $fq = $select->createFilterQuery('fq_' . $field);
                    $fq->setQuery("$field:\"$value\"");
                }
            }
            
            // Sắp xếp mặc định theo relevance hoặc created_at
            if (empty($sort)) {
                $sort = ['score' => 'desc'];
            }
            
            foreach ($sort as $field => $direction) {
                $select->addSort($field, $direction === 'desc' ? $select::SORT_DESC : $select::SORT_ASC);
            }
            
            // Highlighting
            $highlighting = $select->getHighlighting();
            $highlighting->setFields('title', 'content', 'full_name', 'medicine_name', 'service_name', 'username', 'email');
            $highlighting->setSimplePrefix('<mark>');
            $highlighting->setSimplePostfix('</mark>');
            $highlighting->setFragSize(150);
            
            // Facets cho filter
            $facetSet = $select->getFacetSet();
            if (isset($filters['type'])) {
                switch ($filters['type']) {
                    case 'patient':
                        $facetSet->createFacetField('status')->setField('status');
                        break;
                    case 'medicine':
                        $facetSet->createFacetField('category')->setField('category');
                        $facetSet->createFacetField('supplier')->setField('supplier');
                        break;
                    case 'appointment':
                        $facetSet->createFacetField('status')->setField('status');
                        $facetSet->createFacetField('doctor')->setField('doctor_name');
                        break;
                    case 'user':
                        $facetSet->createFacetField('user_role')->setField('user_role');
                        $facetSet->createFacetField('is_active')->setField('is_active');
                        break;
                    case 'invoice':
                        $facetSet->createFacetField('payment_status')->setField('payment_status');
                        $facetSet->createFacetField('status')->setField('status');
                        break;
                }
            }
            $facetSet->createFacetField('type')->setField('type');
            
            // Execute query
            $resultset = $this->client->select($select);
            $highlighting = $resultset->getHighlighting();
            
            // Format results
            $results = $this->formatSearchResults($resultset, $highlighting);
            
            // Facets data
            $facets = $this->extractFacets($resultset);
            
            return [
                'success' => true,
                'results' => $results,
                'total' => $resultset->getNumFound(),
                'pages' => ceil($resultset->getNumFound() / $perPage),
                'current_page' => $page,
                'per_page' => $perPage,
                'facets' => $facets,
            ];
            
        } catch (\Exception $e) {
            Log::error('Solr search error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Search service temporarily unavailable',
                'results' => [],
                'total' => 0,
                'pages' => 0
            ];
        }
    }
    private function formatSearchResults($resultset, $highlighting): array
    {
        $results = [];
        
        foreach ($resultset as $document) {
            $item = [
                'id' => $document->id,
                'type' => $document->type ?? 'unknown',
                'score' => $document->score,
            ];
            
            // Thêm các field chung
            $commonFields = ['title', 'content', 'category', 'status', 'created_at', 'updated_at'];
            foreach ($commonFields as $field) {
                if (isset($document->$field)) {
                    $item[$field] = $document->$field;
                }
            }
            
            // Thêm các field đặc thù theo type
            $typeSpecificFields = $this->getTypeSpecificFields($document);
            $item = array_merge($item, $typeSpecificFields);
            
            // Apply highlighting
            $this->applyHighlighting($item, $highlighting, $document->id);
            
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
                ];
                break;
                
            case 'medicine':
                $fields = [
                    'medicine_name' => $document->medicine_name ?? $document->title ?? '',
                    'category' => $document->category ?? '',
                    'price' => $document->price ?? '',
                    'stock_quantity' => $document->stock_quantity ?? '',
                    'supplier' => $document->supplier ?? '',
                    'description' => $document->description ?? $document->content ?? '',
                ];
                break;
                
            case 'appointment':
                $fields = [
                    'appointment_code' => $document->appointment_code ?? '',
                    'patient_name' => $document->patient_name ?? '',
                    'doctor_name' => $document->doctor_name ?? '',
                    'appointment_date' => $document->appointment_date ?? '',
                    'symptoms' => $document->symptoms ?? $document->content ?? '',
                    'status' => $document->status ?? '',
                ];
                break;
                
            case 'service':
                $fields = [
                    'service_name' => $document->service_name ?? $document->title ?? '',
                    'service_type' => $document->service_type ?? '',
                    'price' => $document->price ?? '',
                    'description' => $document->description ?? $document->content ?? '',
                ];
                break;
                
            case 'staff':
                $fields = [
                    'full_name' => $document->full_name ?? $document->title ?? '',
                    'email' => $document->email ?? '',
                    'phone' => $document->phone ?? '',
                    'role' => $document->role ?? '',
                    'department' => $document->department ?? '',
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
                ];
                break;
                
            case 'supplier':
                $fields = [
                    'supplier_name' => $document->supplier_name ?? $document->title ?? '',
                    'contact_person' => $document->contact_person ?? '',
                    'phone' => $document->phone ?? '',
                    'email' => $document->email ?? '',
                    'address' => $document->address ?? $document->content ?? '',
                    'status' => $document->status ?? 'active',
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
                ];
                break;
                
            case 'test_result':
                $fields = [
                    'test_name' => $document->test_name ?? $document->title ?? '',
                    'patient_name' => $document->patient_name ?? '',
                    'result' => $document->result ?? '',
                    'notes' => $document->notes ?? $document->content ?? '',
                    'test_date' => $document->test_date ?? '',
                    'status' => $document->status ?? '',
                ];
                break;
        }
        
        return $fields;
    }

    /**
     * Áp dụng highlighting
     */
    private function applyHighlighting(array &$item, $highlighting, string $documentId): void
    {
        $highlightedDoc = $highlighting->getResult($documentId);
        if ($highlightedDoc) {
            foreach ($highlightedDoc as $field => $highlights) {
                $highlightField = $field . '_highlighted';
                if (isset($highlights[0])) {
                    $item[$highlightField] = $highlights[0];
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
                    if ($count > 0 && !empty($value)) {
                        $facets[$facetName][] = [
                            'value' => $value,
                            'count' => $count
                        ];
                    }
                }
            }
        }
        
        return $facets;
    }

    // Các methods indexDocument, deleteDocument, healthCheck giữ nguyên
    public function indexDocument(array $document): bool
    {
        try {
            $update = $this->client->createUpdate();
            
            if (!isset($document['created_at'])) {
                $document['created_at'] = now()->toISOString();
            }
            $document['updated_at'] = now()->toISOString();
            
            $doc = $update->createDocument($document);
            $update->addDocument($doc);
            $update->addCommit(true, true, false);
            
            $result = $this->client->update($update);
            return $result->getStatus() === 0;
            
        } catch (\Exception $e) {
            Log::error('Solr indexing error: ' . $e->getMessage());
            return false;
        }
    }

    public function indexDocuments(array $documents): bool
    {
        try {
            $update = $this->client->createUpdate();
            
            foreach ($documents as $document) {
                if (!isset($document['created_at'])) {
                    $document['created_at'] = now()->toISOString();
                }
                $document['updated_at'] = now()->toISOString();
                
                $doc = $update->createDocument($document);
                $update->addDocument($doc);
            }
            
            $update->addCommit(true, true, false);
            $result = $this->client->update($update);
            return $result->getStatus() === 0;
            
        } catch (\Exception $e) {
            Log::error('Solr bulk indexing error: ' . $e->getMessage());
            return false;
        }
    }

    public function deleteDocument(string $id): bool
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

    public function deleteByQuery(string $query): bool
    {
        try {
            $update = $this->client->createUpdate();
            $update->addDeleteQuery($query);
            $update->addCommit();
            
            $result = $this->client->update($update);
            return $result->getStatus() === 0;
            
        } catch (\Exception $e) {
            Log::error('Solr delete by query error: ' . $e->getMessage());
            return false;
        }
    }

    public function deleteAll(): bool
    {
        return $this->deleteByQuery('*:*');
    }

    public function healthCheck(): bool
    {
        try {
            $ping = $this->client->createPing();
            $result = $this->client->ping($ping);
            return $result->getStatus() === 0;
        } catch (\Exception $e) {
            return false;
        }
    }
}