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
        // Log params để debug (giữ tạm)
        $symptoms = $request->query('symptoms', '');
        $diagnosis = $request->query('diagnosis', '');
        $input = $request->query('input', '');
        $type = $request->query('type', 'medicine');
        Log::info('AI Suggestion Debug - Params: symptoms="' . $symptoms . '", diagnosis="' . $diagnosis . '", input="' . $input . '", type="' . $type . '"');

        // Ưu tiên symptoms nếu có, rồi diagnosis, rồi input
        $finalInput = trim($symptoms ?: $diagnosis ?: $input);

        Log::info('Final input after trim: "' . $finalInput . '" (length: ' . strlen($finalInput) . ')');

        if (strlen($finalInput) < 3) {
            Log::warning('AI Suggestion - Input too short: ' . $finalInput);
            return response()->json(['error' => 'Thiếu thông tin input (symptoms hoặc diagnosis)'], 400);
        }

        // Case cho type='diagnosis'
        if ($type === 'diagnosis') {
            $prompt = "
        Bạn là bác sĩ chuyên khoa nội tổng quát.
        Dựa trên triệu chứng: '{$finalInput}', hãy gợi ý 3-5 chẩn đoán có thể nhất.
        Chỉ trả về JSON thuần túy với định dạng:
        [
          { 'DiagnosisName': 'Chẩn đoán 1', 'Reason': 'Lý do ngắn gọn...' },
          { 'DiagnosisName': 'Chẩn đoán 2', 'Reason': 'Lý do ngắn gọn...' }
        ]
        Không thêm bất kỳ text nào ngoài JSON. Lý do phải dựa trên y khoa cơ bản, không chẩn đoán chính thức.
        ";
            return $this->callGemini($prompt);
        }

        // Medicine/Service logic
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

        // 🆕 Prompt rõ ràng hơn (best practice: chỉ định schema chính xác, tránh Gemini bịa key)
        $inputType = ($type === 'medicine') ? 'chẩn đoán' : 'chẩn đoán';
        $itemType = ($type === 'medicine') ? 'thuốc' : 'dịch vụ cận lâm sàng';
        $schemaKey = ($type === 'medicine') ? 'MedicineName' : 'ServiceName'; // 🆕 Fix key cho service
        $extraField = ($type === 'service') ? ", 'ServiceId': '...' " : '';
        $prompt = "
    Bạn là bác sĩ chuyên khoa nội tổng quát.
    Dựa trên {$inputType}: '{$finalInput}', hãy chọn 3-5 {$itemType} phù hợp nhất từ danh sách sau (chỉ chọn có trong danh sách, không bịa thêm):
    {$itemList}

    Trả về JSON thuần túy, không text thừa, với schema chính xác sau:
    [
      { '{$schemaKey}': 'Tên chính xác từ danh sách', 'Reason': 'Lý do ngắn gọn dựa trên y khoa' {$extraField} }
    ]

    Ví dụ cho {$itemType}: { '{$schemaKey}': 'Tên dịch vụ/thuốc', 'Reason': 'Lý do' }
    ";
        Log::debug('Generated prompt for ' . $type . ': ' . substr($prompt, 0, 200) . '...'); // Log prompt ngắn

        return $this->callGemini($prompt);
    }

    private function callGemini($prompt)
    {
        $apiKey = env('GOOGLE_API_KEY');
        if (!$apiKey) {
            Log::error('GOOGLE_API_KEY not set in .env');
            return response()->json(['error' => 'API key Gemini chưa cấu hình'], 500);
        }

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

            Log::info('Gemini Response Status: ' . $response->status());

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
            Log::error('Gemini Exception: ' . $e->getMessage());
            return response()->json([
                'error' => 'Lỗi kết nối tới Gemini',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}