<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\SolrService;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class SearchController extends Controller
{
    protected $solrService;

    public function __construct(SolrService $solrService)
    {
        $this->solrService = $solrService;
    }

    /**
     * Tìm kiếm tổng quát - tìm tất cả mọi thứ
     */
    public function search(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'q' => 'nullable|string|max:255',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:100',
                'type' => 'nullable|string|in:all,patient,medicine,appointment,service,staff,user,supplier,invoice,test_result',
                'status' => 'nullable|string',
                'role' => 'nullable|string',
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
            $type = $request->get('type', 'all');

            $filters = [];
            if ($type !== 'all') {
                $filters['type'] = $type;
            }

            // Thêm filter theo status nếu có
            if ($request->has('status') && $request->get('status')) {
                $filters['status'] = $request->get('status');
            }

            // Thêm filter theo role nếu có
            if ($request->has('role') && $request->get('role')) {
                $filters['role'] = $request->get('role');
            }

            $results = $this->solrService->search($query, $filters, $page, $perPage);

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
                'facets' => []
            ], 500);
        }
    }

    /**
     * Tìm kiếm bệnh nhân (cho Receptionist)
     */
    public function searchPatients(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'q' => 'nullable|string|max:255',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:50',
                'status' => 'nullable|string|in:active,inactive',
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

            $filters = ['type' => 'patient'];

            if ($request->has('status') && $request->get('status')) {
                $filters['status'] = $request->get('status');
            }

            $results = $this->solrService->search($query, $filters, $page, $perPage);

            return response()->json($results);

        } catch (\Exception $e) {
            Log::error('Patient search error: ' . $e->getMessage());
            return $this->fallbackResponse('patients');
        }
    }

    /**
     * Tìm kiếm thuốc (cho Doctor và Quản lý kho)
     */
    public function searchMedicines(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'q' => 'nullable|string|max:255',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:50',
                'category' => 'nullable|string',
                'in_stock' => 'nullable|boolean',
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
            $perPage = $request->get('per_page', 20);

            $filters = ['type' => 'medicine'];

            if ($request->has('category') && $request->get('category')) {
                $filters['category'] = $request->get('category');
            }

            if ($request->has('in_stock')) {
                $filters['in_stock'] = $request->get('in_stock') ? 'true' : 'false';
            }

            $results = $this->solrService->search($query, $filters, $page, $perPage);

            return response()->json($results);

        } catch (\Exception $e) {
            Log::error('Medicine search error: ' . $e->getMessage());
            return $this->fallbackResponse('medicines');
        }
    }

    /**
     * Tìm kiếm lịch hẹn (cho Receptionist và Doctor)
     */
    public function searchAppointments(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'q' => 'nullable|string|max:255',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:50',
                'status' => 'nullable|string',
                'date' => 'nullable|date',
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

            $filters = ['type' => 'appointment'];

            if ($request->has('status') && $request->get('status')) {
                $filters['status'] = $request->get('status');
            }

            if ($request->has('date') && $request->get('date')) {
                $filters['date'] = $request->get('date');
            }

            $results = $this->solrService->search($query, $filters, $page, $perPage);

            return response()->json($results);

        } catch (\Exception $e) {
            Log::error('Appointment search error: ' . $e->getMessage());
            return $this->fallbackResponse('appointments');
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

            $filters = ['type' => 'service'];

            if ($request->has('service_type') && $request->get('service_type')) {
                $filters['service_type'] = $request->get('service_type');
            }

            $results = $this->solrService->search($query, $filters, $page, $perPage);

            return response()->json($results);

        } catch (\Exception $e) {
            Log::error('Service search error: ' . $e->getMessage());
            return $this->fallbackResponse('services');
        }
    }

    /**
     * Tìm kiếm nhân viên (cho Admin)
     */
    public function searchStaff(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'q' => 'nullable|string|max:255',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:50',
                'role' => 'nullable|string',
                'department' => 'nullable|string',
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

            $filters = ['type' => 'staff'];

            if ($request->has('role') && $request->get('role')) {
                $filters['role'] = $request->get('role');
            }

            if ($request->has('department') && $request->get('department')) {
                $filters['department'] = $request->get('department');
            }

            $results = $this->solrService->search($query, $filters, $page, $perPage);

            return response()->json($results);

        } catch (\Exception $e) {
            Log::error('Staff search error: ' . $e->getMessage());
            return $this->fallbackResponse('staff');
        }
    }

    /**
     * Tìm kiếm User (cho Admin - quản lý tài khoản)
     */
    public function searchUsers(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'q' => 'nullable|string|max:255',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:50',
                'user_role' => 'nullable|string',
                'is_active' => 'nullable|boolean',
                'email_verified' => 'nullable|boolean',
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

            $filters = ['type' => 'user'];

            if ($request->has('user_role') && $request->get('user_role')) {
                $filters['user_role'] = $request->get('user_role');
            }

            if ($request->has('is_active')) {
                $filters['is_active'] = $request->get('is_active') ? 'true' : 'false';
            }

            if ($request->has('email_verified')) {
                $filters['email_verified'] = $request->get('email_verified') ? 'true' : 'false';
            }

            $results = $this->solrService->search($query, $filters, $page, $perPage);

            return response()->json($results);

        } catch (\Exception $e) {
            Log::error('User search error: ' . $e->getMessage());
            return $this->fallbackResponse('users');
        }
    }

    /**
     * Tìm kiếm nhà cung cấp (Suppliers)
     */
    public function searchSuppliers(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'q' => 'nullable|string|max:255',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:50',
                'status' => 'nullable|string|in:active,inactive',
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

            $filters = ['type' => 'supplier'];

            if ($request->has('status') && $request->get('status')) {
                $filters['status'] = $request->get('status');
            }

            $results = $this->solrService->search($query, $filters, $page, $perPage);

            return response()->json($results);

        } catch (\Exception $e) {
            Log::error('Supplier search error: ' . $e->getMessage());
            return $this->fallbackResponse('suppliers');
        }
    }

    /**
     * Tìm kiếm hóa đơn (Invoices)
     */
    public function searchInvoices(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'q' => 'nullable|string|max:255',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:50',
                'status' => 'nullable|string',
                'payment_status' => 'nullable|string',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
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

            $filters = ['type' => 'invoice'];

            if ($request->has('status') && $request->get('status')) {
                $filters['status'] = $request->get('status');
            }

            if ($request->has('payment_status') && $request->get('payment_status')) {
                $filters['payment_status'] = $request->get('payment_status');
            }

            if ($request->has('date_from') && $request->get('date_from')) {
                $filters['date_from'] = $request->get('date_from');
            }
            
            if ($request->has('date_to') && $request->get('date_to')) {
                $filters['date_to'] = $request->get('date_to');
            }

            $results = $this->solrService->search($query, $filters, $page, $perPage);

            return response()->json($results);

        } catch (\Exception $e) {
            Log::error('Invoice search error: ' . $e->getMessage());
            return $this->fallbackResponse('invoices');
        }
    }

    /**
     * Tìm kiếm kết quả xét nghiệm (Test Results)
     */
    public function searchTestResults(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'q' => 'nullable|string|max:255',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:50',
                'status' => 'nullable|string',
                'patient_id' => 'nullable|integer',
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

            $filters = ['type' => 'test_result'];

            if ($request->has('status') && $request->get('status')) {
                $filters['status'] = $request->get('status');
            }

            if ($request->has('patient_id') && $request->get('patient_id')) {
                $filters['patient_id'] = $request->get('patient_id');
            }

            $results = $this->solrService->search($query, $filters, $page, $perPage);

            return response()->json($results);

        } catch (\Exception $e) {
            Log::error('Test result search error: ' . $e->getMessage());
            return $this->fallbackResponse('test_results');
        }
    }

    /**
     * Health check
     */
    public function health()
    {
        try {
            $isHealthy = $this->solrService->healthCheck();

            return response()->json([
                'status' => $isHealthy ? 'healthy' : 'unhealthy',
                'solr_connected' => $isHealthy,
                'timestamp' => now()->toISOString()
            ], $isHealthy ? 200 : 503);

        } catch (\Exception $e) {
            Log::error('Solr health check error: ' . $e->getMessage());

            return response()->json([
                'status' => 'unhealthy',
                'solr_connected' => false,
                'error' => $e->getMessage(),
                'timestamp' => now()->toISOString()
            ], 503);
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
                'title' => 'required|string|max:255',
                'content' => 'required|string',
                'type' => 'required|string',
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
                'documents.*.title' => 'required|string|max:255',
                'documents.*.content' => 'required|string',
                'documents.*.type' => 'required|string'
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
     * Fallback response khi Solr gặp lỗi
     */
    private function fallbackResponse($type)
    {
        return response()->json([
            'success' => false,
            'error' => 'Search service temporarily unavailable',
            'message' => 'Please try again later or use database search',
            'results' => [],
            'total' => 0,
            'pages' => 0,
            'facets' => [],
            'fallback' => true
        ], 503);
    }
}