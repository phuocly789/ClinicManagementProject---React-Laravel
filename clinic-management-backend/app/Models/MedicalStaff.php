<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class MedicalStaff
 *
 * @property int $StaffId
 * @property string|null $StaffType
 * @property string|null $Specialty
 * @property string|null $LicenseNumber
 * @property string|null $Bio
 *
 * @property User $user
 * @property Collection|StaffSchedule[] $staff_schedules
 * @property Collection|Diagnosis[] $diagnoses
 * @property Collection|Appointment[] $appointments
 * @property Collection|ServiceOrder[] $service_orders
 * @property Collection|Prescription[] $prescriptions
 *
 * @package App\Models
 */
class MedicalStaff extends Model
{
    protected $table = 'MedicalStaff';
    protected $primaryKey = 'StaffId';
    public $incrementing = false;
    public $timestamps = false;

    protected $casts = [
        'StaffId' => 'int',
        'StaffType' => 'string'
    ];

    protected $fillable = [
        'StaffType',
        'Specialty',
        'LicenseNumber',
        'Bio'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'StaffId', 'UserId');
    }

    public function staff_schedules()
    {
        return $this->hasMany(StaffSchedule::class, 'StaffId');
    }

    public function diagnoses()
    {
        return $this->hasMany(Diagnosis::class, 'StaffId');
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class, 'StaffId');
    }

    public function service_orders()
    {
        return $this->hasMany(ServiceOrder::class, 'AssignedStaffId');
    }

    public function prescriptions()
    {
        return $this->hasMany(Prescription::class, 'StaffId');
    }


    // Dịch vụ mà bác sĩ chỉ định
    public function assigned_service_orders()
    {
        return $this->hasMany(ServiceOrder::class, 'AssignedStaffId');
    }

    // Dịch vụ mà kỹ thuật viên thực hiện
    public function technician_service_orders()
    {
        return $this->hasMany(ServiceOrder::class, 'TechnicianId');
    }
    public function schedules()
    {
        return $this->hasMany(StaffSchedule::class, 'StaffId', 'StaffId');
    }
}
