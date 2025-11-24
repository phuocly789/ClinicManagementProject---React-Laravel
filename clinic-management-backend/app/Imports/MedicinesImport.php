<?php

namespace App\Imports;

use App\Models\Medicine;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;
use Maatwebsite\Excel\Validators\Failure;
use Maatwebsite\Excel\Concerns\SkipsFailures;
use Maatwebsite\Excel\Imports\HeadingRowFormatter;
use Carbon\Carbon;

class MedicinesImport implements ToModel, WithHeadingRow, WithValidation, SkipsOnFailure, SkipsEmptyRows
{
    use SkipsFailures;

    protected $mapping;  // THÊM: Property cho mapping

    public function __construct($mapping = [])
    {  // THÊM: Constructor nhận mapping (default rỗng)
        $this->mapping = $mapping;
        HeadingRowFormatter::default('none');
    }

    public function model(array $row)
    {
        // Sử dụng đúng tên cột CHỮ HOA từ file Excel của bạn
        return new Medicine([
            'MedicineId'    => $row['MedicineId'] ?? null,  // camelCase
            'MedicineName'  => $row['MedicineName'] ?? '',
            'MedicineType'  => $row['MedicineType'] ?? '',
            'Unit'           => $row['Unit'] ?? '',
            'Price'          => $row['Price'] ?? 0,
            'StockQuantity' => $row['StockQuantity'] ?? 0,
            'Description'    => $row['Description'] ?? '',
            'ExpiryDate'        => isset($row['ExpiryDate']) ? $this->parseDate($row['ExpiryDate']) : null,
            'LowStockThreshold' => $row['LowStockThreshold'] ?? 10,
        ]);
    }

    public function rules(): array
    {
        return [
            'MedicineName'  => 'required|string|max:100',
            'MedicineType'  => 'required|string|max:50',
            'Unit'          => 'required|string|max:20',
            'Price'         => 'required|numeric|min:0',
            'StockQuantity' => 'required|integer|min:0',
            // MedicineId và Description không bắt buộc
            'MedicineId'    => 'sometimes|string|max:50',
            'Description'   => 'nullable|string|max:500',
            'ExpiryDate'        => 'nullable|date',
            'LowStockThreshold' => 'nullable|integer|min:0',
        ];
    }

    public function customValidationAttributes()
    {
        return [
            'MedicineName'  => 'Tên thuốc',
            'MedicineType'  => 'Loại thuốc',
            'Unit'          => 'Đơn vị',
            'Price'         => 'Giá',
            'StockQuantity' => 'Số lượng tồn kho',
            'MedicineId'    => 'Mã thuốc',
            'Description'   => 'Mô tả',
            'ExpiryDate'        => 'Hạn sử dụng',
            'LowStockThreshold' => 'Ngưỡng tồn kho thấp',
        ];
    }

    /**
     * Xử lý trước khi validation - chuyển đổi kiểu dữ liệu
     */
    public function prepareForValidation($data, $index)
    {
        // THÊM: Remap nếu có mapping
        if (!empty($this->mapping)) {
            $remapped = [];
            foreach ($this->mapping as $fileHeader => $systemCol) {
                if (isset($data[$fileHeader])) {
                    $remapped[$systemCol] = $data[$fileHeader];
                }
            }
            $data = $remapped;
        }

        // Chuyển MedicineId thành string nếu có
        if (isset($data['MedicineId']) && is_numeric($data['MedicineId'])) {
            $data['MedicineId'] = (string) $data['MedicineId'];
        }

        // Đảm bảo Price là numeric
        if (isset($data['Price']) && is_string($data['Price'])) {
            $data['Price'] = (float) str_replace(',', '', $data['Price']);
        }

        // Đảm bảo StockQuantity là integer
        if (isset($data['StockQuantity']) && is_string($data['StockQuantity'])) {
            $data['StockQuantity'] = (int) $data['StockQuantity'];
        }

        if (isset($data['LowStockThreshold'])) {
            $data['LowStockThreshold'] = (int) $data['LowStockThreshold'];
        }

        if (isset($data['ExpiryDate'])) {
            $data['ExpiryDate'] = $this->parseDate($data['ExpiryDate']);
        }

        return $data;
    }

    /**
     * Chuyển đổi kiểu ngày linh hoạt (Excel, text, hoặc timestamp)
     */
    private function parseDate($value)
    {
        try {
            if (is_numeric($value)) {
                return Carbon::instance(\PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value))->format('Y-m-d');
            }
            return Carbon::parse($value)->format('Y-m-d');
        } catch (\Exception $e) {
            return null;
        }
    }
}
