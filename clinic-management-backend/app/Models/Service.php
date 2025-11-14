<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Service
 *
 * @property int $ServiceId
 * @property string $ServiceName
 * @property string|null $ServiceType
 * @property float $Price
 * @property string|null $Description
 *
 * @property Collection|ServiceOrder[] $service_orders
 * @property Collection|InvoiceDetail[] $invoice_details
 *
 * @package App\Models
 */
class Service extends Model
{
	protected $table = 'Services';
	protected $primaryKey = 'ServiceId';
	public $incrementing = true;
	public $timestamps = false;

	protected $casts = [
		'ServiceId' => 'int',
		'ServiceType' => 'string',
		'Price' => 'float'
	];

	protected $fillable = [
		'ServiceName',
		'ServiceType',
		'Price',
		'Description'
	];

	public function service_orders()
	{
		return $this->hasMany(ServiceOrder::class, 'ServiceId');
	}

	public function invoice_details()
	{
		return $this->hasMany(InvoiceDetail::class, 'ServiceId');
	}
}
