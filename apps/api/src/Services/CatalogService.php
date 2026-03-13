<?php

declare(strict_types=1);

namespace ColumbiaGames\Api\Services;

use ColumbiaGames\Api\Repositories\ProductRepository;

final class CatalogService
{
    public function __construct(private readonly ProductRepository $products)
    {
    }

    public function list(array $filters): array
    {
        return $this->products->paginate($filters);
    }

    public function show(string $productId): ?array
    {
        return $this->products->findById($productId);
    }

    public function related(string $productId): array
    {
        return $this->products->related($productId);
    }
}
