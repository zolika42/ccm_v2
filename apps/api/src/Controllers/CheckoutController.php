<?php

declare(strict_types=1);

namespace ColumbiaGames\Api\Controllers;

use ColumbiaGames\Api\Services\CheckoutService;
use ColumbiaGames\Api\Support\CookieBridge;
use ColumbiaGames\Api\Support\JsonResponse;
use ColumbiaGames\Api\Support\Request;

final class CheckoutController
{
    public function __construct(private readonly CheckoutService $checkout)
    {
    }

    public function summary(Request $request): void
    {
        $payload = $this->checkout->summary(CookieBridge::currentBrowserId());
        CookieBridge::persistBrowserId($payload['identity']['browserId']);

        JsonResponse::send([
            'ok' => true,
            'identity' => $payload['identity'],
            'data' => $payload['checkout'],
        ]);
    }

    public function validate(Request $request): void
    {
        $payload = $this->checkout->validate(CookieBridge::currentBrowserId(), $request->body);
        CookieBridge::persistBrowserId($payload['identity']['browserId']);

        JsonResponse::send([
            'ok' => true,
            'identity' => $payload['identity'],
            'data' => $payload['checkout'],
        ]);
    }


    public function submit(Request $request): void
    {
        $payload = $this->checkout->submit(CookieBridge::currentBrowserId(), $request->body);
        CookieBridge::persistBrowserId($payload['identity']['browserId']);

        if (!$payload['submitted']) {
            JsonResponse::send([
                'ok' => false,
                'identity' => $payload['identity'],
                'data' => $payload['checkout'],
                'submission' => null,
            ], (int) ($payload['status'] ?? 422));
        }

        JsonResponse::send([
            'ok' => true,
            'identity' => $payload['identity'],
            'data' => $payload['checkout'],
            'submission' => $payload['submission'],
        ]);
    }
}
