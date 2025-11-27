<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('Notifications', function (Blueprint $table) {
            $table->timestamp('UpdatedAt')->nullable()->after('SentAt');
        });
    }

    public function down()
    {
        Schema::table('Notifications', function (Blueprint $table) {
            $table->dropColumn('UpdatedAt');
        });
    }
};
