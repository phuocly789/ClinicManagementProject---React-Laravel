<?php

namespace App\Exports;

use App\Models\Medicine;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle; // <-- THÊM: Cho sheet title
use Maatwebsite\Excel\Concerns\FromArray;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class MedicinesExport implements WithMultipleSheets, WithStyles
{
    protected $filters;
    protected $columns;

    public function __construct($filters = [], $columns = [])
    {
        $this->filters = $filters;
        $this->columns = $columns ?: ['MedicineId', 'MedicineName', 'MedicineType', 'Unit', 'Price', 'StockQuantity', 'Description'];
    }

    public function sheets(): array
    {
        return [
            new SheetExport($this->filters, $this->columns), // Sheet chính
            new DescriptionSheet(), // Sheet mô tả
        ];
    }

    public function styles(Worksheet $sheet)
    {
        // Áp dụng cho header row 1 của TẤT CẢ sheets
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFF']],
                'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => '007BFF']]
            ],
        ];
    }
}

class SheetExport implements FromCollection, WithHeadings, WithTitle // <-- THÊM WithTitle
{
    protected $filters;
    protected $columns;

    public function __construct($filters = [], $columns = [])
    {
        $this->filters = $filters;
        $this->columns = $columns;
    }

    public function collection()
    {
        $query = Medicine::query();
        if (!empty($this->filters['type'])) {
            $query->where('MedicineType', $this->filters['type']);
        }
        // THÊM FILTER KHÁC NẾU CẦN: e.g., if (!empty($this->filters['stock_low'])) $query->where('StockQuantity', '<', 100);
        return $query->select($this->columns)->get();
    }

    public function headings(): array
    {
        return $this->columns;
    }

    public function title(): string // <-- THÊM: Title cho sheet
    {
        return 'DanhSachThuoc';
    }
}

class DescriptionSheet implements FromArray, WithTitle // <-- THÊM WithTitle
{
    public function array(): array
    {
        return [
            ['Cột', 'Mô tả', 'Bắt Buộc', 'Kiểu Dữ Liệu', 'Giới Hạn'],
            ['MedicineId', 'Mã thuốc (tự tăng nếu để trống)', 'Không', 'String/Int', 'Max 50'],
            ['MedicineName', 'Tên thuốc', 'Có', 'String', 'Max 100 ký tự'],
            ['MedicineType', 'Loại thuốc (Thuốc viên/Nước/Tiêm/... )', 'Có', 'String', 'Max 50'],
            ['Unit', 'Đơn vị (Viên/Chai/Ống/... )', 'Có', 'String', 'Max 20'],
            ['Price', 'Giá bán', 'Có', 'Numeric', 'Min 0, Max 9999999999999999.99'],
            ['StockQuantity', 'Số lượng tồn kho', 'Có', 'Integer', 'Min 0'],
            ['Description', 'Mô tả', 'Không', 'String', 'Max 500 ký tự'],
        ];
    }

    public function title(): string // <-- THÊM: Title cho sheet
    {
        return 'MoTaTemplate';
    }
}