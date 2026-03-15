# Payment flow audit (dump-validated v2 jegyzet)

## Jelenleg biztosan ismert tények

- Az új repo jelenleg nem tartalmaz új payment provider integrációt.
- A legacy checkout/payment routingot a dumpból kell reprodukálni, nem találgatni.
- A publikus Columbia Games flow továbbra is klasszikus `Add to cart` → `View cart` → `Checkout` modell.
- A `ccm` dumpban van külön `payflowpro` konfigurációs tábla.
- Az order mezők között dumpból igazoltan szerepelnek a következők:
  - `pay_cardtype`
  - `pay_cardname`
  - `pay_cardno`
  - `pay_cardmonth`
  - `pay_cardyear`
  - `pay_card_last4`
- A minták alapján több payment ág létezik:
  - `paypal`
  - `free`
  - klasszikus kártyás ágak (`visa`, `mastercard`, `amex`)

## Mi dőlt el a dump alapján

### 1. A payment választás order mezőkben is él

A kiválasztott payment típus a legacy order mezőkben jelenik meg, tehát a checkout submit előtt az új appnak ezt ugyanabba a legacy mezőmodellbe kell majd betennie.

### 2. Van külön kártyás provider-konfig

A `payflowpro` tábla alapján a rendszerben nem csak UI-szintű payment choice van, hanem valódi gateway-konfiguráció is. Emiatt provider-csere vagy új payment logika audit nélkül nem vállalható.

### 3. A free / downloadable út külön figyelmet igényel

A cart/item dump alapján a downloadable/freebie termékek külön mezőzést kapnak (`is_downloadable`, `freebie`, `downloadable_filename`), ezért a zero-total / free-download payment ág nem kezelhető ugyanúgy, mint a shippable paid order.

## V1 implementációs döntés

### Döntés

**V1-ben nem vezetünk be új payment providert, és nem írjuk újra a payment routingot audit nélkül.**

### Indok

- a dump explicit payment mezőket és Payflow Pro konfigurációt mutat;
- a checkout oldali side-effectek egy része még mindig legacy függő;
- a legnagyobb kockázat nem a mezőbekérés, hanem a submit + payment state + entitlement összjáték.

## Következő konkrét lépés EPIC H elején

1. checkout field map véglegesítése a kötelező submit mezőkre;
2. `record_order()` és `record_item()` teljes definíció audit;
3. payment type → legacy mező mapping véglegesítése;
4. döntés A/B között:
   - **A)** új app checkout adatgyűjtés + legacy handoff a fizetésre;
   - **B)** új app submit, de változatlan legacy payment routinggal.

## Tiltott scope jelenleg

- új provider bevezetése;
- callback/IPN flow átírása;
- a legacy payment state model lecserélése.
