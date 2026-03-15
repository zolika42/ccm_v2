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

    public function findCheckoutProfileById(int $customerId): ?array
    {
        $sql = <<<'SQL'
SELECT
    customerid,
    ship_email,
    ship_name,
    ship_phone,
    ship_street,
    ship_street2,
    ship_city,
    ship_state,
    ship_zip,
    ship_country,
    bill_name,
    bill_street,
    bill_street2,
    bill_city,
    bill_state,
    bill_zip,
    bill_country,
    pay_cardtype,
    pay_cardmonth,
    pay_cardyear,
    pay_cardname,
    pay_card_last4,
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
