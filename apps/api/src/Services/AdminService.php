<?php

declare(strict_types=1);

/**
 * @fileoverview Admin/merchant application service: session-aware access gating over merchant parity operations.
 */

namespace ColumbiaGames\Api\Services;

use ColumbiaGames\Api\Repositories\AdminRepository;
use ColumbiaGames\Api\Support\SessionAuth;
use RuntimeException;

final class AdminService
{
    public function __construct(private readonly AdminRepository $adminRepository)
    {
    }

    public function access(?string $merchantId = null, ?string $configId = null): array
    {
        $user = $this->requireUser();
        $scopes = $this->adminRepository->listScopesForCustomer((int) $user['customerid']);
        $resolved = $this->adminRepository->resolveScopeForCustomer((int) $user['customerid'], $merchantId, $configId);

        return [
            'user' => [
                'customerId' => (int) ($user['customerid'] ?? 0),
                'email' => (string) ($user['ship_email'] ?? ''),
                'name' => (string) ($user['ship_name'] ?? ''),
            ],
            'isAdmin' => $scopes !== [],
            'defaultScope' => $resolved,
            'scopes' => $scopes,
        ];
    }

    public function listOrders(array $filters): array
    {
        $scope = $this->requireScope($filters['merchantId'] ?? null, $filters['configId'] ?? null);
        return [
            'scope' => $scope,
            'orders' => $this->adminRepository->listOrders($scope, $filters),
        ];
    }

    public function orderDetail(string $orderId, ?string $merchantId = null, ?string $configId = null): array
    {
        $scope = $this->requireScope($merchantId, $configId);
        $detail = $this->adminRepository->findOrderDetail($scope, $orderId);
        if ($detail === null) {
            throw new RuntimeException('Order not found.');
        }

        return [
            'scope' => $scope,
            'order' => $detail,
        ];
    }

    public function markOrder(string $orderId, ?string $merchantId, ?string $configId, string $action = 'mark', ?string $note = null): array
    {
        $scope = $this->requireScope($merchantId, $configId);
        $user = $this->requireUser();
        return [
            'scope' => $scope,
            'mark' => $this->adminRepository->markOrder($scope, $orderId, (int) $user['customerid'], $action, $note),
        ];
    }

    public function configInventory(?string $merchantId = null, ?string $configId = null): array
    {
        $scope = $this->requireScope($merchantId, $configId);
        return $this->adminRepository->configInventory($scope);
    }

    public function exportConfig(?string $merchantId = null, ?string $configId = null): array
    {
        $scope = $this->requireScope($merchantId, $configId);
        return $this->adminRepository->exportConfigBundle($scope);
    }

    public function importConfig(array $payload): array
    {
        $scope = $this->requireScope($payload['merchantId'] ?? null, $payload['configId'] ?? null);
        $bundle = is_array($payload['bundle'] ?? null) ? $payload['bundle'] : [];
        if ($bundle === []) {
            throw new RuntimeException('Config import bundle is required.');
        }
        $user = $this->requireUser();
        return $this->adminRepository->importConfigBundle($scope, $bundle, (int) $user['customerid']);
    }

    public function productUploadSettings(?string $merchantId = null, ?string $configId = null): array
    {
        $scope = $this->requireScope($merchantId, $configId);
        return $this->adminRepository->productUploadSettings($scope);
    }

    public function previewProductUpload(array $payload): array
    {
        $scope = $this->requireScope($payload['merchantId'] ?? null, $payload['configId'] ?? null);
        return $this->adminRepository->previewProductUpload(
            $scope,
            (string) ($payload['content'] ?? ''),
            is_array($payload['fieldNames'] ?? null) ? $payload['fieldNames'] : null,
            array_key_exists('hasHeaderRow', $payload) ? (bool) $payload['hasHeaderRow'] : null,
        );
    }

    public function applyProductUpload(array $payload): array
    {
        $scope = $this->requireScope($payload['merchantId'] ?? null, $payload['configId'] ?? null);
        $user = $this->requireUser();
        return $this->adminRepository->applyProductUpload(
            $scope,
            (string) ($payload['content'] ?? ''),
            is_array($payload['fieldNames'] ?? null) ? $payload['fieldNames'] : null,
            array_key_exists('hasHeaderRow', $payload) ? (bool) $payload['hasHeaderRow'] : null,
            (int) $user['customerid'],
        );
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
