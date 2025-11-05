<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Class PrescriptionDetail
 * 
 * @property int $PrescriptionDetailId
 * @property int|null $PrescriptionId
 * @property int|null $MedicineId
 * @property int $Quantity
 * @property string|null $DosageInstruction
 * 
 * @property Prescription|null $prescription
 * @property Medicine|null $medicine
 *
 * @package App\Models
 */
class PrescriptionDetail extends Model
{
	protected $table = 'PrescriptionDetails';
	protected $primaryKey = 'PrescriptionDetailId';
	public $incrementing = true;
	public $timestamps = false;

	protected $casts = [
		'PrescriptionDetailId' => 'int',
		'PrescriptionId' => 'int',
		'MedicineId' => 'int',
		'Quantity' => 'int'
	];

	protected $fillable = [
		'PrescriptionId',
		'MedicineId',
		'Quantity',
		'DosageInstruction'
	];

	public function prescription()
	{
		return $this->belongsTo(Prescription::class, 'PrescriptionId');
	}

	public function medicine()
	{
		return $this->belongsTo(Medicine::class, 'MedicineId');
	}
}
