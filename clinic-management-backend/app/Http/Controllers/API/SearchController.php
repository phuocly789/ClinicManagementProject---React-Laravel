<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\SolrService;

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
        $query = $request->get('q', '');
        $page = $request->get('page', 1);
        $perPage = $request->get('per_page', 10);
        $type = $request->get('type', 'all'); // all, patients, medicines, appointments, users, etc.

        $filters = [];
        if ($type !== 'all') {
            $filters['type'] = $type;
        }

        // Thêm filter theo role/trang nếu cần
        if ($request->has('status')) {
            $filters['status'] = $request->get('status');
        }

        if ($request->has('role')) {
            $filters['role'] = $request->get('role');
        }

        $results = $this->solrService->search($query, $filters, $page, $perPage);

        return response()->json($results);
    }

    /**
     * Tìm kiếm bệnh nhân (cho Receptionist)
     */
    public function searchPatients(Request $request)
    {
        $query = $request->get('q', '');
        $page = $request->get('page', 1);
        $perPage = $request->get('per_page', 15);

        $filters = ['type' => 'patient'];

        if ($request->has('status')) {
            $filters['status'] = $request->get('status');
        }

        $results = $this->solrService->search($query, $filters, $page, $perPage);

        return response()->json($results);
    }

    /**
     * Tìm kiếm thuốc (cho Doctor và Quản lý kho)
     */
    public function searchMedicines(Request $request)
    {
        $query = $request->get('q', '');
        $page = $request->get('page', 1);
        $perPage = $request->get('per_page', 20);

        $filters = ['type' => 'medicine'];

        if ($request->has('category')) {
            $filters['category'] = $request->get('category');
        }

        if ($request->has('in_stock')) {
            $filters['in_stock'] = $request->get('in_stock');
        }

        $results = $this->solrService->search($query, $filters, $page, $perPage);

        return response()->json($results);
    }

    /**
     * Tìm kiếm lịch hẹn (cho Receptionist và Doctor)
     */
    public function searchAppointments(Request $request)
    {
        $query = $request->get('q', '');
        $page = $request->get('page', 1);
        $perPage = $request->get('per_page', 10);

        $filters = ['type' => 'appointment'];

        if ($request->has('status')) {
            $filters['status'] = $request->get('status');
        }

        if ($request->has('date')) {
            $filters['date'] = $request->get('date');
        }

        $results = $this->solrService->search($query, $filters, $page, $perPage);

        return response()->json($results);
    }

    /**
     * Tìm kiếm dịch vụ (cho Admin và Technician)
     */
    public function searchServices(Request $request)
    {
        $query = $request->get('q', '');
        $page = $request->get('page', 1);
        $perPage = $request->get('per_page', 15);

        $filters = ['type' => 'service'];

        if ($request->has('service_type')) {
            $filters['service_type'] = $request->get('service_type');
        }

        $results = $this->solrService->search($query, $filters, $page, $perPage);

        return response()->json($results);
    }

    /**
     * Tìm kiếm nhân viên (cho Admin)
     */
    public function searchStaff(Request $request)
    {
        $query = $request->get('q', '');
        $page = $request->get('page', 1);
        $perPage = $request->get('per_page', 15);

        $filters = ['type' => 'staff'];

        if ($request->has('role')) {
            $filters['role'] = $request->get('role');
        }

        if ($request->has('department')) {
            $filters['department'] = $request->get('department');
        }

        $results = $this->solrService->search($query, $filters, $page, $perPage);

        return response()->json($results);
    }

    /**
     * Tìm kiếm User (cho Admin - quản lý tài khoản)
     */
    public function searchUsers(Request $request)
    {
        $query = $request->get('q', '');
        $page = $request->get('page', 1);
        $perPage = $request->get('per_page', 15);

        $filters = ['type' => 'user'];

        // Filter theo trạng thái tài khoản
        if ($request->has('is_active')) {
            $filters['is_active'] = $request->get('is_active');
        }

        // Filter theo role
        if ($request->has('user_role')) {
            $filters['user_role'] = $request->get('user_role');
        }

        // Filter theo trạng thái email
        if ($request->has('email_verified')) {
            $filters['email_verified'] = $request->get('email_verified');
        }

        $results = $this->solrService->search($query, $filters, $page, $perPage);

        return response()->json($results);
    }

    /**
     * Tìm kiếm nhà cung cấp (Suppliers)
     */
    public function searchSuppliers(Request $request)
    {
        $query = $request->get('q', '');
        $page = $request->get('page', 1);
        $perPage = $request->get('per_page', 15);

        $filters = ['type' => 'supplier'];

        if ($request->has('status')) {
            $filters['status'] = $request->get('status');
        }

        $results = $this->solrService->search($query, $filters, $page, $perPage);

        return response()->json($results);
    }

    /**
     * Tìm kiếm hóa đơn (Invoices)
     */
    public function searchInvoices(Request $request)
    {
        $query = $request->get('q', '');
        $page = $request->get('page', 1);
        $perPage = $request->get('per_page', 10);

        $filters = ['type' => 'invoice'];

        if ($request->has('status')) {
            $filters['status'] = $request->get('status');
        }

        if ($request->has('payment_status')) {
            $filters['payment_status'] = $request->get('payment_status');
        }

        if ($request->has('date_from')) {
            $filters['date_from'] = $request->get('date_from'); // YYYY-MM-DD
        }
        if ($request->has('date_to')) {
            $filters['date_to'] = $request->get('date_to');
        }
        $results = $this->solrService->search($query, $filters, $page, $perPage);

        return response()->json($results);
    }

    /**
     * Tìm kiếm kết quả xét nghiệm (Test Results)
     */
    public function searchTestResults(Request $request)
    {
        $query = $request->get('q', '');
        $page = $request->get('page', 1);
        $perPage = $request->get('per_page', 10);

        $filters = ['type' => 'test_result'];

        if ($request->has('status')) {
            $filters['status'] = $request->get('status');
        }

        if ($request->has('patient_id')) {
            $filters['patient_id'] = $request->get('patient_id');
        }

        $results = $this->solrService->search($query, $filters, $page, $perPage);

        return response()->json($results);
    }

    /**
     * Health check
     */
    public function health()
    {
        $isHealthy = $this->solrService->healthCheck();

        return response()->json([
            'status' => $isHealthy ? 'healthy' : 'unhealthy',
            'solr_connected' => $isHealthy
        ], $isHealthy ? 200 : 503);
    }

    public function indexDocument(Request $request)
    {
        $document = $request->validate([
            'id' => 'required',
            'title' => 'required|string',
            'content' => 'required|string',
            'type' => 'required|string',
            'category' => 'nullable|string',
            'status' => 'nullable|string'
        ]);

        $success = $this->solrService->indexDocument($document);

        return response()->json([
            'success' => $success,
            'message' => $success ? 'Document indexed successfully' : 'Failed to index document'
        ], $success ? 200 : 500);
    }

    public function bulkIndex(Request $request)
    {
        $documents = $request->validate([
            'documents' => 'required|array',
            'documents.*.id' => 'required',
            'documents.*.title' => 'required|string',
            'documents.*.content' => 'required|string',
            'documents.*.type' => 'required|string'
        ]);

        $success = $this->solrService->indexDocuments($documents['documents']);

        return response()->json([
            'success' => $success,
            'message' => $success ? 'Documents indexed successfully' : 'Failed to index documents'
        ], $success ? 200 : 500);
    }

    public function deleteDocument($id)
    {
        $success = $this->solrService->deleteDocument($id);

        return response()->json([
            'success' => $success,
            'message' => $success ? 'Document deleted successfully' : 'Failed to delete document'
        ], $success ? 200 : 500);
    }
}