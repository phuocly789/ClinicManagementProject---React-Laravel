<?php

namespace App\Http\Controllers\API;

use App\Exceptions\AppErrors;
use App\Http\Controllers\Controller;
use App\Http\Services\PatientService;
use Illuminate\Container\Attributes\Log;
use Illuminate\Http\Request;

class PatientController extends Controller
{
    protected $patientService;
    public function __construct(PatientService $patientService)
    {
        $this->patientService = $patientService;
    }
    public function updateProfile(Request $request, $id)
    {
        try {
            $data = $request->all();
            $updatedPatient = $this->patientService->hanldeUpdateProfile($id, $data);

            return response()->json([
                'success' => true,
                'message' => 'Cập nhật thông tin bệnh nhân thành công.',
            ], 200);
        } catch (AppErrors $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], $e->getCode() ?: 400);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi server: ' . $e->getMessage()
            ], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }
    public function sendVerificationEmail(Request $request)
    {
        try {
            $data = $request->all();
            $emailVerification = $this->patientService->handleSendEmail($data);

            return response()->json([
                'success' => true,
                'message' => 'Gửi mã OTP thành công.',
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (AppErrors $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'code' => $e->getCode(),
            ], $e->getStatusCode() ?: 400,);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi server: ' . $e->getMessage()
            ], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }
    public function changePassword(Request $request)
    {
        try {
            $data = $request->all();
            $changePassword = $this->patientService->handleChangePassword($data);

            return response()->json([
                'success' => true,
                'message' => 'Đổi mật khẩu thành công.',
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (AppErrors $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'code' => $e->getCode(),
            ], $e->getStatusCode() ?: 400,);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi server: ' . $e->getMessage()
            ], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }
    public function getAllServices(Request $request)
    {
        try {
            $service = $this->patientService->handleGetAllServices();

            return response()->json([
                'success' => true,
                'message' => 'Lấy dịch vụ thành công.',
                'data' => $service,
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (AppErrors $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'code' => $e->getCode(),
            ], $e->getStatusCode() ?: 400,);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi server: ' . $e->getMessage()
            ], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }
    public function bookingAppointment(Request $request)
    {
        try {
            $data = $request->all();
            $appointment = $this->patientService->handleBookingAppointment($data);

            return response()->json([
                'success' => true,
                'message' => 'Đặt lịch thành công.',
                'data' => $appointment,
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (AppErrors $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'code' => $e->getCode(),
            ], $e->getStatusCode() ?: 400,);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi server: ' . $e->getMessage()
            ], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }
}
