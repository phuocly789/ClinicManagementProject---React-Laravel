<?php

use App\Events\TestEvent;
use App\Http\Controllers\API\UserController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\MedicinesController;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/users', [UserController::class, 'index']);
Route::get('/ping', [UserController::class, 'ping']);
Route::get('/test', [MedicinesController::class, 'test_simple_addition']);
// Route::get('/test-broadcast', function () {
//     broadcast(new TestEvent());
//     return 'Đã gửi event TestEvent ✅';
// });