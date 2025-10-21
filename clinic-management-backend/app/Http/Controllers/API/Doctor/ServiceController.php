<?php

namespace App\Http\Controllers\API\Doctor;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ServiceController extends Controller
{
    /**
     * Lấy danh sách các dịch vụ vhir định
     * /
     */
    public function index()
    {
        $services = DB::table('Services')
            ->select('ServiceId', 'ServiceName', 'ServiceType', 'Price', 'Description')
            ->get();

        return response()->json($services);
    }
}