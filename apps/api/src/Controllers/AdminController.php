<?php

declare(strict_types=1);

/**
 * @fileoverview Controller for merchant/admin parity endpoints: access, orders, config export/import, and product upload.
 */

namespace ColumbiaGames\Api\Controllers;

use ColumbiaGames\Api\Services\AdminService;
use ColumbiaGames\Api\Support\JsonResponse;
use ColumbiaGames\Api\Support\Request;
use RuntimeException;

final class AdminController
{
    public function __construct(private readonly AdminService $admin)
    {
    }

    public function access(Request $request): void
    {
        try {
            JsonResponse::success($this->admin->access(
                merchantId: $request->query['merchantId'] ?? null,
                configId: $request->query['configId'] ?? null,
            ));
        } catch (RuntimeException $e) {
            $this->handleRuntime($e);
        }
    }

    public function orders(Request $request): void
    {
        try {
            JsonResponse::success($this->admin->listOrders($request->query));
        } catch (RuntimeException $e) {
            $this->handleRuntime($e);
        }
    }

    public function orderDetail(Request $request, array $params): void
    {
        try {
            JsonResponse::success($this->admin->orderDetail(
                (string) ($params['orderId'] ?? ''),
                $request->query['merchantId'] ?? null,
                $request->query['configId'] ?? null,
            ));
        } catch (RuntimeException $e) {
            $this->handleRuntime($e);
        }
    }

    public function markOrder(Request $request, array $params): void
    {
        try {
            JsonResponse::success($this->admin->markOrder(
                orderId: (string) ($params['orderId'] ?? ''),
                merchantId: $request->body['merchantId'] ?? $request->query['merchantId'] ?? null,
                configId: $request->body['configId'] ?? $request->query['configId'] ?? null,
                action: (string) ($request->body['action'] ?? 'mark'),
                note: isset($request->body['note']) ? (string) $request->body['note'] : null,
            ));
        } catch (RuntimeException $e) {
            $this->handleRuntime($e);
        }
    }

    public function configInventory(Request $request): void
    {
        try {
            JsonResponse::success($this->admin->configInventory(
                $request->query['merchantId'] ?? null,
                $request->query['configId'] ?? null,
            ));
        } catch (RuntimeException $e) {
            $this->handleRuntime($e);
        }
    }

    public function exportConfig(Request $request): void
    {
        try {
            JsonResponse::success($this->admin->exportConfig(
                $request->query['merchantId'] ?? null,
                $request->query['configId'] ?? null,
            ));
        } catch (RuntimeException $e) {
            $this->handleRuntime($e);
        }
    }

    public function importConfig(Request $request): void
    {
        try {
            JsonResponse::success($this->admin->importConfig($request->body));
        } catch (RuntimeException $e) {
            $this->handleRuntime($e);
        }
    }

    public function productUploadSettings(Request $request): void
    {
        try {
            JsonResponse::success($this->admin->productUploadSettings(
                $request->query['merchantId'] ?? null,
                $request->query['configId'] ?? null,
            ));
        } catch (RuntimeException $e) {
            $this->handleRuntime($e);
        }
    }

    public function productUploadPreview(Request $request): void
    {
        try {
            JsonResponse::success($this->admin->previewProductUpload($request->body));
        } catch (RuntimeException $e) {
            $this->handleRuntime($e);
        }
    }

    public function productUploadApply(Request $request): void
    {
        try {
            JsonResponse::success($this->admin->applyProductUpload($request->body));
        } catch (RuntimeException $e) {
            $this->handleRuntime($e);
        }
    }

    private function handleRuntime(RuntimeException $e): never
    {
        $message = $e->getMessage();
        if ($message === 'Not authenticated.') {
            JsonResponse::error('unauthorized', $message, 401);
        }
        if (str_contains($message, 'not granted')) {
            JsonResponse::error('forbidden', $message, 403);
        }
        if (str_contains(strtolower($message), 'not found')) {
            JsonResponse::error('not_found', $message, 404);
        }
        JsonResponse::error('validation_error', $message, 422);
    }
}
