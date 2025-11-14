<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Passport\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Class User
 *
 * @property int $UserId
 * @property string $Username
 * @property string $PasswordHash
 * @property string $FullName
 * @property string $Email
 * @property string|null $Phone
 * @property string|null $Gender
 * @property string|null $Address
 * @property Carbon|null $DateOfBirth
 * @property Carbon|null $CreatedAt
 * @property bool $MustChangePassword
 * @property string|null $CodeId
 * @property Carbon|null $CodeExpired
 * @property bool|null $IsActive
 *
 * @property Collection|Role[] $roles
 * @property MedicalStaff|null $medical_staff
 * @property Collection|MedicalRecord[] $medical_records
 * @property Collection|Notification[] $notifications
 * @property Collection|Appointment[] $appointments
 * @property Collection|Queue[] $queues
 * @property Patient|null $patient
 * @property Collection|ImportBill[] $import_bills
 *
 * @package App\Models
 */
class User extends Authenticatable
{
	use HasApiTokens, Notifiable;
	protected $table = 'Users';
	protected $primaryKey = 'UserId';
	public $incrementing = true;
	public $timestamps = false;

	protected $casts = [
		'UserId' => 'int',
		'Gender' => 'string',
		'DateOfBirth' => 'datetime',
		'CreatedAt' => 'datetime',
		'MustChangePassword' => 'bool',
		'CodeExpired' => 'datetime',
		'IsActive' => 'bool'
	];

	protected $fillable = [
		'Username',
		'PasswordHash',
		'FullName',
		'Email',
		'Phone',
		'Gender',
		'Address',
		'DateOfBirth',
		'CreatedAt',
		'MustChangePassword',
		'CodeId',
		'CodeExpired',
		'IsActive'
	];

	// middleware check role
	public function hasRole($roleName)
	{
		return $this->roles()->where('RoleName', $roleName)->exists();
	}
	/**
	 * Quan hệ: User có nhiều Role (Many-to-Many)
	 *
	 * @return BelongsToMany<\App\Models\Role>
	 */
	public function roles()
	{
		return $this->belongsToMany(Role::class, 'UserRoles', 'UserId', 'RoleId')
			->withPivot('AssignedAt');
	}

	public function medical_staff()
	{
		return $this->hasOne(MedicalStaff::class, 'StaffId');
	}

	public function medical_records()
	{
		return $this->hasMany(MedicalRecord::class, 'CreatedBy');
	}

	public function notifications()
	{
		return $this->hasMany(Notification::class, 'UserId');
	}

	public function appointments()
	{
		return $this->hasMany(Appointment::class, 'CreatedBy');
	}

	public function queues()
	{
		return $this->hasMany(Queue::class, 'CreatedBy');
	}

    public function patient()
    {
        return $this->hasOne(Patient::class, 'PatientId', 'UserId');
    }

	public function import_bills()
	{
		return $this->hasMany(ImportBill::class, 'CreatedBy');
	}
}
