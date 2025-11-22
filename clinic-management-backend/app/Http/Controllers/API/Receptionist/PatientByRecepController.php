<?php

namespace App\Http\Controllers\API\Receptionist;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PatientByRecepController extends Controller
{
    //search patient
    public function searchPatients(Request $request)
    {
        $keyword = $request->query('keyword');

        if (!$keyword || strlen($keyword) < 2) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'Từ khóa phải có ít nhất 2 ký tự.'
            ], 400);
        }

        $patients = Patient::whereHas('user', function ($q) use ($keyword) {
            $q->where('FullName', 'ilike', "%{$keyword}%")
                ->orWhere('Phone', 'ilike', "%{$keyword}%")
                ->orWhere('Email', 'ilike', "%{$keyword}%");
        })
            ->with('user') // Chỉ load, không lọc
            ->get()
            ->map(function ($patient) {
                return [
                    'UserId' => $patient->user->UserId,
                    'PatientId' => $patient->PatientId,
                    'FullName' => $patient->user->FullName,
                    'Phone' => $patient->user->Phone,
                    'Email' => $patient->user->Email,
                    'DateOfBirth' => $patient->user->DateOfBirth,
                    'Gender' => $patient->user->Gender,
                    'Address' => $patient->user->Address,
                    'MedicalHistory' => $patient->MedicalHistory
                ];
            });
        if ($patients == null) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => 'Không tìm thấy bệnh nhân.'
            ], 404);
        }
        return response()->json([
            'success' => true,
            'data' => $patients,
            'message' => 'Tìm kiếm bệnh nhân thành công.'
        ]);
    }

    public function createPatient(Request $request)
    {
        $request->validate([
            'FullName' => 'required|string|max:100',
            'Phone' => 'required|string|max:15|unique:Users,Phone',
            'Email' => 'nullable|email|unique:Users,Email',
            'DateOfBirth' => 'nullable|date',
            'Gender' => 'nullable|string|in:Nam,Nữ',
            'Address' => 'nullable|string|max:200',
            'MedicalHistory' => 'nullable|string'
        ]);

        try {
            DB::beginTransaction();

            // Tạo User trước
            $user = User::create([
                'Username' => $request->Phone,
                'PasswordHash' => bcrypt($request->Phone), // Password mặc định
                'FullName' => $request->FullName,
                'Email' => $request->Email,
                'Phone' => $request->Phone,
                'Gender' => $request->Gender,
                'Address' => $request->Address,
                'DateOfBirth' => $request->DateOfBirth,
                'MustChangePassword' => true,
                'IsActive' => true
            ]);

            // Tạo Patient
            $patient = Patient::create([
                'PatientId' => $user->UserId,
                'MedicalHistory' => $request->MedicalHistory
            ]);

            // Gán role patient (nếu có hệ thống role)
            // $user->roles()->attach($patientRoleId);

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => [
                    'UserId' => $user->UserId,
                    'PatientId' => $patient->PatientId,
                    'FullName' => $user->FullName,
                    'Phone' => $user->Phone,
                    'Email' => $user->Email,
                    'DateOfBirth' => $user->DateOfBirth,
                    'Gender' => $user->Gender,
                    'Address' => $user->Address,
                    'MedicalHistory' => $patient->MedicalHistory
                ],
                'message' => 'Tạo bệnh nhân mới thành công.'
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tạo bệnh nhân: ' . $e->getMessage()
            ], 500);
        }
    }
    public function getPatient(){
        $patient=Patient::with('user')->get();
        return response()->json([
            'success' => true,
            'data' => $patient,
            'message' => 'Tạo bệnh nhân mới thành công.'
        ], 201);
    }
    // Trong PatientByRecepController
    public function getPatientDetails($patientId)
    {
        try {
            $patient = Patient::with('user')->find($patientId);

            if (!$patient) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy bệnh nhân'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'UserId' => $patient->user->UserId,
                    'PatientId' => $patient->PatientId,
                    'FullName' => $patient->user->FullName,
                    'Phone' => $patient->user->Phone,
                    'Email' => $patient->user->Email,
                    'DateOfBirth' => $patient->user->DateOfBirth,
                    'Gender' => $patient->user->Gender,
                    'Address' => $patient->user->Address,
                    'MedicalHistory' => $patient->MedicalHistory
                ],
                'message' => 'Thông tin bệnh nhân được tải thành công.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi tải thông tin bệnh nhân: ' . $e->getMessage()
            ], 500);
        }
    }
}
