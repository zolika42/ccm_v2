<?php

declare(strict_types=1);

namespace ColumbiaGames\Api\Repositories;

use PDO;

final class LibraryRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function ownedDownloads(int $customerId): array
    {
        $stmt = $this->db->prepare(<<<'SQL'
SELECT
    trim(pr.product_id) AS product_id,
    COALESCE(pr.quantity, 0) AS quantity,
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
FROM preorders pr
JOIN products p
    ON trim(p.product_id) = trim(pr.product_id)
WHERE pr.customerid = :customerid
  AND COALESCE(pr.quantity, 0) > 0
  AND (
      COALESCE(p.is_downloadable, '') = 'Y'
      OR COALESCE(trim(p.downloadable_filename), '') <> ''
  )
ORDER BY lower(COALESCE(p.category, '')),
         lower(COALESCE(p.sub_category, '')),
         lower(COALESCE(p.product_description, '')),
         trim(pr.product_id)
SQL);
        $stmt->execute(['customerid' => $customerId]);

        $items = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $items[] = [
                'productId' => trim((string) ($row['product_id'] ?? '')),
                'description' => (string) ($row['product_description'] ?? ''),
                'quantity' => max(0, (int) ($row['quantity'] ?? 0)),
                'price' => (string) ($row['product_price'] ?? ''),
                'category' => (string) ($row['category'] ?? ''),
                'subCategory' => (string) ($row['sub_category'] ?? ''),
                'image' => (string) ($row['product_image'] ?? ''),
                'status' => (string) ($row['product_status'] ?? ''),
                'isDownloadable' => (($row['is_downloadable'] ?? '') === 'Y'),
                'downloadableFilename' => trim((string) ($row['downloadable_filename'] ?? '')),
                'hasDownloadFile' => trim((string) ($row['downloadable_filename'] ?? '')) !== '',
                'releaseDate' => (string) ($row['release_date'] ?? ''),
                'preorder' => isset($row['preorder']) ? (int) $row['preorder'] : null,
            ];
        }

        return $items;
    }
}
