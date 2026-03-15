<?php

declare(strict_types=1);

namespace ColumbiaGames\Api\Controllers;

use ColumbiaGames\Api\Services\CatalogService;
use ColumbiaGames\Api\Support\JsonResponse;
use ColumbiaGames\Api\Support\Request;

final class CatalogController
{
    public function __construct(private readonly CatalogService $catalog)
    {
    }

    public function index(Request $request): void
    {
        JsonResponse::success($this->catalog->list($request->query));
    }

    public function show(Request $request, array $params): void
    {
        $productId = $params['productId'] ?? '';
        $product = $this->catalog->show($productId);
        if ($product === null) {
            JsonResponse::error('not_found', 'Product not found.', 404, [
                'productId' => $productId,
            ]);
        }

        JsonResponse::success($product);
    }

    public function related(Request $request, array $params): void
    {
        $productId = $params['productId'] ?? '';
        JsonResponse::success($this->catalog->related($productId));
    }
}
