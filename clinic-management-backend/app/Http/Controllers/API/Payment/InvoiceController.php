<?php

namespace App\Http\Controllers\API\Payment;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\Appointment;
use App\Models\User;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class InvoiceController extends Controller
{
    /**
     * ✅ METHOD TRUNG TÂM: Lấy thông tin user từ Auth
     */
    private function getAuthenticatedUser()
    {
        $user = User::where('UserId', Auth::id())->first();

        if (!$user) {
            throw new \Exception('Không tìm thấy thông tin người dùng.');
        }

        return $user;
    }

    /**
     * Kiểm tra kết nối database
     */
    private function checkDatabaseConnection()
    {
        try {
            DB::connection()->getPdo();
            if (!DB::connection()->getDatabaseName()) {
                Log::error('Kết nối database: Database name không tồn tại');
                return false;
            }
            return true;
        } catch (\Exception $e) {
            Log::error('Lỗi kết nối database: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Xử lý response lỗi mạng
     */
    private function handleNetworkError($context = '')
    {
        $message = 'Lỗi mất internet vui lòng kiểm tra kết nối';
        if (!empty($context)) {
            $message .= ' (' . $context . ')';
        }

        Log::error('Lỗi mạng: ' . $context);

        return response()->json([
            'success' => false,
            'message' => $message,
            'error_code' => 'NETWORK_ERROR',
            'timestamp' => now()->format('Y-m-d H:i:s')
        ], 503);
    }

    /**
     * Xử lý response lỗi database
     */
    private function handleDatabaseError($error, $context = '')
    {
        $errorCode = $error->errorInfo[1] ?? null;
        $errorMessage = 'Lỗi cơ sở dữ liệu';

        // Xác định thông báo dựa trên error code
        switch ($errorCode) {
            case 1045:
                $errorMessage = 'Lỗi xác thực cơ sở dữ liệu';
                $errorCode = 'DATABASE_ACCESS_DENIED';
                break;
            case 1049:
                $errorMessage = 'Database không tồn tại';
                $errorCode = 'DATABASE_NOT_FOUND';
                break;
            case 2002:
            case 2003:
            case 2006:
                $errorMessage = 'Mất kết nối cơ sở dữ liệu';
                $errorCode = 'DATABASE_CONNECTION_LOST';
                break;
            case 1062:
                $errorMessage = 'Dữ liệu đã tồn tại trong hệ thống';
                $errorCode = 'DUPLICATE_ENTRY';
                break;
            case 1451:
                $errorMessage = 'Không thể xóa do ràng buộc dữ liệu';
                $errorCode = 'FOREIGN_KEY_CONSTRAINT';
                break;
            case 1452:
                $errorMessage = 'Dữ liệu liên quan không tồn tại';
                $errorCode = 'FOREIGN_KEY_NOT_FOUND';
                break;
            default:
                $errorCode = 'DATABASE_QUERY_ERROR';
        }

        if (!empty($context)) {
            $errorMessage .= ' (' . $context . ')';
        }

        Log::error('Lỗi database: ' . $errorMessage, [
            'error_code' => $errorCode,
            'mysql_error' => $error->getMessage(),
            'sql_state' => $error->errorInfo[0] ?? '',
            'context' => $context
        ]);

        return response()->json([
            'success' => false,
            'message' => $errorMessage,
            'error_code' => $errorCode,
            'timestamp' => now()->format('Y-m-d H:i:s')
        ], 500);
    }

    /**
     * Xử lý response lỗi hệ thống
     */
    private function handleSystemError($error, $context = '')
    {
        $errorMessage = 'Lỗi hệ thống';
        if (!empty($context)) {
            $errorMessage .= ' (' . $context . ')';
        }

        Log::error('Lỗi hệ thống: ' . $error->getMessage(), [
            'file' => $error->getFile(),
            'line' => $error->getLine(),
            'trace' => $error->getTraceAsString(),
            'context' => $context
        ]);

        return response()->json([
            'success' => false,
            'message' => $errorMessage,
            'error_code' => 'SYSTEM_ERROR',
            'timestamp' => now()->format('Y-m-d H:i:s')
        ], 500);
    }

    /**
     * Xử lý response lỗi validation
     */
    private function handleValidationError($validator, $context = '')
    {
        $errorMessage = 'Dữ liệu không hợp lệ';
        if (!empty($context)) {
            $errorMessage .= ' (' . $context . ')';
        }

        Log::warning('Lỗi validation: ' . $errorMessage, [
            'errors' => $validator->errors()->toArray(),
            'context' => $context
        ]);

        return response()->json([
            'success' => false,
            'message' => $errorMessage,
            'errors' => $validator->errors(),
            'error_count' => count($validator->errors()),
            'error_code' => 'VALIDATION_ERROR',
            'timestamp' => now()->format('Y-m-d H:i:s')
        ], 422);
    }

    /**
     * Xử lý response lỗi không tìm thấy
     */
    private function handleNotFoundError($item, $id, $context = '')
    {
        $errorMessage = $item . ' không tồn tại';
        if (!empty($context)) {
            $errorMessage .= ' (' . $context . ')';
        }

        Log::warning('Lỗi không tìm thấy: ' . $errorMessage, [
            'item' => $item,
            'id' => $id,
            'context' => $context
        ]);

        return response()->json([
            'success' => false,
            'message' => $errorMessage,
            'error_code' => strtoupper($item) . '_NOT_FOUND',
            'searched_id' => $id,
            'timestamp' => now()->format('Y-m-d H:i:s')
        ], 404);
    }

    /**
     * Xử lý response lỗi business logic
     */
    private function handleBusinessError($message, $errorCode, $context = '')
    {
        if (!empty($context)) {
            $message .= ' (' . $context . ')';
        }

        Log::warning('Lỗi business logic: ' . $message, [
            'error_code' => $errorCode,
            'context' => $context
        ]);

        return response()->json([
            'success' => false,
            'message' => $message,
            'error_code' => $errorCode,
            'timestamp' => now()->format('Y-m-d H:i:s')
        ], 409);
    }

    // Lấy danh sách hóa đơn
    public function index(Request $request)
    {
        // Kiểm tra kết nối database trước
        if (!$this->checkDatabaseConnection()) {
            return $this->handleNetworkError('Không thể kết nối database');
        }

        try {
            // ✅ LẤY THÔNG TIN USER ĐĂNG NHẬP
            $user = $this->getAuthenticatedUser();
            Log::info('🔄 User đăng nhập:', [
                'user_id' => $user->UserId,
                'email' => $user->Email,
                'full_name' => $user->FullName
            ]);

            // Validate request parameters
            $validator = Validator::make($request->all(), [
                'search' => 'nullable|string|max:100',
                'status' => 'nullable|string|in:Chờ thanh toán,Đã thanh toán,Đã hủy',
                'has_payment_info' => 'nullable|boolean',
                'with_transaction' => 'nullable|boolean',
                'limit' => 'nullable|integer|min:1|max:100',
                'page' => 'nullable|integer|min:1'
            ], [
                'search.string' => 'Từ khóa tìm kiếm không hợp lệ',
                'search.max' => 'Từ khóa tìm kiếm không được vượt quá 100 ký tự',
                'status.in' => 'Trạng thái không hợp lệ. Chỉ chấp nhận: Chờ thanh toán, Đã thanh toán, Đã hủy',
                'has_payment_info.boolean' => 'Thông tin thanh toán phải là true hoặc false',
                'with_transaction.boolean' => 'Thông tin giao dịch phải là true hoặc false',
                'limit.integer' => 'Số lượng bản ghi phải là số nguyên',
                'limit.min' => 'Số lượng bản ghi tối thiểu là 1',
                'limit.max' => 'Số lượng bản ghi tối đa là 100',
                'page.integer' => 'Số trang phải là số nguyên',
                'page.min' => 'Số trang phải lớn hơn 0'
            ]);

            if ($validator->fails()) {
                return $this->handleValidationError($validator, 'Lấy danh sách hóa đơn');
            }

            $query = Invoice::with([
                'appointment.patient.user',
                'invoice_details.service',
                'invoice_details.medicine'
            ]);

            // TÌM KIẾM AN TOÀN
            $searchApplied = false;
            if ($request->has('search') && $request->search) {
                $search = trim($request->search);

                if (strlen($search) > 0 && strlen($search) <= 100) {
                    $safeSearch = str_replace(['%', '_', '\\'], ['\%', '\_', '\\\\'], $search);
                    $searchApplied = true;

                    $query->where(function ($q) use ($safeSearch) {
                        $q->where('InvoiceId', 'LIKE', "%{$safeSearch}%")
                            ->orWhereHas('appointment.patient.user', function ($patientQuery) use ($safeSearch) {
                                $patientQuery->where('FullName', 'LIKE', "%{$safeSearch}%")
                                    ->orWhere('Phone', 'LIKE', "%{$safeSearch}%");
                            })
                            ->orWhere('PaymentMethod', 'LIKE', "%{$safeSearch}%")
                            ->orWhere('TransactionId', 'LIKE', "%{$safeSearch}%");
                    });
                }
            }

            // LỌC STATUS AN TOÀN
            $statusApplied = false;
            if ($request->has('status') && $request->status) {
                $query->where('Status', $request->status);
                $statusApplied = true;
            }

            // Filter cho payment history
            $paymentFilterApplied = false;
            if ($request->has('has_payment_info') && $request->has_payment_info) {
                $query->whereNotNull('PaymentMethod')
                    ->where('PaymentMethod', '!=', '');
                $paymentFilterApplied = true;
            }

            $transactionFilterApplied = false;
            if ($request->has('with_transaction') && $request->with_transaction) {
                $query->whereNotNull('TransactionId')
                    ->where('TransactionId', '!=', '');
                $transactionFilterApplied = true;
            }

            // Xử lý phân trang
            $perPage = $request->get('limit', 10);
            $page = $request->get('page', 1);

            // Kiểm tra số lượng bản ghi có hợp lệ không
            $totalInvoices = $query->count();

            // Xử lý khi KHÔNG có dữ liệu
            if ($totalInvoices === 0) {
                $message = 'Không tìm thấy hóa đơn nào';

                if ($searchApplied) {
                    $message = 'Không tìm thấy hóa đơn nào phù hợp với từ khóa tìm kiếm';
                } elseif ($statusApplied) {
                    $message = 'Không tìm thấy hóa đơn nào với trạng thái đã chọn';
                } elseif ($paymentFilterApplied || $transactionFilterApplied) {
                    $message = 'Không tìm thấy hóa đơn nào phù hợp với bộ lọc';
                }

                return response()->json([
                    'success' => true,
                    'data' => [
                        'invoices' => [],
                        'pagination' => [
                            'current_page' => 1,
                            'last_page' => 1,
                            'per_page' => $perPage,
                            'total' => 0,
                            'from' => null,
                            'to' => null,
                        ],
                    ],
                    'message' => $message,
                    'filters_applied' => [
                        'search' => $searchApplied,
                        'status' => $statusApplied,
                        'has_payment_info' => $paymentFilterApplied,
                        'with_transaction' => $transactionFilterApplied
                    ],
                    // ✅ THÊM THÔNG TIN USER VÀO RESPONSE
                    'user_info' => [
                        'user_id' => $user->UserId,
                        'full_name' => $user->FullName,
                        'email' => $user->Email
                    ]
                ]);
            }

            $paginatedInvoices = $query->orderBy('InvoiceDate', 'desc')
                ->orderBy('InvoiceId', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);

            // Format data
            $formattedInvoices = $paginatedInvoices->map(function ($invoice) {
                return $this->formatInvoiceData($invoice);
            });

            // Thông báo thành công với thông tin chi tiết
            $message = 'Lấy danh sách hóa đơn thành công';
            $additionalInfo = [];

            if ($searchApplied) {
                $additionalInfo[] = 'đã áp dụng tìm kiếm';
            }
            if ($statusApplied) {
                $additionalInfo[] = 'đã lọc theo trạng thái';
            }
            if ($paymentFilterApplied) {
                $additionalInfo[] = 'đã lọc theo thông tin thanh toán';
            }
            if ($transactionFilterApplied) {
                $additionalInfo[] = 'đã lọc theo giao dịch';
            }

            if (!empty($additionalInfo)) {
                $message .= ' (' . implode(', ', $additionalInfo) . ')';
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => [
                    'invoices' => $formattedInvoices,
                    'pagination' => [
                        'current_page' => $paginatedInvoices->currentPage(),
                        'last_page' => $paginatedInvoices->lastPage(),
                        'per_page' => $paginatedInvoices->perPage(),
                        'total' => $paginatedInvoices->total(),
                        'from' => $paginatedInvoices->firstItem(),
                        'to' => $paginatedInvoices->lastItem(),
                    ]
                ],
                'filters_applied' => [
                    'search' => $searchApplied ? $request->search : null,
                    'status' => $statusApplied ? $request->status : null,
                    'has_payment_info' => $paymentFilterApplied,
                    'with_transaction' => $transactionFilterApplied,
                    'limit' => $perPage,
                    'page' => $page
                ],
                // ✅ THÊM THÔNG TIN USER VÀO RESPONSE
                'user_info' => [
                    'user_id' => $user->UserId,
                    'full_name' => $user->FullName,
                    'email' => $user->Email,
                    'requested_at' => now()->format('d/m/Y H:i:s')
                ]
            ], 200);

        } catch (\Illuminate\Database\QueryException $e) {
            return $this->handleDatabaseError($e, 'Lấy danh sách hóa đơn');
        } catch (\Exception $e) {
            // Kiểm tra nếu là lỗi timeout hoặc connection
            if (
                str_contains($e->getMessage(), 'Connection') ||
                str_contains($e->getMessage(), 'timeout') ||
                str_contains($e->getMessage(), 'Network is unreachable')
            ) {
                return $this->handleNetworkError('Lỗi kết nối hệ thống');
            }
            return $this->handleSystemError($e, 'Lấy danh sách hóa đơn');
        }
    }

    // Lấy chi tiết hóa đơn
    public function show($id)
    {
        // Kiểm tra kết nối database trước
        if (!$this->checkDatabaseConnection()) {
            return $this->handleNetworkError('Không thể kết nối database');
        }

        try {
            // ✅ LẤY THÔNG TIN USER ĐĂNG NHẬP
            $user = $this->getAuthenticatedUser();

            // Validate ID chi tiết
            if (!is_numeric($id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'ID hóa đơn phải là số',
                    'error_code' => 'INVALID_INVOICE_ID_FORMAT',
                    'timestamp' => now()->format('Y-m-d H:i:s'),
                    'user_info' => [
                        'user_id' => $user->UserId,
                        'full_name' => $user->FullName
                    ]
                ], 400);
            }

            $id = (int) $id;

            if ($id <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'ID hóa đơn phải lớn hơn 0',
                    'error_code' => 'INVALID_INVOICE_ID_RANGE',
                    'timestamp' => now()->format('Y-m-d H:i:s'),
                    'user_info' => [
                        'user_id' => $user->UserId,
                        'full_name' => $user->FullName
                    ]
                ], 400);
            }

            if ($id > 999999) {
                return response()->json([
                    'success' => false,
                    'message' => 'ID hóa đơn quá lớn',
                    'error_code' => 'INVOICE_ID_TOO_LARGE',
                    'timestamp' => now()->format('Y-m-d H:i:s'),
                    'user_info' => [
                        'user_id' => $user->UserId,
                        'full_name' => $user->FullName
                    ]
                ], 400);
            }

            $invoice = Invoice::with([
                'appointment.patient.user',
                'invoice_details.service',
                'invoice_details.medicine'
            ])->find($id);

            if (!$invoice) {
                return $this->handleNotFoundError('Hóa đơn', $id, 'Lấy chi tiết hóa đơn');
            }

            // Kiểm tra dữ liệu liên quan
            $warnings = [];

            if (!$invoice->appointment) {
                $warnings[] = 'Hóa đơn không có thông tin lịch hẹn liên quan';
            } else {
                if (!$invoice->appointment->patient) {
                    $warnings[] = 'Lịch hẹn không có thông tin bệnh nhân';
                } elseif (!$invoice->appointment->patient->user) {
                    $warnings[] = 'Bệnh nhân không có thông tin người dùng';
                }
            }

            if ($invoice->invoice_details->isEmpty()) {
                $warnings[] = 'Hóa đơn không có chi tiết dịch vụ hoặc thuốc';
            }

            $formattedInvoice = $this->formatInvoiceData($invoice);
            $formattedInvoice['warnings'] = $warnings;

            return response()->json([
                'success' => true,
                'message' => 'Lấy thông tin hóa đơn thành công',
                'data' => $formattedInvoice,
                'warnings' => $warnings,
                // ✅ THÊM THÔNG TIN USER VÀO RESPONSE
                'user_info' => [
                    'user_id' => $user->UserId,
                    'full_name' => $user->FullName,
                    'email' => $user->Email,
                    'requested_at' => now()->format('d/m/Y H:i:s')
                ]
            ], 200);

        } catch (\Illuminate\Database\QueryException $e) {
            return $this->handleDatabaseError($e, 'Lấy chi tiết hóa đơn ID: ' . $id);
        } catch (\Exception $e) {
            // Kiểm tra lỗi liên quan đến mạng
            if (
                str_contains($e->getMessage(), 'Connection') ||
                str_contains($e->getMessage(), 'timeout') ||
                str_contains($e->getMessage(), 'Network is unreachable')
            ) {
                return $this->handleNetworkError('Lỗi kết nối hệ thống');
            }
            return $this->handleSystemError($e, 'Lấy chi tiết hóa đơn ID: ' . $id);
        }
    }


   

    // Tạo hóa đơn mới
    public function store(Request $request)
    {
        // Kiểm tra kết nối database trước
        if (!$this->checkDatabaseConnection()) {
            return $this->handleNetworkError('Không thể kết nối database');
        }

        DB::beginTransaction();

        try {
            $validator = Validator::make($request->all(), [
                'PatientId' => [
                    'required',
                    'integer',
                    'min:1',
                    function ($attribute, $value, $fail) {
                        if (!Patient::where('PatientId', $value)->exists()) {
                            $fail('Bệnh nhân không tồn tại trong hệ thống');
                        }
                    }
                ],
                'TotalAmount' => [
                    'required',
                    'numeric',
                    'min:1000',
                    'max:1000000000',
                    'regex:/^\d+(\.\d{1,2})?$/'
                ],
                'AppointmentId' => [
                    'nullable',
                    'integer',
                    'min:1',
                    function ($attribute, $value, $fail) {
                        if ($value && !Appointment::where('AppointmentId', $value)->exists()) {
                            $fail('Lịch hẹn không tồn tại trong hệ thống');
                        }
                    }
                ]
            ], [
                'PatientId.required' => 'Vui lòng chọn bệnh nhân',
                'PatientId.integer' => 'ID bệnh nhân phải là số nguyên',
                'PatientId.min' => 'ID bệnh nhân không hợp lệ',
                'TotalAmount.required' => 'Vui lòng nhập tổng số tiền',
                'TotalAmount.numeric' => 'Tổng số tiền phải là số',
                'TotalAmount.min' => 'Tổng số tiền tối thiểu là 1,000 VND',
                'TotalAmount.max' => 'Tổng số tiền không được vượt quá 1,000,000,000 VND',
                'TotalAmount.regex' => 'Tổng số tiền chỉ được có tối đa 2 chữ số thập phân',
                'AppointmentId.integer' => 'ID lịch hẹn phải là số nguyên',
                'AppointmentId.min' => 'ID lịch hẹn không hợp lệ'
            ]);

            if ($validator->fails()) {
                DB::rollBack();
                return $this->handleValidationError($validator, 'Tạo hóa đơn mới');
            }

            // Kiểm tra xem AppointmentId có thuộc về PatientId không
            if ($request->AppointmentId) {
                $appointment = Appointment::find($request->AppointmentId);
                if ($appointment && $appointment->PatientId != $request->PatientId) {
                    DB::rollBack();
                    return $this->handleBusinessError(
                        'Lịch hẹn không thuộc về bệnh nhân đã chọn',
                        'APPOINTMENT_PATIENT_MISMATCH',
                        'Tạo hóa đơn'
                    );
                }
            }

            // Kiểm tra xem đã có hóa đơn cho appointment này chưa
            if ($request->AppointmentId) {
                $existingInvoice = Invoice::where('AppointmentId', $request->AppointmentId)->first();
                if ($existingInvoice) {
                    DB::rollBack();
                    return $this->handleBusinessError(
                        'Đã tồn tại hóa đơn cho lịch hẹn này',
                        'DUPLICATE_APPOINTMENT_INVOICE',
                        'Tạo hóa đơn'
                    );
                }
            }

            // Tạo hóa đơn
            $invoice = Invoice::create([
                'PatientId' => (int) $request->PatientId,
                'AppointmentId' => $request->AppointmentId ? (int) $request->AppointmentId : null,
                'TotalAmount' => (float) $request->TotalAmount,
                'Status' => 'Chờ thanh toán',
                'InvoiceDate' => now()
            ]);

            DB::commit();

            // Load lại thông tin đầy đủ
            $invoice->load(['appointment.patient.user', 'invoice_details.service', 'invoice_details.medicine']);

            return response()->json([
                'success' => true,
                'message' => 'Tạo hóa đơn thành công',
                'data' => $this->formatInvoiceData($invoice),
                'invoice_id' => $invoice->InvoiceId,
                'invoice_code' => 'HD' . str_pad($invoice->InvoiceId, 6, '0', STR_PAD_LEFT),
                'timestamp' => now()->format('Y-m-d H:i:s')
            ], 201);

        } catch (\Illuminate\Database\QueryException $e) {
            DB::rollBack();
            return $this->handleDatabaseError($e, 'Tạo hóa đơn mới');
        } catch (\Exception $e) {
            DB::rollBack();
            // Kiểm tra lỗi mạng
            if (
                str_contains($e->getMessage(), 'Connection') ||
                str_contains($e->getMessage(), 'timeout')
            ) {
                return $this->handleNetworkError('Mất kết nối khi tạo hóa đơn');
            }
            return $this->handleSystemError($e, 'Tạo hóa đơn mới');
        }
    }

    // Lấy danh sách hóa đơn đã thanh toán
    public function paymentHistory(Request $request)
    {
        // Kiểm tra kết nối database trước
        if (!$this->checkDatabaseConnection()) {
            return $this->handleNetworkError('Không thể kết nối database');
        }

        try {
            $validator = Validator::make($request->all(), [
                'search' => 'nullable|string|max:100',
                'payment_method' => 'nullable|string|in:Tiền mặt,Chuyển khoản,Thẻ,Ví điện tử',
                'start_date' => 'nullable|date_format:Y-m-d',
                'end_date' => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
                'limit' => 'nullable|integer|min:1|max:100',
                'page' => 'nullable|integer|min:1'
            ], [
                'search.max' => 'Từ khóa tìm kiếm không được vượt quá 100 ký tự',
                'payment_method.in' => 'Phương thức thanh toán không hợp lệ',
                'start_date.date_format' => 'Ngày bắt đầu không đúng định dạng (YYYY-MM-DD)',
                'end_date.date_format' => 'Ngày kết thúc không đúng định dạng (YYYY-MM-DD)',
                'end_date.after_or_equal' => 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
                'limit.min' => 'Số lượng bản ghi tối thiểu là 1',
                'limit.max' => 'Số lượng bản ghi tối đa là 100',
                'page.min' => 'Số trang phải lớn hơn 0'
            ]);

            if ($validator->fails()) {
                return $this->handleValidationError($validator, 'Lấy lịch sử thanh toán');
            }

            $query = Invoice::with([
                'appointment.patient.user',
                'invoice_details.service',
                'invoice_details.medicine'
            ])->where('Status', 'Đã thanh toán');

            // TÌM KIẾM
            if ($request->has('search') && $request->search) {
                $search = trim($request->search);
                $safeSearch = str_replace(['%', '_', '\\'], ['\%', '\_', '\\\\'], $search);

                $query->where(function ($q) use ($safeSearch) {
                    $q->where('InvoiceId', 'LIKE', "%{$safeSearch}%")
                        ->orWhereHas('appointment.patient.user', function ($patientQuery) use ($safeSearch) {
                            $patientQuery->where('FullName', 'LIKE', "%{$safeSearch}%")
                                ->orWhere('Phone', 'LIKE', "%{$safeSearch}%");
                        })
                        ->orWhere('PaymentMethod', 'LIKE', "%{$safeSearch}%")
                        ->orWhere('TransactionId', 'LIKE', "%{$safeSearch}%")
                        ->orWhere('OrderId', 'LIKE', "%{$safeSearch}%");
                });
            }

            // LỌC PHƯƠNG THỨC THANH TOÁN
            if ($request->has('payment_method') && $request->payment_method) {
                $query->where('PaymentMethod', $request->payment_method);
            }

            // LỌC THEO NGÀY
            if ($request->has('start_date') && $request->start_date) {
                $query->whereDate('Paidat', '>=', $request->start_date);
            }

            if ($request->has('end_date') && $request->end_date) {
                $query->whereDate('Paidat', '<=', $request->end_date);
            }

            // Phân trang
            $perPage = $request->get('limit', 20);
            $page = $request->get('page', 1);

            $totalInvoices = $query->count();
            if ($totalInvoices === 0) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'invoices' => [],
                        'pagination' => [
                            'current_page' => 1,
                            'last_page' => 1,
                            'per_page' => $perPage,
                            'total' => 0,
                            'from' => null,
                            'to' => null,
                        ]
                    ],
                    'message' => 'Không tìm thấy hóa đơn đã thanh toán nào'
                ]);
            }

            $paginatedInvoices = $query->orderBy('Paidat', 'desc')
                ->orderBy('InvoiceId', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);

            // Format data
            $formattedInvoices = $paginatedInvoices->map(function ($invoice) {
                return $this->formatInvoiceData($invoice);
            });

            return response()->json([
                'success' => true,
                'message' => 'Lấy lịch sử thanh toán thành công',
                'data' => [
                    'invoices' => $formattedInvoices,
                    'pagination' => [
                        'current_page' => $paginatedInvoices->currentPage(),
                        'last_page' => $paginatedInvoices->lastPage(),
                        'per_page' => $paginatedInvoices->perPage(),
                        'total' => $paginatedInvoices->total(),
                        'from' => $paginatedInvoices->firstItem(),
                        'to' => $paginatedInvoices->lastItem(),
                    ]
                ]
            ]);

        } catch (\Illuminate\Database\QueryException $e) {
            return $this->handleDatabaseError($e, 'Lấy lịch sử thanh toán');
        } catch (\Exception $e) {
            // Kiểm tra lỗi mạng
            if (
                str_contains($e->getMessage(), 'Connection') ||
                str_contains($e->getMessage(), 'timeout')
            ) {
                return $this->handleNetworkError('Lỗi kết nối hệ thống');
            }
            return $this->handleSystemError($e, 'Lấy lịch sử thanh toán');
        }
    }

    /**
     * Format dữ liệu hóa đơn
     */
    private function formatInvoiceData($invoice)
    {
        $patientName = 'N/A';
        $patientPhone = 'N/A';
        $patientAge = 'N/A';
        $patientGender = 'N/A';
        $patientEmail = 'N/A';

        if (
            $invoice->appointment &&
            $invoice->appointment->patient &&
            $invoice->appointment->patient->user
        ) {
            $user = $invoice->appointment->patient->user;
            $patientName = $user->FullName ?? 'N/A';
            $patientPhone = $user->Phone ?? 'N/A';
            $patientEmail = $user->Email ?? 'N/A';

            // TÍNH TUỔI TỪ DateOfBirth
            if (!empty($user->DateOfBirth)) {
                try {
                    $birthDate = Carbon::parse($user->DateOfBirth);
                    $patientAge = $birthDate->age;
                } catch (\Exception $e) {
                    $patientAge = 'N/A';
                }
            }

            // LẤY GIỚI TÍNH
            $patientGender = $user->Gender ?? 'N/A';
        }

        return [
            'id' => $invoice->InvoiceId,
            'code' => 'HD' . str_pad($invoice->InvoiceId, 6, '0', STR_PAD_LEFT),
            'patient_name' => $patientName,
            'patient_phone' => $patientPhone,
            'patient_email' => $patientEmail,
            'patient_age' => $patientAge,
            'patient_gender' => $patientGender,
            'patient_id' => $invoice->PatientId,
            'date' => $invoice->InvoiceDate ? $invoice->InvoiceDate->format('d/m/Y') : 'N/A',
            'total' => (float) $invoice->TotalAmount,
            'status' => $invoice->Status,
            'payment_method' => $invoice->PaymentMethod,
            'order_id' => $invoice->OrderId,
            'transaction_id' => $invoice->TransactionId,
            'paid_at' => $invoice->Paidat ? $invoice->Paidat->format('d/m/Y H:i') : null,
            'appointment_id' => $invoice->AppointmentId,
            'can_pay' => $invoice->Status === 'Chờ thanh toán',
            'invoice_details' => $invoice->invoice_details,
            'created_at' => $invoice->CreatedAt ? $invoice->CreatedAt->format('d/m/Y H:i') : null,
            'updated_at' => $invoice->UpdatedAt ? $invoice->UpdatedAt->format('d/m/Y H:i') : null
        ];
    }
}