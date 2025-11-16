<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Patient
 *
 * @property int $PatientId
 * @property string|null $MedicalHistory
 *
 * @property User $user
 * @property Collection|MedicalRecord[] $medical_records
 * @property Collection|Appointment[] $appointments
 * @property Collection|Queue[] $queues
 * @property Collection|Invoice[] $invoices
 *
 * @package App\Models
 */
class Patient extends Model
{
	protected $table = 'Patients';
	protected $primaryKey = 'PatientId';
	public $incrementing = false;
	public $timestamps = false;

	protected $casts = [
		'PatientId' => 'int'
	];

	protected $fillable = [
		'PatientId',
		'MedicalHistory',
	];

	public function user()
	{
		return $this->belongsTo(User::class, 'PatientId', 'UserId');
	}

	public function medical_records()
	{
		return $this->hasMany(MedicalRecord::class, 'PatientId');
	}

	public function appointments()
	{
		return $this->hasMany(Appointment::class, 'PatientId');
	}

	public function queues()
	{
		return $this->hasMany(Queue::class, 'PatientId');
	}

	public function invoices()
	{
		return $this->hasMany(Invoice::class, 'PatientId');
	}


}
