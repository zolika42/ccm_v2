<?php

declare(strict_types=1);

namespace ColumbiaGames\Api\Services;

use ColumbiaGames\Api\Repositories\CartRepository;
use ColumbiaGames\Api\Repositories\ProductRepository;
use RuntimeException;

final class CartService
{
    public function __construct(
        private readonly CartRepository $carts,
        private readonly ProductRepository $products,
    ) {
    }

    public function identity(?string $cookieValue): array
    {
        $browserId = $this->carts->resolveBrowserId($cookieValue);

        return [
            'identity' => $this->carts->getIdentity($browserId),
        ];
    }

    public function getCart(?string $cookieValue): array
    {
        $browserId = $this->carts->resolveBrowserId($cookieValue);

        return [
            'identity' => $this->carts->getIdentity($browserId),
            'cart' => $this->carts->getCart($browserId),
        ];
    }

    public function getSummary(?string $cookieValue): array
    {
        $payload = $this->getCart($cookieValue);

        return [
            'identity' => $payload['identity'],
            'summary' => $payload['cart']['summary'],
        ];
    }

    public function addItem(?string $cookieValue, string $productId, int $quantity): array
    {
        $this->ensureProductExists($productId);
        $browserId = $this->carts->resolveBrowserId($cookieValue);

        return [
            'identity' => $this->carts->getIdentity($browserId),
            'cart' => $this->carts->addItem($browserId, $productId, $quantity),
        ];
    }

    public function updateItem(?string $cookieValue, string $productId, int $quantity): array
    {
        if ($quantity > 0) {
            $this->ensureProductExists($productId);
        }

        $browserId = $this->carts->resolveBrowserId($cookieValue);

        return [
            'identity' => $this->carts->getIdentity($browserId),
            'cart' => $this->carts->updateItem($browserId, $productId, $quantity),
        ];
    }

    public function removeItem(?string $cookieValue, string $productId): array
    {
        $browserId = $this->carts->resolveBrowserId($cookieValue);

        return [
            'identity' => $this->carts->getIdentity($browserId),
            'cart' => $this->carts->removeItem($browserId, $productId),
        ];
    }

    private function ensureProductExists(string $productId): void
    {
        $product = $this->products->findById(trim($productId));
        if ($product === null) {
            throw new RuntimeException('Product not found.');
        }
    }
}
