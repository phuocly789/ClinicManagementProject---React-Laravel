<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medicine_id')->constrained()->onDelete('cascade');
            $table->enum('type', ['low_stock', 'expiring_soon', 'expired']);
            $table->text('message');
            $table->boolean('is_read')->default(false);
            $table->boolean('email_sent')->default(false);
            $table->timestamp('triggered_at')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alerts');
    }
};
