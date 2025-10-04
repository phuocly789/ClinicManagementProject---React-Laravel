<?php
namespace App\Http\Controllers\API;
use App\Http\Controllers\Controller;
use App\Models\Medicine;
use Illuminate\Http\Request;
// use OpenApi\Annotations as OA;
class MedicinesController extends Controller
{

    public function index()
    {
        return response()->json(Medicine::all());
    }

    public function ping()
    {
        return response()->json(['message' => 'pong']);
    }
}
