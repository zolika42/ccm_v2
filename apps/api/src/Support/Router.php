<?php

declare(strict_types=1);

/**
 * @fileoverview Minimal regex-based HTTP router used by the native PHP API entrypoint.
 */

namespace ColumbiaGames\Api\Support;

final class Router
{
    /** @var array<int, array{method:string, pattern:string, handler:callable|array}> */
    private array $routes = [];

    public function get(string $pattern, callable|array $handler): void
    {
        $this->add('GET', $pattern, $handler);
    }

    public function post(string $pattern, callable|array $handler): void
    {
        $this->add('POST', $pattern, $handler);
    }

    public function patch(string $pattern, callable|array $handler): void
    {
        $this->add('PATCH', $pattern, $handler);
    }

    public function delete(string $pattern, callable|array $handler): void
    {
        $this->add('DELETE', $pattern, $handler);
    }

    private function add(string $method, string $pattern, callable|array $handler): void
    {
        $this->routes[] = ['method' => $method, 'pattern' => $pattern, 'handler' => $handler];
    }

    public function dispatch(Request $request): void
    {
        foreach ($this->routes as $route) {
            if ($route['method'] !== $request->method) {
                continue;
            }

            $pattern = preg_replace('#\{([A-Za-z0-9_]+)\}#', '(?P<$1>[^/]+)', $route['pattern']);
            $regex = '#^' . $pattern . '$#';
            if (!preg_match($regex, $request->path, $matches)) {
                continue;
            }

            $params = array_filter($matches, static fn ($key): bool => !is_int($key), ARRAY_FILTER_USE_KEY);
            call_user_func($route['handler'], $request, $params);
            return;
        }

        JsonResponse::error('not_found', 'Route not found.', 404, ['route' => $request->path]);
    }
}
