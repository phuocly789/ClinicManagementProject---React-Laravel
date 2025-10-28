<?php

use App\Http\Controllers\API\UserController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\MedicinesController;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/users', [UserController::class, 'index']);
Route::get('/ping', [UserController::class, 'ping']);
Route::get('/test', [MedicinesController::class, 'test_simple_addition']);
