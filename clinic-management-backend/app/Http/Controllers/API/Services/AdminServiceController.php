<?php

namespace App\Http\Controllers\API\Services;
use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminServiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Service::query();
        
        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('type', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }
        
        // Filter by type
        if ($request->has('type') && $request->type) {
            $query->where('type', $request->type);
        }
        
        // Filter by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }
        
        // Pagination
        $perPage = $request->get('per_page', 10);
        $services = $query->orderBy('created_at', 'desc')->paginate($perPage);
        
        return response()->json([
            'data' => $services->items(),
            'current_page' => $services->currentPage(),
            'last_page' => $services->lastPage(),
            'total' => $services->total(),
            'per_page' => $services->perPage()
        ]);
    }
    
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:100',
            'price' => 'required|numeric|min:0',
            'description' => 'required|string',
            'status' => 'sometimes|string|in:active,inactive'
        ]);
        
        $service = Service::create($validated);
        
        return response()->json([
            'message' => 'Service created successfully',
            'data' => $service
        ], 201);
    }
    
    public function update(Request $request, $id): JsonResponse
    {
        $service = Service::findOrFail($id);
        
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|string|max:100',
            'price' => 'sometimes|numeric|min:0',
            'description' => 'sometimes|string',
            'status' => 'sometimes|string|in:active,inactive'
        ]);
        
        $service->update($validated);
        
        return response()->json([
            'message' => 'Service updated successfully',
            'data' => $service
        ]);
    }
    
    public function destroy($id): JsonResponse
    {
        $service = Service::findOrFail($id);
        $service->delete();
        
        return response()->json([
            'message' => 'Service deleted successfully'
        ]);
    }
    
    public function getServiceTypes(): JsonResponse
    {
        $types = Service::distinct()->pluck('type')->map(function($type) {
            return ['id' => $type, 'name' => $type];
        });
        
        return response()->json([
            'data' => $types
        ]);
    }
}