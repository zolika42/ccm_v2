<?php

declare(strict_types=1);

namespace ColumbiaGames\Api\Support;

final class SessionAuth
{
    public static function login(array $customer): void
    {
        $_SESSION['customer'] = [
            'customerid' => (int) ($customer['customerid'] ?? 0),
            'ship_email' => (string) ($customer['ship_email'] ?? ''),
            'ship_name' => (string) ($customer['ship_name'] ?? ''),
            'points' => (int) ($customer['points'] ?? 0),
        ];
    }

    public static function logout(): void
    {
        unset($_SESSION['customer']);
    }

    public static function user(): ?array
    {
        return isset($_SESSION['customer']) && is_array($_SESSION['customer'])
            ? $_SESSION['customer']
            : null;
    }
}
