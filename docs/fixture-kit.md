# Fixture Kit (CG-191)

This project intentionally avoids committing raw customer PII or real purchased content into the repo. Instead, use a local fixture kit workflow.

## Required fixture personas

Create or identify local/dev-only accounts that cover:

1. `fixture-empty@example.invalid`
   - no purchases
   - no points
2. `fixture-library@example.invalid`
   - at least one downloadable preorder
   - mapped `downloadable_filename`
3. `fixture-cart@example.invalid`
   - valid login
   - no special library data required

## Required fixture products

Keep at least one example of each:

- shippable paid product
- downloadable paid product
- free/downloadable product if available

## Local note format

Store actual local fixture IDs/emails/passwords in an untracked developer-local note, not in git. Suggested file:

- `docs/local-fixtures.private.md` (ignored locally if you want)

## Minimum data to record locally

- customer email
- customer password
- customer ID
- product IDs for:
  - shippable item
  - downloadable item
  - optional freebie

## Why this ticket is docs-first

The dump-driven workflow means real production-like data may exist locally, but the repository itself should not become a warehouse of live customer identities.
