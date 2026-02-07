# 📱 Instalacja na telefonie - Instrukcja

## Metoda 1: Instalacja jako PWA (Zalecana)

### Android (Chrome/Edge):
1. Otwórz stronę w przeglądarce Chrome lub Edge
2. Naciśnij menu (⋮) w prawym górnym rogu
3. Wybierz "Dodaj do ekranu głównego" lub "Zainstaluj aplikację"
4. Potwierdź instalację
5. Ikona aplikacji pojawi się na ekranie głównym!

### iOS (Safari):
1. Otwórz stronę w przeglądarce Safari
2. Naciśnij przycisk "Udostępnij" (kwadrat ze strzałką w górę)
3. Przewiń w dół i wybierz "Dodaj do ekranu początkowego"
4. Nadaj nazwę (domyślnie: "Zwierzęta")
5. Naciśnij "Dodaj"
6. Ikona aplikacji pojawi się na ekranie głównym!

## Metoda 2: Hosting lokalny (dla deweloperów)

Jeśli chcesz przetestować lokalnie:

### Użyj Python HTTP Server:
```bash
# W folderze z plikami:
python -m http.server 8000

# Następnie otwórz w telefonie:
http://[IP-KOMPUTERA]:8000
```

### Lub użyj Node.js:
```bash
npx http-server -p 8000
```

## Metoda 3: Deploy na GitHub Pages (darmowy hosting)

1. Utwórz repozytorium na GitHub
2. Wgraj pliki
3. Włącz GitHub Pages w Settings
4. Aplikacja będzie dostępna pod: `https://[username].github.io/[repo-name]`

## Metoda 4: Deploy na Netlify/Vercel (najłatwiejszy)

### Netlify:
1. Wejdź na netlify.com
2. Przeciągnij folder z plikami
3. Gotowe! Otrzymasz link typu: `https://twoja-nazwa.netlify.app`

### Vercel:
1. Wejdź na vercel.com
2. Podłącz GitHub repo lub wgraj pliki
3. Automatyczny deploy!

## 🎯 Zalecane: Kamera na telefonie

Aplikacja działa NAJLEPIEJ na telefonie, ponieważ:
- ✅ Lepsza kamera frontalna
- ✅ Ekran dotykowy (memory game)
- ✅ Łatwiejsza kalibracja wzroku
- ✅ Pełny ekran (standalone mode)

## 🔧 Wymagane uprawnienia:

Przy pierwszym uruchomieniu poprosi o:
- 📷 **Kamera** - dla rysowania wzrokiem
- 🎤 **Mikrofon** - dla gry w gitarę (opcjonalne)

## 💡 Wskazówki:

1. **Kalibracja wzroku działa lepiej w dobrym oświetleniu**
2. **Trzymaj telefon stabilnie podczas kalibracji**
3. **Siedź około 30-50cm od ekranu**
4. **Kalibruj wzrok patrząc DOKŁADNIE na środek ekranu**

## 🐛 Troubleshooting:

**Problem: Kamera nie działa**
- Sprawdź uprawnienia w ustawieniach przeglądarki
- Odśwież stronę
- Spróbuj w trybie incognito (bez rozszerzeń)

**Problem: Wzrok jest niedokładny**
- Kliknij przycisk "🎯 Kalibruj" ponownie
- Upewnij się że dobrze oświetlisz twarz
- Spróbuj z innej odległości

**Problem: PWA nie instaluje się**
- Sprawdź czy masz wystarczająco miejsca
- Upewnij się że strona jest na HTTPS (lub localhost)
- Zaktualizuj przeglądarkę

## 📦 Pliki w paczce:

```
zwierzeta_v49/
├── index.html          # Główny plik
├── manifest.json       # Manifest PWA
├── sw.js              # Service Worker
├── icon-192.png       # Ikona aplikacji
├── icon-512.png       # Ikona aplikacji HD
├── css/
│   └── styles.css     # Style
├── js/
│   ├── 01-player-voice.js
│   ├── 02-voice-wav.js
│   ├── 03-tabs.js
│   ├── 04-drawing.js
│   ├── 05-learning-game.js
│   ├── 06-games.js
│   ├── 07-gitara.js
│   ├── 08-kolorowanki.js
│   └── 09-memory.js
└── img/
    └── [zwierzątka].png
```

---

Miłej zabawy! 🎮🐾
