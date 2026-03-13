<?php

declare(strict_types=1);

namespace ColumbiaGames\Api\Controllers;

use ColumbiaGames\Api\Services\AuthService;
use ColumbiaGames\Api\Support\JsonResponse;
use ColumbiaGames\Api\Support\Request;
use RuntimeException;

final class AuthController
{
    public function __construct(private readonly AuthService $auth)
    {
    }

    public function login(Request $request): void
    {
        $email = trim((string) ($request->body['email'] ?? ''));
        $password = (string) ($request->body['password'] ?? '');

        if ($email === '' || $password === '') {
            JsonResponse::error('Email and password are required.', 422);
        }

        try {
            $user = $this->auth->login($email, $password);
            JsonResponse::send(['ok' => true, 'user' => $user]);
        } catch (RuntimeException $e) {
            JsonResponse::error($e->getMessage(), 401);
        }
    }

    public function logout(Request $request): void
    {
        $this->auth->logout();
        JsonResponse::send(['ok' => true]);
    }

    public function me(Request $request): void
    {
        $user = $this->auth->me();
        if ($user === null) {
            JsonResponse::error('Not authenticated.', 401);
        }

        JsonResponse::send(['ok' => true, 'user' => $user]);
    }
}
