<?php

namespace App\Http\Controllers\API\Service;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\ServiceOrder;
use App\Models\InvoiceDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class AdminServiceController extends Controller
{
    /**
     * Display a listing of the services.
     */
    public function index(Request $request)
    {
        // Tình huống 9: Validate URL parameters
        $validator = Validator::make($request->all(), [
            'per_page' => 'nullable|integer|min:1|max:100',
            'page' => 'nullable|integer|min:1',
            'search' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:255',
        ], [
            'page.integer' => 'Trang phải là số nguyên',
            'page.min' => 'Số trang không hợp lệ',
            'per_page.integer' => 'Số bản ghi mỗi trang phải là số nguyên',
            'per_page.min' => 'Số bản ghi mỗi trang phải lớn hơn 0',
            'per_page.max' => 'Số bản ghi mỗi trang không được vượt quá 100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Tham số không hợp lệ',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Xử lý giá trị mặc định an toàn
            $perPage = min($request->get('per_page', 10), 100);
            $page = max($request->get('page', 1), 1);

            $query = Service::query();

            // Search filter với sanitization
            if ($request->has('search') && !empty($request->search)) {
                $search = htmlspecialchars(trim($request->search), ENT_QUOTES, 'UTF-8');
                $query->where(function($q) use ($search) {
                    $q->where('ServiceName', 'like', "%{$search}%")
                      ->orWhere('Description', 'like', "%{$search}%")
                      ->orWhere('ServiceType', 'like', "%{$search}%");
                });
            }

            // ServiceType filter với sanitization
            if ($request->has('type') && !empty($request->type)) {
                $type = htmlspecialchars(trim($request->type), ENT_QUOTES, 'UTF-8');
                $query->where('ServiceType', $type);
            }

            // Pagination an toàn
            $services = $query->orderBy('ServiceId', 'asc')->paginate($perPage, ['*'], 'page', $page);

            // Format response để phù hợp với frontend
            $formattedServices = $services->map(function($service) {
                return [
                    'id' => $service->ServiceId,
                    'name' => $service->ServiceName,
                    'type' => $service->ServiceType,
                    'price' => (float)$service->Price,
                    'description' => $service->Description,
                    'status' => 'active',
                    'created_at' => $service->CreatedAt ?? null,
                    'updated_at' => $service->updated_at ?? null,
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
            Log::error('Lỗi khi tải danh sách dịch vụ: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tải danh sách dịch vụ.',
                'error' => 'Lỗi hệ thống'
            ], 500);
        }
    }

    /**
     * Store a newly created service.
     */
    public function store(Request $request)
    {
        // Clean data đầu vào (Tình huống 5 - XSS protection)
        $cleanedData = [
            'name' => $request->name ? htmlspecialchars(trim($request->name), ENT_QUOTES, 'UTF-8') : '',
            'type' => $request->type ? htmlspecialchars(trim($request->type), ENT_QUOTES, 'UTF-8') : '',
            'price' => $request->price,
            'description' => $request->description ? htmlspecialchars(trim($request->description), ENT_QUOTES, 'UTF-8') : '',
        ];

        // Tình huống 4 & 6: Validate form chi tiết
        $validator = Validator::make($cleanedData, [
            'name' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) {
                    $trimmedValue = trim($value);
                    if ($trimmedValue === '') {
                        $fail('Tên dịch vụ không được để trống.');
                        return;
                    }
                    
                    // Chống XSS (Tình huống 5)
                    if ($value !== strip_tags($value)) {
                        $fail('Tên dịch vụ không được chứa mã HTML.');
                        return;
                    }
                    
                    // Kiểm tra khoảng trắng 2 bytes (Tình huống 6)
                    if (strpos($value, '　') !== false) {
                        $fail('Tên dịch vụ không được chứa khoảng trắng không hợp lệ.');
                        return;
                    }
                    
                    // Kiểm tra độ dài thực tế
                    $decoded = html_entity_decode(trim($value));
                    if (mb_strlen($decoded) > 255) {
                        $fail('Tên dịch vụ không được vượt quá 255 ký tự.');
                    }
                }
            ],
            'type' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) {
                    if ($value !== strip_tags($value)) {
                        $fail('Loại dịch vụ không được chứa mã HTML.');
                    }
                }
            ],
            'price' => [
                'required',
                'numeric',
                'min:0',
                'max:999999999.99',
                function ($attribute, $value, $fail) {
                    // Tình huống 7: Kiểm tra dữ liệu số
                    if (!is_numeric($value)) {
                        $fail('Giá dịch vụ phải là số.');
                        return;
                    }
                    
                    if ($value < 0) {
                        $fail('Giá dịch vụ không được âm.');
                    }
                    
                    if ($value > 999999999.99) {
                        $fail('Giá dịch vụ quá lớn.');
                    }
                }
            ],
            'description' => [
                'required',
                'string',
                function ($attribute, $value, $fail) {
                    $trimmedValue = trim($value);
                    if ($trimmedValue === '') {
                        $fail('Mô tả dịch vụ không được để trống.');
                        return;
                    }
                    
                    if ($value !== strip_tags($value)) {
                        $fail('Mô tả dịch vụ không được chứa mã HTML.');
                    }
                }
            ],
        ], [
            'name.required' => 'Tên dịch vụ là bắt buộc.',
            'type.required' => 'Loại dịch vụ là bắt buộc.',
            'price.required' => 'Giá dịch vụ là bắt buộc.',
            'price.min' => 'Giá dịch vụ không được âm.',
            'price.max' => 'Giá dịch vụ không được vượt quá 999,999,999 VND.',
            'description.required' => 'Mô tả dịch vụ là bắt buộc.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        // Tình huống 8: Kiểm tra trùng lặp với transaction lock
        DB::beginTransaction();
        try {
            // Sử dụng lock để tránh trùng lặp
            $existingService = Service::where('ServiceName', $cleanedData['name'])
                ->lockForUpdate()
                ->first();
                
            if ($existingService) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Dịch vụ đã tồn tại trong hệ thống'
                ], 409);
            }

            $validated = $validator->validated();

            $service = Service::create([
                'ServiceName' => $cleanedData['name'],
                'ServiceType' => $cleanedData['type'],
                'Price' => $validated['price'],
                'Description' => $cleanedData['description'],
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
                    'updated_at' => $service->updated_at,
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lỗi khi thêm dịch vụ: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi thêm dịch vụ.',
                'error' => 'Lỗi hệ thống'
            ], 500);
        }
    }

    /**
     * Display the specified service.
     */
    public function show($id)
    {
        // Tình huống 3: Kiểm tra ID hợp lệ
        if (!is_numeric($id) || $id <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'ID dịch vụ không hợp lệ'
            ], 400);
        }

        try {
            $service = Service::find($id);

            // Tình huống 1: Kiểm tra tồn tại
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
                    'updated_at' => $service->updated_at,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Lỗi khi tải thông tin dịch vụ: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tải thông tin dịch vụ.',
                'error' => 'Lỗi hệ thống'
            ], 500);
        }
    }

    /**
     * Update the specified service.
     */
    public function update(Request $request, $id)
    {
        // Tình huống 3: Kiểm tra ID hợp lệ
        if (!is_numeric($id) || $id <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'ID dịch vụ không hợp lệ'
            ], 400);
        }

        $service = Service::find($id);

        // Tình huống 1: Kiểm tra tồn tại
        if (!$service) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy dịch vụ.'
            ], 404);
        }

        // Tình huống 2: Kiểm tra optimistic lock
        if ($request->has('updated_at') && $service->updated_at) {
            $clientUpdatedAt = $request->input('updated_at');
            if ($clientUpdatedAt != $service->updated_at->toDateTimeString()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu đã được cập nhật bởi người khác. Vui lòng tải lại trang trước khi cập nhật.',
                    'requires_reload' => true
                ], 409);
            }
        }

        // Clean data đầu vào
        $cleanedData = [
            'name' => $request->name ? htmlspecialchars(trim($request->name), ENT_QUOTES, 'UTF-8') : '',
            'type' => $request->type ? htmlspecialchars(trim($request->type), ENT_QUOTES, 'UTF-8') : '',
            'price' => $request->price,
            'description' => $request->description ? htmlspecialchars(trim($request->description), ENT_QUOTES, 'UTF-8') : '',
        ];

        $validator = Validator::make($cleanedData, [
            'name' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) {
                    $trimmedValue = trim($value);
                    if ($trimmedValue === '') {
                        $fail('Tên dịch vụ không được để trống.');
                        return;
                    }
                    
                    if ($value !== strip_tags($value)) {
                        $fail('Tên dịch vụ không được chứa mã HTML.');
                        return;
                    }
                    
                    if (strpos($value, '　') !== false) {
                        $fail('Tên dịch vụ không được chứa khoảng trắng không hợp lệ.');
                        return;
                    }
                    
                    $decoded = html_entity_decode(trim($value));
                    if (mb_strlen($decoded) > 255) {
                        $fail('Tên dịch vụ không được vượt quá 255 ký tự.');
                    }
                }
            ],
            'type' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) {
                    if ($value !== strip_tags($value)) {
                        $fail('Loại dịch vụ không được chứa mã HTML.');
                    }
                }
            ],
            'price' => [
                'required',
                'numeric',
                'min:0',
                'max:999999999.99',
                function ($attribute, $value, $fail) {
                    if (!is_numeric($value)) {
                        $fail('Giá dịch vụ phải là số.');
                        return;
                    }
                    
                    if ($value < 0) {
                        $fail('Giá dịch vụ không được âm.');
                    }
                }
            ],
            'description' => [
                'required',
                'string',
                function ($attribute, $value, $fail) {
                    $trimmedValue = trim($value);
                    if ($trimmedValue === '') {
                        $fail('Mô tả dịch vụ không được để trống.');
                        return;
                    }
                    
                    if ($value !== strip_tags($value)) {
                        $fail('Mô tả dịch vụ không được chứa mã HTML.');
                    }
                }
            ],
        ], [
            'name.required' => 'Tên dịch vụ là bắt buộc.',
            'type.required' => 'Loại dịch vụ là bắt buộc.',
            'price.required' => 'Giá dịch vụ là bắt buộc.',
            'price.min' => 'Giá dịch vụ không được âm.',
            'price.max' => 'Giá dịch vụ không được vượt quá 999,999,999 VND.',
            'description.required' => 'Mô tả dịch vụ là bắt buộc.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $validated = $validator->validated();

            $service->update([
                'ServiceName' => $cleanedData['name'],
                'ServiceType' => $cleanedData['type'],
                'Price' => $validated['price'],
                'Description' => $cleanedData['description'],
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
                    'updated_at' => $service->fresh()->updated_at,
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lỗi khi cập nhật dịch vụ: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi cập nhật dịch vụ.',
                'error' => 'Lỗi hệ thống'
            ], 500);
        }
    }

    /**
     * Remove the specified service.
     */
    public function destroy($id)
    {
        // Tình huống 3: Kiểm tra ID hợp lệ
        if (!is_numeric($id) || $id <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'ID dịch vụ không hợp lệ'
            ], 400);
        }

        // Tình huống 10: Kiểm tra phương thức
        if (request()->isMethod('GET')) {
            return response()->json([
                'success' => false,
                'message' => 'Phương thức không được phép'
            ], 405);
        }

        $service = Service::find($id);

        // Tình huống 1: Kiểm tra tồn tại
        if (!$service) {
            return response()->json([
                'success' => false,
                'message' => 'Dịch vụ không tồn tại hoặc đã bị xóa'
            ], 404);
        }

        DB::beginTransaction();
        try {
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
            Log::error('Lỗi khi xóa dịch vụ: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi xóa dịch vụ.',
                'error' => 'Lỗi hệ thống'
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
            Log::error('Lỗi khi tải danh sách loại dịch vụ: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tải danh sách loại dịch vụ.',
                'error' => 'Lỗi hệ thống'
            ], 500);
        }
    }

    /**
     * Search services using Solr
     */
    public function search(Request $request)
    {
        try {
            $params = new \stdClass();
            
            // Query tìm kiếm chính xác trên các field quan trọng
            if ($request->has('q') && !empty($request->q)) {
                $keyword = htmlspecialchars(trim($request->q), ENT_QUOTES, 'UTF-8');
                $params->q = "(service_name:*{$keyword}* OR service_type:*{$keyword}* OR description:*{$keyword}*)";
            } else {
                $params->q = "*:*";
            }

            $params->fq = "type:service";
            $params->page = max($request->get('page', 1), 1);
            $params->per_page = min($request->get('per_page', 10), 100);
            $params->sort = "score desc, id asc";

            if ($request->has('type') && !empty($request->type)) {
                $params->service_type = htmlspecialchars(trim($request->type), ENT_QUOTES, 'UTF-8');
            }

            // Giả lập kết quả Solr - trong thực tế sẽ gọi Solr client
            $fallback = false;
            $results = [];
            
            try {
                // Gọi Solr service ở đây
                // $solrResponse = $this->solrService->search($params);
                // $results = $solrResponse->results;
                
                // Nếu Solr không available, fallback về database
                $fallback = true;
                throw new \Exception('Solr not available');
                
            } catch (\Exception $e) {
                // Fallback to database search
                $fallback = true;
                $query = Service::query();
                
                if ($request->has('q') && !empty($request->q)) {
                    $search = htmlspecialchars(trim($request->q), ENT_QUOTES, 'UTF-8');
                    $query->where(function($q) use ($search) {
                        $q->where('ServiceName', 'like', "%{$search}%")
                          ->orWhere('ServiceType', 'like', "%{$search}%")
                          ->orWhere('Description', 'like', "%{$search}%");
                    });
                }

                if ($request->has('type') && !empty($request->type)) {
                    $type = htmlspecialchars(trim($request->type), ENT_QUOTES, 'UTF-8');
                    $query->where('ServiceType', $type);
                }

                $perPage = min($request->get('per_page', 10), 100);
                $page = max($request->get('page', 1), 1);
                
                $services = $query->orderBy('ServiceId', 'asc')
                                ->paginate($perPage, ['*'], 'page', $page);

                $results = $services->map(function($service) {
                    return [
                        'id' => 'service_' . $service->ServiceId,
                        'service_name' => $service->ServiceName,
                        'service_type' => $service->ServiceType,
                        'price' => (float)$service->Price,
                        'description' => $service->Description,
                        'type' => 'service',
                    ];
                })->toArray();

                return response()->json([
                    'success' => true,
                    'results' => $results,
                    'total' => $services->total(),
                    'current_page' => $services->currentPage(),
                    'last_page' => $services->lastPage(),
                    'fallback' => $fallback,
                    'solr_available' => false
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Lỗi khi tìm kiếm dịch vụ: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tìm kiếm dịch vụ.',
                'error' => 'Lỗi hệ thống',
                'fallback' => true
            ], 500);
        }
    }
}
