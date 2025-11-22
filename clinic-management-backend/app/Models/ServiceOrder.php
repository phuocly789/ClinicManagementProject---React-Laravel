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
 * @property Carbon|null $completed_at  
 * @property Carbon|null $UpdatedAt     
 * 
 * @property Appointment|null $appointment
 * @property Service|null $service
 * @property MedicalStaff|null $medical_staff
 *
 * @package App\Models
 */
class ServiceOrder extends Model
{
	protected $table = 'ServiceOrders';
	protected $primaryKey = 'ServiceOrderId';
	public $incrementing = true;
	public $timestamps = false;

	protected $casts = [
		'ServiceOrderId' => 'int',
		'AppointmentId' => 'int',
		'ServiceId' => 'int',
		'AssignedStaffId' => 'int',
		'OrderDate' => 'datetime',
		'completed_at' => 'datetime', 
		'UpdatedAt' => 'datetime'
	];

	protected $fillable = [
		'AppointmentId',
		'ServiceId',
		'AssignedStaffId',
		'OrderDate',
		'Result',
		'Status',
		'completed_at',  
		'UpdatedAt'      
	];

	public function appointment()
	{
		return $this->belongsTo(Appointment::class, 'AppointmentId');
	}

	public function service()
	{
		return $this->belongsTo(Service::class, 'ServiceId');
	}

	public function medical_staff()
	{
		return $this->belongsTo(MedicalStaff::class, 'AssignedStaffId');
	}
}
