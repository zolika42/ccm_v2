<?php

declare(strict_types=1);

/**
 * @fileoverview Controller for login/logout/session lookup endpoints. Keeps HTTP validation separate from auth business rules.
 */

namespace ColumbiaGames\Api\Controllers;

use ColumbiaGames\Api\Services\AuthService;
use ColumbiaGames\Api\Support\CookieBridge;
use ColumbiaGames\Api\Support\JsonResponse;
use ColumbiaGames\Api\Support\Request;
use DomainException;
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
        $rememberMe = filter_var($request->body['rememberMe'] ?? false, FILTER_VALIDATE_BOOL);

        if ($email === '' || $password === '') {
            JsonResponse::error('validation_error', 'Email and password are required.', 422, [
                'fields' => ['email', 'password'],
            ]);
        }

        try {
            $user = $this->auth->login($email, $password, $rememberMe, CookieBridge::currentBrowserId());
            JsonResponse::success(['user' => $user]);
        } catch (RuntimeException $e) {
            JsonResponse::error('unauthorized', $e->getMessage(), 401);
        }
    }

    public function register(Request $request): void
    {
        $payload = [
            'email' => trim((string) ($request->body['email'] ?? '')),
            'name' => trim((string) ($request->body['name'] ?? '')),
            'password' => (string) ($request->body['password'] ?? ''),
            'shipPhone' => trim((string) ($request->body['shipPhone'] ?? '')),
            'shipStreet' => trim((string) ($request->body['shipStreet'] ?? '')),
            'shipStreet2' => trim((string) ($request->body['shipStreet2'] ?? '')),
            'shipCity' => trim((string) ($request->body['shipCity'] ?? '')),
            'shipState' => trim((string) ($request->body['shipState'] ?? '')),
            'shipZip' => trim((string) ($request->body['shipZip'] ?? '')),
            'shipCountry' => trim((string) ($request->body['shipCountry'] ?? '')),
            'billName' => trim((string) ($request->body['billName'] ?? '')),
            'billStreet' => trim((string) ($request->body['billStreet'] ?? '')),
            'billStreet2' => trim((string) ($request->body['billStreet2'] ?? '')),
            'billCity' => trim((string) ($request->body['billCity'] ?? '')),
            'billState' => trim((string) ($request->body['billState'] ?? '')),
            'billZip' => trim((string) ($request->body['billZip'] ?? '')),
            'billCountry' => trim((string) ($request->body['billCountry'] ?? '')),
        ];
        $rememberMe = filter_var($request->body['rememberMe'] ?? false, FILTER_VALIDATE_BOOL);

        $errors = [];
        if ($payload['email'] === '') {
            $errors['email'][] = 'Email is required.';
        } elseif (filter_var($payload['email'], FILTER_VALIDATE_EMAIL) === false) {
            $errors['email'][] = 'Email must be valid.';
        }
        if ($payload['password'] === '') {
            $errors['password'][] = 'Password is required.';
        }

        if ($errors !== []) {
            JsonResponse::error('validation_error', 'Registration payload is invalid.', 422, ['fields' => $errors]);
        }

        try {
            $user = $this->auth->register($payload, $rememberMe, CookieBridge::currentBrowserId());
            JsonResponse::success(['user' => $user], 201);
        } catch (DomainException $e) {
            JsonResponse::error('conflict', $e->getMessage(), 409);
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

    public function updateProfile(Request $request): void
    {
        $payload = [
            'email' => trim((string) ($request->body['email'] ?? '')),
            'name' => trim((string) ($request->body['name'] ?? '')),
            'shipPhone' => trim((string) ($request->body['shipPhone'] ?? '')),
            'shipStreet' => trim((string) ($request->body['shipStreet'] ?? '')),
            'shipStreet2' => trim((string) ($request->body['shipStreet2'] ?? '')),
            'shipCity' => trim((string) ($request->body['shipCity'] ?? '')),
            'shipState' => trim((string) ($request->body['shipState'] ?? '')),
            'shipZip' => trim((string) ($request->body['shipZip'] ?? '')),
            'shipCountry' => trim((string) ($request->body['shipCountry'] ?? '')),
            'billName' => trim((string) ($request->body['billName'] ?? '')),
            'billStreet' => trim((string) ($request->body['billStreet'] ?? '')),
            'billStreet2' => trim((string) ($request->body['billStreet2'] ?? '')),
            'billCity' => trim((string) ($request->body['billCity'] ?? '')),
            'billState' => trim((string) ($request->body['billState'] ?? '')),
            'billZip' => trim((string) ($request->body['billZip'] ?? '')),
            'billCountry' => trim((string) ($request->body['billCountry'] ?? '')),
            'payCardType' => trim((string) ($request->body['payCardType'] ?? '')),
            'payCardMonth' => trim((string) ($request->body['payCardMonth'] ?? '')),
            'payCardYear' => trim((string) ($request->body['payCardYear'] ?? '')),
            'payCardName' => trim((string) ($request->body['payCardName'] ?? '')),
            'payCardLast4' => trim((string) ($request->body['payCardLast4'] ?? '')),
        ];

        $errors = [];
        if ($payload['email'] === '') {
            $errors['email'][] = 'Email is required.';
        } elseif (filter_var($payload['email'], FILTER_VALIDATE_EMAIL) === false) {
            $errors['email'][] = 'Email must be valid.';
        }
        if ($errors !== []) {
            JsonResponse::error('validation_error', 'Profile payload is invalid.', 422, ['fields' => $errors]);
        }

        try {
            $user = $this->auth->updateProfile($payload);
            JsonResponse::success(['user' => $user]);
        } catch (DomainException $e) {
            JsonResponse::error('conflict', $e->getMessage(), 409);
        } catch (RuntimeException $e) {
            JsonResponse::error('unauthorized', $e->getMessage(), 401);
        }
    }

    public function changePassword(Request $request): void
    {
        $currentPassword = (string) ($request->body['currentPassword'] ?? '');
        $newPassword = (string) ($request->body['newPassword'] ?? '');

        $errors = [];
        if ($currentPassword === '') {
            $errors['currentPassword'][] = 'Current password is required.';
        }
        if ($newPassword === '') {
            $errors['newPassword'][] = 'New password is required.';
        }
        if ($errors !== []) {
            JsonResponse::error('validation_error', 'Password reset payload is invalid.', 422, ['fields' => $errors]);
        }

        try {
            $this->auth->changePassword($currentPassword, $newPassword);
            JsonResponse::success([
                'changed' => true,
                'recoveryPolicy' => [
                    'legacyForgotPasswordAvailable' => false,
                    'emailDependencyVerified' => false,
                    'implementedPath' => 'authenticated-password-reset',
                ],
            ]);
        } catch (RuntimeException $e) {
            JsonResponse::error('unauthorized', $e->getMessage(), 401);
        }
    }

    public function passwordRecoveryPolicy(Request $request): void
    {
        JsonResponse::success([
            'policy' => [
                'legacyForgotPasswordAvailable' => false,
                'emailDependencyVerified' => false,
                'passwordStorage' => 'legacy-plaintext-column-customer_password',
                'implementedPath' => 'authenticated-password-reset',
                'notes' => [
                    'The rewrite does not ship an email-based recovery flow because the legacy entrypoint and mail dependency are not verified in the checked-in project assets.',
                    'A logged-in customer can rotate the legacy password via /auth/password/reset.',
                ],
            ],
        ]);
    }
}
