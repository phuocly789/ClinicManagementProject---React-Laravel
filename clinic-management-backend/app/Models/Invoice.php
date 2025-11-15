<?php

/**
 * Created by Reliese Model.
 */

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Class Invoice
 * 
 * @property int $InvoiceId
 * @property int|null $AppointmentId
 * @property int|null $PatientId
 * @property float $TotalAmount
 * @property Carbon|null $InvoiceDate
 * @property string $Status
 * 
 * @property Appointment|null $appointment
 * @property Patient|null $patient
 * @property Collection|InvoiceDetail[] $invoice_details
 *
 * @package App\Models
 */
class Invoice extends Model
{
	protected $table = 'Invoices';
	protected $primaryKey = 'InvoiceId';
	public $incrementing = true;
	public $timestamps = false;

	protected $casts = [
		'InvoiceId' => 'int',
		'AppointmentId' => 'int',
		'PatientId' => 'int',
		'TotalAmount' => 'float',
		'InvoiceDate' => 'datetime',
		'Paidat' => 'datetime',
	];

	protected $fillable = [
		'AppointmentId',
		'PatientId',
		'TotalAmount',
		'InvoiceDate',
		'Status',
		'PaymentMethod',
		'OrderId',
		'TransactionId',
		'Paidat',
	];

	public function appointment()
	{
		return $this->belongsTo(Appointment::class, 'AppointmentId');
	}

	public function patient()
	{
		return $this->belongsTo(Patient::class, 'PatientId');
	}

	public function invoice_details()
	{
		return $this->hasMany(InvoiceDetail::class, 'InvoiceId');
	}
	// Helper method để lấy status đúng
	public static function getStatusOptions()
	{
		return [
			'pending' => 'Chờ thanh toán',
			'paid' => 'Đã thanh toán',
			'cancelled' => 'Đã hủy'
		];
	}
}
