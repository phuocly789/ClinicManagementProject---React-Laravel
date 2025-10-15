<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Room
 * 
 * @property int $RoomId
 * @property string $RoomName
 * @property string|null $Description
 * @property bool|null $IsActive
 * 
 * @property Collection|Queue[] $queues
 *
 * @package App\Models
 */
class Room extends Model
{
	protected $table = 'Rooms';
	protected $primaryKey = 'RoomId';
	public $incrementing = false;
	public $timestamps = false;

	protected $casts = [
		'RoomId' => 'int',
		'IsActive' => 'bool'
	];

	protected $fillable = [
		'RoomName',
		'Description',
		'IsActive'
	];

	public function queues()
	{
		return $this->hasMany(Queue::class, 'RoomId');
	}
}
