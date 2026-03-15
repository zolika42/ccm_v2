# Checkout field map (working v2, dump-validated baseline)

Ez a dokumentum már a 2026-03-14-i valódi dumpokból ellenőrzött mezőkre épül. A legfontosabb megállapítás: a legacy cart **nem klasszikus header/detail táblapár**, hanem részben query-string state, részben EAV.

## Biztosan ismert források

### `ccm` DB

- `browser_state(browser_id, merchant_id, config_id, state, last_updated)`
  - a `state` mező **URL-encoded query string**, nem JSON
  - a termékazonosítók közvetlenül kulcsként jelennek meg benne, pl. `1201A=2`
- `order_status(browser_id, merchant_id, config_id, order_id, status, last_updated, unused1, batch_id)`
  - a `status` **smallint**
  - dump alapján az **aktív kosár státusz = `3`**
  - a `1` tipikusan üres / nem aktív kosárállapotként látszik
- `orders(merchant_id, config_id, order_id, field, value)`
  - **EAV** order header/meta tábla
- `items(merchant_id, config_id, order_id, product_id, field, value)`
  - **EAV** item tábla
- `payflowpro(...)`
  - legacy kártyás payment konfiguráció

### `columbia_games` DB

- `customers` — customer profil, email, név, pontok
- `products` — termékmester adatok, ár, downloadable flag, státusz
- `preorders` — vásárlás utáni entitlement / library kapcsolat
- `related_products` — termékajánló kapcsolat

### Legacy functionök a `columbia_games` DB-ben

- `record_order()`
- `record_item()`
- `preorder_update_or_insert()`

## Új frontend → legacy target térkép

| Új frontend mező / fogalom | Legacy target | Megjegyzés |
| --- | --- | --- |
| browser identity | `ccm.browser_state` + `bid-cg` cookie | CG-140 |
| aktív kosár lookup | `ccm.order_status.status = 3` | CG-141 |
| aktív kosár fejléc | `ccm.orders` | EAV, nem normál oszlopos header |
| kosártétel | `ccm.items` | EAV, `ec_quantity_ordered` a qty mező |
| order status | `ccm.order_status` | numeric state |
| customer id | `columbia_games.customers.customerid` | auth rétegből ismert |
| customer email | `columbia_games.customers.ship_email` | auth rétegből ismert |
| customer név | `columbia_games.customers.ship_name` | auth rétegből ismert |
| pontok | `columbia_games.customers.points` | auth read model |
| product id | `columbia_games.products.product_id` | catalog read model |
| product name / description | `columbia_games.products.product_description` | catalog read model |
| unit price | `columbia_games.products.product_price` | catalog read model |
| downloadable flag | `columbia_games.products.is_downloadable` | purchase utáni entitlementhez kell |
| order submit | `record_order()` | CG-163 előkészítés |
| order item submit | `record_item()` | CG-163 előkészítés |
| preorder entitlement update | `preorder_update_or_insert()` | download/library kapcsolat |

## Dumpból igazolt cart / checkout mezők

### `orders.field` gyakori és biztosan használt mezők

- `total_items_requiring_payment`
- `linetotal`
- `shippable_subtotal`
- `discountable_total`
- `pdf_total`
- `ec_customer_login_state`
- `ec_customer_id`
- `customerid`
- `ship_email`
- `ship_phone`
- `ship_name`
- `ship_method`
- `bill_name`
- `bill_city`, `bill_country`, `bill_state`, `bill_zip`, `bill_street`, `bill_street2`
- `ship_city`, `ship_country`, `ship_state`, `ship_zip`, `ship_street`, `ship_street2`
- `pay_cardtype`, `pay_cardname`, `pay_cardno`, `pay_cardmonth`, `pay_cardyear`, `pay_card_last4`
- `promocode`
- `points`, `points_applied`
- `eu_choice`

### `items.field` dumpból igazolt mezők

Minimum read/write szempontból biztosan releváns:

- `product_id`
- `ec_quantity_ordered`
- `product_price`
- `product_description`
- `category`
- `sub_category`
- `sub_category2`
- `is_downloadable`
- `freebie`
- `downloadable_filename`

Gyakori opcionális mezők:

- `product_header`
- `category_weight`
- `pledges_required`
- `pledge_deadline`
- `product_image`, `product_image2`, `product_image3`, `product_image4`
- `product_extendeddescription`, `product_specs`, `product_resources`
- `preorder`

## Aktív kosár feloldási szabály (v1)

1. `bid-cg` cookie → `browser_id`
2. `order_status` lookup `browser_id` alapján
3. a legfrissebb `status = 3` sor az aktív kosár
4. ha nincs aktív order, fallback a `browser_state.state` query stringre

## V1 döntéshez ajánlott szabály

Amíg a submithez szükséges összes mező és side-effect nincs pontosan feltérképezve, addig az új app csak a cart és summary réteget tekinti stabilnak. A checkout submit csak a function signatúrák és a required mezők teljes auditja után kerülhet implementálásra.
