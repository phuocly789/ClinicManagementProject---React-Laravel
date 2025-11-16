<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Class InvoiceDetail
 * 
 * @property int $InvoiceDetailId
 * @property int|null $InvoiceId
 * @property int|null $ServiceId
 * @property int|null $MedicineId
 * @property int $Quantity
 * @property float $UnitPrice
 * @property float|null $SubTotal
 * 
 * @property Invoice|null $invoice
 * @property Service|null $service
 * @property Medicine|null $medicine
 *
 * @package App\Models
 */
class InvoiceDetail extends Model
{
	protected $table = 'InvoiceDetails';
	protected $primaryKey = 'InvoiceDetailId';
	public $incrementing = true;
	public $timestamps = false;

	protected $casts = [
		'InvoiceDetailId' => 'int',
		'InvoiceId' => 'int',
		'ServiceId' => 'int',
		'MedicineId' => 'int',
		'Quantity' => 'int',
		'UnitPrice' => 'float',
		'SubTotal' => 'float'
	];

	protected $fillable = [
		'InvoiceId',
		'ServiceId',
		'MedicineId',
		'Quantity',
		'UnitPrice',
		'SubTotal'
	];

	public function invoice()
	{
		return $this->belongsTo(Invoice::class, 'InvoiceId');
	}

	public function service()
	{
		return $this->belongsTo(Service::class, 'ServiceId');
	}

	public function medicine()
	{
		return $this->belongsTo(Medicine::class, 'MedicineId');
	}
}
