<?php

declare(strict_types=1);

/**
 * @fileoverview Catalog application service for product listing/detail use cases.
 */

namespace ColumbiaGames\Api\Services;

use ColumbiaGames\Api\Repositories\ProductRepository;
use ColumbiaGames\Api\Support\SessionAuth;

final class CatalogService
{
    public function __construct(private readonly ProductRepository $products)
    {
    }

    public function list(array $filters): array
    {
        return $this->products->paginate($filters, $this->currentCustomerId());
    }

    public function show(string $productId): ?array
    {
        return $this->products->findById($productId, $this->currentCustomerId());
    }

    public function related(string $productId): array
    {
        return $this->products->related($productId, $this->currentCustomerId());
    }

    public function categories(): array
    {
        return $this->products->categories();
    }

    private function currentCustomerId(): ?int
    {
        $user = SessionAuth::user();
        if (!is_array($user)) {
            return null;
        }

        $customerId = (int) ($user['customerid'] ?? 0);
        return $customerId > 0 ? $customerId : null;
    }
}
