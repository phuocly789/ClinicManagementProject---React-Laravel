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
        $symptoms = $request->query('symptoms', '');
        $diagnosis = $request->query('diagnosis', '');
        $type = $request->query('type', 'medicine');
        
        $finalInput = $this->getFinalInput($symptoms, $diagnosis);
        
        if (strlen($finalInput) < 3) {
            return response()->json(['error' => 'Vui lòng nhập ít nhất 3 ký tự triệu chứng hoặc chẩn đoán'], 400);
        }

        try {
            if ($type === 'diagnosis') {
                return $this->handleDiagnosisSuggestion($finalInput);
            }
            
            return $this->handleMedicineServiceSuggestion($finalInput, $type);
            
        } catch (\Exception $e) {
            Log::error('AI Suggestion Error: ' . $e->getMessage());
            return response()->json(['error' => 'Lỗi hệ thống AI, vui lòng thử lại sau'], 500);
        }
    }

    private function getFinalInput($symptoms, $diagnosis)
    {
        $input = trim($symptoms ?: $diagnosis);
        // Mask sensitive data for logging
        $maskedInput = strlen($input) > 10 ? substr($input, 0, 10) . '...' : $input;
        Log::info('AI Suggestion - Input: ' . $maskedInput);
        return $input;
    }

    private function handleDiagnosisSuggestion($input)
    {
        $prompt = "Bạn là bác sĩ. Dựa trên triệu chứng: '{$input}', gợi ý 3-5 chẩn đoán có thể.
        Trả về JSON: [{'DiagnosisName': '...', 'Reason': '...'}]";
        
        return $this->callGemini($prompt);
    }

    private function handleMedicineServiceSuggestion($input, $type)
    {
        $items = $type === 'medicine' 
            ? $this->getMedicines() 
            : $this->getServices();

        if ($items->isEmpty()) {
            return response()->json(['error' => 'Không tìm thấy dữ liệu'], 404);
        }

        $prompt = $this->buildSuggestionPrompt($input, $items, $type);
        $aiResponse = $this->callGemini($prompt);
        
        return $this->enrichWithRealData($aiResponse, $items, $type);
    }

    private function getMedicines()
    {
        return DB::table('Medicines')
            ->select('MedicineName', 'MedicineType', 'Unit', 'Price', 'StockQuantity')
            ->where('StockQuantity', '>', 0) // Chỉ lấy thuốc còn hàng
            ->limit(15)
            ->get();
    }

    private function getServices()
    {
        return DB::table('Services')
            ->select('ServiceId', 'ServiceName', 'ServiceType', 'Price', 'Description')
            ->limit(15)
            ->get();
    }

    private function buildSuggestionPrompt($input, $items, $type)
    {
        $itemType = $type === 'medicine' ? 'thuốc' : 'dịch vụ';
        $itemList = $items->map(fn($item) => 
            $type === 'medicine' 
                ? "{$item->MedicineName} - Giá: {$item->Price} VNĐ - Đơn vị: {$item->Unit}"
                : "{$item->ServiceName} - Giá: {$item->Price} VNĐ"
        )->implode(', ');

        return "Bạn là bác sĩ. Dựa trên chẩn đoán: '{$input}', chọn 3-5 {$itemType} phù hợp từ: {$itemList}
        Trả về JSON: [{'MedicineName': '...', 'Reason': '...', 'Price': ..., 'Unit': '...'}]";
    }

    private function enrichWithRealData($aiResponse, $databaseItems, $type)
    {
        if ($aiResponse->getStatusCode() !== 200) {
            return $aiResponse;
        }

        $aiData = json_decode($aiResponse->getContent(), true);
        
        if (!is_array($aiData)) {
            return $aiResponse;
        }

        $enrichedData = array_map(function($item) use ($databaseItems, $type) {
            $name = $item['MedicineName'] ?? $item['ServiceName'] ?? null;
            $dbItem = $databaseItems->firstWhere(
                $type === 'medicine' ? 'MedicineName' : 'ServiceName', 
                $name
            );

            if ($dbItem) {
                $item['Price'] = $dbItem->Price;
                if ($type === 'medicine') {
                    $item['Unit'] = $dbItem->Unit;
                }
            }
            
            return $item;
        }, $aiData);

        return response()->json($enrichedData);
    }

    private function callGemini($prompt)
    {
        $apiKey = env('GOOGLE_API_KEY');
        if (!$apiKey) {
            throw new \Exception('API key chưa được cấu hình');
        }

        $response = Http::timeout(30)->post(
            "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={$apiKey}",
            [
                'contents' => [['parts' => [['text' => $prompt]]]],
                'generationConfig' => ['temperature' => 0.4]
            ]
        );

        if ($response->failed()) {
            throw new \Exception('Lỗi kết nối AI');
        }

        $text = $response->json('candidates.0.content.parts.0.text');
        
        if (!$text) {
            throw new \Exception('AI không trả về kết quả');
        }

        // Extract JSON from response
        if (preg_match('/```json\s*([\s\S]*?)\s*```/', $text, $matches)) {
            $text = trim($matches[1]);
        }

        $data = json_decode($text, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \Exception('Định dạng kết quả không hợp lệ');
        }

        return response()->json($data);
    }
}