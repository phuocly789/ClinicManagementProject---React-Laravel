<?php

use App\Http\Controllers\API\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/users', [UserController::class, 'index']);
Route::get('/ping', [UserController::class, 'ping']);
