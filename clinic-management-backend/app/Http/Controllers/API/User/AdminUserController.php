<?php

namespace App\Http\Controllers\API\User;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Role;
use App\Models\UserRole;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
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
            'gender' => 'nullable|string|max:10|in:Nam,Nữ,Khác',
            'role' => 'nullable|string|max:50',
            'status' => 'nullable|string|in:0,1'
        ], [
            'page.integer' => 'Trang phải là số nguyên',
            'page.min' => 'Số trang không hợp lệ',
            'per_page.integer' => 'Số bản ghi mỗi trang phải là số nguyên',
            'per_page.min' => 'Số bản ghi mỗi trang phải lớn hơn 0',
            'per_page.max' => 'Số bản ghi mỗi trang không được vượt quá 100',
            'gender.in' => 'Giới tính không hợp lệ',
            'status.in' => 'Trạng thái không hợp lệ'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Tham số không hợp lệ',
                'errors' => $validator->errors()
            ], 422);
        }

        // Xử lý giá trị mặc định an toàn (Tình huống 9)
        $perPage = min($request->get('per_page', 10), 100);
        $page = max($request->get('page', 1), 1);

        $query = User::with('roles')->orderBy('UserId', 'asc');

        // Tìm kiếm
        if (!empty($request->search)) {
            $searchTerm = htmlspecialchars(trim($request->search), ENT_QUOTES, 'UTF-8');
            $query->where(function ($q) use ($searchTerm) {
                $q->where('FullName', 'like', "%{$searchTerm}%")
                    ->orWhere('Username', 'like', "%{$searchTerm}%")
                    ->orWhere('Email', 'like', "%{$searchTerm}%")
                    ->orWhere('Phone', 'like', "%{$searchTerm}%");
            });
        }

        // Lọc theo giới tính
        if (!empty($request->gender)) {
            $query->where('Gender', $request->gender);
        }

        // Lọc theo vai trò
        if (!empty($request->role)) {
            $roleName = htmlspecialchars(trim($request->role), ENT_QUOTES, 'UTF-8');
            $query->whereHas('roles', function ($q) use ($roleName) {
                $q->where('RoleName', $roleName);
            });
        }

        // Lọc theo trạng thái
        if (isset($request->status)) {
            $status = $request->status == '1' ? true : false;
            $query->where('IsActive', $status);
        }

        try {
            $users = $query->paginate($perPage, ['*'], 'page', $page);
            return response()->json($users);
        } catch (\Exception $e) {
            Log::error('Lỗi phân trang: ' . $e->getMessage());
            return response()->json([
                'message' => 'Lỗi khi tải dữ liệu phân trang',
                'error' => 'Tham số phân trang không hợp lệ'
            ], 400);
        }
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
        // Clean data đầu vào (Tình huống 5 - XSS protection)
        $cleanedData = [
            'Username' => $request->Username ? htmlspecialchars(trim($request->Username), ENT_QUOTES, 'UTF-8') : '',
            'FullName' => $request->FullName ? htmlspecialchars(trim($request->FullName), ENT_QUOTES, 'UTF-8') : '',
            'Email' => $request->Email ? htmlspecialchars(trim($request->Email), ENT_QUOTES, 'UTF-8') : '',
            'Phone' => $request->Phone ? htmlspecialchars(trim($request->Phone), ENT_QUOTES, 'UTF-8') : '',
            'Address' => $request->Address ? htmlspecialchars(trim($request->Address), ENT_QUOTES, 'UTF-8') : null,
            'Gender' => $request->Gender,
            'DateOfBirth' => $request->DateOfBirth,
            'Role' => $request->Role,
            'Password' => $request->Password,
            'Specialty' => $request->Specialty ? htmlspecialchars(trim($request->Specialty), ENT_QUOTES, 'UTF-8') : null,
            'LicenseNumber' => $request->LicenseNumber ? htmlspecialchars(trim($request->LicenseNumber), ENT_QUOTES, 'UTF-8') : null,
        ];

        $validator = Validator::make($cleanedData, [
            'Username' => [
                'required',
                'string',
                'max:50',
                'unique:Users,Username',
                'regex:/^[a-zA-Z0-9_]+$/',
                function ($attribute, $value, $fail) {
                    // Chống XSS và HTML injection (Tình huống 5)
                    if ($value !== strip_tags($value)) {
                        $fail('Tên đăng nhập không được chứa mã HTML.');
                    }
                    
                    // Kiểm tra độ dài thực tế sau khi decode
                    $decoded = html_entity_decode($value);
                    if (mb_strlen(trim($decoded)) > 50) {
                        $fail('Tên đăng nhập không được vượt quá 50 ký tự.');
                    }
                }
            ],
            'FullName' => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) {
                    $trimmedValue = trim($value);
                    
                    // Tình huống 6: Kiểm tra khoảng trắng
                    if ($trimmedValue === '') {
                        $fail('Họ tên không được để trống.');
                        return;
                    }
                    
                    // Kiểm tra khoảng trắng 2 bytes (full-width space)
                    if (strpos($value, '　') !== false) {
                        $fail('Họ tên không được chứa khoảng trắng không hợp lệ.');
                        return;
                    }
                    
                    // Chống XSS (Tình huống 5)
                    if ($value !== strip_tags($value)) {
                        $fail('Họ tên không được chứa mã HTML.');
                        return;
                    }
                    
                    // Kiểm tra độ dài thực tế
                    $decoded = html_entity_decode(trim($value));
                    if (mb_strlen($decoded) > 255) {
                        $fail('Họ tên không được vượt quá 255 ký tự.');
                    }
                }
            ],
            'Password' => [
                'required',
                'string',
                'min:6',
                'max:100',
                function ($attribute, $value, $fail) {
                    // Kiểm tra mật khẩu không chứa HTML
                    if ($value !== strip_tags($value)) {
                        $fail('Mật khẩu không được chứa mã HTML.');
                    }
                }
            ],
            'Email' => [
                'required',
                'email:rfc,dns',
                'max:255',
                'unique:Users,Email',
                function ($attribute, $value, $fail) {
                    if ($value !== strip_tags($value)) {
                        $fail('Email không được chứa mã HTML.');
                    }
                }
            ],
            'Phone' => [
                'required',
                'string',
                'max:20',
                'regex:/^[0-9+\-\s()]+$/',
                function ($attribute, $value, $fail) {
                    // Tình huống 7: Kiểm tra dữ liệu số
                    $numericOnly = preg_replace('/[^0-9]/', '', $value);
                    if (strlen($numericOnly) < 9 || strlen($numericOnly) > 15) {
                        $fail('Số điện thoại phải từ 9-15 chữ số.');
                    }
                    
                    if ($value !== strip_tags($value)) {
                        $fail('Số điện thoại không được chứa mã HTML.');
                    }
                }
            ],
            'Address' => [
                'nullable',
                'string',
                'max:500',
                function ($attribute, $value, $fail) {
                    if ($value !== null) {
                        $trimmedValue = trim($value);
                        // Tình huống 6: Kiểm tra khoảng trắng
                        if ($trimmedValue === '') {
                            $fail('Địa chỉ không được chỉ chứa khoảng trắng.');
                        }
                        
                        if ($value !== strip_tags($value)) {
                            $fail('Địa chỉ không được chứa mã HTML.');
                        }
                    }
                }
            ],
            'Gender' => 'required|string|in:Nam,Nữ,Khác',
            'DateOfBirth' => 'nullable|date_format:Y-m-d|before:today',
            'Role' => 'required|string|exists:Roles,RoleName',
            'Specialty' => [
                'nullable',
                'string',
                'max:100',
                function ($attribute, $value, $fail) {
                    if ($value !== null && $value !== strip_tags($value)) {
                        $fail('Chuyên khoa không được chứa mã HTML.');
                    }
                }
            ],
            'LicenseNumber' => [
                'nullable',
                'string',
                'max:50',
                function ($attribute, $value, $fail) {
                    if ($value !== null && $value !== strip_tags($value)) {
                        $fail('Số giấy phép không được chứa mã HTML.');
                    }
                }
            ],
        ], [
            'Username.required' => 'Tên đăng nhập là bắt buộc.',
            'Username.regex' => 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới.',
            'Username.unique' => 'Tên đăng nhập đã tồn tại.',
            'FullName.required' => 'Họ tên là bắt buộc.',
            'Password.required' => 'Mật khẩu là bắt buộc.',
            'Password.min' => 'Mật khẩu phải có ít nhất 6 ký tự.',
            'Email.required' => 'Email là bắt buộc.',
            'Email.email' => 'Email không đúng định dạng.',
            'Email.unique' => 'Email đã tồn tại.',
            'Phone.required' => 'Số điện thoại là bắt buộc.',
            'Phone.regex' => 'Số điện thoại không đúng định dạng.',
            'Gender.required' => 'Giới tính là bắt buộc.',
            'Gender.in' => 'Giới tính không hợp lệ.',
            'DateOfBirth.date_format' => 'Ngày sinh không đúng định dạng.',
            'DateOfBirth.before' => 'Ngày sinh không được là ngày trong tương lai.',
            'Role.required' => 'Vai trò là bắt buộc.',
            'Role.exists' => 'Vai trò không tồn tại.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors()
            ], 422);
        }

        // Tình huống 8: Kiểm tra trùng lặp với transaction lock
        DB::beginTransaction();
        try {
            // Sử dụng lock để tránh trùng lặp
            $existingUser = User::where('Username', $cleanedData['Username'])
                ->orWhere('Email', $cleanedData['Email'])
                ->lockForUpdate()
                ->first();
                
            if ($existingUser) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Người dùng đã tồn tại trong hệ thống'
                ], 409);
            }

            $validated = $validator->validated();

            $user = new User();
            $user->Username = $cleanedData['Username'];
            $user->FullName = $cleanedData['FullName'];
            $user->PasswordHash = bcrypt($validated['Password']);
            $user->Email = $cleanedData['Email'];
            $user->Phone = $cleanedData['Phone'];
            $user->Address = $cleanedData['Address'];
            $user->Gender = $validated['Gender'];
            $user->DateOfBirth = $validated['DateOfBirth'] ?? null;
            $user->IsActive = true;
            $user->CreatedAt = now();
            $user->MustChangePassword = true;
            
            // Thêm các trường cho bác sĩ
            if ($validated['Role'] === 'Bác sĩ') {
                $user->Specialty = $cleanedData['Specialty'];
                $user->LicenseNumber = $cleanedData['LicenseNumber'];
            }
            
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
            Log::error('Lỗi tạo người dùng: ' . $e->getMessage());
            return response()->json([
                'message' => 'Đã có lỗi xảy ra khi tạo người dùng', 
                'error' => 'Lỗi hệ thống'
            ], 500);
        }
    }

    // Cập nhật người dùng
    public function update(Request $request, $id)
    {
        // Tình huống 3: Kiểm tra ID hợp lệ
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

        // Tình huống 2: Kiểm tra optimistic lock
        if ($request->has('updated_at') && $user->updated_at) {
            $clientUpdatedAt = $request->input('updated_at');
            if ($clientUpdatedAt != $user->updated_at->toDateTimeString()) {
                return response()->json([
                    'message' => 'Dữ liệu đã được cập nhật bởi người khác. Vui lòng tải lại trang trước khi cập nhật.',
                    'requires_reload' => true
                ], 409);
            }
        }

        // Clean data đầu vào
        $cleanedData = [
            'FullName' => $request->FullName ? htmlspecialchars(trim($request->FullName), ENT_QUOTES, 'UTF-8') : '',
            'Email' => $request->Email ? htmlspecialchars(trim($request->Email), ENT_QUOTES, 'UTF-8') : '',
            'Phone' => $request->Phone ? htmlspecialchars(trim($request->Phone), ENT_QUOTES, 'UTF-8') : '',
            'Address' => $request->Address ? htmlspecialchars(trim($request->Address), ENT_QUOTES, 'UTF-8') : null,
            'Gender' => $request->Gender,
            'DateOfBirth' => $request->DateOfBirth,
            'Role' => $request->Role,
            'Specialty' => $request->Specialty ? htmlspecialchars(trim($request->Specialty), ENT_QUOTES, 'UTF-8') : null,
            'LicenseNumber' => $request->LicenseNumber ? htmlspecialchars(trim($request->LicenseNumber), ENT_QUOTES, 'UTF-8') : null,
        ];

        $validator = Validator::make($cleanedData, [
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
                    
                    if ($value !== strip_tags($value)) {
                        $fail('Họ tên không được chứa mã HTML.');
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
                Rule::unique('Users', 'Email')->ignore($id, 'UserId'),
                function ($attribute, $value, $fail) {
                    if ($value !== strip_tags($value)) {
                        $fail('Email không được chứa mã HTML.');
                    }
                }
            ],
            'Phone' => [
                'required',
                'string',
                'max:20',
                'regex:/^[0-9+\-\s()]+$/',
                function ($attribute, $value, $fail) {
                    $numericOnly = preg_replace('/[^0-9]/', '', $value);
                    if (strlen($numericOnly) < 9 || strlen($numericOnly) > 15) {
                        $fail('Số điện thoại phải từ 9-15 chữ số.');
                    }
                    
                    if ($value !== strip_tags($value)) {
                        $fail('Số điện thoại không được chứa mã HTML.');
                    }
                }
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
                        
                        if ($value !== strip_tags($value)) {
                            $fail('Địa chỉ không được chứa mã HTML.');
                        }
                    }
                }
            ],
            'Gender' => 'required|string|in:Nam,Nữ,Khác',
            'DateOfBirth' => 'nullable|date_format:Y-m-d|before:today',
            'Role' => 'required|string|exists:Roles,RoleName',
            'Specialty' => [
                'nullable',
                'string',
                'max:100',
                function ($attribute, $value, $fail) use ($cleanedData) {
                    if ($cleanedData['Role'] === 'Bác sĩ' && empty($value)) {
                        $fail('Chuyên khoa là bắt buộc cho bác sĩ.');
                    }
                    
                    if ($value !== null && $value !== strip_tags($value)) {
                        $fail('Chuyên khoa không được chứa mã HTML.');
                    }
                }
            ],
            'LicenseNumber' => [
                'nullable',
                'string',
                'max:50',
                function ($attribute, $value, $fail) use ($cleanedData) {
                    if ($cleanedData['Role'] === 'Bác sĩ' && empty($value)) {
                        $fail('Số giấy phép hành nghề là bắt buộc cho bác sĩ.');
                    }
                    
                    if ($value !== null && $value !== strip_tags($value)) {
                        $fail('Số giấy phép không được chứa mã HTML.');
                    }
                }
            ],
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
                'FullName' => $cleanedData['FullName'],
                'Email' => $cleanedData['Email'],
                'Phone' => $cleanedData['Phone'],
                'Address' => $cleanedData['Address'],
                'Gender' => $validated['Gender'],
                'DateOfBirth' => $validated['DateOfBirth'] ?? null,
            ];
            
            // Cập nhật thông tin bác sĩ nếu có
            if ($validated['Role'] === 'Bác sĩ') {
                $updateData['Specialty'] = $cleanedData['Specialty'];
                $updateData['LicenseNumber'] = $cleanedData['LicenseNumber'];
            } else {
                $updateData['Specialty'] = null;
                $updateData['LicenseNumber'] = null;
            }
            
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
            Log::error('Lỗi cập nhật người dùng: ' . $e->getMessage());
            return response()->json([
                'message' => 'Đã có lỗi xảy ra khi cập nhật người dùng', 
                'error' => 'Lỗi hệ thống'
            ], 500);
        }
    }

    // Xóa người dùng
    public function destroy($id)
    {
        // Tình huống 3: Kiểm tra ID hợp lệ
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

        // Tình huống 10: Kiểm tra phương thức
        if (request()->isMethod('GET')) {
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
            Log::error('Lỗi xóa người dùng: ' . $e->getMessage());
            return response()->json([
                'message' => 'Đã có lỗi xảy ra khi xóa người dùng', 
                'error' => 'Lỗi hệ thống'
            ], 500);
        }
    }

    // Kích hoạt / vô hiệu hóa người dùng
    public function toggleStatus($id)
    {
        // Tình huống 3: Kiểm tra ID hợp lệ
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
        // Tình huống 3: Kiểm tra ID hợp lệ
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
            'password' => [
                'required',
                'string',
                'min:6',
                'max:100',
                function ($attribute, $value, $fail) {
                    if ($value !== strip_tags($value)) {
                        $fail('Mật khẩu không được chứa mã HTML.');
                    }
                }
            ]
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
            Log::error('Lỗi reset mật khẩu: ' . $e->getMessage());
            return response()->json([
                'message' => 'Đã có lỗi xảy ra khi reset mật khẩu', 
                'error' => 'Lỗi hệ thống'
            ], 500);
        }
    }

    // Lấy thông tin chi tiết người dùng
    public function show($id)
    {
        // Tình huống 3: Kiểm tra ID hợp lệ
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