<?php

declare(strict_types=1);

namespace ColumbiaGames\Api\Database;

use PDO;
use PDOException;

final class ConnectionFactory
{
    private ?PDO $ccm = null;
    private ?PDO $store = null;

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

    public function ping(string $name): array
    {
        try {
            $pdo = $name === 'ccm' ? $this->ccm() : $this->store();
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
