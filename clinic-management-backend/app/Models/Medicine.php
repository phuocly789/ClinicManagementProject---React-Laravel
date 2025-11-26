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
 * @property string|null $Unit
 * @property float $Price
 * @property int $StockQuantity
 * @property string|null $Description
 *
 * @property Collection|PrescriptionDetail[] $prescription_details
 * @property Collection|InvoiceDetail[] $invoice_details
 * @property Collection|ImportDetail[] $import_details
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
		'Unit' => 'string',
		'Price' => 'float',
		'StockQuantity' => 'int',
		'ExpiryDate' => 'date',
		'version' => 'int',
	];

	protected $fillable = [
		'MedicineName',
		'MedicineType',
		'Unit',
		'Price',
		'StockQuantity',
		'Description',
		'ExpiryDate',
		'LowStockThreshold',
		'version',
	];

	public function prescription_details()
	{
		return $this->hasMany(PrescriptionDetail::class, 'MedicineId');
	}

	public function invoice_details()
	{
		return $this->hasMany(InvoiceDetail::class, 'MedicineId');
	}

	public function import_details()
	{
		return $this->hasMany(ImportDetail::class, 'MedicineId');
	}

	public function alerts()
	{
		return $this->hasMany(Alert::class, 'medicine_id', 'MedicineId');
	}
}
