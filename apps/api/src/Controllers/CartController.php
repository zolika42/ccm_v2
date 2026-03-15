<?php

declare(strict_types=1);

namespace ColumbiaGames\Api\Controllers;

use ColumbiaGames\Api\Services\CartService;
use ColumbiaGames\Api\Support\CookieBridge;
use ColumbiaGames\Api\Support\JsonResponse;
use ColumbiaGames\Api\Support\Request;
use RuntimeException;

final class CartController
{
    public function __construct(private readonly CartService $cart)
    {
    }

    public function identity(Request $request): void
    {
        $payload = $this->cart->identity(CookieBridge::currentBrowserId());
        CookieBridge::persistBrowserId($payload['identity']['browserId']);

        JsonResponse::send([
            'ok' => true,
            'data' => $payload['identity'],
        ]);
    }

    public function show(Request $request): void
    {
        $payload = $this->cart->getCart(CookieBridge::currentBrowserId());
        CookieBridge::persistBrowserId($payload['identity']['browserId']);

        JsonResponse::send([
            'ok' => true,
            'identity' => $payload['identity'],
            'data' => $payload['cart'],
        ]);
    }

    public function summary(Request $request): void
    {
        $payload = $this->cart->getSummary(CookieBridge::currentBrowserId());
        CookieBridge::persistBrowserId($payload['identity']['browserId']);

        JsonResponse::send([
            'ok' => true,
            'identity' => $payload['identity'],
            'data' => $payload['summary'],
        ]);
    }

    public function addItem(Request $request): void
    {
        $productId = trim((string) ($request->body['productId'] ?? ''));
        $quantity = (int) ($request->body['quantity'] ?? 1);

        if ($productId === '') {
            JsonResponse::error('Product ID is required.', 422);
        }
        if ($quantity < 1) {
            JsonResponse::error('Quantity must be at least 1.', 422);
        }

        try {
            $payload = $this->cart->addItem(CookieBridge::currentBrowserId(), $productId, $quantity);
            CookieBridge::persistBrowserId($payload['identity']['browserId']);
            JsonResponse::send([
                'ok' => true,
                'identity' => $payload['identity'],
                'data' => $payload['cart'],
            ]);
        } catch (RuntimeException $e) {
            JsonResponse::error($e->getMessage(), 422);
        }
    }

    public function updateItem(Request $request, array $params): void
    {
        $productId = trim((string) ($params['productId'] ?? ''));
        $quantity = (int) ($request->body['quantity'] ?? 0);

        if ($productId === '') {
            JsonResponse::error('Product ID is required.', 422);
        }

        try {
            $payload = $this->cart->updateItem(CookieBridge::currentBrowserId(), $productId, $quantity);
            CookieBridge::persistBrowserId($payload['identity']['browserId']);
            JsonResponse::send([
                'ok' => true,
                'identity' => $payload['identity'],
                'data' => $payload['cart'],
            ]);
        } catch (RuntimeException $e) {
            JsonResponse::error($e->getMessage(), 422);
        }
    }

    public function removeItem(Request $request, array $params): void
    {
        $productId = trim((string) ($params['productId'] ?? ''));
        if ($productId === '') {
            JsonResponse::error('Product ID is required.', 422);
        }

        $payload = $this->cart->removeItem(CookieBridge::currentBrowserId(), $productId);
        CookieBridge::persistBrowserId($payload['identity']['browserId']);
        JsonResponse::send([
            'ok' => true,
            'identity' => $payload['identity'],
            'data' => $payload['cart'],
        ]);
    }
}
