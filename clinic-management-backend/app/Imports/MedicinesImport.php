<?php

namespace App\Imports;

use App\Models\Medicine;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Validators\Failure;
use Maatwebsite\Excel\Concerns\SkipsFailures;

class MedicinesImport implements ToModel, WithHeadingRow, WithValidation, SkipsOnFailure
{
    use SkipsFailures;

    public function model(array $row)
    {
        // Sử dụng đúng tên cột CHỮ HOA từ file Excel của bạn
        return new Medicine([
            'MedicineId'    => $row['MedicineId'] ?? null,
            'MedicineName'  => $row['MedicineName'] ?? '',
            'MedicineType'  => $row['MedicineType'] ?? '',
            'Unit'          => $row['Unit'] ?? '',
            'Price'         => $row['Price'] ?? 0,
            'StockQuantity' => $row['StockQuantity'] ?? 0,
            'Description'   => $row['Description'] ?? '',
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
        ];
    }

    /**
     * Xử lý trước khi validation - chuyển đổi kiểu dữ liệu
     */
    public function prepareForValidation($data, $index)
    {
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

        return $data;
    }
}