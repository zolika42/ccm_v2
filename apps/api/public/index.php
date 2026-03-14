<?php

declare(strict_types=1);

use ColumbiaGames\Api\Controllers\AuthController;
use ColumbiaGames\Api\Controllers\CatalogController;
use ColumbiaGames\Api\Database\ConnectionFactory;
use ColumbiaGames\Api\Repositories\CustomerRepository;
use ColumbiaGames\Api\Repositories\ProductRepository;
use ColumbiaGames\Api\Services\AuthService;
use ColumbiaGames\Api\Services\CatalogService;
use ColumbiaGames\Api\Support\Cors;
use ColumbiaGames\Api\Support\JsonResponse;
use ColumbiaGames\Api\Support\Request;
use ColumbiaGames\Api\Support\Router;

require_once __DIR__ . '/../bootstrap.php';

Cors::apply();
Cors::maybeHandlePreflight();

$request = Request::fromGlobals();
$router = new Router();
$connections = new ConnectionFactory();

$customerRepository = new CustomerRepository($connections->store());
$productRepository = new ProductRepository($connections->store());
$authService = new AuthService($customerRepository);
$catalogService = new CatalogService($productRepository);

$authController = new AuthController($authService);
$catalogController = new CatalogController($catalogService);

$router->get('/health', function () use ($connections): void {
    JsonResponse::send([
        'ok' => true,
        'databases' => [
            'ccm' => $connections->ping('ccm'),
            'columbia_games' => $connections->ping('store'),
        ],
    ]);
});

$router->post('/auth/login', [$authController, 'login']);
$router->post('/auth/logout', [$authController, 'logout']);
$router->get('/auth/me', [$authController, 'me']);

$router->get('/catalog/products', [$catalogController, 'index']);
$router->get('/catalog/products/{productId}', [$catalogController, 'show']);
$router->get('/catalog/products/{productId}/related', [$catalogController, 'related']);

$router->dispatch($request);
