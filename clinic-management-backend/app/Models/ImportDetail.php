<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Class ImportDetail
 * 
 * @property int $ImportDetailId
 * @property int|null $ImportId
 * @property int|null $MedicineId
 * @property int $Quantity
 * @property float $ImportPrice
 * @property float|null $SubTotal
 * 
 * @property ImportBill|null $import_bill
 * @property Medicine|null $medicine
 *
 * @package App\Models
 */
class ImportDetail extends Model
{
	protected $table = 'ImportDetails';
    protected $primaryKey = 'ImportDetailId';
    protected $keyType = 'int';
    public $incrementing = true;
    public $timestamps = false;

	protected $casts = [
		'ImportDetailId' => 'int',
		'ImportId' => 'int',
		'MedicineId' => 'int',
		'Quantity' => 'int',
		'ImportPrice' => 'float',
		'SubTotal' => 'float'
	];

	protected $fillable = [
		'ImportId',
		'MedicineId',
		'Quantity',
		'ImportPrice',
		'SubTotal'
	];

	public function import_bill()
	{
		return $this->belongsTo(ImportBill::class, 'ImportId');
	}

	public function medicine()
	{
		return $this->belongsTo(Medicine::class, 'MedicineId');
	}
}
