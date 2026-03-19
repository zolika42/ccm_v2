<?php

declare(strict_types=1);

/**
 * @fileoverview Store-database wishlist adapter backed by the legacy real_wishlists table/view semantics.
 */

namespace ColumbiaGames\Api\Repositories;

use PDO;

final class WishlistRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function summary(int $customerId): ?array
    {
        $customer = $this->findCustomer($customerId);
        if ($customer === null) {
            return null;
        }

        $items = $this->loadItems($customerId);

        $categories = [];
        foreach ($items as $item) {
            $category = trim((string) ($item['category'] ?? ''));
            if ($category === '') {
                continue;
            }
            $categories[$category] = true;
        }

        return [
            'customerId' => $customerId,
            'customerEmail' => (string) ($customer['ship_email'] ?? ''),
            'customerName' => (string) ($customer['ship_name'] ?? ''),
            'items' => $items,
            'meta' => [
                'count' => count($items),
                'totalQuantity' => array_sum(array_map(static fn (array $item): int => (int) ($item['quantity'] ?? 0), $items)),
                'downloadableCount' => count(array_filter($items, static fn (array $item): bool => (bool) ($item['isDownloadable'] ?? false))),
                'hasItems' => $items !== [],
                'categories' => array_values(array_keys($categories)),
                'legacyRelation' => 'real_wishlists.ship_email stores customers.customerid as text; rewrite reads/writes by authenticated customer id.',
            ],
        ];
    }

    public function addItem(int $customerId, string $productId, int $quantity): void
    {
        $stmt = $this->db->prepare(<<<'SQL'
INSERT INTO real_wishlists (ship_email, product_id, quantity)
VALUES (:customer_id, :product_id, :quantity)
ON CONFLICT (ship_email, product_id)
DO UPDATE SET quantity = real_wishlists.quantity + EXCLUDED.quantity
SQL);
        $stmt->execute([
            'customer_id' => (string) $customerId,
            'product_id' => $productId,
            'quantity' => $quantity,
        ]);
    }

    public function replaceItem(int $customerId, string $productId, int $quantity): void
    {
        if ($quantity <= 0) {
            $this->removeItem($customerId, $productId);
            return;
        }

        $stmt = $this->db->prepare(<<<'SQL'
INSERT INTO real_wishlists (ship_email, product_id, quantity)
VALUES (:customer_id, :product_id, :quantity)
ON CONFLICT (ship_email, product_id)
DO UPDATE SET quantity = EXCLUDED.quantity
SQL);
        $stmt->execute([
            'customer_id' => (string) $customerId,
            'product_id' => $productId,
            'quantity' => $quantity,
        ]);
    }

    public function removeItem(int $customerId, string $productId): void
    {
        $stmt = $this->db->prepare('DELETE FROM real_wishlists WHERE ship_email = :customer_id AND product_id = :product_id');
        $stmt->execute([
            'customer_id' => (string) $customerId,
            'product_id' => $productId,
        ]);
    }

    /**
     * @param array<int, array{productId:string, quantity:int}> $purchasedItems
     * @return array{trigger:string,beforeCount:int,afterCount:int,updatedItems:array<int,array{productId:string,beforeQuantity:int,purchasedQuantity:int,afterQuantity:int,action:string}>,removedProductIds:array<int,string>}
     */
    public function syncPurchasedItems(int $customerId, array $purchasedItems): array
    {
        $current = $this->loadQuantities($customerId);
        $beforeCount = count($current);
        $updatedItems = [];
        $removedProductIds = [];

        foreach ($purchasedItems as $item) {
            $productId = trim((string) ($item['productId'] ?? ''));
            $purchasedQuantity = max(0, (int) ($item['quantity'] ?? 0));
            if ($productId === '' || $purchasedQuantity <= 0) {
                continue;
            }

            $beforeQuantity = $current[$productId] ?? 0;
            if ($beforeQuantity <= 0) {
                continue;
            }

            $afterQuantity = max(0, $beforeQuantity - $purchasedQuantity);
            if ($afterQuantity <= 0) {
                $this->removeItem($customerId, $productId);
                unset($current[$productId]);
                $removedProductIds[] = $productId;
                $action = 'removed';
            } else {
                $this->replaceItem($customerId, $productId, $afterQuantity);
                $current[$productId] = $afterQuantity;
                $action = 'decremented';
            }

            $updatedItems[] = [
                'productId' => $productId,
                'beforeQuantity' => $beforeQuantity,
                'purchasedQuantity' => $purchasedQuantity,
                'afterQuantity' => $afterQuantity,
                'action' => $action,
            ];
        }

        return [
            'trigger' => 'post_purchase_sync',
            'beforeCount' => $beforeCount,
            'afterCount' => count($current),
            'updatedItems' => $updatedItems,
            'removedProductIds' => $removedProductIds,
        ];
    }

    private function findCustomer(int $customerId): ?array
    {
        $stmt = $this->db->prepare(<<<'SQL'
SELECT customerid, ship_email, ship_name
FROM customers
WHERE customerid = :customerid
LIMIT 1
SQL);
        $stmt->execute(['customerid' => $customerId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /** @return array<int, array<string, mixed>> */
    private function loadItems(int $customerId): array
    {
        $stmt = $this->db->prepare(<<<'SQL'
SELECT
    rw.product_id,
    rw.quantity,
    p.product_description,
    p.product_price,
    p.category,
    p.sub_category,
    p.sub_category2,
    p.product_image,
    p.product_status,
    p.is_downloadable,
    p.downloadable_filename,
    p.preorder,
    p.release_date
FROM real_wishlists rw
JOIN products p
    ON p.product_id = rw.product_id
WHERE rw.ship_email = :customer_id
  AND LOWER(TRIM(COALESCE(p.product_status, ''))) <> 'hidden'
  AND LOWER(TRIM(COALESCE(p.category, ''))) <> 'hidden'
  AND COALESCE(p.category_weight, 0) >= 0
ORDER BY p.category_weight NULLS LAST, p.category, p.sub_category, p.sub_category2, rw.product_id
SQL);
        $stmt->execute(['customer_id' => (string) $customerId]);

        return array_map(static function (array $row): array {
            return [
                'productId' => trim((string) ($row['product_id'] ?? '')),
                'description' => (string) ($row['product_description'] ?? ''),
                'quantity' => (int) ($row['quantity'] ?? 0),
                'price' => (string) ($row['product_price'] ?? ''),
                'category' => (string) ($row['category'] ?? ''),
                'subCategory' => (string) ($row['sub_category'] ?? ''),
                'subCategory2' => (string) ($row['sub_category2'] ?? ''),
                'image' => (string) ($row['product_image'] ?? ''),
                'status' => (string) ($row['product_status'] ?? ''),
                'isDownloadable' => (($row['is_downloadable'] ?? '') === 'Y'),
                'downloadableFilename' => (string) ($row['downloadable_filename'] ?? ''),
                'preorder' => isset($row['preorder']) ? (int) $row['preorder'] : null,
                'releaseDate' => (string) ($row['release_date'] ?? ''),
            ];
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * @return array<string,int>
     */
    private function loadQuantities(int $customerId): array
    {
        $stmt = $this->db->prepare(<<<'SQL'
SELECT product_id, quantity
FROM real_wishlists
WHERE ship_email = :customer_id
ORDER BY product_id
SQL);
        $stmt->execute(['customer_id' => (string) $customerId]);

        $quantities = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $productId = trim((string) ($row['product_id'] ?? ''));
            if ($productId === '') {
                continue;
            }
            $quantities[$productId] = (int) ($row['quantity'] ?? 0);
        }

        return $quantities;
    }
}
