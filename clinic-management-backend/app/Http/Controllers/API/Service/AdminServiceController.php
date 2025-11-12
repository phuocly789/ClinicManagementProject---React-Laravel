<?php

namespace App\Http\Controllers\API\Service;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\ServiceOrder;
use App\Models\InvoiceDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class AdminServiceController extends Controller
{
    /**
     * Display a listing of the services.
     */
    public function index(Request $request)
    {
        try {
            $query = Service::query();

            // Search filter
            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('ServiceName', 'like', "%{$search}%")
                      ->orWhere('Description', 'like', "%{$search}%")
                      ->orWhere('ServiceType', 'like', "%{$search}%");
                });
            }

            // ServiceType filter
            if ($request->has('type') && !empty($request->type)) {
                $query->where('ServiceType', $request->type);
            }

            // Status filter - Thêm nếu có trường status
            if ($request->has('status') && !empty($request->status)) {
                // Nếu bạn muốn thêm trường status, cần cập nhật database
                // $query->where('Status', $request->status);
            }

            // Pagination
            $perPage = $request->per_page ?? 5;
            $services = $query->orderBy('ServiceId', 'asc')->paginate($perPage);

            // Format response để phù hợp với frontend
            $formattedServices = $services->map(function($service) {
                return [
                    'id' => $service->ServiceId,
                    'name' => $service->ServiceName,
                    'type' => $service->ServiceType,
                    'price' => (float)$service->Price,
                    'description' => $service->Description,
                    'status' => 'active', // Mặc định vì model chưa có trường status
                    'created_at' => null,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formattedServices,
                'current_page' => $services->currentPage(),
                'last_page' => $services->lastPage(),
                'total' => $services->total(),
                'per_page' => $services->perPage(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tải danh sách dịch vụ.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created service.
     */
    public function store(Request $request)
    {
        DB::beginTransaction();
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'type' => 'required|string|max:255',
                'price' => 'required|numeric|min:0',
                'description' => 'required|string',
            ], [
                'name.required' => 'Tên dịch vụ là bắt buộc.',
                'type.required' => 'Loại dịch vụ là bắt buộc.',
                'price.required' => 'Giá dịch vụ là bắt buộc.',
                'price.min' => 'Giá dịch vụ không được âm.',
                'description.required' => 'Mô tả dịch vụ là bắt buộc.',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ.',
                    'errors' => $validator->errors()
                ], 422);
            }

            $service = Service::create([
                'ServiceName' => $request->name,
                'ServiceType' => $request->type,
                'Price' => $request->price,
                'Description' => $request->description,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Thêm dịch vụ thành công!',
                'data' => [
                    'id' => $service->ServiceId,
                    'name' => $service->ServiceName,
                    'type' => $service->ServiceType,
                    'price' => (float)$service->Price,
                    'description' => $service->Description,
                    'status' => 'active',
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi thêm dịch vụ.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified service.
     */
    public function show($id)
    {
        try {
            $service = Service::find($id);

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy dịch vụ.'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $service->ServiceId,
                    'name' => $service->ServiceName,
                    'type' => $service->ServiceType,
                    'price' => (float)$service->Price,
                    'description' => $service->Description,
                    'status' => 'active',
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tải thông tin dịch vụ.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified service.
     */
    public function update(Request $request, $id)
    {
        DB::beginTransaction();
        try {
            $service = Service::find($id);

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy dịch vụ.'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'type' => 'required|string|max:255',
                'price' => 'required|numeric|min:0',
                'description' => 'required|string',
            ], [
                'name.required' => 'Tên dịch vụ là bắt buộc.',
                'type.required' => 'Loại dịch vụ là bắt buộc.',
                'price.required' => 'Giá dịch vụ là bắt buộc.',
                'price.min' => 'Giá dịch vụ không được âm.',
                'description.required' => 'Mô tả dịch vụ là bắt buộc.',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu không hợp lệ.',
                    'errors' => $validator->errors()
                ], 422);
            }

            $service->update([
                'ServiceName' => $request->name,
                'ServiceType' => $request->type,
                'Price' => $request->price,
                'Description' => $request->description,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Cập nhật dịch vụ thành công!',
                'data' => [
                    'id' => $service->ServiceId,
                    'name' => $service->ServiceName,
                    'type' => $service->ServiceType,
                    'price' => (float)$service->Price,
                    'description' => $service->Description,
                    'status' => 'active',
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi cập nhật dịch vụ.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified service.
     */
    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            $service = Service::find($id);

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy dịch vụ.'
                ], 404);
            }

            // Check if service is being used in any service orders
            $serviceOrderCount = ServiceOrder::where('ServiceId', $id)->count();
            if ($serviceOrderCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể xóa dịch vụ đang được sử dụng trong đơn dịch vụ.'
                ], 422);
            }

            // Check if service is being used in any invoice details
            $invoiceDetailCount = InvoiceDetail::where('ServiceId', $id)->count();
            if ($invoiceDetailCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể xóa dịch vụ đang được sử dụng trong hóa đơn.'
                ], 422);
            }

            $service->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Xóa dịch vụ thành công!'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi xóa dịch vụ.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all service types (distinct from existing services)
     */
    public function getServiceTypes()
    {
        try {
            $types = Service::select('ServiceType')
                ->distinct()
                ->orderBy('ServiceType', 'asc')
                ->pluck('ServiceType')
                ->filter()
                ->values();

            $formatted = $types->map(function ($type, $index) {
                return [
                    'id' => $index + 1,
                    'name' => $type
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formatted
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tải danh sách loại dịch vụ.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}