<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

/**
 * Class ServiceOrder
 * 
 * @property int $ServiceOrderId
 * @property int|null $AppointmentId
 * @property int|null $ServiceId
 * @property int|null $AssignedStaffId
 * @property Carbon|null $OrderDate
 * @property string|null $Result
 * @property string $Status
 * 
 * @property Appointment|null $appointment
 * @property Service|null $service
 * @property User|null $user
 *
 * @package App\Models
 */
class ServiceOrder extends Model
{
	protected $table = 'ServiceOrders';
	protected $primaryKey = 'ServiceOrderId';
	public $incrementing = false;
	public $timestamps = false;

	protected $casts = [
		'ServiceOrderId' => 'int',
		'AppointmentId' => 'int',
		'ServiceId' => 'int',
		'AssignedStaffId' => 'int',
		'OrderDate' => 'datetime'
	];

	protected $fillable = [
		'AppointmentId',
		'ServiceId',
		'AssignedStaffId',
		'OrderDate',
		'Result',
		'Status'
	];

	public function appointment()
	{
		return $this->belongsTo(Appointment::class, 'AppointmentId');
	}

	public function service()
	{
		return $this->belongsTo(Service::class, 'ServiceId');
	}

	public function user()
	{
		return $this->belongsTo(User::class, 'AssignedStaffId');
	}
}
