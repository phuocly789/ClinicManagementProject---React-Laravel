<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

/**
 * Class UserRole
 *
 * @property int $UserId
 * @property int $RoleId
 * @property Carbon|null $AssignedAt
 *
 * @property User $user
 * @property Role $role
 *
 * @package App\Models
 */
class UserRole extends Model
{
	protected $table = 'UserRoles';
	protected $primaryKey = ['UserId', 'RoleId'];
	public $incrementing = false;
	public $timestamps = false;
	protected $keyType = 'int';

	protected $casts = [
		'UserId' => 'int',
		'RoleId' => 'int',
		'AssignedAt' => 'datetime'
	];

	protected $fillable = [
		'AssignedAt'
	];

	public function user()
	{
		return $this->belongsTo(User::class, 'UserId');
	}

	public function role()
	{
		return $this->belongsTo(Role::class, 'RoleId');
	}

}