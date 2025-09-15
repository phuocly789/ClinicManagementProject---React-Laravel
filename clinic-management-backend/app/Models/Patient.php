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
 * @property Collection|Queue[] $queues
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
		'MedicalHistory'
	];

	public function user()
	{
		return $this->belongsTo(User::class, 'PatientId');
	}

	public function medical_records()
	{
		return $this->hasMany(MedicalRecord::class, 'PatientId');
	}

	public function queues()
	{
		return $this->hasMany(Queue::class, 'PatientId');
	}
}
