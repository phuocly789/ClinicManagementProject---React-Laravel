<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Notification
 *
 * @property int $NotificationId
 * @property int|null $UserId
 * @property int|null $AppointmentId
 * @property string|null $Message
 * @property string|null $Type
 * @property Carbon|null $SentAt
 * @property string|null $Status
 *
 * @property User|null $user
 * @property Appointment|null $appointment
 *
 * @package App\Models
 */
class Notification extends Model
{
	protected $table = 'Notifications';
	protected $primaryKey = 'NotificationId';
	public $incrementing = false;
	public $timestamps = true;
    const UPDATED_AT = 'UpdatedAt';
	protected $casts = [
		'NotificationId' => 'int',
		'UserId' => 'int',
		'AppointmentId' => 'int',
		'SentAt' => 'datetime'
	];

	protected $fillable = [
		'UserId',
		'AppointmentId',
		'Message',
		'Type',
		'SentAt',
		'Status',
        'UpdatedAt'
	];

	public function user()
	{
		return $this->belongsTo(User::class, 'UserId');
	}

	public function appointment()
	{
		return $this->belongsTo(Appointment::class, 'AppointmentId');
	}
}
