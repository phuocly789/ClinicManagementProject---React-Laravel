<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\SolrService;
use App\Models\User;
use App\Models\Service;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class SearchController extends Controller
{
    protected $solrService;

    public function __construct(SolrService $solrService)
    {
        $this->solrService = $solrService;
    }

    /* Tìm kiếm tổng quát - tìm tất cả mọi thứ */
    public function search(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'q' => 'nullable|string|max:255',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:100',
                'type' => 'nullable|string|in:user,service',
                'sort' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors()
                ], 422);
            }

            $query = $request->get('q', '');
            $page = $request->get('page', 1);
            $perPage = $request->get('per_page', 10);
            $type = $request->get('type', 'user');
            $sort = $request->get('sort', 'score desc, id asc');

            $filters = [];
            if ($type) {
                $filters['type'] = $type;
            }

            $results = $this->solrService->search($query, $filters, $page, $perPage, $sort);

            return response()->json($results);
        } catch (\Exception $e) {
            Log::error('Search error: ' . $e->getMessage(), [
                'query' => $request->get('q'),
                'type' => $request->get('type'),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Search service temporarily unavailable',
                'message' => config('app.debug') ? $e->getMessage() : 'Search service error',
                'results' => [],
                'total' => 0,
                'pages' => 0,
                'facets' => [],
                'fallback' => true
            ], 500);
        }
    }

    //Tìm kiếm user
    public function searchUsers(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'q' => 'nullable|string|max:255',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:50',
                'user_role' => 'nullable|string',
                'gender' => 'nullable|string|in:Nam,Nữ,Khác',
                'is_active' => 'nullable|string|in:true,false',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors()
                ], 422);
            }

            $query = $request->get('q', '');
            $page = $request->get('page', 1);
            $perPage = $request->get('per_page', 15);

            $filters = [];
            if ($request->has('user_role') && $request->get('user_role')) {
                $filters['user_role'] = $request->get('user_role');
            }

            if ($request->has('gender') && $request->get('gender')) {
                $filters['gender'] = $request->get('gender');
            }

            if ($request->has('is_active') && $request->get('is_active')) {
                $filters['is_active'] = $request->get('is_active');
            }

            $results = $this->solrService->searchUsers($query, $filters, $page, $perPage);

            return response()->json($results);
        } catch (\Exception $e) {
            Log::error('User search error: ' . $e->getMessage());

            // Fallback to database search
            return $this->fallbackUserSearch($request);
        }
    }

    /**
     * Tìm kiếm dịch vụ (cho Admin và Technician)
     */
    public function searchServices(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'q' => 'nullable|string|max:255',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:50',
                'service_type' => 'nullable|string',
                'min_price' => 'nullable|numeric|min:0',
                'max_price' => 'nullable|numeric|min:0',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors()
                ], 422);
            }

            $query = $request->get('q', '');
            $page = $request->get('page', 1);
            $perPage = $request->get('per_page', 15);

            $filters = [];
            if ($request->has('service_type') && $request->get('service_type')) {
                $filters['service_type'] = $request->get('service_type');
            }

            $results = $this->solrService->searchServices($query, $filters, $page, $perPage);

            return response()->json($results);
        } catch (\Exception $e) {
            Log::error('Service search error: ' . $e->getMessage());

            // Fallback to database search
            return $this->fallbackServiceSearch($request);
        }
    }

    /**
     * Health check
     */
    public function health()
    {
        try {
            $isHealthy = $this->solrService->healthCheck();
            $coreExists = $this->solrService->checkCoreExists();

            return response()->json([
                'status' => $isHealthy && $coreExists ? 'healthy' : 'unhealthy',
                'solr_connected' => $isHealthy,
                'core_exists' => $coreExists,
                'timestamp' => now()->toISOString(),
                'details' => [
                    'host' => config('solr.endpoint.125.212.218.44.host', '127.0.0.1'),
                    'port' => config('solr.endpoint.125.212.218.44.port', 8983),
                    'core' => config('solr.endpoint.125.212.218.44.core', 'clinic_management')
                ]
            ], $isHealthy && $coreExists ? 200 : 503);
        } catch (\Exception $e) {
            Log::error('Solr health check error: ' . $e->getMessage());

            return response()->json([
                'status' => 'unhealthy',
                'solr_connected' => false,
                'core_exists' => false,
                'error' => $e->getMessage(),
                'timestamp' => now()->toISOString()
            ], 503);
        }
    }

    /**
     * Index user document
     */
    public function indexUser(User $user)
    {
        try {
            $document = [
                'id' => 'user_' . $user->UserId,
                'type' => 'user',
                'full_name' => $user->FullName,
                'username' => $user->Username,
                'email' => $user->Email,
                'phone' => $user->Phone,
                'gender' => $user->Gender,
                'address' => $user->Address,
                'date_of_birth' => $user->DateOfBirth,
                'is_active' => (bool)$user->IsActive,
                'created_at' => $user->CreatedAt,
                'updated_at' => $user->updated_at,
            ];

            // Thêm role information
            if ($user->roles && $user->roles->isNotEmpty()) {
                $document['user_role'] = $user->roles->first()->RoleName;
            }

            // Thêm thông tin cho bác sĩ
            if ($user->Specialty) {
                $document['specialty'] = $user->Specialty;
            }
            if ($user->LicenseNumber) {
                $document['license_number'] = $user->LicenseNumber;
            }

            $success = $this->solrService->indexDocument($document);

            return $success;
        } catch (\Exception $e) {
            Log::error('Index user error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Index service document
     */
    public function indexService(Service $service)
    {
        try {
            $document = [
                'id' => 'service_' . $service->ServiceId,
                'type' => 'service',
                'service_name' => $service->ServiceName,
                'service_type' => $service->ServiceType,
                'price' => (float)$service->Price,
                'description' => $service->Description,
                'status' => 'active',
                'created_at' => $service->CreatedAt ?? now(),
                'updated_at' => $service->updated_at ?? now(),
            ];

            $success = $this->solrService->indexDocument($document);

            return $success;
        } catch (\Exception $e) {
            Log::error('Index service error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Bulk index users
     */
    public function bulkIndexUsers(Request $request)
    {
        try {
            $users = User::with('roles')->get();
            $documents = [];

            foreach ($users as $user) {
                $document = [
                    'id' => 'user_' . $user->UserId,
                    'type' => 'user',
                    'full_name' => $user->FullName,
                    'username' => $user->Username,
                    'email' => $user->Email,
                    'phone' => $user->Phone,
                    'gender' => $user->Gender,
                    'address' => $user->Address,
                    'date_of_birth' => $user->DateOfBirth,
                    'is_active' => (bool)$user->IsActive,
                    'created_at' => $user->CreatedAt,
                    'updated_at' => $user->updated_at,
                ];

                if ($user->roles && $user->roles->isNotEmpty()) {
                    $document['user_role'] = $user->roles->first()->RoleName;
                }

                if ($user->Specialty) {
                    $document['specialty'] = $user->Specialty;
                }
                if ($user->LicenseNumber) {
                    $document['license_number'] = $user->LicenseNumber;
                }

                $documents[] = $document;
            }

            $success = $this->solrService->indexDocuments($documents);

            return response()->json([
                'success' => $success,
                'message' => $success ? 'Users indexed successfully' : 'Failed to index users',
                'count' => count($documents)
            ]);
        } catch (\Exception $e) {
            Log::error('Bulk index users error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to index users: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk index services
     */
    public function bulkIndexServices(Request $request)
    {
        try {
            $services = Service::all();
            $documents = [];

            foreach ($services as $service) {
                $document = [
                    'id' => 'service_' . $service->ServiceId,
                    'type' => 'service',
                    'service_name' => $service->ServiceName,
                    'service_type' => $service->ServiceType,
                    'price' => (float)$service->Price,
                    'description' => $service->Description,
                    'status' => 'active',
                    'created_at' => $service->CreatedAt ?? now(),
                    'updated_at' => $service->updated_at ?? now(),
                ];

                $documents[] = $document;
            }

            $success = $this->solrService->indexDocuments($documents);

            return response()->json([
                'success' => $success,
                'message' => $success ? 'Services indexed successfully' : 'Failed to index services',
                'count' => count($documents)
            ]);
        } catch (\Exception $e) {
            Log::error('Bulk index services error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to index services: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Index một document
     */
    public function indexDocument(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'id' => 'required|string',
                'type' => 'required|string|in:user,service',
                'title' => 'nullable|string|max:255',
                'content' => 'nullable|string',
                'category' => 'nullable|string|max:100',
                'status' => 'nullable|string|max:50'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors()
                ], 422);
            }

            $success = $this->solrService->indexDocument($validator->validated());

            return response()->json([
                'success' => $success,
                'message' => $success ? 'Document indexed successfully' : 'Failed to index document'
            ], $success ? 200 : 500);
        } catch (\Exception $e) {
            Log::error('Index document error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to index document: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk index documents
     */
    public function bulkIndex(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'documents' => 'required|array|max:1000',
                'documents.*.id' => 'required|string',
                'documents.*.type' => 'required|string|in:user,service'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ',
                    'errors' => $validator->errors()
                ], 422);
            }

            $success = $this->solrService->indexDocuments($request->documents);

            return response()->json([
                'success' => $success,
                'message' => $success ? 'Documents indexed successfully' : 'Failed to index documents',
                'count' => $success ? count($request->documents) : 0
            ], $success ? 200 : 500);
        } catch (\Exception $e) {
            Log::error('Bulk index error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to index documents: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Xóa document
     */
    public function deleteDocument($id)
    {
        try {
            if (empty($id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Document ID is required'
                ], 400);
            }

            $success = $this->solrService->deleteDocument($id);

            return response()->json([
                'success' => $success,
                'message' => $success ? 'Document deleted successfully' : 'Failed to delete document'
            ], $success ? 200 : 500);
        } catch (\Exception $e) {
            Log::error('Delete document error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete document: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Fallback user search khi Solr gặp lỗi
     */
    private function fallbackUserSearch(Request $request)
    {
        try {
            $query = User::with('roles');

            // Search filter
            if ($request->has('q') && !empty($request->q)) {
                $search = $request->q;
                $query->where(function ($q) use ($search) {
                    $q->where('FullName', 'like', "%{$search}%")
                        ->orWhere('Username', 'like', "%{$search}%")
                        ->orWhere('Email', 'like', "%{$search}%")
                        ->orWhere('Phone', 'like', "%{$search}%");
                });
            }

            // Role filter
            if ($request->has('user_role') && !empty($request->user_role)) {
                $query->whereHas('roles', function ($q) use ($request) {
                    $q->where('RoleName', $request->user_role);
                });
            }

            // Gender filter
            if ($request->has('gender') && !empty($request->gender)) {
                $query->where('Gender', $request->gender);
            }

            // Status filter
            if ($request->has('is_active') && !empty($request->is_active)) {
                $isActive = $request->is_active === 'true';
                $query->where('IsActive', $isActive);
            }

            $page = $request->get('page', 1);
            $perPage = $request->get('per_page', 15);

            $users = $query->orderBy('FullName', 'asc')->paginate($perPage, ['*'], 'page', $page);

            $formattedResults = $users->map(function ($user) {
                return [
                    'id' => 'user_' . $user->UserId,
                    'type' => 'user',
                    'full_name' => $user->FullName,
                    'username' => $user->Username,
                    'email' => $user->Email,
                    'phone' => $user->Phone,
                    'gender' => $user->Gender,
                    'address' => $user->Address,
                    'user_role' => $user->roles && $user->roles->isNotEmpty() ? $user->roles->first()->RoleName : 'Chưa có',
                    'is_active' => (bool)$user->IsActive,
                    'specialty' => $user->Specialty,
                    'license_number' => $user->LicenseNumber,
                    'date_of_birth' => $user->DateOfBirth,
                ];
            });

            return response()->json([
                'success' => true,
                'results' => $formattedResults,
                'total' => $users->total(),
                'pages' => $users->lastPage(),
                'current_page' => $users->currentPage(),
                'per_page' => $users->perPage(),
                'fallback' => true,
                'solr_available' => false
            ]);
        } catch (\Exception $e) {
            Log::error('Fallback user search error: ' . $e->getMessage());
            return $this->fallbackResponse('users');
        }
    }

    /**
     * Fallback service search khi Solr gặp lỗi
     */
    private function fallbackServiceSearch(Request $request)
    {
        try {
            $query = Service::query();

            // Search filter
            if ($request->has('q') && !empty($request->q)) {
                $search = $request->q;
                $query->where(function ($q) use ($search) {
                    $q->where('ServiceName', 'like', "%{$search}%")
                        ->orWhere('ServiceType', 'like', "%{$search}%")
                        ->orWhere('Description', 'like', "%{$search}%");
                });
            }

            // Service type filter
            if ($request->has('service_type') && !empty($request->service_type)) {
                $query->where('ServiceType', $request->service_type);
            }

            // Price range filter
            if ($request->has('min_price') && !empty($request->min_price)) {
                $query->where('Price', '>=', $request->min_price);
            }

            if ($request->has('max_price') && !empty($request->max_price)) {
                $query->where('Price', '<=', $request->max_price);
            }

            $page = $request->get('page', 1);
            $perPage = $request->get('per_page', 15);

            $services = $query->orderBy('ServiceName', 'asc')->paginate($perPage, ['*'], 'page', $page);

            $formattedResults = $services->map(function ($service) {
                return [
                    'id' => 'service_' . $service->ServiceId,
                    'type' => 'service',
                    'service_name' => $service->ServiceName,
                    'service_type' => $service->ServiceType,
                    'price' => (float)$service->Price,
                    'description' => $service->Description,
                ];
            });

            return response()->json([
                'success' => true,
                'results' => $formattedResults,
                'total' => $services->total(),
                'pages' => $services->lastPage(),
                'current_page' => $services->currentPage(),
                'per_page' => $services->perPage(),
                'fallback' => true,
                'solr_available' => false
            ]);
        } catch (\Exception $e) {
            Log::error('Fallback service search error: ' . $e->getMessage());
            return $this->fallbackResponse('services');
        }
    }

    /**
     * Fallback response khi cả Solr và database đều gặp lỗi
     */
    private function fallbackResponse($type)
    {
        return response()->json([
            'success' => false,
            'error' => 'Search service temporarily unavailable',
            'message' => 'Please try again later',
            'results' => [],
            'total' => 0,
            'pages' => 0,
            'facets' => [],
            'fallback' => true,
            'solr_available' => false
        ], 503);
    }
}
