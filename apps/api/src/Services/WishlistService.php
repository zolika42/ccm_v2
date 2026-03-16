<?php

declare(strict_types=1);

/**
 * @fileoverview Authenticated wishlist application service for read-model, add/replace mutations, and post-purchase sync.
 */

namespace ColumbiaGames\Api\Services;

use ColumbiaGames\Api\Repositories\ProductRepository;
use ColumbiaGames\Api\Repositories\WishlistRepository;
use ColumbiaGames\Api\Support\ApiLogger;
use ColumbiaGames\Api\Support\SessionAuth;
use RuntimeException;

final class WishlistService
{
    public function __construct(
        private readonly WishlistRepository $wishlists,
        private readonly ProductRepository $products,
    ) {
    }

    public function summary(): array
    {
        $customerId = $this->requireAuthenticatedCustomerId();
        $wishlist = $this->wishlists->summary($customerId);
        if ($wishlist === null) {
            throw new RuntimeException('Authenticated customer profile was not found.');
        }

        return $wishlist;
    }

    public function add(array $input): array
    {
        $customerId = $this->requireAuthenticatedCustomerId();
        $productId = trim((string) ($input['productId'] ?? ''));
        $quantity = max(1, min(999, (int) ($input['quantity'] ?? 1)));

        $product = $this->assertProductExists($productId);
        $this->wishlists->addItem($customerId, $productId, $quantity);
        ApiLogger::info('wishlist_item_added', [
            'customerId' => $customerId,
            'productId' => $productId,
            'quantity' => $quantity,
        ]);

        $wishlist = $this->summary();
        $wishlist['lastMutation'] = [
            'action' => 'add',
            'productId' => $productId,
            'quantity' => $quantity,
            'productDescription' => (string) ($product['description'] ?? ''),
        ];

        return $wishlist;
    }

    public function replace(string $productId, array $input): array
    {
        $customerId = $this->requireAuthenticatedCustomerId();
        $normalizedProductId = trim($productId);
        $quantity = max(0, min(999, (int) ($input['quantity'] ?? 0)));

        $product = $this->assertProductExists($normalizedProductId);
        $this->wishlists->replaceItem($customerId, $normalizedProductId, $quantity);
        ApiLogger::info('wishlist_item_replaced', [
            'customerId' => $customerId,
            'productId' => $normalizedProductId,
            'quantity' => $quantity,
        ]);

        $wishlist = $this->summary();
        $wishlist['lastMutation'] = [
            'action' => 'replace',
            'productId' => $normalizedProductId,
            'quantity' => $quantity,
            'productDescription' => (string) ($product['description'] ?? ''),
        ];

        return $wishlist;
    }

    public function remove(string $productId): array
    {
        $customerId = $this->requireAuthenticatedCustomerId();
        $normalizedProductId = trim($productId);
        if ($normalizedProductId === '') {
            throw new RuntimeException('Product ID is required.');
        }

        $this->wishlists->removeItem($customerId, $normalizedProductId);
        ApiLogger::info('wishlist_item_removed', [
            'customerId' => $customerId,
            'productId' => $normalizedProductId,
        ]);

        $wishlist = $this->summary();
        $wishlist['lastMutation'] = [
            'action' => 'remove',
            'productId' => $normalizedProductId,
            'quantity' => 0,
        ];

        return $wishlist;
    }

    /**
     * @param array<int, array{productId:string, quantity:int}> $purchasedItems
     * @return array<string,mixed>
     */
    public function syncPurchasedItems(int $customerId, array $purchasedItems): array
    {
        $sideEffect = $this->wishlists->syncPurchasedItems($customerId, $purchasedItems);
        ApiLogger::info('wishlist_post_purchase_sync', [
            'customerId' => $customerId,
            'updatedItems' => $sideEffect['updatedItems'] ?? [],
            'removedProductIds' => $sideEffect['removedProductIds'] ?? [],
        ]);

        return $sideEffect;
    }

    private function requireAuthenticatedCustomerId(): int
    {
        $user = SessionAuth::user();
        if ($user === null) {
            throw new RuntimeException('Not authenticated.');
        }

        $customerId = (int) ($user['customerid'] ?? 0);
        if ($customerId <= 0) {
            throw new RuntimeException('Authenticated customer id is missing.');
        }

        return $customerId;
    }

    private function assertProductExists(string $productId): array
    {
        if ($productId === '') {
            throw new RuntimeException('Product ID is required.');
        }

        $product = $this->products->findById($productId);
        if ($product === null) {
            throw new RuntimeException('Product not found.');
        }

        return $product;
    }
}
