<?php

namespace App\Http\Controllers\API\Doctor;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AISuggestionController extends Controller
{
    public function suggest(Request $request)
    {
        $diagnosis = trim($request->query('diagnosis', ''));
        $type = trim($request->query('type', 'medicine')); // 'medicine' hoặc 'service'

        if (strlen($diagnosis) < 3) {
            return response()->json(['error' => 'Thiếu thông tin chẩn đoán'], 400);
        }

        // Lấy danh sách dữ liệu dựa trên loại
        $items = [];
        $itemList = '';
        if ($type === 'medicine') {
            $items = DB::table('Medicines')
                ->select('MedicineName', 'MedicineType', 'Unit', 'Price', 'StockQuantity', 'Description')
                ->limit(10)
                ->get();
            $itemList = $items->map(fn($m) => "{$m->MedicineName} ({$m->MedicineType})")->implode(', ');
            Log::debug('Medicines list: ' . $itemList);
        } elseif ($type === 'service') {
            $items = DB::table('Services')
                ->select('ServiceId', 'ServiceName', 'ServiceType', 'Price', 'Description')
                ->limit(10)
                ->get();
            $itemList = $items->map(fn($s) => "{$s->ServiceName} ({$s->ServiceType})")->implode(', ');
            Log::debug('Services list: ' . $itemList);
        }

        if ($items->isEmpty()) {
            return response()->json(['error' => 'Không tìm thấy ' . ($type === 'medicine' ? 'thuốc' : 'dịch vụ') . ' trong database'], 500);
        }

        // Prompt động dựa trên loại
        $prompt = "
        Bạn là bác sĩ chuyên khoa nội tổng quát.
        Dựa trên chẩn đoán: '{$diagnosis}', hãy chọn những " . ($type === 'medicine' ? 'thuốc' : 'dịch vụ cận lâm sàng') . " phù hợp nhất từ danh sách sau:
        {$itemList}
        Chỉ trả về JSON thuần túy với định dạng:
        [
          { 'MedicineName': '...', 'Reason': '...' } " . ($type === 'service' ? ", 'ServiceId': '...' " : '') . "
        ]
        Không thêm bất kỳ text nào ngoài JSON, chỉ chọn " . ($type === 'medicine' ? 'thuốc' : 'dịch vụ') . " có trong danh sách, không bịa thêm.
        ";

        $apiKey = env('GOOGLE_API_KEY');
        $apiUrl = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={$apiKey}";

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->post($apiUrl, [
                'contents' => [
                    [
                        'parts' => [['text' => $prompt]],
                    ]
                ],
                'generationConfig' => ['temperature' => 0.4],
            ]);

            if ($response->failed()) {
                return response()->json([
                    'error' => 'Gemini API lỗi',
                    'details' => $response->json() ?? 'Không có chi tiết lỗi',
                    'status_code' => $response->status(),
                ], 500);
            }

            $data = $response->json();
            if (!isset($data['candidates'][0]['content']['parts'][0]['text'])) {
                return response()->json([
                    'error' => 'Dữ liệu trả về từ Gemini không hợp lệ',
                    'raw' => $data,
                ], 500);
            }

            $text = $data['candidates'][0]['content']['parts'][0]['text'];
            Log::debug('Raw response from Gemini: ' . $text);

            $jsonString = $text;
            if (preg_match('/```json\s*([\s\S]*?)\s*```/', $text, $matches)) {
                $jsonString = trim($matches[1]);
            }

            $json = json_decode($jsonString, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return response()->json([
                    'error' => 'Gemini trả về định dạng không hợp lệ',
                    'raw' => $text,
                    'json_error' => json_last_error_msg(),
                    'extracted_json' => $jsonString,
                ], 500);
            }

            return response()->json($json);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Lỗi kết nối tới Gemini',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}