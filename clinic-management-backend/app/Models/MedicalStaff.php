<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Class MedicalStaff
 * 
 * @property int $StaffId
 * @property string $StaffType
 * @property string|null $Specialty
 * @property string|null $LicenseNumber
 * @property string|null $Bio
 * 
 * @property User $user
 *
 * @package App\Models
 */
class MedicalStaff extends Model
{
	protected $table = 'MedicalStaff';
	protected $primaryKey = 'StaffId';
	public $incrementing = false;
	public $timestamps = false;

	protected $casts = [
		'StaffId' => 'int'
	];

	protected $fillable = [
		'StaffType',
		'Specialty',
		'LicenseNumber',
		'Bio'
	];

	public function user()
	{
		return $this->belongsTo(User::class, 'StaffId');
	}
}
