<?php
namespace App\Http\Controllers\API;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
// use OpenApi\Annotations as OA;
class UserController extends Controller
{

    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 5); // hoặc bất kỳ số mặc định nào
        $users = User::orderBy('UserId', 'asc')->paginate($perPage);

        return response()->json($users);
    }


    public function ping()
    {
        return response()->json(['message' => 'pong']);
    }
}
