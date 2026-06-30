# Chińczyk – Cyfrowa Edycja Premium (Ludo)

Nowoczesna, w pełni interaktywna gra planszowa **Chińczyk** stworzona od podstaw przy użyciu czystych technologii webowych (**HTML5, Vanilla CSS i JavaScript**). Projekt wyróżnia się minimalistyczną, a zarazem efektowną estetyką (szklane panele – *glassmorphism*, ciemne neonowe motywy), dynamicznymi animacjami ruchu pionków, trójwymiarowym rzutem kostką 3D oraz wbudowanym syntetyzatorem dźwięków.

---

## 🚀 Jak uruchomić lokalnie

Gra korzysta z modułów JavaScript (ES6 Modules), dlatego przeglądarka wymaga uruchomienia lokalnego serwera HTTP (otwieranie pliku `index.html` bezpośrednio przez kliknięcie na dysku zakończy się błędem CORS).

1. Upewnij się, że masz zainstalowane środowisko [Node.js](https://nodejs.org/).
2. Otwórz terminal w katalogu głównym projektu i wpisz:
   ```bash
   npx http-server -p 8080
   ```
3. Otwórz w przeglądarce adres:
   **[http://localhost:8080/](http://localhost:8080/)**

---

## 🎨 Główne cechy projektu

* **Premium Visual Experience**: Ciemny, elegancki motyw z neonowymi poświatami w kolorach graczy oraz efektami szkła i rozmycia tła (*backdrop-filter*).
* **Kostka 3D z fizyką obrotu**: Trójwymiarowy sześcian CSS 3D, który obraca się dynamicznie po kliknięciu i płynnie wyhamowuje, pokazując wylosowaną w tle liczbę oczek.
* **Syntezator Audio (Web Audio API)**: Brak zewnętrznych, ciężkich plików dźwiękowych (.mp3). Wszystkie efekty dźwiękowe (rzut, przesunięcie pionka, zbicie przeciwnika, fanfara zwycięstwa) są generowane bezpośrednio w przeglądarce za pomocą kodu JS.
* **Płynne animacje ruchu**: Pionki nie "teleportują się" — poruszają się płynnie pole po polu wzdłuż całej trasy, odtwarzając przy tym synchroniczne dźwięki kroków.
* **Staggering (Nakładanie pionków)**: Jeśli na jednym polu stanie kilka pionków, automatycznie zmniejszają się one i rozsuwają w mini-siatkę, aby wszystkie były doskonale widoczne dla graczy.
* **Elastyczna konfiguracja**: Obsługa od 2 do 4 graczy. Każdy kolor (Czerwony, Zielony, Niebieski, Żółty) można skonfigurować jako:
  * **Człowiek** (sterowanie ręczne),
  * **Komputer (SI)** (inteligentna gra automatyczna z suwakiem prędkości ruchów),
  * **Wyłączony** (baza i meta gracza zostają wyszarzone, a jego pionki nie biorą udziału w grze).
* **Sztuczna Inteligencja (SI)**: Komputer podejmuje decyzje taktyczne na podstawie algorytmu priorytetów (zbijanie przeciwnika -> wprowadzanie pionków na start -> bezpieczne wchodzenie na metę -> ucieczka przed zagrożeniem).
* **Przycisk Testu Wygranej**: Dodatkowy przycisk w panelu sterowania ułatwiający natychmiastowe sprawdzenie działania ekranu zwycięstwa i fanfary audio.

---

## 📏 Zasady Gry (Klasyczny Polski Chińczyk)

Gra implementuje tradycyjne reguły:
1. **Wyjście z bazy**: Wymaga wyrzucenia **6**. Pionek ląduje wtedy na polu startowym gracza.
2. **Trzy rzuty szansy**: Jeśli gracz nie posiada żadnego pionka na planszy (wszystkie 4 stoją w bazie), ma prawo wykonać do **3 rzutów** kostką w swojej turze. Wyrzucenie 6 pozwala wyjść z bazy i natychmiast wykonać kolejny ruch.
3. **Kolejny rzut po 6**: Każde wyrzucenie 6 daje dodatkowy rzut (maksymalnie do 3 rzutów z rzędu w jednej turze, aby uniknąć pętli).
4. **Zbijanie**: Jeśli pionek zakończy ruch na polu zajmowanym przez przeciwnika, zbija go (pionek przeciwnika powraca do swojej bazy).
5. **Blokowanie własnych pól**: Nie można stanąć na polu zajmowanym przez własny pionek (ruch jest wtedy zablokowany, gracz musi wybrać inny pionek lub traci turę).
6. **Meta**: Aby wejść na metę (do domku na środku planszy), należy wyrzucić dokładną liczbę oczek. Zwycięża ten, kto jako pierwszy wprowadzi wszystkie 4 pionki na metę.

---

## 📁 Struktura plików projektu

* `index.html` — Główny plik strukturalny interfejsu (ekran startowy, plansza grid 15x15, panele boczne).
* `styles.css` — Stylistyka aplikacji, szklane panele, siatka planszy, animacja kostki 3D.
* `src/game.js` — Silnik logiki gry (stan rozgrywki, ruchy, kolizje, zasady, sztuczna inteligencja).
* `src/ui.js` — Kontroler UI, obsługa kliknięć, rysowanie planszy, animacje pionków, panel boczny.
* `src/audio.js` — Moduł syntezy dźwięków za pomocą Web Audio API.
