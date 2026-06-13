---
title: "Hermes ako môj time-tracking asistent"
date: 2026-06-13
draft: false
tags: ["hermes"]
summary: "Prestal som si zapisovať čas ručne. Namiesto toho ma Hermes počas dňa občas pingne na Slacku a zvyšok vybaví automaticky."
---

Time tracking je jedna z tých vecí, ktoré si vždy plánujem robiť poctivo - a vždy pri nich zlyhám.

Začiatok mesiaca vyzerá sľubne. Poctivo zapisujem tasky, meetingy aj drobné odbočky.
O týždeň neskôr už mám úplne iné starosti a na konci mesiaca sa snažím spätne zrekonštruovať, čo som vlastne robil.

Potreboval by som, aby niekto stál za zadkom a kopal ma, nech si zalogujem prácu.

## Hermes
Nedávno som skúšal Hermes AI a jeho napojenie na Slack.
Keďže Slack používam prakticky celý deň, napadlo mi jednoduché riešenie: nech ma Hermes v náhodných časoch osloví správou a spýta sa, na čom práve pracujem.

Dôležité je, že kvôli tomu nemusím prepínať kontext ako pri bežných notifikáciách od kolegov, ktoré často znamenajú prechod na inú úlohu.
Neotváram žiadny timesheet systém, formulár ani webovú aplikáciu.
Odpoviem jednou vetou priamo v Slacku a pokračujem v práci; Hermes odpoveď automaticky zaloguje.

Náhodné časy sú zámer. Keby sa ping objavoval vždy o 10:00, 13:00 a 15:00, veľmi rýchlo by som si naň zvykol a podvedoma ho začal ignorovať.
Takto ma zastihne počas reálnej práce a vzorka dňa je prirodzenejšia.

## Ako to funguje

{{< image src="img/hermes_time_tracking_flow.sk.svg" alt="Diagram toku time-trackingu cez Hermes: ping na Slacku, odpoveď používateľa a zalogovanie cez LLM a skill task-time-tracker" caption="Ako prebieha jedna time-tracking interakcia naprieč systémom" >}}

Príklad jednej interakcie:

```text
Hermes:
@ivo What are you working on?

Ivo:
Finishing JWT decoder UI and discussing extension permissions.

Hermes:
Logged under JWT Decoder.
```

Celá "big-brain" časť (klasifikácia odpovede do kategórie) beží na jazykovom modeli.
Dáta, scheduler aj logovanie ostávajú lokálne.

### Komponenty

- **Hosting** - Raspberry Pi alebo iný stroj, kde Hermes beží 24/7.
- **Hermes Gateway** - prepojenie medzi Hermesom a Slackom.
- **Slack kanál `#time-tracking`** - miesto, kde prebiehajú pingy aj odpovede.
- **Task-time-tracker skill** - logovanie záznamov a generovanie reportov.
- **Hermes scheduler** - plánuje náhodné pingy počas dňa.
- **LLM** - klasifikuje odpovede do existujúcich kategórií.

### Nastavenie
Celý trik je v dvoch veciach:

1. Hermes číta všetky správy v kanáli automaticky.
2. Ping používa `@mention`, aby ti Slack poslal notifikáciu.

Nastavuje sa to v Slack gateway configu (`hermes config edit`, sekcia `slack`).

### 1. Hermes číta kanál + ping s mention

Hermes je v Slack gateway nastavený tak, že v kanáli `#time-tracking` číta všetky správy automaticky - nemusíš ho v odpovedi tagovať.

Keď príde ping a ty odpovieš bežnou vetou, Hermes ju zachytí a spracuje.

Ping ťa pritom otaguje (`@ty na čom robíš?`).
Dôvod je jednoduchý: notifikácie pre tento kanál mám nastavené na "mention only“. Bez tagu by mi Slack nedal vedieť, že sa Hermes pýta.

### 2. `channel_prompts` – aby Hermes vedel, že má logovať

Bez stálej inštrukcie by Hermes na holú správu reagoval konverzačne ("čo tým myslíš?“) namiesto toho, aby zavolal skill.

`channel_prompts` mu dá trvalý pokyn, že každá správa v tomto kanáli predstavuje odpoveď na time-tracking ping.

```yaml
channel_prompts:
  C0XXXXXXX: "Every message in this channel is my reply to a time-tracking ping. Log it using the task-time-tracker skill: first run `ping categories`, classify my reply into an existing category (create a new one only if nothing fits), then run `ping log` with my exact words. Reply with one short confirmation line. Do not use any other task tool."
```

Hermes po zalogovaní odpovie krátkym potvrdením.

A tu je pekná vlastnosť celého setupu: keďže v potvrdení nepoužíva `@mention` a notifikácie kanála mám nastavené na "mention only“, táto odpoveď ma už znova nevyruší.
Ticho pristane v kanáli a ja môžem pokračovať v práci.

Po každej úprave configu nezabudni:

```shell
hermes gateway restart
```

### Skill task-time-tracker

Skill vystavuje jednoduché príkazy cez `scripts/tracker.py`:

```shell
ping categories
ping log
python3 scripts/tracker.py report month
```

Klasifikačná logika je zámerne jednoduchá:

- zaraď odpoveď do existujúcej kategórie,
- novú kategóriu vytvor iba vtedy, keď nič nesedí.

Tým sa počet kategórií prirodzene stabilizuje a reporty ostávajú prehľadné.

## TL;DR

1. Nainštaluj Hermes Agent.
2. Pripoj Slack cez Hermes Gateway.
3. Vytvor kanál `#time-tracking`.
4. Nastav Hermesa tak, aby v ňom čítal všetky správy.
5. Nakonfiguruj `channel_prompts`.
6. Nainštaluj alebo napíš `task-time-tracker` skill.
7. Reštartuj gateway a otestuj workflow.
8. Nastav náhodné pingy cez Hermes scheduler.

Výsledok: Hermes sa ťa počas dňa občas spýta, na čom pracuješ. Ty odpovieš jednou vetou a zvyšok sa udeje automaticky.

## Záver

Tento setup nebude vyhovovať každému. Niekomu môže pravidelné vyrušovanie notifikáciami prekážať.

Mne funguje práve preto, že odpoveď trvá pár sekúnd a nevyžaduje prepínanie do iného nástroja.
Hermes sa ma spýta priamo tam, kde už pracujem celý deň - na Slacku.

Samotné logovanie je však len polovica príbehu. Zaujímavejšia časť začína vo chvíli, keď sa z týchto záznamov začnú generovať reporty a štatistiky.

Tomu sa budem venovať v samostatnom článku.
