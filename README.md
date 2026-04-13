# 💰 willhaben Flip Finder

> Automatisch Mega-Schnäppchen in der Elektronik-Kategorie auf willhaben.at finden – neu, OVP, mit Rechnung.

## Features

- 9 Elektronik-Kategorien (Smartphones, Laptops, Konsolen, GPU, Tablets, …)
- Filter: Zustand (Neu/Neuwertig), Preisrange, Keyword, Mindest-Flip-Score
- Automatisches Flip-Scoring (+2 pro Positivkeyword, -5 pro Negativkeyword)
- Inserate mit Negativ-Keywords werden komplett herausgefiltert
- Direkt-Links zu **Geizhals** (Preisvergleich) und **eBay Sold Listings** pro Karte
- Vercel Edge Function als serverseitiger Proxy → kein CORS-Problem

## Flip-Keywords

| Typ | Keywords |
|-----|----------|
| ✅ Positiv (+2) | ovp, ungeöffnet, rechnung, garantie, fehlkauf, doppelt, geschenk, ungebraucht, versiegelt, … |
| ❌ Negativ (-5) | defekt, bastler, wasserschaden, displaybruch, sperrgemeldet, … |

## Lokales Setup

```bash
npm i -g vercel
vercel dev
```

## Deploy auf Vercel

```bash
vercel --prod
```

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS
- **Backend:** Vercel Edge Function (`/api/proxy.js`)
- **Hosting:** Vercel (kostenloses Hobby-Tier)
