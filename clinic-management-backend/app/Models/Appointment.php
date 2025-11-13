<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Appointment
 *
 * @property int $AppointmentId
 * @property int|null $PatientId
 * @property int|null $StaffId
 * @property int|null $ScheduleId
 * @property int|null $RecordId
 * @property Carbon $AppointmentDate
 * @property time without time zone $AppointmentTime
 * @property string $Status
 * @property Carbon|null $FollowUpDate
 * @property Carbon|null $CreatedAt
 * @property int|null $CreatedBy
 * @property  string|null $Notes
 *
 * @property Patient|null $patient
 * @property MedicalStaff|null $medical_staff
 * @property StaffSchedule|null $staff_schedule
 * @property MedicalRecord|null $medical_record
 * @property User|null $user
 * @property Collection|Diagnosis[] $diagnoses
 * @property Collection|Notification[] $notifications
 * @property Collection|Queue[] $queues
 * @property Collection|ServiceOrder[] $service_orders
 * @property Collection|Prescription[] $prescriptions
 * @property Collection|Invoice[] $invoices
 *
 * @package App\Models
 */
class Appointment extends Model
{
	protected $table = 'Appointments';
	protected $primaryKey = 'AppointmentId';
	public $incrementing = true;
	public $timestamps = false;
	public const STATUS_BOOKED      = 'Đã đặt';
	public const STATUS_WAITING     = 'Đang chờ';
	public const STATUS_IN_PROGRESS = 'Đang khám';
	public const STATUS_COMPLETED   = 'Đã khám';
	public const STATUS_CANCELLED   = 'Hủy';

	protected $casts = [
		'AppointmentId' => 'int',
		'PatientId' => 'int',
		'StaffId' => 'int',
		'ScheduleId' => 'int',
		'RecordId' => 'int',
		'AppointmentDate' => 'datetime',
		'AppointmentTime' => 'string',
		'FollowUpDate' => 'datetime',
		'CreatedAt' => 'datetime',
		'CreatedBy' => 'int',
		'Notes' => 'string'
	];

	protected $fillable = [
		'PatientId',
		'StaffId',
		'ScheduleId',
		'RecordId',
		'AppointmentDate',
		'AppointmentTime',
		'Status',
		'FollowUpDate',
		'CreatedAt',
		'CreatedBy',
		'Notes'
	];

	public function patient()
	{
		return $this->belongsTo(Patient::class, 'PatientId');
	}

	public function medical_staff()
	{
		return $this->belongsTo(MedicalStaff::class, 'StaffId');
	}

	public function staff_schedule()
	{
		return $this->belongsTo(StaffSchedule::class, 'ScheduleId');
	}

	public function medical_record()
	{
		return $this->belongsTo(MedicalRecord::class, 'RecordId');
	}

	public function user()
	{
		return $this->belongsTo(User::class, 'CreatedBy');
	}

	public function diagnoses()
	{
		return $this->hasMany(Diagnosis::class, 'AppointmentId');
	}

	public function notifications()
	{
		return $this->hasMany(Notification::class, 'AppointmentId');
	}

	public function queues()
	{
		return $this->hasMany(Queue::class, 'AppointmentId');
	}

	public function service_orders()
	{
		return $this->hasMany(ServiceOrder::class, 'AppointmentId');
	}

	public function prescriptions()
	{
		return $this->hasMany(Prescription::class, 'AppointmentId');
	}

	public function invoices()
	{
		return $this->hasMany(Invoice::class, 'AppointmentId');
	}
}
