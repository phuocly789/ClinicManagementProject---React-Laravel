<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Diagnosis
 * 
 * @property int $DiagnosisId
 * @property int|null $AppointmentId
 * @property int|null $StaffId
 * @property int|null $RecordId
 * @property string|null $Symptoms
 * @property string|null $Diagnosis
 * @property string|null $Notes
 * @property Carbon|null $DiagnosisDate
 * 
 * @property Appointment|null $appointment
 * @property MedicalStaff|null $medical_staff
 * @property MedicalRecord|null $medical_record
 *
 * @package App\Models
 */
class Diagnosis extends Model
{
	protected $table = 'Diagnoses';
	protected $primaryKey = 'DiagnosisId';
	public $incrementing = false;
	public $timestamps = false;

	protected $casts = [
		'DiagnosisId' => 'int',
		'AppointmentId' => 'int',
		'StaffId' => 'int',
		'RecordId' => 'int',
		'DiagnosisDate' => 'datetime'
	];

	protected $fillable = [
		'AppointmentId',
		'StaffId',
		'RecordId',
		'Symptoms',
		'Diagnosis',
		'Notes',
		'DiagnosisDate'
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
}
