<?php

declare(strict_types=1);

/**
 * @fileoverview File-backed catalog category HTML content registry.
 */

namespace ColumbiaGames\Api\Support;

final class CatalogCategoryContentRegistry
{
    /**
     * Fill this map with legacy category / subcategory / subcategory2 HTML descriptions as they are recovered.
     *
     * Example:
     * 'maps' => [
     *     '__html' => '<p>Top-level category intro.</p>',
     *     'harn' => [
     *         '__html' => '<p>Subcategory intro.</p>',
     *         'kingdoms' => [
     *             '__html' => '<p>Third-level intro.</p>',
     *         ],
     *     ],
     * ],
     *
     * Keys are matched case-insensitively after trim().
     *
     * @var array<string, mixed>
     */
    private const CONTENT = [
    ];

    public static function descriptionFor(string $category, string $subCategory = '', string $subCategory2 = ''): ?string
    {
        $categoryNode = self::CONTENT[self::normalizeKey($category)] ?? null;
        if (!is_array($categoryNode)) {
            return null;
        }

        $subCategoryKey = self::normalizeKey($subCategory);
        $subCategory2Key = self::normalizeKey($subCategory2);

        if ($subCategoryKey !== '') {
            $subCategoryNode = $categoryNode[$subCategoryKey] ?? null;
            if (is_array($subCategoryNode)) {
                if ($subCategory2Key !== '') {
                    $subCategory2Node = $subCategoryNode[$subCategory2Key] ?? null;
                    if (is_array($subCategory2Node) && self::htmlValue($subCategory2Node) !== null) {
                        return self::htmlValue($subCategory2Node);
                    }
                }

                if (self::htmlValue($subCategoryNode) !== null) {
                    return self::htmlValue($subCategoryNode);
                }
            }
        }

        return self::htmlValue($categoryNode);
    }

    /**
     * @param array<string, mixed> $node
     */
    private static function htmlValue(array $node): ?string
    {
        $value = $node['__html'] ?? null;
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        return $trimmed !== '' ? $trimmed : null;
    }

    private static function normalizeKey(string $value): string
    {
        return mb_strtolower(trim($value));
    }
}
