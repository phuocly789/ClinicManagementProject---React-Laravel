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
 * @property User|null $user
 * @property MedicalRecord|null $medical_record
 * @property Collection|PrescriptionDetail[] $prescription_details
 *
 * @package App\Models
 */
class Prescription extends Model
{
	protected $table = 'Prescriptions';
	protected $primaryKey = 'PrescriptionId';
	public $incrementing = false;
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

	public function user()
	{
		return $this->belongsTo(User::class, 'StaffId');
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
