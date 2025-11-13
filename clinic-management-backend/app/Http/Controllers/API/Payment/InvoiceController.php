<?php

namespace App\Http\Controllers\API\Payment;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    // Lấy danh sách hóa đơn
    public function index(Request $request)
    {
        try {
            $query = Invoice::with([
                'appointment.patient.user',
                'invoice_details.service',
                'invoice_details.medicine'
            ]);

            // TÌM KIẾM AN TOÀN
            if ($request->has('search') && $request->search) {
                $search = trim($request->search);

                // Giới hạn độ dài và escape ký tự đặc biệt
                if (strlen($search) > 0 && strlen($search) <= 100) {
                    $safeSearch = str_replace(['%', '_', '\\'], ['\%', '\_', '\\\\'], $search);

                    $query->where(function ($q) use ($safeSearch) {
                        $q->where('InvoiceId', 'LIKE', "%{$safeSearch}%")
                            ->orWhereHas('appointment.patient.user', function ($patientQuery) use ($safeSearch) {
                                $patientQuery->where('FullName', 'LIKE', "%{$safeSearch}%")
                                    ->orWhere('Phone', 'LIKE', "%{$safeSearch}%");
                            });
                    });
                }
            }

            // LỌC STATUS AN TOÀN - CHỈ CHO PHÉP GIÁ TRỊ HỢP LỆ
            if ($request->has('status') && $request->status) {
                $allowedStatuses = ['Chờ thanh toán', 'Đã thanh toán', 'Đã hủy'];
                $status = trim($request->status);

                if (in_array($status, $allowedStatuses)) {
                    $query->where('Status', $status);
                }
            }

            // THÊM: Filter cho payment history
            if ($request->has('has_payment_info') && $request->has_payment_info) {
                $query->whereNotNull('PaymentMethod')
                    ->where('PaymentMethod', '!=', '');
            }

            if ($request->has('with_transaction') && $request->with_transaction) {
                $query->whereNotNull('TransactionId')
                    ->where('TransactionId', '!=', '');
            }

            // THÊM: Xử lý phân trang
            $perPage = $request->get('limit', 10); // Mặc định 10 items/trang
            $page = $request->get('page', 1); // Mặc định trang 1

            // Sử dụng paginate thay vì get
            $paginatedInvoices = $query->orderBy('InvoiceDate', 'desc')
                ->orderBy('InvoiceId', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);

            // Format data
            $formattedInvoices = $paginatedInvoices->map(function ($invoice) {
                $patientName = 'N/A';
                $patientPhone = 'N/A';

                if (
                    $invoice->appointment &&
                    $invoice->appointment->patient &&
                    $invoice->appointment->patient->user
                ) {
                    $patientName = $invoice->appointment->patient->user->FullName ?? 'N/A';
                    $patientPhone = $invoice->appointment->patient->user->Phone ?? 'N/A';
                }

                return [
                    'id' => $invoice->InvoiceId,
                    'code' => 'HD' . str_pad($invoice->InvoiceId, 6, '0', STR_PAD_LEFT),
                    'patient_name' => $patientName,
                    'patient_phone' => $patientPhone,
                    'patient_id' => $invoice->PatientId,
                    'date' => $invoice->InvoiceDate ? $invoice->InvoiceDate->format('d/m/Y') : 'N/A',
                    'total' => (float) $invoice->TotalAmount,
                    'status' => $invoice->Status,
                    'payment_method' => $invoice->PaymentMethod,
                    'order_id' => $invoice->OrderId,
                    'transaction_id' => $invoice->TransactionId,
                    'paid_at' => $invoice->Paidat ? $invoice->Paidat->format('d/m/Y H:i') : null,
                    'appointment_id' => $invoice->AppointmentId,
                    'can_pay' => $invoice->Status === 'Chờ thanh toán'
                ];
            });

            return response()->json([
                'success' => true,
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

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy danh sách hóa đơn: ' . $e->getMessage()
            ], 500);
        }
    }

    // Lấy chi tiết hóa đơn
    public function show($id)
    {
        try {
            $invoice = Invoice::with([
                'appointment.patient.user', // Sửa thành appointment.patient.user
                'invoice_details.service',
                'invoice_details.medicine'
            ])->find($id);

            if (!$invoice) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hóa đơn không tồn tại'
                ], 404);
            }

            // Format data để có patient name và phone
            $formattedInvoice = [
                'id' => $invoice->InvoiceId,
                'code' => 'HD' . str_pad($invoice->InvoiceId, 6, '0', STR_PAD_LEFT),
                'patient_name' => $invoice->appointment && $invoice->appointment->patient && $invoice->appointment->patient->user
                    ? $invoice->appointment->patient->user->FullName
                    : 'N/A',
                'patient_phone' => $invoice->appointment && $invoice->appointment->patient && $invoice->appointment->patient->user
                    ? $invoice->appointment->patient->user->Phone
                    : 'N/A',
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
                'appointment' => $invoice->appointment
            ];

            return response()->json([
                'success' => true,
                'data' => $formattedInvoice
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy thông tin hóa đơn: ' . $e->getMessage()
            ], 500);
        }
    }

    // Tạo hóa đơn mới
    public function store(Request $request)
    {
        try {
            $request->validate([
                'PatientId' => 'required|integer|exists:Patients,PatientId', // Thêm exists
                'TotalAmount' => 'required|numeric|min:1000', // Tối thiểu 1000 VND
                'AppointmentId' => 'nullable|integer|exists:Appointments,AppointmentId' // Thêm exists
            ]);

            // Kiểm tra PatientId có tồn tại không
            $patientExists = \App\Models\Patient::where('PatientId', $request->PatientId)->exists();
            if (!$patientExists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bệnh nhân không tồn tại'
                ], 400);
            }

            $invoice = Invoice::create([
                'PatientId' => (int) $request->PatientId, // Cast to int để an toàn
                'AppointmentId' => $request->AppointmentId ? (int) $request->AppointmentId : null,
                'TotalAmount' => (float) $request->TotalAmount,
                'Status' => 'Chờ thanh toán',
                'InvoiceDate' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Tạo hóa đơn thành công',
                'data' => [
                    'id' => $invoice->InvoiceId,
                    'code' => 'HD' . str_pad($invoice->InvoiceId, 6, '0', STR_PAD_LEFT),
                    'patient_id' => $invoice->PatientId,
                    'total_amount' => $invoice->TotalAmount,
                    'status' => $invoice->Status,
                    'invoice_date' => $invoice->InvoiceDate->format('d/m/Y')
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tạo hóa đơn: ' . $e->getMessage()
            ], 500);
        }
    }

    // Lấy danh sách hóa đơn đã thanh toán (cho tab lịch sử thanh toán)
    public function paymentHistory(Request $request)
    {
        try {
            $query = Invoice::with([
                'appointment.patient.user',
                'invoice_details.service',
                'invoice_details.medicine'
            ])->where('Status', 'Đã thanh toán');

            // TÌM KIẾM AN TOÀN
            if ($request->has('search') && $request->search) {
                $search = trim($request->search);

                if (strlen($search) > 0 && strlen($search) <= 100) {
                    $safeSearch = str_replace(['%', '_', '\\'], ['\%', '\_', '\\\\'], $search);

                    $query->where(function ($q) use ($safeSearch) {
                        $q->where('InvoiceId', 'LIKE', "%{$safeSearch}%")
                            ->orWhereHas('appointment.patient.user', function ($patientQuery) use ($safeSearch) {
                                $patientQuery->where('FullName', 'LIKE', "%{$safeSearch}%")
                                    ->orWhere('Phone', 'LIKE', "%{$safeSearch}%");
                            });
                    });
                }
            }

            // Phân trang
            $perPage = $request->get('limit', 20); // Tăng limit cho lịch sử
            $page = $request->get('page', 1);

            $paginatedInvoices = $query->orderBy('InvoiceDate', 'desc')
                ->orderBy('InvoiceId', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);

            // Format data (giống như method index)
            $formattedInvoices = $paginatedInvoices->map(function ($invoice) {
                $patientName = 'N/A';
                $patientPhone = 'N/A';

                if (
                    $invoice->appointment &&
                    $invoice->appointment->patient &&
                    $invoice->appointment->patient->user
                ) {
                    $patientName = $invoice->appointment->patient->user->FullName ?? 'N/A';
                    $patientPhone = $invoice->appointment->patient->user->Phone ?? 'N/A';
                }

                return [
                    'id' => $invoice->InvoiceId,
                    'code' => 'HD' . str_pad($invoice->InvoiceId, 6, '0', STR_PAD_LEFT),
                    'patient_name' => $patientName,
                    'patient_phone' => $patientPhone,
                    'patient_id' => $invoice->PatientId,
                    'date' => $invoice->InvoiceDate ? $invoice->InvoiceDate->format('d/m/Y') : 'N/A',
                    'total' => (float) $invoice->TotalAmount,
                    'status' => $invoice->Status,
                    'payment_method' => $invoice->PaymentMethod,
                    'order_id' => $invoice->OrderId,
                    'transaction_id' => $invoice->TransactionId,
                    'paid_at' => $invoice->Paidat ? $invoice->Paidat->format('d/m/Y H:i') : null,
                    'appointment_id' => $invoice->AppointmentId,
                    'can_pay' => $invoice->Status === 'Chờ thanh toán'
                ];
            });

            return response()->json([
                'success' => true,
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

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi lấy lịch sử thanh toán: ' . $e->getMessage()
            ], 500);
        }
    }
}