<?php

declare(strict_types=1);

namespace ColumbiaGames\Api\Repositories;

use PDO;

final class ProductRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function paginate(array $filters): array
    {
        $limit = max(1, min((int) ($filters['limit'] ?? 24), 100));
        $offset = max(0, (int) ($filters['offset'] ?? 0));
        $search = trim((string) ($filters['q'] ?? ''));
        $category = trim((string) ($filters['category'] ?? ''));
        $subCategory = trim((string) ($filters['sub_category'] ?? ''));

        $where = ['1=1'];
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

        $whereSql = implode(' AND ', $where);

        $countStmt = $this->db->prepare("SELECT COUNT(*) AS total FROM products WHERE {$whereSql}");
        $countStmt->execute($params);
        $total = (int) (($countStmt->fetch()['total'] ?? 0));

        $sql = "
SELECT
    product_id,
    product_description,
    product_price,
    category,
    sub_category,
    product_image,
    product_status,
    is_downloadable,
    downloadable_filename,
    release_date,
    preorder
FROM products
WHERE {$whereSql}
ORDER BY category_weight NULLS LAST, category, sub_category, product_id
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

        return [
            'items' => array_map([$this, 'normalizeProduct'], $rows),
            'meta' => [
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset,
            ],
        ];
    }

    public function findById(string $productId): ?array
    {
        $sql = <<<'SQL'
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
LIMIT 1
SQL;
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['product_id' => $productId]);
        $row = $stmt->fetch();
        return $row ? $this->normalizeProduct($row) : null;
    }

    public function related(string $productId): array
    {
        $sql = <<<'SQL'
SELECT
    trim(rp.related_product_id) AS related_product_id,
    p.product_id,
    p.product_description,
    p.product_price,
    p.category,
    p.sub_category,
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
ORDER BY p.product_id
SQL;
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['product_id' => $productId]);
        return array_map([$this, 'normalizeProduct'], $stmt->fetchAll());
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
