<?php

declare(strict_types=1);

namespace ColumbiaGames\Api\Services;

use ColumbiaGames\Api\Repositories\CustomerRepository;
use ColumbiaGames\Api\Support\SessionAuth;
use RuntimeException;

final class AuthService
{
    public function __construct(private readonly CustomerRepository $customers)
    {
    }

    public function login(string $email, string $password): array
    {
        $customer = $this->customers->findByEmail($email);
        if ($customer === null) {
            throw new RuntimeException('Invalid credentials.');
        }

        $legacyPassword = (string) ($customer['customer_password'] ?? '');
        if ($legacyPassword !== $password) {
            throw new RuntimeException('Invalid credentials.');
        }

        SessionAuth::login($customer);
        return SessionAuth::user() ?? [];
    }

    public function logout(): void
    {
        SessionAuth::logout();
    }

    public function me(): ?array
    {
        $sessionUser = SessionAuth::user();
        if ($sessionUser === null) {
            return null;
        }

        $customer = $this->customers->findPublicProfileById((int) $sessionUser['customerid']);
        if ($customer === null) {
            SessionAuth::logout();
            return null;
        }

        return [
            'customerId' => (int) $customer['customerid'],
            'email' => (string) $customer['ship_email'],
            'name' => (string) ($customer['ship_name'] ?? ''),
            'points' => (int) ($customer['points'] ?? 0),
        ];
    }
}
