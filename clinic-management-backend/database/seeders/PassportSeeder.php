<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Laravel\Passport\Client;

class PassportSeeder extends Seeder
{
    public function run(): void
    {
        // Tạo client cho password grant
        Client::create([
            'name' => 'Password Grant Client',
            'secret' => 'secret-password',
            'redirect' => 'http://125.212.218.44',
            'personal_access_client' => false,
            'password_client' => true,
            'revoked' => false,
        ]);

        // Tạo client cho personal access
        Client::create([
            'name' => 'Personal Access Client',
            'secret' => 'secret-personal',
            'redirect' => 'http://125.212.218.44',
            'personal_access_client' => true,
            'password_client' => false,
            'revoked' => false,
        ]);
    }
}
