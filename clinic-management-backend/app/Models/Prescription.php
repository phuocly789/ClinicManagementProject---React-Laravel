<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Prescription
 * 
 * @property int $PrescriptionId
 * @property int|null $AppointmentId
 * @property int|null $StaffId
 * @property int|null $RecordId
 * @property Carbon|null $PrescriptionDate
 * @property string|null $Instructions
 * 
 * @property Appointment|null $appointment
 * @property MedicalStaff|null $medical_staff
 * @property MedicalRecord|null $medical_record
 * @property Collection|PrescriptionDetail[] $prescription_details
 *
 * @package App\Models
 */
class Prescription extends Model
{
	protected $table = 'Prescriptions';
	protected $primaryKey = 'PrescriptionId';
	public $incrementing = true;
	public $timestamps = false;

	protected $casts = [
		'PrescriptionId' => 'int',
		'AppointmentId' => 'int',
		'StaffId' => 'int',
		'RecordId' => 'int',
		'PrescriptionDate' => 'datetime'
	];

	protected $fillable = [
		'AppointmentId',
		'StaffId',
		'RecordId',
		'PrescriptionDate',
		'Instructions'
	];

	public function appointment()
	{
		return $this->belongsTo(Appointment::class, 'AppointmentId');
	}

	public function medical_staff()
	{
		return $this->belongsTo(MedicalStaff::class, 'StaffId');
	}

	public function medical_record()
	{
		return $this->belongsTo(MedicalRecord::class, 'RecordId');
	}

	public function prescription_details()
	{
		return $this->hasMany(PrescriptionDetail::class, 'PrescriptionId');
	}
}
