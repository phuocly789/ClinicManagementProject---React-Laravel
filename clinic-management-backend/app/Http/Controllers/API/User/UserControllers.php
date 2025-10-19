<?php

namespace App\Http\Controllers\API\User;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Role;
use App\Models\UserRole;
use Illuminate\Support\Facades\DB;

class UserControllers extends Controller
{
    // ✅ Lấy danh sách người dùng (có phân trang + vai trò)
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 5);
        $users = User::with('roles')
            ->orderBy('UserId', 'asc')
            ->paginate($perPage);

        return response()->json($users);
    }

    // ✅ Lấy danh sách tất cả vai trò (cho dropdown React)
    public function roles()
    {
        $roles = Role::orderBy('RoleName', 'asc')->get();
        return response()->json($roles);
    }

    // ✅ Tạo mới người dùng
    public function store(Request $request)
    {
        $validated = $request->validate([
            'Username' => 'required|string|max:255',
            'Email' => 'nullable|email',
            'Phone' => 'nullable|string|max:20',
            'Address' => 'nullable|string|max:255',
            'Gender' => 'nullable|string|max:10',
            'BirthDate' => 'nullable|date',
            'Role' => 'required|string',
            'IsActive' => 'boolean'
        ]);

        DB::beginTransaction();

        try {
            $user = new User();
            $user->Username = $validated['Username'];
            $user->Email = $validated['Email'] ?? null;
            $user->Phone = $validated['Phone'] ?? null;
            $user->Address = $validated['Address'] ?? null;
            $user->Gender = $validated['Gender'] ?? null;
            $user->DateOfBirth = $validated['BirthDate'] ?? null;
            $user->IsActive = $validated['IsActive'] ?? true;
            $user->PasswordHash = bcrypt('123456'); // mặc định mật khẩu
            $user->CreatedAt = now();
            $user->MustChangePassword = false;
            $user->save();

            // Gán vai trò
            $role = Role::where('RoleName', $validated['Role'])->first();
            if ($role) {
                $user->roles()->attach($role->RoleId, ['AssignedAt' => now()]);
            }

            DB::commit();
            return response()->json(['message' => 'Thêm người dùng thành công', 'user' => $user], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // ✅ Cập nhật người dùng
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'Username' => 'sometimes|string|max:255',
            'Email' => 'nullable|email',
            'Phone' => 'nullable|string|max:20',
            'Address' => 'nullable|string|max:255',
            'Gender' => 'nullable|string|max:10',
            'BirthDate' => 'nullable|date',
            'Role' => 'nullable|string',
            'IsActive' => 'boolean'
        ]);

        DB::beginTransaction();

        try {
            $user->fill($validated);
            $user->save();

            // Cập nhật vai trò nếu có
            if (!empty($validated['Role'])) {
                $role = Role::where('RoleName', $validated['Role'])->first();
                if ($role) {
                    $user->roles()->sync([$role->RoleId => ['AssignedAt' => now()]]);
                }
            }

            DB::commit();
            return response()->json(['message' => 'Cập nhật người dùng thành công', 'user' => $user]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // ✅ Xóa người dùng
    public function destroy($id)
    {
        $user = User::findOrFail($id);

        DB::beginTransaction();
        try {
            $user->roles()->detach();
            $user->delete();

            DB::commit();
            return response()->json(['message' => 'Đã xóa người dùng']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // ✅ Kích hoạt / vô hiệu hóa người dùng
    public function toggleStatus($id)
    {
        $user = User::findOrFail($id);
        $user->IsActive = !$user->IsActive;
        $user->save();

        return response()->json(['message' => 'Cập nhật trạng thái thành công', 'user' => $user]);
    }
}
