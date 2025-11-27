<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Supplier
 *
 * @property int $SupplierId
 * @property string $SupplierName
 * @property string|null $ContactEmail
 * @property string|null $ContactPhone
 * @property string|null $Address
 * @property string|null $Description
 *
 * @property Collection|ImportBill[] $import_bills
 *
 * @package App\Models
 */
class Supplier extends Model
{
	protected $table = 'Suppliers';
	protected $primaryKey = 'SupplierId';
	public $incrementing = true;
	public $timestamps = false;

	protected $casts = [
		'SupplierId' => 'int',
		'version' => 'integer',
	];

	protected $fillable = [
		'SupplierName',
		'ContactEmail',
		'ContactPhone',
		'Address',
		'Description',
		'version',
	];

	public function import_bills()
	{
		return $this->hasMany(ImportBill::class, 'SupplierId');
	}
}
