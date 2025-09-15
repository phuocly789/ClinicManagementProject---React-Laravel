<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Role
 * 
 * @property int $RoleId
 * @property string $RoleName
 * @property string|null $Description
 * 
 * @property Collection|User[] $users
 *
 * @package App\Models
 */
class Role extends Model
{
	protected $table = 'Roles';
	protected $primaryKey = 'RoleId';
	public $incrementing = false;
	public $timestamps = false;

	protected $casts = [
		'RoleId' => 'int'
	];

	protected $fillable = [
		'RoleName',
		'Description'
	];

	public function users()
	{
		return $this->belongsToMany(User::class, 'UserRoles', 'RoleId', 'UserId')
					->withPivot('AssignedAt');
	}
}
