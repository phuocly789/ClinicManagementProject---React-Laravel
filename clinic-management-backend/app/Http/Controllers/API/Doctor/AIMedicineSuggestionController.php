<?php

namespace App\Http\Controllers\API\Doctor;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIMedicineSuggestionController extends Controller
{
    public function suggest(Request $request)
    {
        $diagnosis = trim($request->query('diagnosis', ''));
        if (strlen($diagnosis) < 3) {
            return response()->json(['error' => 'Thiếu thông tin chẩn đoán'], 400);
        }

        // Lấy danh sách thuốc từ DB với giới hạn nhỏ hơn
        $medicines = DB::table('Medicines')
            ->select('MedicineName', 'MedicineType', 'Unit', 'Price', 'StockQuantity', 'Description')
            ->limit(10)
            ->get();

        if ($medicines->isEmpty()) {
            return response()->json(['error' => 'Không tìm thấy thuốc trong database'], 500);
        }

        $medicinesList = $medicines->map(fn($m) => "{$m->MedicineName} ({$m->MedicineType})")->implode(', ');
        Log::debug('Medicines list: ' . $medicinesList);

        // Prompt được cải thiện: Yêu cầu JSON thuần túy, không thêm text giải thích
        $prompt = "
        Bạn là bác sĩ chuyên khoa nội tổng quát.
        Dựa trên chẩn đoán: '{$diagnosis}', hãy chọn những thuốc phù hợp nhất từ danh sách sau:
        {$medicinesList}
        Chỉ trả về JSON thuần túy với định dạng:
        [
          { 'MedicineName': '...', 'Reason': '...' }
        ]
        Không thêm bất kỳ text nào ngoài JSON, chỉ chọn thuốc có trong danh sách, không bịa thêm.
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
            Log::debug('Raw response from Gemini: ' . $text); // Log để debug

            // Trích xuất JSON từ chuỗi (nếu có ```json
            $jsonString = $text;
            if (preg_match('/```json\s*([\s\S]*?)\s*```/', $text, $matches)) {
                $jsonString = trim($matches[1]); // Lấy nội dung trong ```json ... ```
            }

            $json = json_decode($jsonString, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return response()->json([
                    'error' => 'Gemini trả về định dạng không hợp lệ',
                    'raw' => $text,
                    'json_error' => json_last_error_msg(),
                    'extracted_json' => $jsonString, // Hiển thị JSON đã trích xuất để debug
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