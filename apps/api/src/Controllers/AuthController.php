<?php

declare(strict_types=1);

/**
 * @fileoverview Controller for login/logout/session lookup endpoints. Keeps HTTP validation separate from auth business rules.
 */

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
            JsonResponse::error('validation_error', 'Email and password are required.', 422, [
                'fields' => ['email', 'password'],
            ]);
        }

        try {
            $user = $this->auth->login($email, $password);
            JsonResponse::success(['user' => $user]);
        } catch (RuntimeException $e) {
            JsonResponse::error('unauthorized', $e->getMessage(), 401);
        }
    }

    public function logout(Request $request): void
    {
        $this->auth->logout();
        JsonResponse::success(['loggedOut' => true]);
    }

    public function me(Request $request): void
    {
        $user = $this->auth->me();
        if ($user === null) {
            JsonResponse::error('unauthorized', 'Not authenticated.', 401);
        }

        JsonResponse::success(['user' => $user]);
    }
}
