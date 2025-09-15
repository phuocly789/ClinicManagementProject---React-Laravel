<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Queue
 * 
 * @property int $QueueId
 * @property int|null $PatientId
 * @property int|null $AppointmentId
 * @property int|null $RecordId
 * @property int $QueueNumber
 * @property int|null $RoomId
 * @property Carbon $QueueDate
 * @property time without time zone $QueueTime
 * @property string $Status
 * @property int|null $CreatedBy
 * 
 * @property Patient|null $patient
 * @property Appointment|null $appointment
 * @property MedicalRecord|null $medical_record
 * @property Room|null $room
 * @property User|null $user
 *
 * @package App\Models
 */
class Queue extends Model
{
	protected $table = 'Queues';
	protected $primaryKey = 'QueueId';
	public $incrementing = false;
	public $timestamps = false;

	protected $casts = [
		'QueueId' => 'int',
		'PatientId' => 'int',
		'AppointmentId' => 'int',
		'RecordId' => 'int',
		'QueueNumber' => 'int',
		'RoomId' => 'int',
		'QueueDate' => 'datetime',
		'QueueTime' => 'time without time zone',
		'CreatedBy' => 'int'
	];

	protected $fillable = [
		'PatientId',
		'AppointmentId',
		'RecordId',
		'QueueNumber',
		'RoomId',
		'QueueDate',
		'QueueTime',
		'Status',
		'CreatedBy'
	];

	public function patient()
	{
		return $this->belongsTo(Patient::class, 'PatientId');
	}

	public function appointment()
	{
		return $this->belongsTo(Appointment::class, 'AppointmentId');
	}

	public function medical_record()
	{
		return $this->belongsTo(MedicalRecord::class, 'RecordId');
	}

	public function room()
	{
		return $this->belongsTo(Room::class, 'RoomId');
	}

	public function user()
	{
		return $this->belongsTo(User::class, 'CreatedBy');
	}
}
