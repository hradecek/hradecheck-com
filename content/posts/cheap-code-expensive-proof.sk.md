---
title: "Kód je lacný, dôkaz drahý"
date: 2026-11-20
draft: false
tags: ["testing", "ai", "mutation-testing"]
summary: "Písanie kódu zlacnelo. Dôkaz, že robí, čo má, nie."
---

Vo vývoji softvéru sa písanie kódu zmenilo z najpomalšej na najrýchlejšiu činnosť, tak rýchlo, že si to nestíhame ani uvedomovať.
Agent mi za dve minúty vyrobí 800-riadkový diff a ja potom hodinu robím to, čo som vždy chcel robiť namiesto programovania: čítam cudzí kód.
Stretol som sa s názormi, že na kóde už nezáleží. Ja som presne opačného názoru, softvér je oblečený stále v rovnakom kabáte, len ho šijú stroje. Ale, keďže kód dnes nikto nečíta, znamená to, že dôkaz, že to robí, čo má, je oveľa dôležitejší.

## Všetko je zelené

Agent píše testy s rovnakým nadšením ako implementáciu. A sú nádherné:

```kotlin
@Test
fun `calculates discount`() {
    val result = service.discountFor(order)
    assertNotNull(result)
}
```

Zľava? Je tam! 5 % alebo 500 %? Problém účtovníctva.
Coverage? Všetka, Sonar? šťastný.

{{< image src="img/what-a-beautiful-pigeon.jpg" alt="Meme Is this a pigeon?: muž ukazuje na motýľa označeného ASSERT-NOT-NULL a hovorí What a beautiful pigeon" >}}

Coverage totiž meria, kadiaľ kód prešiel, nie či si niekto všimol, čo tam robil. Je to dochádzkový systém, nie hodnotenie výkonu.

Na to druhé je **mutation testing**. [Pitest](https://pitest.org/) potichu zmení `>=` na `>`, vráti inú hodnotu, vyhodí volanie, a pustí testy znova.
Ak zostanú zelené, mutant prežil a váš test je na tom mieste dekorácia. Je to jediná metrika, ktorú poznám, čo **testuje testy**. Je to aj jediný report, po ktorom som sa cítil horšie ako po code review.

## Mocky, ktoré testujú mocky

Keď je implementácia lacná, prepisuje sa častejšie. Unit test, ktorý pol stránky nastavuje mocky a potom overí, že mock vrátil to, čo sme mu povedali, sa zahodí spolu s ňou. Nikomu nechýba.

Test, ktorý pošle request a pozrie sa na odpoveď, o vnútre nevie nič. Prežije refaktoring, prepis aj to, keď agent v utorok usúdi, že to celé má byť inak.

Preto pri review čítam najprv **scenáre**, až potom kód. Osemsto riadkov riadok po riadku nečíta nikto a kto tvrdí, že áno, klame.

## Pointa

Úsudok z programovania neodišiel.

Presunul sa z *"ako to napísať"* na *"čo má vlastne vyjsť"*.

Písať rýchlo vie dnes každý, kto má predplatné. Review testov spraví ďalší agent. Či má byť zľava 5 % alebo 500 %, mu však musí niekto povedať.
