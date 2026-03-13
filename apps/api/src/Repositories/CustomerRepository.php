<?php

declare(strict_types=1);

namespace ColumbiaGames\Api\Repositories;

use PDO;

final class CustomerRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function findByEmail(string $email): ?array
    {
        $sql = <<<'SQL'
SELECT
    customerid,
    ship_email,
    ship_name,
    customer_password,
    points
FROM customers
WHERE lower(ship_email) = lower(:email)
LIMIT 1
SQL;

        $stmt = $this->db->prepare($sql);
        $stmt->execute(['email' => trim($email)]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findPublicProfileById(int $customerId): ?array
    {
        $sql = <<<'SQL'
SELECT
    customerid,
    ship_email,
    ship_name,
    points
FROM customers
WHERE customerid = :customerid
LIMIT 1
SQL;
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['customerid' => $customerId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }
}
