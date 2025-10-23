<?php

use Laravel\Passport\Http\Controllers\AccessTokenController;
use Illuminate\Support\Facades\Route;

Route::post('token', [AccessTokenController::class, 'issueToken'])
    ->middleware(['throttle']);
