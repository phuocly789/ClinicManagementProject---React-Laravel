<?php
namespace App\Http\Controllers\API;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
// use OpenApi\Annotations as OA;
class UserController extends Controller
{

    public function index()
    {
        return response()->json(User::all());
    }

    public function ping()
    {
        return response()->json(['message' => 'pong']);
    }
}
