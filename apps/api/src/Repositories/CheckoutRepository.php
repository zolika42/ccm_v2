<?php

declare(strict_types=1);

namespace ColumbiaGames\Api\Repositories;

use PDO;

final class CheckoutRepository
{
    public function __construct(
        private readonly PDO $ccmDb,
        private readonly PDO $storeDb,
    ) {
    }

    public function beginStoreTransaction(): void
    {
        if (!$this->storeDb->inTransaction()) {
            $this->storeDb->beginTransaction();
        }
    }

    public function commitStoreTransaction(): void
    {
        if ($this->storeDb->inTransaction()) {
            $this->storeDb->commit();
        }
    }

    public function rollBackStoreTransaction(): void
    {
        if ($this->storeDb->inTransaction()) {
            $this->storeDb->rollBack();
        }
    }

    public function loadOrderFields(?string $orderId): array
    {
        if ($orderId === null || trim($orderId) === '') {
            return [];
        }

        $stmt = $this->ccmDb->prepare(<<<'SQL'
SELECT field, value
FROM orders
WHERE order_id = :order_id
ORDER BY field
SQL);
        $stmt->execute(['order_id' => $orderId]);

        $fields = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $field = trim((string) ($row['field'] ?? ''));
            if ($field === '' || array_key_exists($field, $fields)) {
                continue;
            }
            $fields[$field] = (string) ($row['value'] ?? '');
        }

        return $fields;
    }

    public function loadBrowserStateFields(string $browserId): array
    {
        $stmt = $this->ccmDb->prepare(<<<'SQL'
SELECT state
FROM browser_state
WHERE browser_id = :browser_id
ORDER BY last_updated DESC NULLS LAST
LIMIT 1
SQL);
        $stmt->execute(['browser_id' => $browserId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return [];
        }

        $state = (string) ($row['state'] ?? '');
        if (trim($state) === '') {
            return [];
        }

        parse_str($state, $parsed);
        return is_array($parsed) ? $parsed : [];
    }

    public function loadPaymentConfig(string $merchantId = 'cg', string $configId = 'default'): array
    {
        $stmt = $this->ccmDb->prepare(<<<'SQL'
SELECT merchant_id, config_id, test_mode, auth_mode, vendor, partner, user_id,
       street, zip, card_number, card_expire_month, card_expire_year, card_amount,
       result_code, response_message, reference_code
FROM payflowpro
WHERE merchant_id = :merchant_id
  AND config_id = :config_id
LIMIT 1
SQL);
        $stmt->execute([
            'merchant_id' => $merchantId,
            'config_id' => $configId,
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return [
                'enabled' => false,
                'merchantId' => $merchantId,
                'configId' => $configId,
            ];
        }

        return [
            'enabled' => true,
            'merchantId' => (string) ($row['merchant_id'] ?? $merchantId),
            'configId' => (string) ($row['config_id'] ?? $configId),
            'testMode' => isset($row['test_mode']) ? (int) $row['test_mode'] : null,
            'authMode' => isset($row['auth_mode']) ? (int) $row['auth_mode'] : null,
            'vendor' => (string) ($row['vendor'] ?? ''),
            'partner' => (string) ($row['partner'] ?? ''),
            'userId' => (string) ($row['user_id'] ?? ''),
            'streetField' => (string) ($row['street'] ?? ''),
            'zipField' => (string) ($row['zip'] ?? ''),
            'cardNumberField' => (string) ($row['card_number'] ?? ''),
            'cardExpireMonthField' => (string) ($row['card_expire_month'] ?? ''),
            'cardExpireYearField' => (string) ($row['card_expire_year'] ?? ''),
            'cardAmountField' => (string) ($row['card_amount'] ?? ''),
            'resultCodeField' => (string) ($row['result_code'] ?? ''),
            'responseMessageField' => (string) ($row['response_message'] ?? ''),
            'referenceCodeField' => (string) ($row['reference_code'] ?? ''),
        ];
    }

    public function submitToLegacyStore(int $customerId, array $draft, array $cart): array
    {
        $before = $this->loadCustomerCheckoutProfile($customerId) ?? ['customerid' => $customerId, 'points' => 0];

        $this->saveCustomerCheckoutProfile($customerId, $draft);
        $this->recordOrder(
            $customerId,
            (int) ($draft['pointsApplied'] ?? 0),
            (float) (($cart['summary']['subtotal'] ?? 0.0)),
        );

        $recordedItems = [];
        foreach (($cart['items'] ?? []) as $item) {
            $productId = trim((string) ($item['productId'] ?? ''));
            $quantity = max(0, (int) ($item['quantity'] ?? 0));
            if ($productId === '' || $quantity <= 0) {
                continue;
            }

            $this->recordItem($customerId, $productId, $quantity);
            $recordedItems[] = [
                'productId' => $productId,
                'quantity' => $quantity,
            ];
        }

        $after = $this->loadCustomerCheckoutProfile($customerId) ?? $before;

        return [
            'customerId' => $customerId,
            'pointsBefore' => (int) ($before['points'] ?? 0),
            'pointsAfter' => (int) ($after['points'] ?? 0),
            'recordedItemCount' => count($recordedItems),
            'recordedItems' => $recordedItems,
        ];
    }

    public function loadCustomerCheckoutProfile(int $customerId): ?array
    {
        $stmt = $this->storeDb->prepare(<<<'SQL'
SELECT customerid, ship_email, ship_name, ship_phone, ship_street, ship_street2, ship_city, ship_state,
       ship_zip, ship_country, bill_name, bill_street, bill_street2, bill_city, bill_state,
       bill_zip, bill_country, pay_cardtype, pay_cardmonth, pay_cardyear, pay_cardname,
       pay_cardno, pay_card_last4, points
FROM customers
WHERE customerid = :customerid
LIMIT 1
SQL);
        $stmt->execute(['customerid' => $customerId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function saveCustomerCheckoutProfile(int $customerId, array $draft): void
    {
        $stmt = $this->storeDb->prepare(<<<'SQL'
UPDATE customers
SET ship_name = :ship_name,
    ship_email = :ship_email,
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
        $stmt->execute([
            'customerid' => $customerId,
            'ship_name' => (string) ($draft['shipName'] ?? ''),
            'ship_email' => strtolower(trim((string) ($draft['shipEmail'] ?? ''))),
            'ship_phone' => (string) ($draft['shipPhone'] ?? ''),
            'ship_street' => (string) ($draft['shipStreet'] ?? ''),
            'ship_street2' => (string) ($draft['shipStreet2'] ?? ''),
            'ship_city' => (string) ($draft['shipCity'] ?? ''),
            'ship_state' => (string) ($draft['shipState'] ?? ''),
            'ship_zip' => (string) ($draft['shipZip'] ?? ''),
            'ship_country' => (string) ($draft['shipCountry'] ?? ''),
            'bill_name' => (string) ($draft['billName'] ?? ''),
            'bill_street' => (string) ($draft['billStreet'] ?? ''),
            'bill_street2' => (string) ($draft['billStreet2'] ?? ''),
            'bill_city' => (string) ($draft['billCity'] ?? ''),
            'bill_state' => (string) ($draft['billState'] ?? ''),
            'bill_zip' => (string) ($draft['billZip'] ?? ''),
            'bill_country' => (string) ($draft['billCountry'] ?? ''),
            'pay_cardtype' => strtolower(trim((string) ($draft['paymentType'] ?? ''))),
            'pay_cardmonth' => (string) ($draft['payCardMonth'] ?? ''),
            'pay_cardyear' => (string) ($draft['payCardYear'] ?? ''),
            'pay_cardname' => (string) ($draft['payCardName'] ?? ''),
            'pay_cardno' => (string) ($draft['payCardNumber'] ?? ''),
            'pay_card_last4' => (string) ($draft['payCardLast4'] ?? ''),
        ]);
    }

    private function recordOrder(int $customerId, int $pointsApplied, float $subtotal): void
    {
        $stmt = $this->storeDb->prepare('SELECT record_order(:customerid, :points_applied, :subtotal)');
        $stmt->execute([
            'customerid' => $customerId,
            'points_applied' => $pointsApplied,
            'subtotal' => $subtotal,
        ]);
    }

    private function recordItem(int $customerId, string $productId, int $quantity): void
    {
        $stmt = $this->storeDb->prepare('SELECT record_item(:customerid, :product_id, :quantity)');
        $stmt->execute([
            'customerid' => $customerId,
            'product_id' => $productId,
            'quantity' => $quantity,
        ]);
    }
}
