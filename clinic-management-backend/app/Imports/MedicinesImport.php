<?php

namespace App\Imports;

use App\Models\Medicine;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Concerns\Importable; // <-- THÊM: Để collect failures()
use Maatwebsite\Excel\Concerns\SkipsFailures; // <-- THÊM: Import trait
use Maatwebsite\Excel\Validators\Failure;
use Illuminate\Support\Facades\Validator;

class MedicinesImport implements ToModel, WithHeadingRow, WithValidation, WithChunkReading, SkipsOnFailure
{
    use Importable, SkipsFailures; // <-- THÊM: Traits tự động skip & collect failures

    // KHÔNG CẦN $failures nữa, dùng $this->failures() sau import

    public function model(array $row)
    {
        return Medicine::updateOrCreate(
            ['MedicineId' => $row['medicineid'] ?? null],
            [
                'MedicineName' => $row['medicinename'],
                'MedicineType' => $row['medicinetype'],
                'Unit' => $row['unit'],
                'Price' => $row['price'],
                'StockQuantity' => $row['stockquantity'],
                'Description' => $row['description'] ?? null,
            ]
        );
    }

    public function rules(): array
    {
        return [
            'medicinename' => 'required|string|max:100',
            'medicinetype' => 'required|in:Thuốc viên,Thuốc nước,Thuốc tiêm,Thuốc bột,Thuốc bôi,Thuốc nhỏ mắt', // <-- THÊM: Validate enum
            'unit' => 'required|in:Viên,Chai,Ống,Gói,Tuýp,Lọ', // <-- THÊM: Validate enum
            'price' => 'required|numeric|min:0|max:9999999999999999.99',
            'stockquantity' => 'required|integer|min:0',
            'description' => 'nullable|string|max:500',
            '*.medicineid' => 'nullable|string|max:50|unique:medicines,MedicineId', // Anti-duplicate
        ];
    }

    public function chunkSize(): int
    {
        return 1000;
    }

    // BỎ onFailure: Trait tự handle. Nếu cần custom: Giữ và override.
}