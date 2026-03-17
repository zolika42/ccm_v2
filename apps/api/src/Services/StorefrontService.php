<?php

declare(strict_types=1);

/**
 * @fileoverview Public/admin storefront theme service: reads the active backend-driven template style and lets admins switch it.
 */

namespace ColumbiaGames\Api\Services;

use ColumbiaGames\Api\Repositories\AdminRepository;
use ColumbiaGames\Api\Support\SessionAuth;
use RuntimeException;

final class StorefrontService
{
    public function __construct(private readonly AdminRepository $adminRepository)
    {
    }

    public function theme(?string $merchantId = null, ?string $configId = null): array
    {
        return $this->adminRepository->getStorefrontThemeConfig($merchantId, $configId);
    }

    public function updateTheme(array $payload): array
    {
        $scope = $this->requireScope($payload['merchantId'] ?? null, $payload['configId'] ?? null);
        $theme = trim((string) ($payload['theme'] ?? ''));
        if ($theme === '') {
            throw new RuntimeException('Theme is required.');
        }

        return $this->adminRepository->updateStorefrontTheme($scope, $theme);
    }

    private function requireUser(): array
    {
        $user = SessionAuth::user();
        if ($user === null) {
            throw new RuntimeException('Not authenticated.');
        }
        return $user;
    }

    private function requireScope(?string $merchantId, ?string $configId): array
    {
        $user = $this->requireUser();
        $scope = $this->adminRepository->resolveScopeForCustomer((int) $user['customerid'], $merchantId, $configId);
        if ($scope === null) {
            throw new RuntimeException('Admin access is not granted for the requested merchant/config scope.');
        }
        return $scope;
    }
}
