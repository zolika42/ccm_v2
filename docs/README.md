# Docs Index

- [Developer Handbook](./DEVELOPER_HANDBOOK.md)
- [OpenAPI Spec](./openapi.yaml)
- [Code Reference Index (HTML)](./code-reference/index.html)
- [Backend Code Reference (HTML)](./code-reference/backend.html)
- [Frontend Code Reference (HTML)](./code-reference/frontend.html)
- [Tooling Code Reference (HTML)](./code-reference/tooling.html)

The HTML code reference is generated from first-party source comments and now includes:
- file-level summaries
- symbol-level blocks for classes/functions/constants
- clickable sidebar navigation
- in-page search

Regenerate everything with:

```bash
make docs
```

Or from the frontend install workflow:

```bash
cd apps/web && npm install
```
