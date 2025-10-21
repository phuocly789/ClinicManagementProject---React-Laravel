<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class ImportBill
 * 
 * @property int $ImportId
 * @property int|null $SupplierId
 * @property Carbon|null $ImportDate
 * @property float $TotalAmount
 * @property string|null $Notes
 * @property int|null $CreatedBy
 * 
 * @property Supplier|null $supplier
 * @property User|null $user
 * @property Collection|ImportDetail[] $import_details
 *
 * @package App\Models
 */
class ImportBill extends Model
{
	protected $table = 'ImportBills'; // Tên bảng, khớp với lược đồ PostgreSQL
    protected $primaryKey = 'ImportId'; // Khóa chính
    protected $keyType = 'int'; // Kiểu dữ liệu của khóa chính là integer
    public $incrementing = true; // Xác nhận rằng ImportId là cột tự tăng
    public $timestamps = false; // Không sử dụng timestamps nếu bảng không có created_at/updated_at

	protected $casts = [
		'ImportId' => 'int',
		'SupplierId' => 'int',
		'ImportDate' => 'datetime',
		'TotalAmount' => 'float',
		'CreatedBy' => 'int'
	];

	protected $fillable = [
		'SupplierId',
		'ImportDate',
		'TotalAmount',
		'Notes',
		'CreatedBy'
	];

	public function supplier()
	{
		return $this->belongsTo(Supplier::class, 'SupplierId');
	}

	public function user()
	{
		return $this->belongsTo(User::class, 'CreatedBy');
	}

	public function import_details()
	{
		return $this->hasMany(ImportDetail::class, 'ImportId');
	}
}
