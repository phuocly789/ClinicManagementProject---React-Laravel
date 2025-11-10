<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class MedicalRecord
 * 
 * @property int $RecordId
 * @property int|null $PatientId
 * @property string $RecordNumber
 * @property Carbon $IssuedDate
 * @property string $Status
 * @property string|null $Notes
 * @property int|null $CreatedBy
 * 
 * @property Patient|null $patient
 * @property User|null $user
 * @property Collection|Diagnosis[] $diagnoses
 * @property Collection|Appointment[] $appointments
 * @property Collection|Queue[] $queues
 * @property Collection|Prescription[] $prescriptions
 *
 * @package App\Models
 */
class MedicalRecord extends Model
{
	protected $table = 'MedicalRecords';
	protected $primaryKey = 'RecordId';
	public $incrementing = true;
	public $timestamps = false;

	protected $casts = [
		'RecordId' => 'int',
		'PatientId' => 'int',
		'IssuedDate' => 'datetime',
		'CreatedBy' => 'int'
	];

	protected $fillable = [
		'PatientId',
		'RecordNumber',
		'IssuedDate',
		'Status',
		'Notes',
		'CreatedBy'
	];

	public function patient()
	{
		return $this->belongsTo(Patient::class, 'PatientId');
	}

	public function user()
	{
		return $this->belongsTo(User::class, 'CreatedBy');
	}

	public function diagnoses()
	{
		return $this->hasMany(Diagnosis::class, 'RecordId');
	}

	public function appointments()
	{
		return $this->hasMany(Appointment::class, 'RecordId');
	}

	public function queues()
	{
		return $this->hasMany(Queue::class, 'RecordId');
	}

	public function prescriptions()
	{
		return $this->hasMany(Prescription::class, 'RecordId');
	}
}
