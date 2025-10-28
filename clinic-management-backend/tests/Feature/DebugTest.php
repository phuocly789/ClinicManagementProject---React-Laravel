<?php

namespace Tests\Feature;

use Tests\TestCase;

class DebugTest extends TestCase
{
    public function test_simple_addition()
    {
        $a = 5; // Đặt breakpoint ở đây
        $b = 10;
        $sum = $a + $b;

        $this->assertEquals(15, $sum); // Kiểm tra kết quả
    }
}
