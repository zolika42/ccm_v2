<?php

declare(strict_types=1);

/**
 * @fileoverview Store-database customer lookups and customer profile persistence used by auth and checkout.
 */

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

    public function emailExists(string $email, ?int $excludeCustomerId = null): bool
{
    if ($excludeCustomerId === null) {
        $sql = <<<'SQL'
SELECT 1
FROM customers
WHERE lower(ship_email) = lower(:email)
LIMIT 1
SQL;
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['email' => trim($email)]);
        return $stmt->fetchColumn() !== false;
    }

    $sql = <<<'SQL'
SELECT 1
FROM customers
WHERE lower(ship_email) = lower(:email)
  AND customerid <> :exclude_customerid
LIMIT 1
SQL;
    $stmt = $this->db->prepare($sql);
    $stmt->execute([
        'email' => trim($email),
        'exclude_customerid' => $excludeCustomerId,
    ]);
    return $stmt->fetchColumn() !== false;
}

    public function findPublicProfileById(int $customerId): ?array
    {
        $sql = <<<'SQL'
SELECT
    customerid,
    ship_email,
    ship_name,
    points,
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
    pay_card_last4
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

    public function createCustomer(array $input): array
    {
        $stmt = $this->db->prepare(<<<'SQL'
INSERT INTO customers (
    ship_email,
    ship_name,
    customer_password,
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
    pay_cardno,
    pay_card_last4,
    points,
    change
) VALUES (
    :ship_email,
    :ship_name,
    :customer_password,
    :ship_phone,
    :ship_street,
    :ship_street2,
    :ship_city,
    :ship_state,
    :ship_zip,
    :ship_country,
    :bill_name,
    :bill_street,
    :bill_street2,
    :bill_city,
    :bill_state,
    :bill_zip,
    :bill_country,
    :pay_cardtype,
    :pay_cardmonth,
    :pay_cardyear,
    :pay_cardname,
    :pay_cardno,
    :pay_card_last4,
    :points,
    'F'
)
RETURNING customerid
SQL);
        $stmt->execute($this->profileParams($input, true));
        $customerId = (int) $stmt->fetchColumn();

        return $this->findPublicProfileById($customerId) ?? [
            'customerid' => $customerId,
            'ship_email' => strtolower(trim((string) ($input['email'] ?? ''))),
            'ship_name' => trim((string) ($input['name'] ?? '')),
            'points' => 0,
        ];
    }

    public function updateProfile(int $customerId, array $input): ?array
    {
        $stmt = $this->db->prepare(<<<'SQL'
UPDATE customers
SET ship_email = :ship_email,
    ship_name = :ship_name,
    ship_phone = :ship_phone,
    ship_street = :ship_street,
    ship_street2 = :ship_street2,
    ship_city = :ship_city,
    ship_state = :ship_state,
    ship_zip = :ship_zip,
    ship_country = :ship_country,
    bill_name = :bill_name,
    bill_street = :bill_street,
    bill_street2 = :bill_street2,
    bill_city = :bill_city,
    bill_state = :bill_state,
    bill_zip = :bill_zip,
    bill_country = :bill_country,
    pay_cardtype = :pay_cardtype,
    pay_cardmonth = :pay_cardmonth,
    pay_cardyear = :pay_cardyear,
    pay_cardname = :pay_cardname,
    pay_cardno = :pay_cardno,
    pay_card_last4 = :pay_card_last4,
    change = 'T'
WHERE customerid = :customerid
SQL);
        $params = $this->profileParams($input, false);
        $params['customerid'] = $customerId;
        $stmt->execute($params);

        return $this->findPublicProfileById($customerId);
    }

    public function updatePassword(int $customerId, string $newPassword): void
    {
        $stmt = $this->db->prepare(<<<'SQL'
UPDATE customers
SET customer_password = :customer_password,
    change = 'T'
WHERE customerid = :customerid
SQL);
        $stmt->execute([
            'customerid' => $customerId,
            'customer_password' => $newPassword,
        ]);
    }

    /**
     * @return array<string, scalar|null>
     */
    private function profileParams(array $input, bool $includePassword): array
    {
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $name = trim((string) ($input['name'] ?? ''));
        $shipStreet = trim((string) ($input['shipStreet'] ?? ''));
        $shipStreet2 = trim((string) ($input['shipStreet2'] ?? ''));
        $shipCity = trim((string) ($input['shipCity'] ?? ''));
        $shipState = trim((string) ($input['shipState'] ?? ''));
        $shipZip = trim((string) ($input['shipZip'] ?? ''));
        $shipCountry = trim((string) ($input['shipCountry'] ?? ''));
        $billStreet = trim((string) ($input['billStreet'] ?? ''));
        $billStreet2 = trim((string) ($input['billStreet2'] ?? ''));
        $billCity = trim((string) ($input['billCity'] ?? ''));
        $billState = trim((string) ($input['billState'] ?? ''));
        $billZip = trim((string) ($input['billZip'] ?? ''));
        $billCountry = trim((string) ($input['billCountry'] ?? ''));

        if ($includePassword) {
            $billStreet = $billStreet !== '' ? $billStreet : $shipStreet;
            $billStreet2 = $billStreet2 !== '' ? $billStreet2 : $shipStreet2;
            $billCity = $billCity !== '' ? $billCity : $shipCity;
            $billState = $billState !== '' ? $billState : $shipState;
            $billZip = $billZip !== '' ? $billZip : $shipZip;
            $billCountry = $billCountry !== '' ? $billCountry : $shipCountry;
        }

        $params = [
            'ship_email' => $email,
            'ship_name' => $name,
            'ship_phone' => trim((string) ($input['shipPhone'] ?? '')),
            'ship_street' => $shipStreet,
            'ship_street2' => $shipStreet2,
            'ship_city' => $shipCity,
            'ship_state' => $shipState,
            'ship_zip' => $shipZip,
            'ship_country' => $shipCountry,
            'bill_name' => trim((string) ($input['billName'] ?? '')) ?: $name,
            'bill_street' => $billStreet,
            'bill_street2' => $billStreet2,
            'bill_city' => $billCity,
            'bill_state' => $billState,
            'bill_zip' => $billZip,
            'bill_country' => $billCountry,
            'pay_cardtype' => strtolower(trim((string) ($input['payCardType'] ?? ''))) ?: 'choose',
            'pay_cardmonth' => trim((string) ($input['payCardMonth'] ?? '')) ?: 'Month',
            'pay_cardyear' => trim((string) ($input['payCardYear'] ?? '')) ?: 'Year',
            'pay_cardname' => trim((string) ($input['payCardName'] ?? '')),
            'pay_cardno' => '',
            'pay_card_last4' => trim((string) ($input['payCardLast4'] ?? '')),
        ];

        if ($includePassword) {
            $params['customer_password'] = (string) ($input['password'] ?? '');
            $params['points'] = 0;
        }

        return $params;
    }
}
