<?php

declare(strict_types=1);

/**
 * @fileoverview Merchant/admin parity repository: access scopes, order admin queries, config export/import, and product upload import.
 */

namespace ColumbiaGames\Api\Repositories;

use PDO;
use RuntimeException;

final class AdminRepository
{
    /** @var array<string, list<string>> */
    private const CONFIG_TABLE_COLUMNS = [
        'customer_databases' => [
            'merchant_id', 'config_id', 'customers_table', 'customer_id_field', 'customer_passwd_field', 'auto_login', 'auto_login_field',
            'login_summaries', 'login_forms', 'anonymous_login', 'login_form', 'new_customer_error_script', 'new_customer_error_template',
            'customer_fields', 'save_customer_summaries', 'save_customer_forms', 'login_info', 'anonymous_info', 'login_error_script',
            'login_error_template', 'password_reply_template', 'password_email_template', 'password_email_field', 'customer_email_field', 'password_error_template',
        ],
        'merchant_configurations' => [
            'merchant_id', 'config_id', 'payserver_host', 'payserver_port', 'payserver_path', 'product_fields', 'product_id_field',
            'product_description_field', 'product_price_field', 'order_fields', 'tax_rates', 'tax_field', 'shipping_rates', 'shipping_field',
            'discount_rates', 'discount_field', 'partial_order_age', 'summaries', 'forms', 'note_template', 'posterror_template', 'cybercash_type',
            'pay_error_template', 'pay_message_template', 'bank_message_template', 'record_message_template', 'secure_record_template',
            'admin_order_summary_template', 'admin_order_detail_template', 'admin_empty_summary_template', 'admin_empty_detail_template',
            'secure_pay_error_template', 'no_bid_cookie_template', 'datasource', 'username', 'password', 'extensions', 'products_table',
            'cancel_order_template', 'template_style',
        ],
        'merchant_downloads' => [
            'merchant_id', 'config_id', 'download_directory', 'is_downloadable_field', 'filename_field', 'password_field', 'record_template',
            'password_template', 'download_template', 'error_template', 'download_age_limit',
        ],
        'merchant_order_downloads' => ['merchant_id', 'config_id', 'header_template', 'detail_template'],
        'merchant_product_uploads' => [
            'merchant_id', 'config_id', 'source_file', 'source_format', 'source_has_fieldnames', 'override_fields', 'fields', 'save_copy', 'save_file',
        ],
        'payflowpro' => [
            'merchant_id', 'config_id', 'error_template', 'extra_request_fields', 'extra_response_fields', 'test_mode', 'auth_mode', 'vendor', 'partner',
            'pwd', 'user_id', 'street', 'zip', 'card_number', 'card_expire_month', 'card_expire_year', 'card_amount', 'result_code', 'response_message', 'reference_code',
        ],
    ];

    /** @var list<string> */
    private const PRODUCT_COLUMNS = [
        'product_id', 'product_description', 'product_price', 'category', 'product_image', 'product_image2', 'product_extendeddescription',
        'product_specs', 'product_resources', 'sub_category', 'preorder', 'sub_category2', 'wishlist_customer', 'retailer_pricelist',
        'net_price', 'product_status', 'notes', 'is_downloadable', 'downloadable_filename', 'freebie', 'release_date', 'product_header',
        'pledges_required', 'pledge_deadline', 'category_weight', 'product_image3', 'product_image4', 'caption2', 'caption3', 'caption4', 'caption1',
    ];

    public function __construct(
        private readonly PDO $ccmDb,
        private readonly PDO $storeDb,
        private readonly PDO $rewriteDb,
    ) {
    }

    public function listScopesForCustomer(int $customerId): array
    {
        $stmt = $this->rewriteDb->prepare(<<<'SQL'
SELECT customerid, merchant_id, config_id, is_active, notes, created_at, updated_at
FROM admin_user_scopes
WHERE customerid = :customerid AND is_active = true
ORDER BY merchant_id, config_id
SQL);
        $stmt->execute(['customerid' => $customerId]);
        return array_map(static fn (array $row): array => [
            'customerId' => (int) ($row['customerid'] ?? 0),
            'merchantId' => (string) ($row['merchant_id'] ?? ''),
            'configId' => (string) ($row['config_id'] ?? ''),
            'isActive' => (bool) ($row['is_active'] ?? false),
            'notes' => $row['notes'] ?? null,
            'createdAt' => $row['created_at'] ?? null,
            'updatedAt' => $row['updated_at'] ?? null,
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function resolveScopeForCustomer(int $customerId, ?string $merchantId, ?string $configId): ?array
    {
        $scopes = $this->listScopesForCustomer($customerId);
        if ($scopes === []) {
            return null;
        }

        $wantedMerchantId = trim((string) $merchantId);
        $wantedConfigId = trim((string) $configId);

        if ($wantedMerchantId === '' && $wantedConfigId === '') {
            return $scopes[0];
        }

        foreach ($scopes as $scope) {
            if (($wantedMerchantId === '' || $scope['merchantId'] === $wantedMerchantId)
                && ($wantedConfigId === '' || $scope['configId'] === $wantedConfigId)) {
                return $scope;
            }
        }

        return null;
    }


    public function getStorefrontThemeConfig(?string $merchantId = null, ?string $configId = null): array
    {
        $scope = $this->resolveStorefrontScope($merchantId, $configId);
        $override = $this->findStorefrontThemeOverride($scope['merchantId'], $scope['configId']);
        if ($override !== null) {
            $rawTemplateStyle = trim((string) ($override['theme'] ?? ''));

            return [
                'merchantId' => $scope['merchantId'],
                'configId' => $scope['configId'],
                'theme' => $this->normalizeStorefrontTheme($rawTemplateStyle),
                'rawTemplateStyle' => $rawTemplateStyle,
                'availableThemes' => $this->availableStorefrontThemes(),
                'source' => 'rewrite.storefront_theme_overrides.theme',
            ];
        }

        $stmt = $this->ccmDb->prepare(<<<'SQL'
SELECT template_style
FROM merchant_configurations
WHERE merchant_id = :merchant_id
  AND config_id = :config_id
LIMIT 1
SQL);
        $stmt->execute([
            'merchant_id' => $scope['merchantId'],
            'config_id' => $scope['configId'],
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        $rawTemplateStyle = trim((string) ($row['template_style'] ?? ''));
        $theme = $this->normalizeStorefrontTheme($rawTemplateStyle);

        return [
            'merchantId' => $scope['merchantId'],
            'configId' => $scope['configId'],
            'theme' => $theme,
            'rawTemplateStyle' => $rawTemplateStyle,
            'availableThemes' => $this->availableStorefrontThemes(),
            'source' => $row === null ? 'default-fallback' : 'merchant_configurations.template_style (read-only fallback)',
        ];
    }

    public function updateStorefrontTheme(array $scope, string $theme): array
    {
        $normalizedTheme = $this->normalizeStorefrontTheme($theme);
        if (!in_array($normalizedTheme, $this->availableStorefrontThemes(), true)) {
            throw new RuntimeException('Unsupported storefront theme.');
        }

        $stmt = $this->rewriteDb->prepare(<<<'SQL'
INSERT INTO storefront_theme_overrides (merchant_id, config_id, theme, updated_at)
VALUES (:merchant_id, :config_id, :theme, NOW())
ON CONFLICT (merchant_id, config_id)
DO UPDATE SET theme = EXCLUDED.theme, updated_at = NOW()
SQL);
        $stmt->execute([
            'theme' => $normalizedTheme,
            'merchant_id' => $scope['merchantId'],
            'config_id' => $scope['configId'],
        ]);

        return $this->getStorefrontThemeConfig($scope['merchantId'], $scope['configId']);
    }

    public function listOrders(array $scope, array $filters): array
    {
        $query = trim((string) ($filters['q'] ?? ''));
        $view = strtolower(trim((string) ($filters['view'] ?? 'queue')));
        $limit = max(1, min((int) ($filters['limit'] ?? 25), 100));
        $offset = max(0, (int) ($filters['offset'] ?? 0));

        $where = [
            'os.merchant_id = :merchant_id',
            'os.config_id = :config_id',
            'os.status = 0',
        ];
        $params = [
            'merchant_id' => $scope['merchantId'],
            'config_id' => $scope['configId'],
        ];

        if ($query !== '') {
            $where[] = <<<'SQL'
(
    os.order_id ILIKE :search
    OR EXISTS (
        SELECT 1
        FROM orders o
        WHERE o.merchant_id = os.merchant_id
          AND o.config_id = os.config_id
          AND o.order_id = os.order_id
          AND (
            o.field IN ('ship_name', 'ship_email', 'ship_city', 'ship_country', 'ship_method', 'promocode')
            OR o.field LIKE 'bill_%'
          )
          AND o.value ILIKE :search
    )
    OR EXISTS (
        SELECT 1
        FROM items i
        WHERE i.merchant_id = os.merchant_id
          AND i.config_id = os.config_id
          AND i.order_id = os.order_id
          AND (
            i.product_id ILIKE :search
            OR (i.field = 'product_description' AND i.value ILIKE :search)
          )
    )
)
SQL;
            $params['search'] = '%' . $query . '%';
        }

        $markedOrderIds = $this->fetchMarkedOrderIds($scope);
        if ($view === 'queue' && $markedOrderIds !== []) {
            [$notInSql, $notInParams] = $this->buildInCondition('os.order_id', $markedOrderIds, 'marked_');
            $where[] = 'NOT ' . $notInSql;
            $params = array_merge($params, $notInParams);
        }

        $whereSql = implode(' AND ', $where);

        $countStmt = $this->ccmDb->prepare("SELECT COUNT(*) AS total FROM order_status os WHERE {$whereSql}");
        foreach ($params as $key => $value) {
            $countStmt->bindValue(':' . $key, $value);
        }
        $countStmt->execute();
        $total = (int) (($countStmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0));

        $sql = <<<SQL
SELECT
    os.order_id,
    os.status,
    os.last_updated,
    order_fields.ship_name,
    order_fields.ship_email,
    order_fields.ship_city,
    order_fields.ship_country,
    order_fields.ship_method,
    order_fields.shippable_subtotal,
    order_fields.pdf_total,
    order_fields.total_items_requiring_payment,
    order_fields.points_applied,
    order_fields.promocode,
    item_meta.item_count,
    item_meta.total_quantity
FROM order_status os
LEFT JOIN LATERAL (
    SELECT
        MAX(CASE WHEN field = 'ship_name' THEN value END) AS ship_name,
        MAX(CASE WHEN field = 'ship_email' THEN value END) AS ship_email,
        MAX(CASE WHEN field = 'ship_city' THEN value END) AS ship_city,
        MAX(CASE WHEN field = 'ship_country' THEN value END) AS ship_country,
        MAX(CASE WHEN field = 'ship_method' THEN value END) AS ship_method,
        MAX(CASE WHEN field = 'shippable_subtotal' THEN value END) AS shippable_subtotal,
        MAX(CASE WHEN field = 'pdf_total' THEN value END) AS pdf_total,
        MAX(CASE WHEN field = 'total_items_requiring_payment' THEN value END) AS total_items_requiring_payment,
        MAX(CASE WHEN field = 'points_applied' THEN value END) AS points_applied,
        MAX(CASE WHEN field = 'promocode' THEN value END) AS promocode
    FROM orders o
    WHERE o.merchant_id = os.merchant_id
      AND o.config_id = os.config_id
      AND o.order_id = os.order_id
) AS order_fields ON true
LEFT JOIN LATERAL (
    SELECT
        COUNT(DISTINCT i.product_id) AS item_count,
        COALESCE(SUM(CASE WHEN i.field = 'ec_quantity_ordered' THEN NULLIF(i.value, '')::integer ELSE 0 END), 0) AS total_quantity
    FROM items i
    WHERE i.merchant_id = os.merchant_id
      AND i.config_id = os.config_id
      AND i.order_id = os.order_id
) AS item_meta ON true
WHERE {$whereSql}
ORDER BY os.last_updated DESC NULLS LAST, os.order_id DESC
LIMIT :limit OFFSET :offset
SQL;
        $stmt = $this->ccmDb->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $latestMarks = $this->fetchLatestMarksByOrderIds($scope, array_map(static fn (array $row): string => (string) ($row['order_id'] ?? ''), $rows));
        $normalizedItems = [];
        foreach ($rows as $row) {
            $normalized = $this->normalizeOrderSummaryRow($row);
            $normalized['latestMark'] = $latestMarks[$normalized['orderId']] ?? null;
            $normalizedItems[] = $normalized;
        }

        if ($view === 'all') {
            usort($normalizedItems, static function (array $left, array $right): int {
                $leftMarked = $left['latestMark'] !== null;
                $rightMarked = $right['latestMark'] !== null;
                if ($leftMarked !== $rightMarked) {
                    return $leftMarked <=> $rightMarked;
                }
                return strcmp((string) ($right['lastUpdated'] ?? ''), (string) ($left['lastUpdated'] ?? ''));
            });
        }

        return [
            'items' => $normalizedItems,
            'meta' => [
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset,
                'view' => $view,
                'query' => $query,
            ],
        ];
    }

    public function findOrderDetail(array $scope, string $orderId): ?array
    {
        $statusStmt = $this->ccmDb->prepare(<<<'SQL'
SELECT order_id, status, last_updated
FROM order_status
WHERE merchant_id = :merchant_id AND config_id = :config_id AND order_id = :order_id
ORDER BY last_updated DESC NULLS LAST
LIMIT 1
SQL);
        $statusStmt->execute([
            'merchant_id' => $scope['merchantId'],
            'config_id' => $scope['configId'],
            'order_id' => $orderId,
        ]);
        $statusRow = $statusStmt->fetch(PDO::FETCH_ASSOC);
        if ($statusRow === false) {
            return null;
        }

        $fieldStmt = $this->ccmDb->prepare(<<<'SQL'
SELECT field, value
FROM orders
WHERE merchant_id = :merchant_id AND config_id = :config_id AND order_id = :order_id
ORDER BY field
SQL);
        $fieldStmt->execute([
            'merchant_id' => $scope['merchantId'],
            'config_id' => $scope['configId'],
            'order_id' => $orderId,
        ]);
        $fields = [];
        foreach ($fieldStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $field = trim((string) ($row['field'] ?? ''));
            if ($field === '') {
                continue;
            }
            $fields[$field] = (string) ($row['value'] ?? '');
        }

        $itemStmt = $this->ccmDb->prepare(<<<'SQL'
SELECT product_id, field, value
FROM items
WHERE merchant_id = :merchant_id AND config_id = :config_id AND order_id = :order_id
ORDER BY product_id, field
SQL);
        $itemStmt->execute([
            'merchant_id' => $scope['merchantId'],
            'config_id' => $scope['configId'],
            'order_id' => $orderId,
        ]);
        $items = [];
        foreach ($itemStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $productId = trim((string) ($row['product_id'] ?? ''));
            $field = trim((string) ($row['field'] ?? ''));
            if ($productId === '' || $field === '') {
                continue;
            }
            if (!isset($items[$productId])) {
                $items[$productId] = [
                    'productId' => $productId,
                    'fields' => [],
                ];
            }
            $items[$productId]['fields'][$field] = (string) ($row['value'] ?? '');
        }

        $marksStmt = $this->rewriteDb->prepare(<<<'SQL'
SELECT id, action, note, customerid, created_at
FROM admin_order_marks
WHERE merchant_id = :merchant_id AND config_id = :config_id AND order_id = :order_id
ORDER BY created_at DESC, id DESC
SQL);
        $marksStmt->execute([
            'merchant_id' => $scope['merchantId'],
            'config_id' => $scope['configId'],
            'order_id' => $orderId,
        ]);

        return [
            'orderId' => $orderId,
            'merchantId' => $scope['merchantId'],
            'configId' => $scope['configId'],
            'status' => (int) ($statusRow['status'] ?? 0),
            'lastUpdated' => $statusRow['last_updated'] ?? null,
            'fields' => $fields,
            'items' => array_values(array_map([$this, 'normalizeOrderItem'], $items)),
            'marks' => array_map(static fn (array $row): array => [
                'id' => (int) ($row['id'] ?? 0),
                'action' => (string) ($row['action'] ?? ''),
                'note' => $row['note'] ?? null,
                'customerId' => (int) ($row['customerid'] ?? 0),
                'createdAt' => $row['created_at'] ?? null,
            ], $marksStmt->fetchAll(PDO::FETCH_ASSOC)),
        ];
    }

    public function markOrder(array $scope, string $orderId, int $customerId, string $action, ?string $note): array
    {
        $detail = $this->findOrderDetail($scope, $orderId);
        if ($detail === null) {
            throw new RuntimeException('Order not found for the selected admin scope.');
        }

        $normalizedAction = trim($action) !== '' ? trim($action) : 'mark';
        $stmt = $this->rewriteDb->prepare(<<<'SQL'
INSERT INTO admin_order_marks (order_id, merchant_id, config_id, customerid, action, note)
VALUES (:order_id, :merchant_id, :config_id, :customerid, :action, :note)
RETURNING id, order_id, merchant_id, config_id, customerid, action, note, created_at
SQL);
        $stmt->execute([
            'order_id' => $orderId,
            'merchant_id' => $scope['merchantId'],
            'config_id' => $scope['configId'],
            'customerid' => $customerId,
            'action' => $normalizedAction,
            'note' => $note,
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'id' => (int) ($row['id'] ?? 0),
            'orderId' => (string) ($row['order_id'] ?? $orderId),
            'merchantId' => (string) ($row['merchant_id'] ?? $scope['merchantId']),
            'configId' => (string) ($row['config_id'] ?? $scope['configId']),
            'customerId' => (int) ($row['customerid'] ?? $customerId),
            'action' => (string) ($row['action'] ?? $normalizedAction),
            'note' => $row['note'] ?? null,
            'createdAt' => $row['created_at'] ?? null,
        ];
    }

    public function configInventory(array $scope): array
    {
        $rows = [];
        foreach (self::CONFIG_TABLE_COLUMNS as $table => $columns) {
            $row = $this->loadScopeRow($table, $scope);
            $rows[] = [
                'table' => $table,
                'present' => $row !== null,
                'columns' => $columns,
                'row' => $row,
            ];
        }

        $operations = [
            [
                'operation' => 'config-export',
                'required' => true,
                'implemented' => true,
                'notes' => 'Exports the scoped legacy merchant/config rows into a JSON bundle.',
            ],
            [
                'operation' => 'config-import',
                'required' => true,
                'implemented' => true,
                'notes' => 'Replaces the scoped legacy merchant/config rows from a previously exported JSON bundle.',
            ],
            [
                'operation' => 'order-queue',
                'required' => true,
                'implemented' => true,
                'notes' => 'Scoped order queue/list/search is provided via /admin/orders.',
            ],
            [
                'operation' => 'product-table-upload',
                'required' => true,
                'implemented' => true,
                'notes' => 'Tab-delimited preview/apply flow is provided via /admin/product-upload/*. Source-file copy side-effects are not mirrored.',
            ],
        ];

        return [
            'scope' => ['merchantId' => $scope['merchantId'], 'configId' => $scope['configId']],
            'rows' => $rows,
            'operations' => $operations,
        ];
    }

    public function exportConfigBundle(array $scope): array
    {
        $tables = [];
        foreach (array_keys(self::CONFIG_TABLE_COLUMNS) as $table) {
            $tables[$table] = $this->loadScopeRows($table, $scope);
        }

        return [
            'schemaVersion' => 1,
            'exportedAt' => gmdate(DATE_ATOM),
            'scope' => ['merchantId' => $scope['merchantId'], 'configId' => $scope['configId']],
            'tables' => $tables,
        ];
    }

    public function importConfigBundle(array $scope, array $bundle, int $customerId): array
    {
        $tables = is_array($bundle['tables'] ?? null) ? $bundle['tables'] : [];
        $imported = [];

        $this->ccmDb->beginTransaction();
        try {
            foreach (self::CONFIG_TABLE_COLUMNS as $table => $columns) {
                $rows = $tables[$table] ?? [];
                if ($rows !== [] && array_is_list($rows) === false) {
                    $rows = [$rows];
                }
                if (!is_array($rows)) {
                    $rows = [];
                }

                $deleteStmt = $this->ccmDb->prepare("DELETE FROM {$table} WHERE merchant_id = :merchant_id AND config_id = :config_id");
                $deleteStmt->execute([
                    'merchant_id' => $scope['merchantId'],
                    'config_id' => $scope['configId'],
                ]);

                $count = 0;
                foreach ($rows as $row) {
                    if (!is_array($row)) {
                        continue;
                    }
                    $normalized = $this->normalizeConfigInsertRow($columns, $row, $scope);
                    $this->insertConfigRow($table, $columns, $normalized);
                    $count++;
                }
                $imported[$table] = $count;
            }
            $this->ccmDb->commit();
        } catch (\Throwable $e) {
            if ($this->ccmDb->inTransaction()) {
                $this->ccmDb->rollBack();
            }
            throw $e;
        }

        return [
            'scope' => ['merchantId' => $scope['merchantId'], 'configId' => $scope['configId']],
            'importedTables' => $imported,
            'importedByCustomerId' => $customerId,
            'importedAt' => gmdate(DATE_ATOM),
        ];
    }

    public function productUploadSettings(array $scope): array
    {
        $row = $this->loadScopeRow('merchant_product_uploads', $scope);
        if ($row === null) {
            throw new RuntimeException('merchant_product_uploads row is missing for the selected admin scope.');
        }

        $fields = $this->splitLegacyFieldList((string) ($row['fields'] ?? ''));
        return [
            'scope' => ['merchantId' => $scope['merchantId'], 'configId' => $scope['configId']],
            'sourceFormat' => (int) ($row['source_format'] ?? 0),
            'sourceHasFieldNames' => $this->toBool($row['source_has_fieldnames'] ?? null),
            'overrideFields' => $this->toBool($row['override_fields'] ?? null),
            'fields' => $fields,
            'saveCopy' => $this->toBool($row['save_copy'] ?? null),
            'saveFile' => $row['save_file'] ?? null,
            'sourceFile' => $row['source_file'] ?? null,
            'supportedInput' => [
                'delimiter' => ((int) ($row['source_format'] ?? 0) === 1) ? 'tab' : 'csv',
                'notes' => [
                    'The rewrite preview/apply flow accepts pasted file contents rather than filesystem source-file reads.',
                    'Legacy save-copy/source-file side-effects are reported but not replayed by the rewrite.',
                ],
            ],
        ];
    }

    public function previewProductUpload(array $scope, string $content, ?array $fieldNames, ?bool $hasHeaderRow): array
    {
        $settings = $this->productUploadSettings($scope);
        $parsed = $this->parseProductUploadContent($content, $settings, $fieldNames, $hasHeaderRow);
        $existingIds = $this->fetchExistingProductIds(array_column($parsed['rows'], 'product_id'));
        $previewRows = [];

        foreach ($parsed['rows'] as $index => $row) {
            $previewRows[] = [
                'rowNumber' => $index + 1,
                'productId' => $row['product_id'],
                'mode' => in_array($row['product_id'], $existingIds, true) ? 'update' : 'insert',
                'fields' => $row,
            ];
        }

        return [
            'scope' => $settings['scope'],
            'delimiter' => $settings['supportedInput']['delimiter'],
            'fieldNames' => $parsed['fieldNames'],
            'rowCount' => count($previewRows),
            'insertCount' => count(array_filter($previewRows, static fn (array $row): bool => $row['mode'] === 'insert')),
            'updateCount' => count(array_filter($previewRows, static fn (array $row): bool => $row['mode'] === 'update')),
            'warnings' => $parsed['warnings'],
            'rows' => $previewRows,
        ];
    }

    public function applyProductUpload(array $scope, string $content, ?array $fieldNames, ?bool $hasHeaderRow, int $customerId): array
    {
        $settings = $this->productUploadSettings($scope);
        $parsed = $this->parseProductUploadContent($content, $settings, $fieldNames, $hasHeaderRow);
        $rows = $parsed['rows'];
        if ($rows === []) {
            throw new RuntimeException('No importable product rows were parsed from the supplied content.');
        }

        $existingIds = $this->fetchExistingProductIds(array_column($rows, 'product_id'));
        $inserted = 0;
        $updated = 0;

        $this->storeDb->beginTransaction();
        try {
            foreach ($rows as $row) {
                $columns = array_values(array_filter(self::PRODUCT_COLUMNS, static fn (string $column): bool => array_key_exists($column, $row)));
                if (!in_array('product_id', $columns, true)) {
                    continue;
                }
                $this->upsertProductRow($columns, $row);
                if (in_array($row['product_id'], $existingIds, true)) {
                    $updated++;
                } else {
                    $inserted++;
                }
            }
            $this->storeDb->commit();
        } catch (\Throwable $e) {
            if ($this->storeDb->inTransaction()) {
                $this->storeDb->rollBack();
            }
            throw $e;
        }

        return [
            'scope' => $settings['scope'],
            'appliedByCustomerId' => $customerId,
            'appliedAt' => gmdate(DATE_ATOM),
            'rowCount' => count($rows),
            'insertCount' => $inserted,
            'updateCount' => $updated,
            'warnings' => $parsed['warnings'],
            'notes' => [
                'Products were upserted into public.products keyed by product_id.',
                'Legacy save-copy/source-file side-effects were not replayed by the rewrite import path.',
            ],
        ];
    }

    /** @return list<string> */
    private function fetchMarkedOrderIds(array $scope): array
    {
        $stmt = $this->rewriteDb->prepare(<<<'SQL'
SELECT DISTINCT order_id
FROM admin_order_marks
WHERE merchant_id = :merchant_id AND config_id = :config_id
SQL);
        $stmt->execute([
            'merchant_id' => $scope['merchantId'],
            'config_id' => $scope['configId'],
        ]);
        return array_values(array_filter(array_map(static fn (array $row): string => (string) ($row['order_id'] ?? ''), $stmt->fetchAll(PDO::FETCH_ASSOC)), static fn (string $value): bool => $value !== ''));
    }

    /**
     * @param list<string> $orderIds
     * @return array<string, array{action:string,note:?string,customerId:int,createdAt:?string}>
     */
    private function fetchLatestMarksByOrderIds(array $scope, array $orderIds): array
    {
        $orderIds = array_values(array_filter(array_unique(array_map(static fn ($value): string => trim((string) $value), $orderIds)), static fn (string $value): bool => $value !== ''));
        if ($orderIds === []) {
            return [];
        }

        [$inSql, $params] = $this->buildInCondition('order_id', $orderIds, 'order_');
        $stmt = $this->rewriteDb->prepare(
            'SELECT DISTINCT ON (order_id) order_id, action, note, customerid, created_at '
            . 'FROM admin_order_marks WHERE merchant_id = :merchant_id AND config_id = :config_id AND ' . $inSql
            . ' ORDER BY order_id, created_at DESC, id DESC'
        );
        $stmt->bindValue(':merchant_id', $scope['merchantId']);
        $stmt->bindValue(':config_id', $scope['configId']);
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->execute();

        $result = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $orderId = (string) ($row['order_id'] ?? '');
            if ($orderId === '') {
                continue;
            }
            $result[$orderId] = [
                'action' => (string) ($row['action'] ?? ''),
                'note' => $row['note'] ?? null,
                'customerId' => (int) ($row['customerid'] ?? 0),
                'createdAt' => $row['created_at'] ?? null,
            ];
        }
        return $result;
    }

    /**
     * @param list<string> $values
     * @return array{0:string,1:array<string,string>}
     */
    private function buildInCondition(string $column, array $values, string $prefix): array
    {
        $placeholders = [];
        $params = [];
        foreach (array_values($values) as $index => $value) {
            $key = $prefix . $index;
            $placeholders[] = ':' . $key;
            $params[$key] = $value;
        }
        return [sprintf('%s IN (%s)', $column, implode(', ', $placeholders)), $params];
    }

    private function normalizeOrderSummaryRow(array $row): array
    {
        return [
            'orderId' => (string) ($row['order_id'] ?? ''),
            'status' => (int) ($row['status'] ?? 0),
            'lastUpdated' => $row['last_updated'] ?? null,
            'shipName' => $row['ship_name'] ?? null,
            'shipEmail' => $row['ship_email'] ?? null,
            'shipCity' => $row['ship_city'] ?? null,
            'shipCountry' => $row['ship_country'] ?? null,
            'shipMethod' => $row['ship_method'] ?? null,
            'shippableSubtotal' => $row['shippable_subtotal'] ?? null,
            'pdfTotal' => $row['pdf_total'] ?? null,
            'totalItemsRequiringPayment' => isset($row['total_items_requiring_payment']) ? (int) $row['total_items_requiring_payment'] : null,
            'pointsApplied' => isset($row['points_applied']) && $row['points_applied'] !== '' ? (int) $row['points_applied'] : null,
            'promoCode' => $row['promocode'] ?? null,
            'itemCount' => (int) ($row['item_count'] ?? 0),
            'totalQuantity' => (int) ($row['total_quantity'] ?? 0),
            'latestMark' => ($row['latest_mark_action'] ?? null) === null ? null : [
                'action' => (string) ($row['latest_mark_action'] ?? ''),
                'note' => $row['latest_mark_note'] ?? null,
                'customerId' => (int) ($row['latest_mark_customerid'] ?? 0),
                'createdAt' => $row['latest_mark_created_at'] ?? null,
            ],
        ];
    }

    private function normalizeOrderItem(array $item): array
    {
        $fields = $item['fields'];
        return [
            'productId' => $item['productId'],
            'description' => $fields['product_description'] ?? null,
            'quantity' => isset($fields['ec_quantity_ordered']) ? (int) $fields['ec_quantity_ordered'] : 0,
            'price' => $fields['product_price'] ?? null,
            'category' => $fields['category'] ?? null,
            'subCategory' => $fields['sub_category'] ?? null,
            'subCategory2' => $fields['sub_category2'] ?? null,
            'isDownloadable' => !empty($fields['is_downloadable']),
            'fields' => $fields,
        ];
    }

    private function loadScopeRow(string $table, array $scope): ?array
    {
        $rows = $this->loadScopeRows($table, $scope);
        return $rows[0] ?? null;
    }

    private function loadScopeRows(string $table, array $scope): array
    {
        $stmt = $this->ccmDb->prepare("SELECT * FROM {$table} WHERE merchant_id = :merchant_id AND config_id = :config_id");
        $stmt->execute([
            'merchant_id' => $scope['merchantId'],
            'config_id' => $scope['configId'],
        ]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /** @param list<string> $columns */
    private function normalizeConfigInsertRow(array $columns, array $row, array $scope): array
    {
        $normalized = [];
        foreach ($columns as $column) {
            if ($column === 'merchant_id') {
                $normalized[$column] = $scope['merchantId'];
                continue;
            }
            if ($column === 'config_id') {
                $normalized[$column] = $scope['configId'];
                continue;
            }
            $normalized[$column] = $row[$column] ?? null;
        }
        return $normalized;
    }

    /** @param list<string> $columns */
    private function insertConfigRow(string $table, array $columns, array $row): void
    {
        $columnList = implode(', ', $columns);
        $placeholders = implode(', ', array_map(static fn (string $column): string => ':' . $column, $columns));
        $stmt = $this->ccmDb->prepare("INSERT INTO {$table} ({$columnList}) VALUES ({$placeholders})");
        $stmt->execute($row);
    }

    /** @return list<string> */
    private function splitLegacyFieldList(string $value): array
    {
        $parts = preg_split('/\r\n|\n|\r/', $value) ?: [];
        $parts = array_values(array_filter(array_map(static fn (string $part): string => trim($part), $parts), static fn (string $part): bool => $part !== ''));
        return array_values(array_unique($parts));
    }

    /**
     * @param array<string, mixed> $settings
     * @param list<string>|null $fieldNames
     * @return array{fieldNames:list<string>,rows:list<array<string,mixed>>,warnings:list<string>}
     */
    private function parseProductUploadContent(string $content, array $settings, ?array $fieldNames, ?bool $hasHeaderRow): array
    {
        $trimmed = trim($content);
        if ($trimmed === '') {
            throw new RuntimeException('Upload content is required.');
        }

        $delimiter = (($settings['sourceFormat'] ?? 0) === 1) ? "\t" : ',';
        $lines = preg_split('/\r\n|\n|\r/', $trimmed) ?: [];
        $lines = array_values(array_filter($lines, static fn (string $line): bool => trim($line) !== ''));
        if ($lines === []) {
            throw new RuntimeException('Upload content did not contain any non-empty rows.');
        }

        $warnings = [];
        $resolvedFieldNames = array_values(array_filter(array_map(static fn ($value): string => trim((string) $value), $fieldNames ?? []), static fn (string $value): bool => $value !== ''));
        $useHeader = $hasHeaderRow ?? (bool) ($settings['sourceHasFieldNames'] ?? false);

        if ($resolvedFieldNames === []) {
            if ($useHeader) {
                $resolvedFieldNames = array_map(static fn (string $part): string => trim($part), explode($delimiter, array_shift($lines)));
            } else {
                $resolvedFieldNames = $settings['fields'] ?? [];
            }
        } elseif ($useHeader) {
            array_shift($lines);
        }

        $resolvedFieldNames = array_values(array_filter($resolvedFieldNames, static fn (string $value): bool => $value !== ''));
        if ($resolvedFieldNames === []) {
            throw new RuntimeException('No field list could be resolved for the upload preview/apply flow.');
        }
        if (!in_array('product_id', $resolvedFieldNames, true)) {
            throw new RuntimeException('Resolved upload field list must include product_id.');
        }

        $rows = [];
        foreach ($lines as $lineIndex => $line) {
            $cells = array_map(static fn (string $part): string => trim($part), explode($delimiter, $line));
            if (count($cells) < count($resolvedFieldNames)) {
                $warnings[] = sprintf('Row %d had fewer columns than expected; missing values were padded with empty strings.', $lineIndex + 1);
                $cells = array_pad($cells, count($resolvedFieldNames), '');
            } elseif (count($cells) > count($resolvedFieldNames)) {
                $warnings[] = sprintf('Row %d had extra columns; trailing values were ignored.', $lineIndex + 1);
                $cells = array_slice($cells, 0, count($resolvedFieldNames));
            }

            $mapped = [];
            foreach ($resolvedFieldNames as $index => $field) {
                if (!in_array($field, self::PRODUCT_COLUMNS, true)) {
                    continue;
                }
                $mapped[$field] = $cells[$index] ?? '';
            }
            $productId = trim((string) ($mapped['product_id'] ?? ''));
            if ($productId === '') {
                $warnings[] = sprintf('Row %d was skipped because product_id was empty.', $lineIndex + 1);
                continue;
            }
            $mapped['product_id'] = $productId;
            $rows[] = $mapped;
        }

        return [
            'fieldNames' => $resolvedFieldNames,
            'rows' => $rows,
            'warnings' => array_values(array_unique($warnings)),
        ];
    }

    /** @param list<string> $productIds
     *  @return list<string>
     */
    private function fetchExistingProductIds(array $productIds): array
    {
        $productIds = array_values(array_unique(array_filter(array_map(static fn ($value): string => trim((string) $value), $productIds), static fn (string $value): bool => $value !== '')));
        if ($productIds === []) {
            return [];
        }

        $placeholders = [];
        $params = [];
        foreach ($productIds as $index => $productId) {
            $key = 'product_' . $index;
            $placeholders[] = ':' . $key;
            $params[$key] = $productId;
        }

        $stmt = $this->storeDb->prepare('SELECT product_id FROM products WHERE product_id IN (' . implode(', ', $placeholders) . ')');
        $stmt->execute($params);
        return array_map(static fn (array $row): string => (string) ($row['product_id'] ?? ''), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** @param list<string> $columns
     *  @param array<string, mixed> $row
     */
    private function upsertProductRow(array $columns, array $row): void
    {
        $columnList = implode(', ', $columns);
        $placeholders = implode(', ', array_map(static fn (string $column): string => ':' . $column, $columns));
        $updateColumns = array_values(array_filter($columns, static fn (string $column): bool => $column !== 'product_id'));
        $updateSql = implode(', ', array_map(static fn (string $column): string => sprintf('%s = EXCLUDED.%s', $column, $column), $updateColumns));
        if ($updateSql === '') {
            $updateSql = 'product_id = EXCLUDED.product_id';
        }

        $stmt = $this->storeDb->prepare("INSERT INTO products ({$columnList}) VALUES ({$placeholders}) ON CONFLICT (product_id) DO UPDATE SET {$updateSql}");
        $params = [];
        foreach ($columns as $column) {
            $params[$column] = $row[$column] ?? null;
        }
        $stmt->execute($params);
    }


    private function findStorefrontThemeOverride(string $merchantId, string $configId): ?array
    {
        $stmt = $this->rewriteDb->prepare(<<<'SQL'
SELECT merchant_id, config_id, theme, created_at, updated_at
FROM storefront_theme_overrides
WHERE merchant_id = :merchant_id
  AND config_id = :config_id
LIMIT 1
SQL);
        $stmt->execute([
            'merchant_id' => $merchantId,
            'config_id' => $configId,
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function resolveStorefrontScope(?string $merchantId, ?string $configId): array
    {
        $resolvedMerchantId = trim((string) ($merchantId ?? (getenv('STOREFRONT_MERCHANT_ID') ?: 'cg')));
        $resolvedConfigId = trim((string) ($configId ?? (getenv('STOREFRONT_CONFIG_ID') ?: 'default')));

        return [
            'merchantId' => $resolvedMerchantId !== '' ? $resolvedMerchantId : 'cg',
            'configId' => $resolvedConfigId !== '' ? $resolvedConfigId : 'default',
        ];
    }

    /** @return list<string> */
    private function availableStorefrontThemes(): array
    {
        return ['rewrite', 'legacy'];
    }

    private function normalizeStorefrontTheme(string $value): string
    {
        $normalized = strtolower(trim($value));
        return match ($normalized) {
            'legacy', 'classic', 'legacy-theme' => 'legacy',
            'rewrite', 'modern', 'default', '' => 'rewrite',
            default => 'rewrite',
        };
    }

    private function toBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_numeric($value)) {
            return (int) $value !== 0;
        }
        $normalized = strtolower(trim((string) $value));
        return in_array($normalized, ['t', 'true', '1', 'yes', 'y'], true);
    }
}
