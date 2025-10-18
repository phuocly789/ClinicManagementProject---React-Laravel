<?php

namespace App\Http\Controllers\API\Doctor;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Diagnosis;

class DiagnosisSuggestionController extends Controller
{
    /**
     * Gợi ý chẩn đoán từ lịch sử Diagnoses
     * GET /api/doctor/diagnoses/suggestions?q=...
     */
    public function suggestions(Request $request)
    {
        $q = trim($request->query('q', ''));
        if (strlen($q) < 2) {
            return response()->json([]);
        }

        $results = Diagnosis::select('Diagnosis')
            ->where('Diagnosis', 'LIKE', "%{$q}%")
            ->groupBy('Diagnosis')
            ->orderByRaw('COUNT(*) DESC')
            ->limit(10)
            ->pluck('Diagnosis');

        return response()->json($results);
    }
}
