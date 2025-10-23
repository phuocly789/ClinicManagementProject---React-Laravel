<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateScheduleRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'StaffId' => ['required', 'integer', 'exists:medical_staff,StaffId'],
            'WorkDate' => ['required', 'date_format:Y-m-d'],
            'StartTime' => ['required', 'date_format:H:i:s'],
            'EndTime' => ['required', 'date_format:H:i:s', 'after:StartTime'],
            'IsAvailable' => ['required', 'boolean'],
        ];
    }
    /**
     * Get custom messages for validation errors.
     *
     * @return array
     */
    public function messages()
    {
        return [
            'StaffId.required' => 'Vui lòng cung cấp StaffId.',
            'StaffId.integer' => 'StaffId phải là số nguyên.',
            'StaffId.exists' => 'StaffId không tồn tại trong hệ thống.',
            'WorkDate.required' => 'Vui lòng cung cấp ngày làm việc.',
            'WorkDate.date_format' => 'Ngày làm việc phải có định dạng YYYY-MM-DD.',
            'StartTime.required' => 'Vui lòng cung cấp giờ bắt đầu.',
            'StartTime.date_format' => 'Giờ bắt đầu phải có định dạng HH:MM:SS.',
            'EndTime.required' => 'Vui lòng cung cấp giờ kết thúc.',
            'EndTime.date_format' => 'Giờ kết thúc phải có định dạng HH:MM:SS.',
            'EndTime.after' => 'Giờ kết thúc phải sau giờ bắt đầu.',
            'IsAvailable.required' => 'Vui lòng cung cấp trạng thái có sẵn.',
            'IsAvailable.boolean' => 'Trạng thái có sẵn phải là true hoặc false.',
        ];
    }
}
