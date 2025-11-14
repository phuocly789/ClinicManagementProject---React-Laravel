<?php

namespace App\Http\Controllers\API\Receptionist;

use App\Http\Controllers\Controller;
use App\Models\Room;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    //get all
    public function getAllRooms(){
        $rooms = Room::all();
        return response()->json([
            'success' => true,
            'data' => $rooms,
            'message' => 'Danh sách phòng được tải thành công.'
        ], 200);
    }
}
