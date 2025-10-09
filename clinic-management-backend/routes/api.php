<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\MedicinesController;
use App\Http\Controllers\API\UserController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::get('/users', [UserController::class, 'index']);
Route::get('/ping', [UserController::class, 'ping']);

Route::get('/medicines', [MedicinesController::class, 'index']);
Route::get('/medicines/ping', [MedicinesController::class, 'ping']);
Route::post('/medicines', [MedicinesController::class, 'store']);
Route::put('/medicines/{id}', [MedicinesController::class, 'update']);
Route::delete('/medicines/{id}', [MedicinesController::class, 'destroy']);