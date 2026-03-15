<?php

declare(strict_types=1);

use ColumbiaGames\Api\Controllers\AuthController;
use ColumbiaGames\Api\Controllers\CatalogController;
use ColumbiaGames\Api\Controllers\CartController;
use ColumbiaGames\Api\Controllers\CheckoutController;
use ColumbiaGames\Api\Controllers\LibraryController;
use ColumbiaGames\Api\Database\ConnectionFactory;
use ColumbiaGames\Api\Repositories\CartRepository;
use ColumbiaGames\Api\Repositories\CheckoutRepository;
use ColumbiaGames\Api\Repositories\CustomerRepository;
use ColumbiaGames\Api\Repositories\LibraryRepository;
use ColumbiaGames\Api\Repositories\ProductRepository;
use ColumbiaGames\Api\Services\AuthService;
use ColumbiaGames\Api\Services\CartService;
use ColumbiaGames\Api\Services\CatalogService;
use ColumbiaGames\Api\Services\CheckoutService;
use ColumbiaGames\Api\Services\LibraryService;
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
$cartRepository = new CartRepository($connections->ccm(), $productRepository);
$checkoutRepository = new CheckoutRepository($connections->ccm(), $connections->store());
$libraryRepository = new LibraryRepository($connections->store());
$authService = new AuthService($customerRepository);
$catalogService = new CatalogService($productRepository);
$cartService = new CartService($cartRepository, $productRepository);
$checkoutService = new CheckoutService($cartRepository, $checkoutRepository, $customerRepository);
$libraryService = new LibraryService($libraryRepository);

$authController = new AuthController($authService);
$catalogController = new CatalogController($catalogService);
$cartController = new CartController($cartService);
$checkoutController = new CheckoutController($checkoutService);
$libraryController = new LibraryController($libraryService);

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

$router->get('/cart/identity', [$cartController, 'identity']);
$router->get('/cart', [$cartController, 'show']);
$router->get('/cart/summary', [$cartController, 'summary']);
$router->post('/cart/items', [$cartController, 'addItem']);
$router->patch('/cart/items/{productId}', [$cartController, 'updateItem']);
$router->delete('/cart/items/{productId}', [$cartController, 'removeItem']);

$router->get('/checkout/summary', [$checkoutController, 'summary']);
$router->post('/checkout/validate', [$checkoutController, 'validate']);
$router->post('/checkout/submit', [$checkoutController, 'submit']);

$router->get('/library', [$libraryController, 'index']);

$router->dispatch($request);
