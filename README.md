# Dust & Redemption

Ein Western-Open-World-Spiel im Browser (Three.js), inspiriert von Red Dead Redemption. Alle Inhalte, Namen und Modelle sind eigen und werden prozedural erzeugt.

## Starten

Einfach `index.html` im Browser öffnen. Three.js liegt lokal in `js/three.min.js`, es wird kein Server gebraucht. Für Pointer-Lock (Maussteuerung) ist ein Server angenehmer:

```
python -m http.server 8123
```

Dann `http://localhost:8123` öffnen.

## Steuerung

| Taste | Aktion |
|---|---|
| WASD, Shift, Leertaste, Strg | Laufen, Sprinten/Galopp, Springen, Schleichen |
| Maus, rechte Maus, linke Maus | Umsehen, Zielen, Schießen |
| 1–6 / Mausrad | Waffe wechseln |
| R | Nachladen |
| E | Interagieren, Auf-/Absteigen, Plündern, Shops |
| H | Pferd rufen |
| Q | Dead Eye |
| G | Dynamit werfen |
| F | Heiltonikum |
| Tab | Rucksack |
| M | Karte |
| N | Musik an/aus |
| P / Esc | Pause |

## Inhalt

- 1,6 × 1,6 km große Welt mit Stadt, drei Banditenlagern, Farm, See, Tag/Nacht und Wetter
- Sechs Waffen, Dynamit, explodierende Fässer, Dead Eye
- Rucksack, Kramladen, Waffenhändler, Saloon
- Auftragskette, Kopfgelder, Duell, Wölfe und Jagd

## Technik

Reines JavaScript ohne Build-Schritt. Three.js r128 (MIT-Lizenz).
