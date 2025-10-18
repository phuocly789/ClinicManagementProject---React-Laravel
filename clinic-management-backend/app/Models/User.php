<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Passport\HasApiTokens;

/**
 * Class User
 * 
 * @property int $UserId
 * @property string $Username
 * @property string $PasswordHash
 * @property string $FullName
 * @property string $Email
 * @property string|null $Phone
 * @property string|null $Gender
 * @property string|null $Address
 * @property Carbon|null $DateOfBirth
 * @property Carbon|null $CreatedAt
 * @property bool|null $IsActive
 * @property bool $MustChangePassword
 * 
 * @property Collection|MedicalRecord[] $medical_records
 * @property Patient|null $patient
 * @property MedicalStaff|null $medical_staff
 * @property Collection|Role[] $roles
 * @property Collection|Queue[] $queues
 * @property Collection|Diagnosis[] $diagnoses
 * @property Collection|StaffSchedule[] $staff_schedules
 * @property Collection|Appointment[] $appointments
 * @property Collection|ServiceOrder[] $service_orders
 * @property Collection|ImportBill[] $import_bills
 * @property Collection|Invoice[] $invoices
 * @property Collection|Notification[] $notifications
 * @property Collection|Prescription[] $prescriptions
 *
 * @package App\Models
 */
class User extends Authenticatable
{
	use HasApiTokens, Notifiable;
	protected $table = 'Users';
	protected $primaryKey = 'UserId';
	public $incrementing = false;
	public $timestamps = false;

	protected $casts = [
		'UserId' => 'int',
		'DateOfBirth' => 'datetime',
		'CreatedAt' => 'datetime',
		'IsActive' => 'bool',
		'MustChangePassword' => 'bool'
	];

	protected $fillable = [
		'Username',
		'PasswordHash',
		'FullName',
		'Email',
		'Phone',
		'Gender',
		'Address',
		'DateOfBirth',
		'CreatedAt',
		'IsActive',
		'MustChangePassword'
	];

	public function medical_records()
	{
		return $this->hasMany(MedicalRecord::class, 'CreatedBy');
	}

	public function patient()
	{
		return $this->hasOne(Patient::class, 'PatientId');
	}

	public function medical_staff()
	{
		return $this->hasOne(MedicalStaff::class, 'StaffId');
	}

	public function roles()
	{
		return $this->belongsToMany(Role::class, 'UserRoles', 'UserId', 'RoleId')
			->withPivot('AssignedAt');
	}

	public function queues()
	{
		return $this->hasMany(Queue::class, 'CreatedBy');
	}

	public function diagnoses()
	{
		return $this->hasMany(Diagnosis::class, 'StaffId');
	}

	public function staff_schedules()
	{
		return $this->hasMany(StaffSchedule::class, 'StaffId');
	}

	public function appointments()
	{
		return $this->hasMany(Appointment::class, 'CreatedBy');
	}

	public function service_orders()
	{
		return $this->hasMany(ServiceOrder::class, 'AssignedStaffId');
	}

	public function import_bills()
	{
		return $this->hasMany(ImportBill::class, 'CreatedBy');
	}

	public function invoices()
	{
		return $this->hasMany(Invoice::class, 'PatientId');
	}

	public function notifications()
	{
		return $this->hasMany(Notification::class, 'UserId');
	}

	public function prescriptions()
	{
		return $this->hasMany(Prescription::class, 'StaffId');
	}
}