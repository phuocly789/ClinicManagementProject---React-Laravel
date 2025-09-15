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
 * @property User|null $user
 * @property Collection|InvoiceDetail[] $invoice_details
 *
 * @package App\Models
 */
class Invoice extends Model
{
	protected $table = 'Invoices';
	protected $primaryKey = 'InvoiceId';
	public $incrementing = false;
	public $timestamps = false;

	protected $casts = [
		'InvoiceId' => 'int',
		'AppointmentId' => 'int',
		'PatientId' => 'int',
		'TotalAmount' => 'float',
		'InvoiceDate' => 'datetime'
	];

	protected $fillable = [
		'AppointmentId',
		'PatientId',
		'TotalAmount',
		'InvoiceDate',
		'Status'
	];

	public function appointment()
	{
		return $this->belongsTo(Appointment::class, 'AppointmentId');
	}

	public function user()
	{
		return $this->belongsTo(User::class, 'PatientId');
	}

	public function invoice_details()
	{
		return $this->hasMany(InvoiceDetail::class, 'InvoiceId');
	}
}
