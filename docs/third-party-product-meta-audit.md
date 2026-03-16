# 3rd-party product meta audit (CG-202)

## Mire támaszkodik az audit?

A legacy `columbia_games` dumpban ténylegesen jelen vannak ezek a táblák:

- `3rd_party_product_details`
- `3rd_party_images`
- `3rd_party_comments`

A rewrite korábbi catalog read modelje ezeket nem olvasta, ezért a customer UI sem listában, sem PDP-n nem tudott 3rd-party enrichmentet megjeleníteni.

## Döntés

A 3rd-party product meta **read-only parity-releváns**.

Ennek megfelelően a rewrite mostantól:

- listanézetben opcionálisan visszaad rövid 3rd-party meta összegzést,
- PDP-n visszaadja a részletes 3rd-party meta blokkot,
- ha nincs ilyen rekord, változatlanul működik a normál catalog response.

## Mi nincs most scope-ban?

A következők továbbra sem kerültek be a v1 customer UI-ba:

- 3rd-party comment írás/szerkesztés
- 3rd-party sync / refresh workflow
- bármilyen write-back a legacy meta táblákba

Ezek külön admin/integrációs döntést igényelnek, ezért most **nem parity-kötelező customer UI funkcióként**, hanem későbbi backlog témaként kezeljük őket.

## Rewrite implementációs szabály

- A catalog API `thirdParty` blokkot csak akkor ad vissza, ha tényleg van kapcsolódó legacy rekord.
- A listanézet rövidített leírást használ, hogy a payload kezelhető maradjon.
- A PDP teljesebb képet kap, beleértve a gallery elemeket is, ha elérhetők.
- A 3rd-party meta hiánya **nem** okozhat hibát, és nem teheti használhatatlanná a normál termékoldalt.
