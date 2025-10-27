<?php

namespace App\Helpers;

class NumberHelper
{// Chuyển số nguyên (>=0) sang chữ tiếng Việt CÓ "đồng"
    public static function convertToWords($number): string
    {
        $number = (int) round($number);
        if ($number === 0)
            return 'không đồng';

        $units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ', 'tỷ tỷ'];
        $digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

        $readThree = function ($num) use ($digits) {
            $hundreds = intdiv($num, 100);
            $tens = intdiv($num % 100, 10);
            $ones = $num % 10;
            $part = '';

            if ($hundreds > 0) {
                $part .= $digits[$hundreds] . ' trăm';
                if ($tens == 0 && $ones > 0) {
                    $part .= ' linh';
                }
            }

            if ($tens > 1) {
                $part .= ($part ? ' ' : '') . $digits[$tens] . ' mươi';
                if ($ones == 1)
                    $part .= ' mốt';
                elseif ($ones == 4)
                    $part .= ' bốn';
                elseif ($ones == 5)
                    $part .= ' lăm';
                elseif ($ones > 1)
                    $part .= ' ' . $digits[$ones];
            } elseif ($tens == 1) {
                $part .= ($part ? ' ' : '') . 'mười';
                if ($ones == 1)
                    $part .= ' một';
                elseif ($ones == 5)
                    $part .= ' lăm';
                elseif ($ones > 1)
                    $part .= ' ' . $digits[$ones];
            } else { // tens == 0
                if ($ones > 0 && $hundreds == 0) {
                    $part .= ($part ? ' ' : '') . $digits[$ones];
                } elseif ($ones > 0) {
                    $part .= ($part ? ' ' : '') . $digits[$ones];
                }
            }

            return trim($part);
        };

        $parts = [];
        $unitIndex = 0;

        while ($number > 0) {
            $chunk = $number % 1000;
            if ($chunk > 0) {
                $parts[] = trim($readThree($chunk) . ' ' . ($units[$unitIndex] ?? ''));
            }
            $number = intdiv($number, 1000);
            $unitIndex++;
        }

        $result = trim(implode(' ', array_reverse($parts)));
        // Tối giản khoảng trắng dư thừa
        $result = preg_replace('/\s+/', ' ', $result);

        // THÊM "đồng" VÀO CUỐI
        return $result . ' đồng';
    }
}
