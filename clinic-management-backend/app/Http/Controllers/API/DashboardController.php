<?php

namespace App\Http\Controllers\API;

use App\Events\DashboardStatsUpdated;
use App\Http\Controllers\Controller;
use App\Services\DashboardStatsService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    protected $statsService;

    public function __construct(DashboardStatsService $statsService)
    {
        $this->statsService = $statsService;
    }

    public function getStats()
    {
        try {
            $stats = $this->statsService->getRealtimeStats();
            return response()->json($stats);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch stats',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function broadcastStats()
    {
        try {
            $stats = $this->statsService->getRealtimeStats();
            broadcast(new DashboardStatsUpdated($stats));

            return response()->json([
                'message' => 'Stats broadcasted successfully',
                'stats' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to broadcast stats',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
