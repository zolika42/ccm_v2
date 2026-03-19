<?php

declare(strict_types=1);

/**
 * @fileoverview Store-database product catalog queries and product detail lookups.
 */

namespace ColumbiaGames\Api\Repositories;

use ColumbiaGames\Api\Support\CatalogCategoryContentRegistry;
use PDO;

final class ProductRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function paginate(array $filters, ?int $customerId = null): array
    {
        $limit = max(1, min((int) ($filters['limit'] ?? 24), 100));
        $offset = max(0, (int) ($filters['offset'] ?? 0));
        $search = trim((string) ($filters['q'] ?? ''));
        $category = trim((string) ($filters['category'] ?? ''));
        $subCategory = trim((string) ($filters['sub_category'] ?? ''));
        $subCategory2 = trim((string) ($filters['sub_category2'] ?? ''));
        $sort = $this->normalizeSort((string) ($filters['sort'] ?? ''));

        $where = [$this->catalogVisibilityWhere()];
        $params = [];

        if ($search !== '') {
            $where[] = '(product_id ILIKE :search OR product_description ILIKE :search OR product_extendeddescription ILIKE :search OR notes ILIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($category !== '') {
            $where[] = 'category = :category';
            $params['category'] = $category;
        }

        if ($subCategory !== '') {
            $where[] = 'sub_category = :sub_category';
            $params['sub_category'] = $subCategory;
        }

        if ($subCategory2 !== '') {
            $where[] = 'sub_category2 = :sub_category2';
            $params['sub_category2'] = $subCategory2;
        }

        $whereSql = implode(' AND ', $where);

        $countStmt = $this->db->prepare("SELECT COUNT(*) AS total FROM products WHERE {$whereSql}");
        $countStmt->execute($params);
        $total = (int) (($countStmt->fetch()['total'] ?? 0));

        $orderBySql = $this->buildCatalogOrderBy($sort);

        $sql = "
SELECT
    product_id,
    product_description,
    product_price,
    category,
    sub_category,
    sub_category2,
    product_image,
    product_status,
    is_downloadable,
    downloadable_filename,
    release_date,
    preorder
FROM products
WHERE {$whereSql}
ORDER BY {$orderBySql}
LIMIT :limit OFFSET :offset
";
        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        $items = array_map([$this, 'normalizeProduct'], $rows);
        $items = $this->enrichWithCustomerCatalogState($items, $customerId);
        $items = $this->enrichWithThirdPartyMeta($items, false);

        return [
            'items' => $items,
            'meta' => [
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset,
                'sort' => $sort,
            ],
        ];
    }

    public function findById(string $productId, ?int $customerId = null): ?array
    {
        $visibilitySql = $this->catalogVisibilityWhere();
        $sql = <<<SQL
SELECT
    product_id,
    product_description,
    product_price,
    category,
    sub_category,
    sub_category2,
    product_image,
    product_image2,
    product_image3,
    product_image4,
    product_extendeddescription,
    product_specs,
    product_resources,
    product_status,
    is_downloadable,
    downloadable_filename,
    freebie,
    release_date,
    preorder,
    product_header,
    notes,
    caption1,
    caption2,
    caption3,
    caption4
FROM products
WHERE product_id = :product_id
  AND {$visibilitySql}
LIMIT 1
SQL;
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['product_id' => $productId]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }

        $product = $this->normalizeProduct($row);
        $product = $this->enrichWithCustomerCatalogState([$product], $customerId)[0];
        $product = $this->enrichWithThirdPartyMeta([$product], true)[0];

        return $product;
    }

    public function related(string $productId, ?int $customerId = null): array
    {
        $visibilitySql = $this->catalogVisibilityWhere('p');
        $sql = <<<SQL
SELECT
    trim(rp.related_product_id) AS related_product_id,
    p.product_id,
    p.product_description,
    p.product_price,
    p.category,
    p.sub_category,
    p.sub_category2,
    p.product_image,
    p.product_status,
    p.is_downloadable,
    p.downloadable_filename,
    p.release_date,
    p.preorder
FROM related_products rp
JOIN products p
    ON p.product_id = trim(rp.related_product_id)
WHERE trim(rp.product_id) = :product_id
  AND {$visibilitySql}
ORDER BY p.product_id
SQL;
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['product_id' => $productId]);
        $items = array_map([$this, 'normalizeProduct'], $stmt->fetchAll());
        $items = $this->enrichWithCustomerCatalogState($items, $customerId);
        return $this->enrichWithThirdPartyMeta($items, false);
    }

    public function categories(): array
    {
        $visibilitySql = $this->catalogVisibilityWhere();
        $sql = <<<SQL
SELECT
    COALESCE(NULLIF(trim(category), ''), 'Uncategorized') AS category_name,
    COALESCE(NULLIF(trim(sub_category), ''), '') AS sub_category_name,
    COALESCE(NULLIF(trim(sub_category2), ''), '') AS sub_category2_name,
    COUNT(*) AS product_count,
    MIN(category_weight) AS category_weight
FROM products
WHERE {$visibilitySql}
GROUP BY 1, 2, 3
ORDER BY category_weight NULLS LAST, category_name, sub_category_name, sub_category2_name
SQL;
        $stmt = $this->db->query($sql);
        $rows = $stmt->fetchAll();

        $categories = [];
        $subCategoryCount = 0;
        $subCategory2Count = 0;

        foreach ($rows as $row) {
            $categoryName = (string) ($row['category_name'] ?? 'Uncategorized');
            $subCategoryName = (string) ($row['sub_category_name'] ?? '');
            $subCategory2Name = (string) ($row['sub_category2_name'] ?? '');
            $productCount = (int) ($row['product_count'] ?? 0);

            if (!isset($categories[$categoryName])) {
                $categories[$categoryName] = [
                    'name' => $categoryName,
                    'productCount' => 0,
                    'descriptionHtml' => $this->categoryDescriptionHtml($categoryName),
                    'subCategories' => [],
                ];
            }

            $categories[$categoryName]['productCount'] += $productCount;

            if ($subCategoryName === '') {
                continue;
            }

            if (!isset($categories[$categoryName]['subCategories'][$subCategoryName])) {
                $categories[$categoryName]['subCategories'][$subCategoryName] = [
                    'name' => $subCategoryName,
                    'productCount' => 0,
                    'descriptionHtml' => $this->categoryDescriptionHtml($categoryName, $subCategoryName),
                    'subCategory2s' => [],
                ];
                $subCategoryCount++;
            }

            $categories[$categoryName]['subCategories'][$subCategoryName]['productCount'] += $productCount;

            if ($subCategory2Name === '') {
                continue;
            }

            $categories[$categoryName]['subCategories'][$subCategoryName]['subCategory2s'][] = [
                'name' => $subCategory2Name,
                'productCount' => $productCount,
                'descriptionHtml' => $this->categoryDescriptionHtml($categoryName, $subCategoryName, $subCategory2Name),
            ];
            $subCategory2Count++;
        }

        $normalizedCategories = [];
        foreach ($categories as $category) {
            $category['subCategories'] = array_values($category['subCategories']);
            $normalizedCategories[] = $category;
        }

        return [
            'categories' => $normalizedCategories,
            'meta' => [
                'categoryCount' => count($normalizedCategories),
                'subCategoryCount' => $subCategoryCount,
                'subCategory2Count' => $subCategory2Count,
            ],
        ];
    }

    private function catalogVisibilityWhere(string $alias = ''): string
    {
        $prefix = $alias !== '' ? rtrim($alias, '.') . '.' : '';

        return implode(' AND ', [
            "LOWER(TRIM(COALESCE({$prefix}product_status, ''))) <> 'hidden'",
            "LOWER(TRIM(COALESCE({$prefix}category, ''))) <> 'hidden'",
            "COALESCE({$prefix}category_weight, 0) >= 0",
        ]);
    }

    private function categoryDescriptionHtml(string $category, string $subCategory = '', string $subCategory2 = ''): ?string
    {
        return CatalogCategoryContentRegistry::descriptionFor($category, $subCategory, $subCategory2);
    }

    private function normalizeSort(string $value): string
    {
        $normalized = strtolower(trim($value));
        return match ($normalized) {
            'sku_asc', 'sku_desc', 'name_asc', 'name_desc', 'price_asc', 'price_desc' => $normalized,
            default => 'default',
        };
    }

    private function buildCatalogOrderBy(string $sort): string
    {
        return match ($sort) {
            'sku_asc' => 'product_id ASC',
            'sku_desc' => 'product_id DESC',
            'name_asc' => 'LOWER(COALESCE(product_description, product_id)) ASC, product_id ASC',
            'name_desc' => 'LOWER(COALESCE(product_description, product_id)) DESC, product_id DESC',
            'price_asc' => "NULLIF(regexp_replace(COALESCE(product_price, ''), '[^0-9.\-]', '', 'g'), '')::numeric ASC NULLS LAST, product_id ASC",
            'price_desc' => "NULLIF(regexp_replace(COALESCE(product_price, ''), '[^0-9.\-]', '', 'g'), '')::numeric DESC NULLS LAST, product_id ASC",
            default => 'category_weight NULLS LAST, category, sub_category, sub_category2, product_id',
        };
    }

    private function enrichWithCustomerCatalogState(array $items, ?int $customerId): array
    {
        if ($items === [] || $customerId === null || $customerId <= 0) {
            return $items;
        }

        $productIds = array_values(array_filter(array_map(
            static fn (array $item): string => trim((string) ($item['productId'] ?? '')),
            $items
        )));

        if ($productIds === []) {
            return $items;
        }

        $params = ['customer_id' => $customerId];
        $placeholders = [];
        foreach ($productIds as $index => $id) {
            $key = 'product_' . $index;
            $placeholders[] = ':' . $key;
            $params[$key] = $id;
        }

        $sql = sprintf(
            'SELECT product_id, COALESCE(SUM(quantity), 0) AS quantity FROM preorders WHERE customerid = :customer_id AND product_id IN (%s) GROUP BY product_id',
            implode(', ', $placeholders)
        );
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $ownedQuantities = [];
        foreach ($stmt->fetchAll() as $row) {
            $ownedQuantities[trim((string) ($row['product_id'] ?? ''))] = (int) ($row['quantity'] ?? 0);
        }

        foreach ($items as &$item) {
            $productId = trim((string) ($item['productId'] ?? ''));
            $ownedQuantity = $ownedQuantities[$productId] ?? 0;
            if ($ownedQuantity <= 0) {
                $item['customerOwnedQuantity'] = null;
                $item['customerCatalogState'] = null;
                continue;
            }

            $item['customerOwnedQuantity'] = $ownedQuantity;
            $item['customerCatalogState'] = ((int) ($item['preorder'] ?? 0) > 0) ? 'preordered' : 'owned';
        }
        unset($item);

        return $items;
    }

    private function enrichWithThirdPartyMeta(array $items, bool $includeGallery): array
    {
        if ($items === []) {
            return $items;
        }

        $productIds = array_values(array_filter(array_map(
            static fn (array $item): string => trim((string) ($item['productId'] ?? '')),
            $items
        )));
        if ($productIds === []) {
            return $items;
        }

        $params = [];
        $placeholders = [];
        foreach ($productIds as $index => $id) {
            $key = 'product_' . $index;
            $placeholders[] = ':' . $key;
            $params[$key] = $id;
        }

        $sql = sprintf(
            'SELECT id, product_id, thumbnail, image, rating, description, id_3rd_party, last_check, status FROM "3rd_party_product_details" WHERE product_id IN (%s)',
            implode(', ', $placeholders)
        );
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $detailRows = $stmt->fetchAll();

        if ($detailRows === []) {
            foreach ($items as &$item) {
                $item['thirdParty'] = null;
            }
            unset($item);
            return $items;
        }

        $galleryByThirdPartyId = [];
        if ($includeGallery) {
            $thirdPartyIds = array_values(array_filter(array_map(
                static fn (array $row): string => trim((string) ($row['id_3rd_party'] ?? '')),
                $detailRows
            )));

            if ($thirdPartyIds !== []) {
                $galleryParams = [];
                $galleryPlaceholders = [];
                foreach ($thirdPartyIds as $index => $thirdPartyId) {
                    $key = 'third_party_' . $index;
                    $galleryPlaceholders[] = ':' . $key;
                    $galleryParams[$key] = $thirdPartyId;
                }

                $gallerySql = sprintf(
                    'SELECT third_party_id, url, description FROM "3rd_party_images" WHERE third_party_id IN (%s) ORDER BY id',
                    implode(', ', $galleryPlaceholders)
                );
                $galleryStmt = $this->db->prepare($gallerySql);
                $galleryStmt->execute($galleryParams);

                foreach ($galleryStmt->fetchAll() as $row) {
                    $thirdPartyId = trim((string) ($row['third_party_id'] ?? ''));
                    if ($thirdPartyId === '') {
                        continue;
                    }

                    $galleryByThirdPartyId[$thirdPartyId][] = [
                        'url' => $this->normalizeExternalUrl((string) ($row['url'] ?? '')),
                        'description' => trim((string) ($row['description'] ?? '')),
                    ];
                }
            }
        }

        $detailsByProductId = [];
        foreach ($detailRows as $row) {
            $productId = trim((string) ($row['product_id'] ?? ''));
            if ($productId === '') {
                continue;
            }

            $thirdPartyId = trim((string) ($row['id_3rd_party'] ?? ''));
            $detailsByProductId[$productId] = [
                'sourceId' => isset($row['id']) ? (int) $row['id'] : null,
                'thirdPartyId' => $thirdPartyId !== '' ? $thirdPartyId : null,
                'thumbnail' => $this->normalizeExternalUrl((string) ($row['thumbnail'] ?? '')),
                'image' => $this->normalizeExternalUrl((string) ($row['image'] ?? '')),
                'rating' => trim((string) ($row['rating'] ?? '')) !== '' ? (string) $row['rating'] : null,
                'description' => $this->normalizeThirdPartyDescription((string) ($row['description'] ?? ''), $includeGallery),
                'status' => isset($row['status']) ? (int) $row['status'] : null,
                'lastCheck' => trim((string) ($row['last_check'] ?? '')) !== '' ? (string) $row['last_check'] : null,
                'gallery' => $thirdPartyId !== '' ? ($galleryByThirdPartyId[$thirdPartyId] ?? []) : [],
            ];
        }

        foreach ($items as &$item) {
            $productId = trim((string) ($item['productId'] ?? ''));
            $item['thirdParty'] = $detailsByProductId[$productId] ?? null;
        }
        unset($item);

        return $items;
    }

    private function normalizeThirdPartyDescription(string $value, bool $full): string
    {
        $normalized = html_entity_decode(strip_tags($value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $normalized = preg_replace('/\s+/u', ' ', $normalized) ?? $normalized;
        $normalized = trim($normalized);

        if ($normalized === '' || $full) {
            return $normalized;
        }

        if (mb_strlen($normalized) <= 240) {
            return $normalized;
        }

        return rtrim(mb_substr($normalized, 0, 237)) . '…';
    }

    private function normalizeExternalUrl(string $value): string
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return '';
        }

        if (str_starts_with($trimmed, '//')) {
            return 'https:' . $trimmed;
        }

        return $trimmed;
    }

    private function normalizeProduct(array $row): array
    {
        return [
            'productId' => trim((string) ($row['product_id'] ?? '')),
            'description' => (string) ($row['product_description'] ?? ''),
            'price' => (string) ($row['product_price'] ?? ''),
            'category' => (string) ($row['category'] ?? ''),
            'subCategory' => (string) ($row['sub_category'] ?? ''),
            'subCategory2' => (string) ($row['sub_category2'] ?? ''),
            'image' => (string) ($row['product_image'] ?? ''),
            'image2' => (string) ($row['product_image2'] ?? ''),
            'image3' => (string) ($row['product_image3'] ?? ''),
            'image4' => (string) ($row['product_image4'] ?? ''),
            'extendedDescription' => (string) ($row['product_extendeddescription'] ?? ''),
            'specs' => (string) ($row['product_specs'] ?? ''),
            'resources' => (string) ($row['product_resources'] ?? ''),
            'status' => (string) ($row['product_status'] ?? ''),
            'isDownloadable' => (($row['is_downloadable'] ?? '') === 'Y'),
            'downloadableFilename' => (string) ($row['downloadable_filename'] ?? ''),
            'freebie' => (($row['freebie'] ?? '') === 'Y'),
            'releaseDate' => (string) ($row['release_date'] ?? ''),
            'preorder' => isset($row['preorder']) ? (int) $row['preorder'] : null,
            'header' => (string) ($row['product_header'] ?? ''),
            'notes' => (string) ($row['notes'] ?? ''),
            'captions' => [
                (string) ($row['caption1'] ?? ''),
                (string) ($row['caption2'] ?? ''),
                (string) ($row['caption3'] ?? ''),
                (string) ($row['caption4'] ?? ''),
            ],
        ];
    }
}
