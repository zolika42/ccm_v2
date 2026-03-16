<?php

declare(strict_types=1);

/**
 * @fileoverview Builds and configures PostgreSQL PDO connections for legacy CCM/store data plus rewrite-owned tables.
 */

namespace ColumbiaGames\Api\Database;

use PDO;
use PDOException;

final class ConnectionFactory
{
    private ?PDO $ccm = null;
    private ?PDO $store = null;
    private ?PDO $rewrite = null;

    public function ccm(): PDO
    {
        return $this->ccm ??= $this->connect(
            host: getenv('CG_CCM_DB_HOST') ?: '127.0.0.1',
            port: getenv('CG_CCM_DB_PORT') ?: '5432',
            dbName: getenv('CG_CCM_DB_NAME') ?: 'ccm',
            user: getenv('CG_CCM_DB_USER') ?: 'postgres',
            password: getenv('CG_CCM_DB_PASSWORD') ?: 'postgres',
        );
    }

    public function store(): PDO
    {
        return $this->store ??= $this->connect(
            host: getenv('CG_STORE_DB_HOST') ?: '127.0.0.1',
            port: getenv('CG_STORE_DB_PORT') ?: '5432',
            dbName: getenv('CG_STORE_DB_NAME') ?: 'columbia_games',
            user: getenv('CG_STORE_DB_USER') ?: 'postgres',
            password: getenv('CG_STORE_DB_PASSWORD') ?: 'postgres',
        );
    }

    public function rewrite(): PDO
    {
        return $this->rewrite ??= $this->connect(
            host: getenv('CG_REWRITE_DB_HOST') ?: (getenv('CG_CCM_DB_HOST') ?: '127.0.0.1'),
            port: getenv('CG_REWRITE_DB_PORT') ?: (getenv('CG_CCM_DB_PORT') ?: '5432'),
            dbName: getenv('CG_REWRITE_DB_NAME') ?: 'columbia_rewrite',
            user: getenv('CG_REWRITE_DB_USER') ?: (getenv('CG_CCM_DB_USER') ?: 'postgres'),
            password: getenv('CG_REWRITE_DB_PASSWORD') ?: (getenv('CG_CCM_DB_PASSWORD') ?: 'postgres'),
        );
    }

    public function ping(string $name): array
    {
        try {
            $pdo = match ($name) {
                'ccm' => $this->ccm(),
                'rewrite' => $this->rewrite(),
                default => $this->store(),
            };
            $stmt = $pdo->query('SELECT current_database() AS db, current_user AS username');
            $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
            return ['ok' => true, 'database' => $row['db'] ?? null, 'user' => $row['username'] ?? null];
        } catch (PDOException $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    private function connect(string $host, string $port, string $dbName, string $user, string $password): PDO
    {
        $dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s', $host, $port, $dbName);
        $pdo = new PDO($dsn, $user, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        return $pdo;
    }
}
