<?php
namespace App\Http\Controllers\API;
use App\Http\Controllers\Controller;
use App\Models\Medicine;
use Illuminate\Http\Request;
// use OpenApi\Annotations as OA;
class MedicinesController extends Controller
{

    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 10); // Mặc định 10 items/page, có thể override qua query param
        $medicines = Medicine::orderBy('MedicineId', 'asc')->paginate($perPage);

        return response()->json($medicines); // Trả về paginator: { data: [...], current_page: 1, last_page: X, ... }
    }

    public function ping()
    {
        return response()->json(['message' => 'pong']);
    }
}
