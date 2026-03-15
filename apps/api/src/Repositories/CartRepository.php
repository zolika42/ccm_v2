<?php

declare(strict_types=1);

namespace ColumbiaGames\Api\Repositories;

use PDO;
use RuntimeException;

final class CartRepository
{
    private const DEFAULT_MERCHANT_ID = 'cg';
    private const DEFAULT_CONFIG_ID = 'default';
    private const ACTIVE_CART_STATUS = 3;
    private const EMPTY_CART_STATUS = 1;
    private const SUBMITTED_ORDER_STATUS = 0;

    /** @var array<string, array|null> */
    private array $productCache = [];

    public function __construct(
        private readonly PDO $ccmDb,
        private readonly ProductRepository $products,
    ) {
    }

    public function resolveBrowserId(?string $cookieValue): string
    {
        $candidate = trim((string) $cookieValue);
        if ($candidate !== '' && preg_match('/^[A-Za-z0-9._:-]{6,128}$/', $candidate) === 1) {
            return $candidate;
        }

        return 'cg-' . bin2hex(random_bytes(16));
    }

    public function getIdentity(string $browserId): array
    {
        $this->ensureBrowserStateRow($browserId);
        $activeOrder = $this->findActiveOrder($browserId);
        $browserState = $this->readBrowserStateRow($browserId);

        return [
            'browserId' => $browserId,
            'cookieName' => 'bid-cg',
            'storage' => $this->chooseStorage($browserState, $activeOrder),
            'legacyMirror' => true,
            'activeOrderId' => $activeOrder['orderId'] ?? null,
        ];
    }

    public function getCart(string $browserId): array
    {
        $this->ensureBrowserStateRow($browserId);

        $browserState = $this->readBrowserStateRow($browserId);
        $activeOrder = $this->findActiveOrder($browserId);

        if ($this->shouldUseBrowserState($browserState, $activeOrder)) {
            return $this->buildCartFromQuantities(
                $browserId,
                $browserState['quantities'],
                'browser_state',
                null,
            );
        }

        if ($activeOrder !== null) {
            return $this->buildCartFromOrder($browserId, $activeOrder['orderId']);
        }

        return $this->buildCartFromQuantities($browserId, [], 'browser_state', null);
    }

    public function addItem(string $browserId, string $productId, int $quantity): array
    {
        if ($quantity < 1) {
            throw new RuntimeException('Quantity must be at least 1.');
        }

        return $this->mutateCart($browserId, function (array $quantities) use ($productId, $quantity): array {
            $current = (int) ($quantities[$productId] ?? 0);
            $quantities[$productId] = min(999, $current + $quantity);
            return $quantities;
        });
    }

    public function updateItem(string $browserId, string $productId, int $quantity): array
    {
        return $this->mutateCart($browserId, function (array $quantities) use ($productId, $quantity): array {
            if ($quantity <= 0) {
                unset($quantities[$productId]);
                return $quantities;
            }

            $quantities[$productId] = min(999, $quantity);
            return $quantities;
        });
    }

    public function removeItem(string $browserId, string $productId): array
    {
        return $this->mutateCart($browserId, function (array $quantities) use ($productId): array {
            unset($quantities[$productId]);
            return $quantities;
        });
    }


    public function beginTransaction(): void
    {
        if (!$this->ccmDb->inTransaction()) {
            $this->ccmDb->beginTransaction();
        }
    }

    public function commitTransaction(): void
    {
        if ($this->ccmDb->inTransaction()) {
            $this->ccmDb->commit();
        }
    }

    public function rollBackTransaction(): void
    {
        if ($this->ccmDb->inTransaction()) {
            $this->ccmDb->rollBack();
        }
    }

    public function submitOrderDraft(string $browserId, array $draft, int $customerId, int $customerPoints = 0): array
    {
        $this->ensureBrowserStateRow($browserId);

        $browserState = $this->readBrowserStateRow($browserId);
        $activeOrder = $this->findActiveOrder($browserId);
        $quantities = $this->normalizeQuantities($this->baseQuantities($browserState, $activeOrder));
        if ($quantities === []) {
            throw new RuntimeException('Cannot submit checkout with an empty cart.');
        }

        $context = $this->resolveLegacyContext($browserId, $activeOrder['orderId'] ?? null, $browserState);
        $orderId = $activeOrder['orderId'] ?? $this->generateOrderId($context);
        $this->syncOrder($context, $orderId, $browserId, $quantities, true);

        foreach ($this->submitOrderFields($draft, $customerId, $customerPoints) as $field => $value) {
            $this->upsertOrderField($context, $orderId, $field, $value);
        }

        $this->syncOrderStatusWithValue($context, $orderId, $browserId, self::SUBMITTED_ORDER_STATUS);
        $this->writeBrowserState($context, $browserId, [], null);

        return [
            'orderId' => $orderId,
            'browserId' => $browserId,
            'storage' => 'legacy-eav',
            'quantities' => $quantities,
            'summary' => $this->calculateMetrics($quantities),
            'legacyContext' => $context,
        ];
    }

    /**
     * @param callable(array<string,int>): array<string,int> $mutator
     */
    private function mutateCart(string $browserId, callable $mutator): array
    {
        $this->ensureBrowserStateRow($browserId);

        $browserState = $this->readBrowserStateRow($browserId);
        $activeOrder = $this->findActiveOrder($browserId);
        $baseQuantities = $this->baseQuantities($browserState, $activeOrder);
        $nextQuantities = $this->normalizeQuantities($mutator($baseQuantities));

        $context = $this->resolveLegacyContext($browserId, $activeOrder['orderId'] ?? null, $browserState);

        $this->ccmDb->beginTransaction();
        try {
            $orderId = $activeOrder['orderId'] ?? null;
            if ($nextQuantities === []) {
                if ($orderId !== null) {
                    $this->syncOrder($context, $orderId, $browserId, [], false);
                }
                $this->writeBrowserState($context, $browserId, [], null);
            } else {
                if ($orderId === null) {
                    $orderId = $this->generateOrderId($context);
                }

                $this->syncOrder($context, $orderId, $browserId, $nextQuantities, true);
                $this->writeBrowserState($context, $browserId, $nextQuantities, $orderId);
            }

            $this->ccmDb->commit();
        } catch (\Throwable $e) {
            if ($this->ccmDb->inTransaction()) {
                $this->ccmDb->rollBack();
            }
            throw $e;
        }

        return $this->getCart($browserId);
    }

    /**
     * @param array<string,mixed>|null $browserState
     * @param array<string,mixed>|null $activeOrder
     */
    private function chooseStorage(?array $browserState, ?array $activeOrder): string
    {
        if ($this->shouldUseBrowserState($browserState, $activeOrder)) {
            return 'browser_state';
        }

        return $activeOrder !== null ? 'legacy-eav' : 'browser_state';
    }

    /**
     * @param array<string,mixed>|null $browserState
     * @param array<string,mixed>|null $activeOrder
     */
    private function shouldUseBrowserState(?array $browserState, ?array $activeOrder): bool
    {
        if ($browserState === null || ($browserState['quantities'] ?? []) === []) {
            return false;
        }

        if ($activeOrder === null) {
            return true;
        }

        return ($browserState['updatedAtUnix'] ?? 0) > ($activeOrder['updatedAtUnix'] ?? 0);
    }

    /**
     * @param array<string,mixed>|null $browserState
     * @param array<string,mixed>|null $activeOrder
     * @return array<string,int>
     */
    private function baseQuantities(?array $browserState, ?array $activeOrder): array
    {
        if ($this->shouldUseBrowserState($browserState, $activeOrder)) {
            return $browserState['quantities'];
        }

        if ($activeOrder !== null) {
            return $this->loadQuantitiesFromOrder($activeOrder['orderId']);
        }

        return $browserState['quantities'] ?? [];
    }

    private function readBrowserStateRow(string $browserId): ?array
    {
        $stmt = $this->ccmDb->prepare(<<<'SQL'
SELECT browser_id, merchant_id, config_id, state, last_updated
FROM browser_state
WHERE browser_id = :browser_id
ORDER BY last_updated DESC NULLS LAST
LIMIT 1
SQL);
        $stmt->execute(['browser_id' => $browserId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }

        $state = (string) ($row['state'] ?? '');
        return [
            'browserId' => (string) ($row['browser_id'] ?? $browserId),
            'merchantId' => trim((string) ($row['merchant_id'] ?? '')) ?: self::DEFAULT_MERCHANT_ID,
            'configId' => trim((string) ($row['config_id'] ?? '')) ?: self::DEFAULT_CONFIG_ID,
            'state' => $state,
            'quantities' => $this->parseQuantitiesFromBrowserState($state),
            'updatedAt' => (string) ($row['last_updated'] ?? ''),
            'updatedAtUnix' => $this->toUnix((string) ($row['last_updated'] ?? '')),
        ];
    }

    private function findActiveOrder(string $browserId): ?array
    {
        $stmt = $this->ccmDb->prepare(<<<'SQL'
SELECT browser_id, merchant_id, config_id, order_id, status, last_updated
FROM order_status
WHERE browser_id = :browser_id
  AND status = :status
ORDER BY last_updated DESC NULLS LAST, order_id DESC
LIMIT 1
SQL);
        $stmt->execute([
            'browser_id' => $browserId,
            'status' => self::ACTIVE_CART_STATUS,
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }

        return [
            'browserId' => (string) ($row['browser_id'] ?? $browserId),
            'merchantId' => trim((string) ($row['merchant_id'] ?? '')) ?: self::DEFAULT_MERCHANT_ID,
            'configId' => trim((string) ($row['config_id'] ?? '')) ?: self::DEFAULT_CONFIG_ID,
            'orderId' => (string) ($row['order_id'] ?? ''),
            'status' => (int) ($row['status'] ?? self::ACTIVE_CART_STATUS),
            'updatedAt' => (string) ($row['last_updated'] ?? ''),
            'updatedAtUnix' => $this->toUnix((string) ($row['last_updated'] ?? '')),
        ];
    }

    /**
     * @param array<string,mixed>|null $browserState
     * @return array{merchantId:string,configId:string}
     */
    private function resolveLegacyContext(string $browserId, ?string $orderId = null, ?array $browserState = null): array
    {
        if ($browserState !== null) {
            return [
                'merchantId' => $browserState['merchantId'],
                'configId' => $browserState['configId'],
            ];
        }

        if ($orderId !== null) {
            $stmt = $this->ccmDb->prepare(<<<'SQL'
SELECT merchant_id, config_id
FROM order_status
WHERE order_id = :order_id
ORDER BY last_updated DESC NULLS LAST
LIMIT 1
SQL);
            $stmt->execute(['order_id' => $orderId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row !== false) {
                return [
                    'merchantId' => trim((string) ($row['merchant_id'] ?? '')) ?: self::DEFAULT_MERCHANT_ID,
                    'configId' => trim((string) ($row['config_id'] ?? '')) ?: self::DEFAULT_CONFIG_ID,
                ];
            }
        }

        $browserState = $this->readBrowserStateRow($browserId);
        if ($browserState !== null) {
            return [
                'merchantId' => $browserState['merchantId'],
                'configId' => $browserState['configId'],
            ];
        }

        return [
            'merchantId' => self::DEFAULT_MERCHANT_ID,
            'configId' => self::DEFAULT_CONFIG_ID,
        ];
    }

    private function ensureBrowserStateRow(string $browserId): void
    {
        $stmt = $this->ccmDb->prepare('SELECT 1 FROM browser_state WHERE browser_id = :browser_id LIMIT 1');
        $stmt->execute(['browser_id' => $browserId]);
        if ($stmt->fetchColumn() !== false) {
            return;
        }

        $context = $this->resolveLegacyContext($browserId);
        $insert = $this->ccmDb->prepare(<<<'SQL'
INSERT INTO browser_state (browser_id, merchant_id, config_id, state, last_updated)
VALUES (:browser_id, :merchant_id, :config_id, :state, NOW())
SQL);
        $insert->execute([
            'browser_id' => $browserId,
            'merchant_id' => $context['merchantId'],
            'config_id' => $context['configId'],
            'state' => $this->buildBrowserStateString([], $context),
        ]);
    }

    /**
     * @param array{merchantId:string,configId:string} $context
     * @param array<string,int> $quantities
     */
    private function writeBrowserState(array $context, string $browserId, array $quantities, ?string $orderId): void
    {
        $state = $this->buildBrowserStateString($quantities, $context, $orderId);

        $update = $this->ccmDb->prepare(<<<'SQL'
UPDATE browser_state
SET merchant_id = :merchant_id,
    config_id = :config_id,
    state = :state,
    last_updated = NOW()
WHERE browser_id = :browser_id
SQL);
        $update->execute([
            'browser_id' => $browserId,
            'merchant_id' => $context['merchantId'],
            'config_id' => $context['configId'],
            'state' => $state,
        ]);

        if ($update->rowCount() > 0) {
            return;
        }

        $insert = $this->ccmDb->prepare(<<<'SQL'
INSERT INTO browser_state (browser_id, merchant_id, config_id, state, last_updated)
VALUES (:browser_id, :merchant_id, :config_id, :state, NOW())
SQL);
        $insert->execute([
            'browser_id' => $browserId,
            'merchant_id' => $context['merchantId'],
            'config_id' => $context['configId'],
            'state' => $state,
        ]);
    }

    private function buildCartFromOrder(string $browserId, string $orderId): array
    {
        $orderFields = $this->loadOrderFields($orderId);
        $quantities = $this->loadQuantitiesFromOrder($orderId);
        $storage = 'legacy-eav';

        $items = [];
        $subtotal = 0.0;
        $itemCount = 0;
        $paymentItemCount = 0;
        $downloadableItemCount = 0;
        $shippableSubtotal = 0.0;

        foreach ($this->loadItemFieldMap($orderId) as $productId => $fields) {
            $productId = trim((string) ($fields['product_id'] ?? $productId));
            $quantity = (int) ($fields['ec_quantity_ordered'] ?? 0);
            if ($productId === '' || $quantity <= 0) {
                continue;
            }

            $product = $this->loadProduct($productId);
            $unitPrice = $this->parsePrice($fields['product_price'] ?? ($product['price'] ?? null));
            $lineSubtotal = round($unitPrice * $quantity, 2);
            $isDownloadable = $this->isTruthy($fields['is_downloadable'] ?? ($product['isDownloadable'] ?? false));
            $freebie = $this->isTruthy($fields['freebie'] ?? ($product['freebie'] ?? false));

            $items[] = [
                'productId' => $productId,
                'description' => (string) ($fields['product_description'] ?? $product['description'] ?? $productId),
                'quantity' => $quantity,
                'unitPrice' => $unitPrice,
                'unitPriceFormatted' => $this->formatMoney($unitPrice),
                'lineSubtotal' => $lineSubtotal,
                'lineSubtotalFormatted' => $this->formatMoney($lineSubtotal),
                'category' => (string) ($fields['category'] ?? $product['category'] ?? ''),
                'subCategory' => (string) ($fields['sub_category'] ?? $product['subCategory'] ?? ''),
                'isDownloadable' => $isDownloadable,
                'freebie' => $freebie,
                'status' => (string) ($product['status'] ?? ''),
            ];

            $subtotal += $lineSubtotal;
            $itemCount += $quantity;
            if ($unitPrice > 0.0) {
                $paymentItemCount++;
            }
            if ($isDownloadable) {
                $downloadableItemCount += $quantity;
            } else {
                $shippableSubtotal += $lineSubtotal;
            }
        }

        if ($items === [] && $quantities !== []) {
            return $this->buildCartFromQuantities($browserId, $quantities, $storage, $orderId);
        }

        usort($items, static fn (array $a, array $b): int => strcmp($a['productId'], $b['productId']));

        return [
            'browserId' => $browserId,
            'orderId' => $orderId,
            'storage' => $storage,
            'items' => $items,
            'summary' => [
                'itemCount' => $itemCount,
                'uniqueItemCount' => count($items),
                'subtotal' => round($subtotal, 2),
                'subtotalFormatted' => $this->formatMoney($subtotal),
                'currency' => 'USD',
                'hasItems' => $itemCount > 0,
                'storage' => $storage,
                'totalItemsRequiringPayment' => (int) ($orderFields['total_items_requiring_payment'] ?? $paymentItemCount),
                'downloadableItemCount' => $downloadableItemCount,
                'shippableSubtotal' => round($shippableSubtotal, 2),
                'shippableSubtotalFormatted' => $this->formatMoney($shippableSubtotal),
            ],
        ];
    }

    /**
     * @param array<string,int> $quantities
     */
    private function buildCartFromQuantities(string $browserId, array $quantities, string $storage, ?string $orderId): array
    {
        $items = [];
        $subtotal = 0.0;
        $itemCount = 0;
        $downloadableItemCount = 0;
        $shippableSubtotal = 0.0;
        $paymentItemCount = 0;

        foreach ($quantities as $productId => $quantity) {
            $productId = trim((string) $productId);
            $quantity = (int) $quantity;
            if ($productId === '' || $quantity <= 0) {
                continue;
            }

            $product = $this->loadProduct($productId);
            if ($product === null) {
                continue;
            }

            $unitPrice = $this->parsePrice($product['price'] ?? null);
            $lineSubtotal = round($unitPrice * $quantity, 2);
            $isDownloadable = (bool) ($product['isDownloadable'] ?? false);

            $items[] = [
                'productId' => $productId,
                'description' => (string) ($product['description'] ?? $productId),
                'quantity' => $quantity,
                'unitPrice' => $unitPrice,
                'unitPriceFormatted' => $this->formatMoney($unitPrice),
                'lineSubtotal' => $lineSubtotal,
                'lineSubtotalFormatted' => $this->formatMoney($lineSubtotal),
                'category' => (string) ($product['category'] ?? ''),
                'subCategory' => (string) ($product['subCategory'] ?? ''),
                'isDownloadable' => $isDownloadable,
                'freebie' => (bool) ($product['freebie'] ?? false),
                'status' => (string) ($product['status'] ?? ''),
            ];

            $subtotal += $lineSubtotal;
            $itemCount += $quantity;
            if ($unitPrice > 0.0) {
                $paymentItemCount++;
            }
            if ($isDownloadable) {
                $downloadableItemCount += $quantity;
            } else {
                $shippableSubtotal += $lineSubtotal;
            }
        }

        usort($items, static fn (array $a, array $b): int => strcmp($a['productId'], $b['productId']));

        return [
            'browserId' => $browserId,
            'orderId' => $orderId,
            'storage' => $storage,
            'items' => $items,
            'summary' => [
                'itemCount' => $itemCount,
                'uniqueItemCount' => count($items),
                'subtotal' => round($subtotal, 2),
                'subtotalFormatted' => $this->formatMoney($subtotal),
                'currency' => 'USD',
                'hasItems' => $itemCount > 0,
                'storage' => $storage,
                'totalItemsRequiringPayment' => $paymentItemCount,
                'downloadableItemCount' => $downloadableItemCount,
                'shippableSubtotal' => round($shippableSubtotal, 2),
                'shippableSubtotalFormatted' => $this->formatMoney($shippableSubtotal),
            ],
        ];
    }

    /**
     * @return array<string,string>
     */
    private function loadOrderFields(string $orderId): array
    {
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

    /**
     * @return array<string, array<string,string>>
     */
    private function loadItemFieldMap(string $orderId): array
    {
        $stmt = $this->ccmDb->prepare(<<<'SQL'
SELECT product_id, field, value
FROM items
WHERE order_id = :order_id
ORDER BY product_id, field
SQL);
        $stmt->execute(['order_id' => $orderId]);

        $products = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $productId = trim((string) ($row['product_id'] ?? ''));
            $field = trim((string) ($row['field'] ?? ''));
            if ($productId === '' || $field === '') {
                continue;
            }
            $products[$productId][$field] = (string) ($row['value'] ?? '');
        }

        return $products;
    }

    /**
     * @return array<string,int>
     */
    private function loadQuantitiesFromOrder(string $orderId): array
    {
        $quantities = [];
        foreach ($this->loadItemFieldMap($orderId) as $productId => $fields) {
            $quantity = (int) ($fields['ec_quantity_ordered'] ?? 0);
            if ($quantity > 0) {
                $quantities[$productId] = $quantity;
            }
        }

        return $quantities;
    }

    /**
     * @param array{merchantId:string,configId:string} $context
     * @param array<string,int> $quantities
     */
    private function syncOrder(array $context, string $orderId, string $browserId, array $quantities, bool $active): void
    {
        $this->syncOrderStatus($context, $orderId, $browserId, $active);
        $this->replaceItemRows($context, $orderId, $quantities);
        $this->syncOrderSummaryFields($context, $orderId, $browserId, $quantities);
    }

    /**
     * @param array{merchantId:string,configId:string} $context
     */
    private function syncOrderStatus(array $context, string $orderId, string $browserId, bool $active): void
    {
        $status = $active ? self::ACTIVE_CART_STATUS : self::EMPTY_CART_STATUS;
        $this->syncOrderStatusWithValue($context, $orderId, $browserId, $status);
    }

    /**
     * @param array{merchantId:string,configId:string} $context
     */
    private function syncOrderStatusWithValue(array $context, string $orderId, string $browserId, int $status): void
    {
        $update = $this->ccmDb->prepare(<<<'SQL'
UPDATE order_status
SET browser_id = :browser_id,
    merchant_id = :merchant_id,
    config_id = :config_id,
    status = :status,
    last_updated = NOW()
WHERE order_id = :order_id
SQL);
        $update->execute([
            'browser_id' => $browserId,
            'merchant_id' => $context['merchantId'],
            'config_id' => $context['configId'],
            'status' => $status,
            'order_id' => $orderId,
        ]);

        if ($update->rowCount() > 0) {
            return;
        }

        $insert = $this->ccmDb->prepare(<<<'SQL'
INSERT INTO order_status (browser_id, merchant_id, config_id, order_id, status, last_updated, unused1, batch_id)
VALUES (:browser_id, :merchant_id, :config_id, :order_id, :status, NOW(), NULL, NULL)
SQL);
        $insert->execute([
            'browser_id' => $browserId,
            'merchant_id' => $context['merchantId'],
            'config_id' => $context['configId'],
            'order_id' => $orderId,
            'status' => $status,
        ]);
    }

    /**
     * @param array{merchantId:string,configId:string} $context
     * @param array<string,int> $quantities
     */
    private function replaceItemRows(array $context, string $orderId, array $quantities): void
    {
        $delete = $this->ccmDb->prepare('DELETE FROM items WHERE order_id = :order_id');
        $delete->execute(['order_id' => $orderId]);

        if ($quantities === []) {
            return;
        }

        $insert = $this->ccmDb->prepare(<<<'SQL'
INSERT INTO items (merchant_id, config_id, order_id, product_id, field, value)
VALUES (:merchant_id, :config_id, :order_id, :product_id, :field, :value)
SQL);

        foreach ($quantities as $productId => $quantity) {
            $product = $this->loadProduct($productId);
            if ($product === null) {
                continue;
            }

            $fields = $this->itemFieldsForProduct($productId, $quantity, $product);
            foreach ($fields as $field => $value) {
                $insert->execute([
                    'merchant_id' => $context['merchantId'],
                    'config_id' => $context['configId'],
                    'order_id' => $orderId,
                    'product_id' => $productId,
                    'field' => $field,
                    'value' => $value,
                ]);
            }
        }
    }

    /**
     * @param array{merchantId:string,configId:string} $context
     * @param array<string,int> $quantities
     */
    private function syncOrderSummaryFields(array $context, string $orderId, string $browserId, array $quantities): void
    {
        $metrics = $this->calculateMetrics($quantities);
        $orderDate = $this->orderTimestampFromOrderId($orderId);

        $summaryFields = [
            'total_items_requiring_payment' => (string) $metrics['paidLineCount'],
            'linetotal' => '0',
            'shippable_subtotal' => $this->formatMoney($metrics['shippableSubtotal']),
            'discountable_total' => $this->formatMoney($metrics['discountableTotal']),
            'pdf_total' => $this->formatMoney($metrics['downloadableSubtotal']),
            'ec_customer_login_state' => $this->buildCustomerLoginState($browserId, $orderId, $context, $quantities, $metrics, $orderDate),
        ];

        foreach ($summaryFields as $field => $value) {
            $this->upsertOrderField($context, $orderId, $field, $value);
        }
    }

    /**
     * @param array{merchantId:string,configId:string} $context
     */
    private function upsertOrderField(array $context, string $orderId, string $field, string $value): void
    {
        $update = $this->ccmDb->prepare(<<<'SQL'
UPDATE orders
SET value = :value
WHERE order_id = :order_id
  AND field = :field
SQL);
        $update->execute([
            'value' => $value,
            'order_id' => $orderId,
            'field' => $field,
        ]);

        if ($update->rowCount() > 0) {
            return;
        }

        $insert = $this->ccmDb->prepare(<<<'SQL'
INSERT INTO orders (merchant_id, config_id, order_id, field, value)
VALUES (:merchant_id, :config_id, :order_id, :field, :value)
SQL);
        $insert->execute([
            'merchant_id' => $context['merchantId'],
            'config_id' => $context['configId'],
            'order_id' => $orderId,
            'field' => $field,
            'value' => $value,
        ]);
    }

    /**
     * @param array<string,int> $quantities
     * @return array{paidLineCount:int,discountableTotal:float,downloadableSubtotal:float,shippableSubtotal:float,totalItemCount:int,uniqueItemCount:int,downloadableItemCount:int,nonDownloadableItemCount:int}
     */
    private function calculateMetrics(array $quantities): array
    {
        $paidLineCount = 0;
        $discountableTotal = 0.0;
        $downloadableSubtotal = 0.0;
        $shippableSubtotal = 0.0;
        $totalItemCount = 0;
        $downloadableItemCount = 0;
        $nonDownloadableItemCount = 0;

        foreach ($quantities as $productId => $quantity) {
            $product = $this->loadProduct($productId);
            if ($product === null) {
                continue;
            }

            $unitPrice = $this->parsePrice($product['price'] ?? null);
            $lineSubtotal = round($unitPrice * $quantity, 2);
            $isDownloadable = (bool) ($product['isDownloadable'] ?? false);

            $totalItemCount += $quantity;
            if ($unitPrice > 0.0) {
                $paidLineCount++;
                $discountableTotal += $lineSubtotal;
            }
            if ($isDownloadable) {
                $downloadableSubtotal += $lineSubtotal;
                $downloadableItemCount += $quantity;
            } else {
                $shippableSubtotal += $lineSubtotal;
                $nonDownloadableItemCount += $quantity;
            }
        }

        return [
            'paidLineCount' => $paidLineCount,
            'discountableTotal' => round($discountableTotal, 2),
            'downloadableSubtotal' => round($downloadableSubtotal, 2),
            'shippableSubtotal' => round($shippableSubtotal, 2),
            'totalItemCount' => $totalItemCount,
            'uniqueItemCount' => count($quantities),
            'downloadableItemCount' => $downloadableItemCount,
            'nonDownloadableItemCount' => $nonDownloadableItemCount,
        ];
    }

    /**
     * @param array<string,int> $quantities
     * @param array{merchantId:string,configId:string} $context
     * @param array{paidLineCount:int,discountableTotal:float,downloadableSubtotal:float,shippableSubtotal:float,totalItemCount:int,uniqueItemCount:int,downloadableItemCount:int,nonDownloadableItemCount:int} $metrics
     */
    private function buildCustomerLoginState(string $browserId, string $orderId, array $context, array $quantities, array $metrics, int $orderDate): string
    {
        $params = [];
        foreach ($quantities as $productId => $quantity) {
            $params[$productId] = (string) $quantity;
        }

        $params['ec_summary'] = 'order';
        $params['ec_total_non_downloadable_items'] = (string) $metrics['nonDownloadableItemCount'];
        $params['ec_items'] = (string) $metrics['uniqueItemCount'];
        $params['ec_c'] = $context['configId'];
        $params['ec-view-form'] = 'Check Out';
        $params['ec_order_id'] = $orderId;
        $params['ec_form'] = 'order';
        $params['total_items_requiring_payment'] = (string) $metrics['paidLineCount'];
        $params['linetotal'] = '0';
        $params['ec_b'] = $browserId;
        $params['ec_total_items'] = (string) $metrics['totalItemCount'];
        $params['ec_order_date'] = (string) $orderDate;
        $params['ec_customer_info'] = '';
        $params['ec_non_downloadable_items'] = (string) $metrics['nonDownloadableItemCount'];
        $params['ec_m'] = $context['merchantId'];
        $params['ec_downloadable_items'] = (string) $metrics['downloadableItemCount'];
        $params['shippable_subtotal'] = $this->formatMoney($metrics['shippableSubtotal']);
        $params['ec_total_downloadable_items'] = (string) $metrics['downloadableItemCount'];

        return http_build_query($params);
    }

    /**
     * @param array<string,int> $quantities
     * @param array{merchantId:string,configId:string} $context
     */
    private function buildBrowserStateString(array $quantities, array $context, ?string $orderId = null): string
    {
        if ($quantities === []) {
            return http_build_query([
                'ec-view-form' => 'makechanges',
                'ec_form' => 'makechanges',
                'ec_c' => $context['configId'],
                'ec_m' => $context['merchantId'],
            ]);
        }

        $params = [];
        foreach ($quantities as $productId => $quantity) {
            $params[$productId] = (string) $quantity;
        }

        $params['ec_summary'] = 'order';
        $params['ec_c'] = $context['configId'];
        $params['ec-add-order'] = 'Check Out';
        $params['ec_form'] = 'order';
        $params['ec_wishlist_summary'] = 'wishlist_summary';
        $params['ec_m'] = $context['merchantId'];
        if ($orderId !== null) {
            $params['ec_order_id'] = $orderId;
        }

        return http_build_query($params);
    }

    /**
     * @param array<string,mixed> $product
     * @return array<string,string>
     */
    private function itemFieldsForProduct(string $productId, int $quantity, array $product): array
    {
        $fields = [
            'is_downloadable' => !empty($product['isDownloadable']) ? 'Y' : '',
            'freebie' => !empty($product['freebie']) ? 'Y' : '',
            'product_price' => $this->formatMoney($this->parsePrice($product['price'] ?? null)),
            'product_description' => (string) ($product['description'] ?? ''),
            'sub_category2' => (string) ($product['subCategory2'] ?? ''),
            'ec_quantity_ordered' => (string) $quantity,
            'downloadable_filename' => (string) ($product['downloadableFilename'] ?? ''),
            'product_id' => $productId,
            'category' => (string) ($product['category'] ?? ''),
            'sub_category' => (string) ($product['subCategory'] ?? ''),
        ];

        if (trim((string) ($product['header'] ?? '')) !== '') {
            $fields['product_header'] = (string) $product['header'];
        }
        if (($product['preorder'] ?? null) !== null) {
            $fields['preorder'] = (string) (int) $product['preorder'];
        }

        return $fields;
    }

    /**
     * @return array<string,string>
     */
    private function submitOrderFields(array $draft, int $customerId, int $customerPoints): array
    {
        $paymentType = strtolower(trim((string) ($draft['paymentType'] ?? '')));
        $cardNumber = preg_replace('/\D+/', '', (string) ($draft['payCardNumber'] ?? '')) ?? '';
        $cardLast4 = (string) ($draft['payCardLast4'] ?? '');
        if ($cardLast4 === '' && strlen($cardNumber) >= 4) {
            $cardLast4 = substr($cardNumber, -4);
        }

        return [
            'ship_name' => trim((string) ($draft['shipName'] ?? '')),
            'ship_email' => strtolower(trim((string) ($draft['shipEmail'] ?? ''))),
            'ship_phone' => trim((string) ($draft['shipPhone'] ?? '')),
            'ship_street' => trim((string) ($draft['shipStreet'] ?? '')),
            'ship_street2' => trim((string) ($draft['shipStreet2'] ?? '')),
            'ship_city' => trim((string) ($draft['shipCity'] ?? '')),
            'ship_state' => trim((string) ($draft['shipState'] ?? '')),
            'ship_zip' => trim((string) ($draft['shipZip'] ?? '')),
            'ship_country' => trim((string) ($draft['shipCountry'] ?? '')),
            'bill_name' => trim((string) ($draft['billName'] ?? '')),
            'bill_street' => trim((string) ($draft['billStreet'] ?? '')),
            'bill_street2' => trim((string) ($draft['billStreet2'] ?? '')),
            'bill_city' => trim((string) ($draft['billCity'] ?? '')),
            'bill_state' => trim((string) ($draft['billState'] ?? '')),
            'bill_zip' => trim((string) ($draft['billZip'] ?? '')),
            'bill_country' => trim((string) ($draft['billCountry'] ?? '')),
            'ship_method' => trim((string) ($draft['shipMethod'] ?? '')),
            'pay_cardtype' => $paymentType,
            'pay_cardname' => trim((string) ($draft['payCardName'] ?? '')),
            'pay_cardmonth' => trim((string) ($draft['payCardMonth'] ?? '')),
            'pay_cardyear' => trim((string) ($draft['payCardYear'] ?? '')),
            'pay_cardno' => $cardNumber,
            'pay_card_last4' => $cardLast4,
            'promocode' => trim((string) ($draft['promoCode'] ?? '')),
            'points' => (string) max(0, $customerPoints),
            'points_applied' => (string) max(0, (int) ($draft['pointsApplied'] ?? 0)),
            'eu_choice' => trim((string) ($draft['euChoice'] ?? '')),
            'change' => 'T',
            'customerid' => (string) $customerId,
            'ec_customer_id' => strtolower(trim((string) ($draft['shipEmail'] ?? ''))),
        ];
    }

    /**
     * @return array<string,int>
     */
    private function parseQuantitiesFromBrowserState(string $state): array
    {
        if (trim($state) === '') {
            return [];
        }

        parse_str($state, $params);
        if (!is_array($params)) {
            return [];
        }

        $quantities = [];
        foreach ($params as $key => $value) {
            if (!is_string($key)) {
                continue;
            }
            if (str_starts_with($key, 'ec_')) {
                continue;
            }
            if (str_contains($key, '-')) {
                continue;
            }
            $quantity = (int) $value;
            if ($quantity <= 0) {
                continue;
            }
            if ($this->loadProduct($key) === null) {
                continue;
            }
            $quantities[$key] = min(999, $quantity);
        }

        ksort($quantities);
        return $quantities;
    }

    /**
     * @param array<string,int> $quantities
     * @return array<string,int>
     */
    private function normalizeQuantities(array $quantities): array
    {
        $normalized = [];
        foreach ($quantities as $productId => $quantity) {
            $productId = trim((string) $productId);
            $quantity = (int) $quantity;
            if ($productId === '' || $quantity <= 0) {
                continue;
            }
            $normalized[$productId] = min(999, $quantity);
        }

        ksort($normalized);
        return $normalized;
    }

    private function loadProduct(string $productId): ?array
    {
        if (!array_key_exists($productId, $this->productCache)) {
            $this->productCache[$productId] = $this->products->findById($productId);
        }

        return $this->productCache[$productId];
    }

    private function isTruthy(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        $normalized = strtoupper(trim((string) $value));
        return $normalized === 'Y' || $normalized === '1' || $normalized === 'TRUE';
    }

    private function parsePrice(mixed $price): float
    {
        if ($price === null) {
            return 0.0;
        }

        $normalized = preg_replace('/[^0-9.\-]/', '', (string) $price) ?: '0';
        return round((float) $normalized, 2);
    }

    private function formatMoney(float $value): string
    {
        return number_format(round($value, 2), 2, '.', '');
    }

    private function toUnix(string $value): int
    {
        $ts = strtotime($value);
        return $ts === false ? 0 : $ts;
    }

    /**
     * @param array{merchantId:string,configId:string} $context
     */
    private function generateOrderId(array $context): string
    {
        $stmt = $this->ccmDb->prepare(<<<'SQL'
SELECT order_id
FROM order_status
WHERE merchant_id = :merchant_id
  AND config_id = :config_id
ORDER BY last_updated DESC NULLS LAST
LIMIT 1
SQL);
        $stmt->execute([
            'merchant_id' => $context['merchantId'],
            'config_id' => $context['configId'],
        ]);
        $lastOrderId = (string) ($stmt->fetchColumn() ?: '');

        $prefix = '1283029480';
        if ($lastOrderId !== '' && str_contains($lastOrderId, '-')) {
            [$maybePrefix] = explode('-', $lastOrderId, 2);
            if ($maybePrefix !== '') {
                $prefix = $maybePrefix;
            }
        }

        return sprintf('%s-%d', $prefix, time());
    }

    private function orderTimestampFromOrderId(string $orderId): int
    {
        if (str_contains($orderId, '-')) {
            [, $suffix] = explode('-', $orderId, 2);
            if (ctype_digit($suffix)) {
                return (int) $suffix;
            }
        }

        return time();
    }
}
