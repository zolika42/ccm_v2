-- @fileoverview Rewrite-owned schema objects for admin access control and order mark audit.

CREATE TABLE IF NOT EXISTS admin_user_scopes (
    customerid integer NOT NULL,
    merchant_id text NOT NULL,
    config_id text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (customerid, merchant_id, config_id)
);

CREATE INDEX IF NOT EXISTS admin_user_scopes_scope_idx
    ON admin_user_scopes (merchant_id, config_id, is_active, customerid);

CREATE TABLE IF NOT EXISTS admin_order_marks (
    id bigserial PRIMARY KEY,
    order_id text NOT NULL,
    merchant_id text NOT NULL,
    config_id text NOT NULL,
    customerid integer NOT NULL,
    action text NOT NULL,
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_order_marks_lookup_idx
    ON admin_order_marks (merchant_id, config_id, order_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS storefront_theme_overrides (
    merchant_id text NOT NULL,
    config_id text NOT NULL,
    theme text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (merchant_id, config_id)
);

CREATE INDEX IF NOT EXISTS storefront_theme_overrides_theme_idx
    ON storefront_theme_overrides (theme, updated_at DESC);

