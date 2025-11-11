<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Medicine
 * 
 * @property int $MedicineId
 * @property string $MedicineName
 * @property string|null $MedicineType
 * @property string $Unit
 * @property float $Price
 * @property int $StockQuantity
 * @property string|null $Description
 * 
 * @property Collection|ImportDetail[] $import_details
 * @property Collection|InvoiceDetail[] $invoice_details
 * @property Collection|PrescriptionDetail[] $prescription_details
 *
 * @package App\Models
 */
class Medicine extends Model
{
	protected $table = 'Medicines';
	protected $primaryKey = 'MedicineId';
	public $incrementing = false;
	public $timestamps = false;

	protected $casts = [
		'MedicineId' => 'int',
		'Price' => 'float',
		'StockQuantity' => 'int',
		'ExpiryDate' => 'date'
	];

	protected $fillable = [
		'MedicineName',
		'MedicineType',
		'Unit',
		'Price',
		'StockQuantity',
		'Description',
		'ExpiryDate',
		'LowStockThreshold'
	];

	public function import_details()
	{
		return $this->hasMany(ImportDetail::class, 'MedicineId');
	}

	public function invoice_details()
	{
		return $this->hasMany(InvoiceDetail::class, 'MedicineId');
	}

	public function prescription_details()
	{
		return $this->hasMany(PrescriptionDetail::class, 'MedicineId');
	}
}
