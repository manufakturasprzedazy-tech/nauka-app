# Anatomia produkcyjnej automatyzacji

Znasz już wszystkie klocki: argparse, logging, JSON, retry, zmienne środowiskowe, testy, cron. Ta lekcja składa je w całość. Zobaczysz, jak wygląda szkielet skryptu, który można bez wstydu wrzucić na serwer: taki, który cron odpala o 6:00, który sam mówi, co robi, a gdy coś pójdzie nie tak — zostawia czytelny ślad zamiast cichej katastrofy.

## Pipeline: pobierz → przetwórz → zapisz

Prawie każda automatyzacja to ten sam trójkrok. **Pobierz** dane (API, plik, baza). **Przetwórz** je (filtruj, licz, formatuj). **Zapisz lub wyślij** wynik (plik, mail, Slack, kolejne API). Ta struktura podpowiada podział na funkcje:

```python
def pobierz(zrodlo):
    ...

def przetworz(dane):
    ...

def zapisz(wynik):
    ...
# Wynik: trzy małe funkcje zamiast jednego 200-liniowego "main"
```

Złota zasada: **środek pipeline'u to czyste funkcje**. `przetworz()` dostaje dane, zwraca wynik, nie dotyka sieci ani dysku. Dzięki temu testujesz ją pytestem w milisekundę, bez mockowania świata. Całe I/O (sieć, pliki) wypychasz na brzegi — do `pobierz()` i `zapisz()` — i tylko tam zakładasz retry.

## Warstwy skryptu

Produkcyjny skrypt czyta się od góry jak spis treści: konfiguracja → logging → funkcje czyste → I/O → main.

**Config z env**: sekrety i ustawienia środowiska bierzesz z `os.environ`, nigdy z kodu. **Logging zamiast print**: log z poziomem i timestampem powie Ci o 6:03 rano, co się stało o 6:00. **main z argparse**: parametry (zakres dat, tryb dry-run) przychodzą z linii poleceń, bo woła Cię cron, nie człowiek. **Retry wokół I/O**: sieć zawodzi losowo, więc `pobierz()` próbuje kilka razy z rosnącą przerwą.

## Idempotencja i czytelne błędy

Harmonogram może odpalić skrypt dwa razy — po awarii, ręcznie, przy zmianie czasu. Skrypt idempotentny drugi raz grzecznie powie "już zrobione" zamiast wysłać drugi raport. Najprościej: wynik nazywaj deterministycznie (np. `raport_2026-06-12.json`) i sprawdzaj, czy już istnieje.

Druga zasada: **padaj głośno i konkretnie**. `KeyError: 'cena'` o 6 rano nic nie mówi. `ValueError: rekord 3 nie ma pola 'cena' — sprawdź eksport z CRM` — mówi wszystko. Łap wyjątki nisko, opakowuj w komunikat z kontekstem, loguj i kończ z niezerowym kodem wyjścia, żeby cron/CI zobaczył porażkę.

## Pełny szkielet — przykład offline

Poniżej kompletny, działający bez internetu przykład: "pobranie" symuluje string JSON (w realu byłby to `requests.get`), reszta jest w pełni produkcyjna.

```python
import argparse
import json
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("raport")

# --- 1. POBIERZ (I/O, w realu: requests + os.environ["API_KEY"]) ---
ODPOWIEDZ_API = '''
{"zamowienia": [
  {"id": 1, "kwota": 250, "status": "oplacone"},
  {"id": 2, "kwota": 90,  "status": "anulowane"},
  {"id": 3, "kwota": 410, "status": "oplacone"}
]}
'''

def pobierz(proby=3):
    for proba in range(1, proby + 1):
        try:
            return json.loads(ODPOWIEDZ_API)   # w realu: requests.get(...).json()
        except json.JSONDecodeError as e:
            log.warning("Próba %d nieudana: %s", proba, e)
    raise RuntimeError(f"Pobieranie padło po {proby} próbach")

# --- 2. PRZETWÓRZ (czysta funkcja — łatwa do testów) ---
def przetworz(dane, min_kwota=0):
    oplacone = [z for z in dane["zamowienia"]
                if z["status"] == "oplacone" and z["kwota"] >= min_kwota]
    return {"liczba": len(oplacone), "suma": sum(z["kwota"] for z in oplacone)}

# --- 3. ZAPISZ (I/O, tu: zwrot stringa; w realu: plik/Slack) ---
def zapisz(wynik, dry_run=False):
    tekst = json.dumps(wynik, ensure_ascii=False)
    if dry_run:
        log.info("[DRY-RUN] zapisałbym: %s", tekst)
        return None
    return tekst

# --- 4. MAIN spina warstwy ---
def main(args):
    log.info("Start, min_kwota=%d", args.min_kwota)
    dane = pobierz()
    wynik = przetworz(dane, args.min_kwota)
    zapis = zapisz(wynik, args.dry_run)
    log.info("Koniec: %s", wynik)
    return wynik

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Dzienny raport zamówień")
    parser.add_argument("--min-kwota", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    main(parser.parse_args())

# Test bez CLI:
print(przetworz(json.loads(ODPOWIEDZ_API), min_kwota=100))
# wypisze: {'liczba': 2, 'suma': 660}
print(przetworz(json.loads(ODPOWIEDZ_API), min_kwota=300))
# wypisze: {'liczba': 1, 'suma': 410}
```

Zauważ: `przetworz()` przetestowaliśmy dwoma printami, nie dotykając logowania ani "sieci". To efekt czystych funkcji w środku.

## Checklist produkcyjny — 10 punktów

Zanim wrzucisz skrypt na serwer, przejdź listę:

1. Sekrety w env/.env, zero kluczy w kodzie i w gicie.
2. Parametry przez argparse, w tym flaga `--dry-run`.
3. Logging z poziomami i timestampami zamiast print.
4. Logika w czystych funkcjach, I/O tylko na brzegach.
5. Retry z odstępami wokół wywołań sieciowych.
6. Idempotencja — podwójne odpalenie nie robi szkody.
7. Błędy z kontekstem i niezerowy kod wyjścia przy porażce.
8. Testy pytest dla funkcji przetwarzających.
9. Kod w gicie, z README jak uruchomić.
10. Harmonogram (cron/Actions) ustawiony świadomie, z myślą o UTC.

## Częste błędy

**1. Logika sklejona z I/O.**

```python
def przetworz_i_wyslij():
    dane = requests.get("https://api.firma.pl/zam").json()
    ...
# w teście: requests.exceptions.ConnectionError: Failed to establish a new connection
```

Nie przetestujesz logiki bez internetu. Rozdziel: `pobierz()` osobno, `przetworz(dane)` osobno.

**2. Połknięty wyjątek.**

```python
try:
    wynik = przetworz(dane)
except Exception:
    pass  # "żeby się nie wywalało"
print(wynik)
# NameError: name 'wynik' is not defined
```

Skrypt "nie wywalił się", ale wynik nie istnieje, a cron zgłosił sukces. Łap konkretne wyjątki, loguj i przerywaj.

**3. Brak dry-run.** Pierwsze odpalenie nowej wersji od razu wysyła 500 maili do klientów. Bez komunikatu błędu — to działa "poprawnie", tylko nie powinno. Flaga `--dry-run` to najtańsza polisa, jaką znasz z lekcji o argparse.

## Podsumowanie

Produkcyjna automatyzacja to zawsze ten sam szkielet: config z env, logging, pipeline pobierz → przetwórz → zapisz z czystą logiką w środku, main z argparse, retry na I/O, idempotencja i głośne, konkretne błędy. Każdy element znasz z poprzednich lekcji — sztuka polega na tym, żeby składać je za każdym razem, nawet w "małym skrypciku". Małe skrypciki mają zwyczaj zostawać na produkcji latami.
