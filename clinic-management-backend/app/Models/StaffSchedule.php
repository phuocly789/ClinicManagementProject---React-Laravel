<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class StaffSchedule
 *
 * @property int $ScheduleId
 * @property int|null $StaffId
 * @property Carbon $WorkDate
 * @property time without time zone $StartTime
 * @property time without time zone $EndTime
 * @property bool|null $IsAvailable
 *
 * @property MedicalStaff|null $medical_staff
 * @property Collection|Appointment[] $appointments
 *
 * @package App\Models
 */
class StaffSchedule extends Model
{
	protected $table = 'StaffSchedules';
	protected $primaryKey = 'ScheduleId';
	public $incrementing = false;
	public $timestamps = false;

	protected $casts = [
		'ScheduleId' => 'int',
		'StaffId' => 'int',
		'WorkDate' => 'datetime',
		'StartTime' => 'string',
		'EndTime' => 'string',
		'IsAvailable' => 'bool'
	];

	protected $fillable = [
		'StaffId',
		'WorkDate',
		'StartTime',
		'EndTime',
		'IsAvailable'
	];

	public function medical_staff()
	{
		return $this->belongsTo(MedicalStaff::class, 'StaffId');
	}

	public function appointments()
	{
		return $this->hasMany(Appointment::class, 'ScheduleId');
	}
}
