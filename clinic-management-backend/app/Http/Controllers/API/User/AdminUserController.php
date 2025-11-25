<?php

namespace App\Http\Controllers\API\User;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Role;
use App\Models\UserRole;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class AdminUserController extends Controller
{
    // Lấy danh sách người dùng với tìm kiếm, lọc và phân trang
    public function index(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'per_page' => 'nullable|integer|min:1|max:100',
            'page' => 'nullable|integer|min:1',
            'search' => 'nullable|string|max:255',
            'gender' => 'nullable|string|max:10',
            'role' => 'nullable|string|max:50',
            'status' => 'nullable|string|in:0,1'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Tham số không hợp lệ',
                'errors' => $validator->errors()
            ], 422);
        }

        $validated = $validator->validated();
        $perPage = $validated['per_page'] ?? 10;

        $query = User::with('roles')->orderBy('UserId', 'asc');

        // Tìm kiếm
        if (!empty($validated['search'])) {
            $searchTerm = trim($validated['search']);
            $query->where(function ($q) use ($searchTerm) {
                $q->where('FullName', 'like', "%{$searchTerm}%")
                    ->orWhere('Username', 'like', "%{$searchTerm}%")
                    ->orWhere('Email', 'like', "%{$searchTerm}%")
                    ->orWhere('Phone', 'like', "%{$searchTerm}%");
            });
        }

        // Lọc theo giới tính
        if (!empty($validated['gender'])) {
            $query->where('Gender', $validated['gender']);
        }

        // Lọc theo vai trò
        if (!empty($validated['role'])) {
            $roleName = $validated['role'];
            $query->whereHas('roles', function ($q) use ($roleName) {
                $q->where('RoleName', $roleName);
            });
        }

        // Lọc theo trạng thái
        if (isset($validated['status'])) {
            $status = $validated['status'] == '1' ? true : false;
            $query->where('IsActive', $status);
        }

        $users = $query->paginate($perPage);

        return response()->json($users);
    }

    // Lấy danh sách tất cả vai trò
    public function roles()
    {
        $roles = Role::where('RoleName', '!=', 'Admin')->orderBy('RoleName', 'asc')->get();
        return response()->json($roles);
    }

    // Tạo mới người dùng
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'Username' => [
                'required',
                'string',
                'max:50',
                'unique:Users,Username',
                'regex:/^[a-zA-Z0-9_]+$/'
            ],
            'FullName' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) {
                    $trimmedValue = trim($value);
                    if ($trimmedValue === '') {
                        $fail('Họ tên không được để trống.');
                        return;
                    }
                    
                    // Kiểm tra khoảng trắng 2 bytes (full-width space)
                    if (strpos($value, '　') !== false) {
                        $fail('Họ tên không được chứa khoảng trắng không hợp lệ.');
                        return;
                    }
                    
                    // Kiểm tra độ dài sau khi trim
                    if (mb_strlen($trimmedValue) > 255) {
                        $fail('Họ tên không được vượt quá 255 ký tự.');
                    }
                }
            ],
            'Password' => 'required|string|min:6|max:100',
            'Email' => [
                'required',
                'email:rfc,dns',
                'max:255',
                'unique:Users,Email'
            ],
            'Phone' => [
                'required',
                'string',
                'max:20',
                'regex:/^[0-9+\-\s()]+$/'
            ],
            'Address' => [
                'nullable',
                'string',
                'max:500',
                function ($attribute, $value, $fail) {
                    if ($value !== null) {
                        $trimmedValue = trim($value);
                        if ($trimmedValue === '') {
                            $fail('Địa chỉ không được chỉ chứa khoảng trắng.');
                        }
                    }
                }
            ],
            'Gender' => 'required|string|in:Nam,Nữ,Khác',
            'DateOfBirth' => 'nullable|date_format:Y-m-d|before:today',
            'Role' => 'required|string|exists:Roles,RoleName',
        ], [
            'Username.regex' => 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới.',
            'FullName.required' => 'Họ tên là bắt buộc.',
            'Password.min' => 'Mật khẩu phải có ít nhất 6 ký tự.',
            'Email.email' => 'Email không đúng định dạng.',
            'Phone.regex' => 'Số điện thoại không đúng định dạng.',
            'Gender.in' => 'Giới tính không hợp lệ.',
            'DateOfBirth.before' => 'Ngày sinh không được là ngày trong tương lai.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ', 
                'errors' => $validator->errors()
            ], 422);
        }

        // Kiểm tra trùng lặp đồng thời (tình huống 8)
        $lockKey = 'user_creation_' . md5($request->Username . $request->Email);
        if (!DB::transactionLevel() > 0) {
            DB::beginTransaction();
        }
        
        // Sử dụng lock để tránh trùng lặp
        $existingUser = User::where('Username', $request->Username)
            ->orWhere('Email', $request->Email)
            ->lockForUpdate()
            ->first();
            
        if ($existingUser) {
            DB::rollBack();
            return response()->json([
                'message' => 'Người dùng đã tồn tại trong hệ thống'
            ], 409);
        }

        try {
            $validated = $validator->validated();

            $user = new User();
            $user->Username = trim($validated['Username']);
            $user->FullName = trim($validated['FullName']);
            $user->PasswordHash = bcrypt($validated['Password']);
            $user->Email = trim($validated['Email']);
            $user->Phone = trim($validated['Phone']);
            $user->Address = isset($validated['Address']) ? trim($validated['Address']) : null;
            $user->Gender = $validated['Gender'];
            $user->DateOfBirth = $validated['DateOfBirth'] ?? null;
            $user->IsActive = true;
            $user->CreatedAt = now();
            $user->MustChangePassword = true;
            $user->save();

            $role = Role::where('RoleName', $validated['Role'])->firstOrFail();
            $user->roles()->attach($role->RoleId, ['AssignedAt' => now()]);

            DB::commit();
            return response()->json([
                'message' => 'Thêm người dùng thành công!', 
                'user' => $user->load('roles')
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Đã có lỗi xảy ra', 
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Cập nhật người dùng
    public function update(Request $request, $id)
    {
        // Kiểm tra ID hợp lệ (tình huống 3)
        if (!is_numeric($id) || $id <= 0) {
            return response()->json([
                'message' => 'ID người dùng không hợp lệ'
            ], 400);
        }

        $user = User::with('roles')->find($id);

        if (!$user) {
            return response()->json([
                'message' => 'Không tìm thấy người dùng'
            ], 404);
        }

        // Kiểm tra optimistic lock (tình huống 2)
        if ($request->has('updated_at') && $user->updated_at) {
            $clientUpdatedAt = $request->input('updated_at');
            if ($clientUpdatedAt != $user->updated_at->toDateTimeString()) {
                return response()->json([
                    'message' => 'Dữ liệu đã được cập nhật bởi người khác. Vui lòng tải lại trang trước khi cập nhật.',
                    'requires_reload' => true
                ], 409);
            }
        }

        $validator = Validator::make($request->all(), [
            'FullName' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) {
                    $trimmedValue = trim($value);
                    if ($trimmedValue === '') {
                        $fail('Họ tên không được để trống.');
                        return;
                    }
                    
                    if (strpos($value, '　') !== false) {
                        $fail('Họ tên không được chứa khoảng trắng không hợp lệ.');
                        return;
                    }
                    
                    if (mb_strlen($trimmedValue) > 255) {
                        $fail('Họ tên không được vượt quá 255 ký tự.');
                    }
                }
            ],
            'Email' => [
                'required',
                'email:rfc,dns',
                'max:255',
                Rule::unique('Users', 'Email')->ignore($id, 'UserId')
            ],
            'Phone' => [
                'required',
                'string',
                'max:20',
                'regex:/^[0-9+\-\s()]+$/'
            ],
            'Address' => [
                'nullable',
                'string',
                'max:500',
                function ($attribute, $value, $fail) {
                    if ($value !== null) {
                        $trimmedValue = trim($value);
                        if ($trimmedValue === '') {
                            $fail('Địa chỉ không được chỉ chứa khoảng trắng.');
                        }
                    }
                }
            ],
            'Gender' => 'required|string|in:Nam,Nữ,Khác',
            'DateOfBirth' => 'nullable|date_format:Y-m-d|before:today',
            'Role' => 'required|string|exists:Roles,RoleName',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ', 
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $validated = $validator->validated();
            
            // Cập nhật thông tin cơ bản
            $updateData = [
                'FullName' => trim($validated['FullName']),
                'Email' => trim($validated['Email']),
                'Phone' => trim($validated['Phone']),
                'Address' => isset($validated['Address']) ? trim($validated['Address']) : null,
                'Gender' => $validated['Gender'],
                'DateOfBirth' => $validated['DateOfBirth'] ?? null,
            ];
            
            $user->update($updateData);

            // Không cho phép thay đổi vai trò của Admin
            $currentRoleName = $user->roles->first() ? $user->roles->first()->RoleName : null;
            if ($currentRoleName !== 'Admin' && !empty($validated['Role'])) {
                $role = Role::where('RoleName', $validated['Role'])->firstOrFail();
                $user->roles()->sync([$role->RoleId => ['AssignedAt' => now()]]);
            }

            DB::commit();
            return response()->json([
                'message' => 'Cập nhật thành công!', 
                'user' => $user->fresh('roles'),
                'updated_at' => $user->fresh()->updated_at
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Đã có lỗi xảy ra', 
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Xóa người dùng
    public function destroy($id)
    {
        // Kiểm tra ID hợp lệ
        if (!is_numeric($id) || $id <= 0) {
            return response()->json([
                'message' => 'ID người dùng không hợp lệ'
            ], 400);
        }

        $user = User::with('roles')->find($id);

        // Tình huống 1: Xóa mục không tồn tại
        if (!$user) {
            return response()->json([
                'message' => 'Người dùng không tồn tại hoặc đã bị xóa'
            ], 404);
        }

        // Tình huống 10: Kiểm tra phương thức và referer
        if (request()->isMethod('get') && !request()->expectsJson()) {
            return response()->json([
                'message' => 'Phương thức không được phép'
            ], 405);
        }

        if ($user->roles->pluck('RoleName')->contains('Admin')) {
            return response()->json([
                'error' => 'Không thể xóa tài khoản Admin.'
            ], 403);
        }

        DB::beginTransaction();
        try {
            $user->roles()->detach();
            $user->delete();
            DB::commit();
            return response()->json([
                'message' => 'Đã xóa người dùng thành công.'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Đã có lỗi xảy ra', 
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Kích hoạt / vô hiệu hóa người dùng
    public function toggleStatus($id)
    {
        if (!is_numeric($id) || $id <= 0) {
            return response()->json([
                'message' => 'ID người dùng không hợp lệ'
            ], 400);
        }

        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'message' => 'Người dùng không tồn tại.'
            ], 404);
        }

        // Đảo trạng thái IsActive
        $user->IsActive = !$user->IsActive;
        $user->save();

        return response()->json([
            'message' => $user->IsActive
                ? 'Kích hoạt tài khoản thành công!'
                : 'Vô hiệu hóa tài khoản thành công!',
            'data' => $user
        ], 200);
    }

    // Reset password
    public function resetPassword(Request $request, $id)
    {
        if (!is_numeric($id) || $id <= 0) {
            return response()->json([
                'message' => 'ID người dùng không hợp lệ'
            ], 400);
        }

        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'message' => 'Người dùng không tồn tại.'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'password' => 'required|string|min:6|max:100'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ', 
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $validated = $validator->validated();
            
            // Cập nhật mật khẩu mới
            $user->PasswordHash = bcrypt($validated['password']);
            $user->MustChangePassword = true;
            $user->save();

            return response()->json([
                'message' => 'Reset mật khẩu thành công! Mật khẩu mới đã được cập nhật.',
                'data' => $user
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Đã có lỗi xảy ra', 
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Lấy thông tin chi tiết người dùng
    public function show($id)
    {
        if (!is_numeric($id) || $id <= 0) {
            return response()->json([
                'message' => 'ID người dùng không hợp lệ'
            ], 400);
        }

        $user = User::with('roles')->find($id);

        if (!$user) {
            return response()->json([
                'message' => 'Không tìm thấy người dùng'
            ], 404);
        }

        return response()->json([
            'data' => $user
        ]);
    }
}