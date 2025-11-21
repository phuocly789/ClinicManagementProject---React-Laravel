@component('mail::message')
# CẢNH BÁO THUỐC

**{{ strtoupper(str_replace('_', ' ', $alert->type)) }}**

**Tên:** {{ $medicine->MedicineName }}  
**Mã:** {{ $medicine->MedicineId }}  
**Tồn:** {{ $medicine->StockQuantity }} {{ $medicine->Unit }}  
**Hạn:** {{ $medicine->ExpiryDate ? \Carbon\Carbon::parse($medicine->ExpiryDate)->format('d/m/Y') : '—' }}

@component('mail::button', ['url' => env('APP_URL').'/admin/medicine'])
Xem ngay
@endcomponent

Hệ thống Dược
@endcomponent