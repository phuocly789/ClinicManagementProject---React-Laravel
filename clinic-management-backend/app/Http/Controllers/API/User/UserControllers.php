<?php

namespace App\Http\Controllers\API\User;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Role;
use App\Models\UserRole;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class UserControllers extends Controller
{
    //ấy danh sách người dùng với tìm kiếm, lọc và phân trang
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 5);

        $query = User::with('roles')->orderBy('UserId', 'asc');

        //Tìm kiếm
        if ($request->has('search') && $request->input('search') != '') {
            $searchTerm = $request->input('search');
            $query->where(function ($q) use ($searchTerm) {
                $q->where('FullName', 'like', "%{$searchTerm}%")
                    ->orWhere('Username', 'like', "%{$searchTerm}%")
                    ->orWhere('Email', 'like', "%{$searchTerm}%")
                    ->orWhere('Phone', 'like', "%{$searchTerm}%");
            });
        }

        //Lọc theo giới tính
        if ($request->has('gender') && $request->input('gender') != '') {
            $query->where('Gender', $request->input('gender'));
        }

        //Lọc theo vai trò
        if ($request->has('role') && $request->input('role') != '') {
            $roleName = $request->input('role');
            $query->whereHas('roles', function ($q) use ($roleName) {
                $q->where('RoleName', $roleName);
            });
        }

        //Lọc theo trạng thái
        if ($request->has('status') && $request->input('status') != '') {
            $status = $request->input('status') == '1' ? true : false;
            $query->where('IsActive', $status);
        }

        $users = $query->paginate($perPage);

        return response()->json($users);
    }

    //Lấy danh sách tất cả vai trò
    public function roles()
    {
        $roles = Role::where('RoleName', '!=', 'Admin')->orderBy('RoleName', 'asc')->get();
        return response()->json($roles);
    }

    //Tạo mới người dùng
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'Username' => 'required|string|max:50|unique:Users,Username',
            'FullName' => 'required|string|max:255',
            'Password' => 'required|string|min:6',
            'Email' => 'required|email|max:255|unique:Users,Email',
            'Phone' => 'required|string|max:20',
            'Address' => 'nullable|string|max:255',
            'Gender' => 'required|string|max:10',
            'DateOfBirth' => 'nullable|date_format:Y-m-d',
            'Role' => 'required|string|exists:Roles,RoleName',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Dữ liệu không hợp lệ', 'errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            $validated = $validator->validated();

            $user = new User();
            $user->Username = $validated['Username'];
            $user->FullName = $validated['FullName'];
            $user->PasswordHash = bcrypt($validated['Password']);
            $user->Email = $validated['Email'];
            $user->Phone = $validated['Phone'];
            $user->Address = $validated['Address'] ?? null;
            $user->Gender = $validated['Gender'];
            $user->DateOfBirth = $validated['DateOfBirth'] ?? null;
            $user->IsActive = true;
            $user->CreatedAt = now();
            $user->MustChangePassword = true;
            $user->save();

            $role = Role::where('RoleName', $validated['Role'])->firstOrFail();
            $user->roles()->attach($role->RoleId, ['AssignedAt' => now()]);

            DB::commit();
            return response()->json(['message' => 'Thêm người dùng thành công!', 'user' => $user->load('roles')], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Đã có lỗi xảy ra', 'error' => $e->getMessage()], 500);
        }
    }

    //Cập nhật người dùng
    public function update(Request $request, $id)
    {
        $user = User::with('roles')->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'FullName' => 'required|string|max:255',
            'Email' => 'required|email|max:255|unique:Users,Email,' . $id . ',UserId',
            'Phone' => 'required|string|max:20',
            'Address' => 'nullable|string|max:255',
            'Gender' => 'required|string|max:10',
            'DateOfBirth' => 'nullable|date_format:Y-m-d',
            'Role' => 'required|string|exists:Roles,RoleName',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Dữ liệu không hợp lệ', 'errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            $validated = $validator->validated();
            $user->update($validated);

            // Không cho phép thay đổi vai trò của Admin
            $currentRoleName = $user->roles->first() ? $user->roles->first()->RoleName : null;
            if ($currentRoleName !== 'Admin' && !empty($validated['Role'])) {
                $role = Role::where('RoleName', $validated['Role'])->firstOrFail();
                $user->roles()->sync([$role->RoleId => ['AssignedAt' => now()]]);
            }

            DB::commit();
            return response()->json(['message' => 'Cập nhật thành công!', 'user' => $user->fresh('roles')]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Đã có lỗi xảy ra', 'error' => $e->getMessage()], 500);
        }
    }

    //Xóa người dùng
    public function destroy($id)
    {
        $user = User::with('roles')->findOrFail($id);

        if ($user->roles->pluck('RoleName')->contains('Admin')) {
            return response()->json(['error' => 'Không thể xóa tài khoản Admin.'], 403);
        }

        DB::beginTransaction();
        try {
            $user->roles()->detach();
            $user->delete();
            DB::commit();
            return response()->json(['message' => 'Đã xóa người dùng thành công.']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Đã có lỗi xảy ra', 'error' => $e->getMessage()], 500);
        }
    }

    //Kích hoạt / vô hiệu hóa người dùng
    public function toggleStatus($id)
{
    $user = User::find($id);

    if (!$user) {
        return response()->json(['message' => 'Người dùng không tồn tại.'], 404);
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

}
