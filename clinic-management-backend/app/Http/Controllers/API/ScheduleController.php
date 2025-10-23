<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateScheduleRequest;
use App\Models\Appointment;
use App\Models\Invoice;
use App\Services\ScheduleService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

use function Termwind\parse;

class ScheduleController extends Controller
{
    protected $scheduleService;
    public function __construct(ScheduleService $scheduleService)
    {
        $this->scheduleService = $scheduleService;
    }
    public function index(Request $request)
    {
        $result = $this->scheduleService->index();
        return response()->json($result);
    }
    public function createSchedule(CreateScheduleRequest $request):JsonResponse{
        $result = $this->scheduleService->createSchedule($request->validated());

        $statusCode = match ($result['status']) {
            'Success' => 201,
            'BadRequest' => 400,
            'Error' => 500,
            default => 500,
        };

        return response()->json([
            'data' => $result['data'],
            'status' => $result['status'],
            'message' => $result['message']
        ], $statusCode);
    }
}
