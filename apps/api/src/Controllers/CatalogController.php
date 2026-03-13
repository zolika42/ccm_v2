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
        JsonResponse::send([
            'ok' => true,
            'data' => $this->catalog->list($request->query),
        ]);
    }

    public function show(Request $request, array $params): void
    {
        $productId = $params['productId'] ?? '';
        $product = $this->catalog->show($productId);
        if ($product === null) {
            JsonResponse::error('Product not found.', 404);
        }

        JsonResponse::send(['ok' => true, 'data' => $product]);
    }

    public function related(Request $request, array $params): void
    {
        $productId = $params['productId'] ?? '';
        JsonResponse::send([
            'ok' => true,
            'data' => $this->catalog->related($productId),
        ]);
    }
}
