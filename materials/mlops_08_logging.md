# Logging zamiast print

## Czemu print nie wystarcza

Wyobraź sobie: napisałeś skrypt, który co noc o 3:00 pobiera dane i odpala model. Skrypt działa na serwerze. Nie ma tam żadnej konsoli, na którą patrzysz. Wszystkie twoje `print()` lecą w pustkę. Rano widzisz tylko, że danych nie ma. Co poszło nie tak? Nie wiesz. Nie masz śladu.

Do tego `print` ma inne wady. Nie da się go wyłączyć bez kasowania linijek z kodu. Nie mówi, KIEDY coś się stało ani z którego pliku pochodzi. Nie rozróżnia "wszystko ok" od "pali się". W automatyzacji i MLOps to dyskwalifikacja — logi to twoje oczy, gdy ciebie nie ma przy maszynie.

Rozwiązaniem jest wbudowany moduł `logging`. Zero instalacji, po prostu `import logging`.

## Poziomy logowania

Logging ma poziomy ważności. Od najmniej do najbardziej poważnego:

- `DEBUG` — szczegóły dla programisty ("wartość zmiennej x to 5")
- `INFO` — normalne zdarzenia ("pobrano 200 rekordów")
- `WARNING` — coś dziwnego, ale działamy dalej ("brak pola email, pomijam")
- `ERROR` — coś się nie udało ("nie mogę połączyć z API")
- `CRITICAL` — totalna katastrofa ("brak miejsca na dysku, kończę")

```python
import logging

logging.basicConfig(level=logging.INFO)

logging.debug("to się NIE pokaże, bo poziom to INFO")
logging.info("pobieram dane")       # wypisze: INFO:root:pobieram dane
logging.warning("wolna odpowiedź")  # wypisze: WARNING:root:wolna odpowiedź
logging.error("brak pliku")         # wypisze: ERROR:root:brak pliku
```

Kluczowy trik: ustawiasz poziom raz, w jednym miejscu. Na produkcji dajesz `INFO` i nie widzisz śmieci debugowych. Gdy coś się psuje, zmieniasz na `DEBUG` i nagle widzisz wszystko — bez dotykania reszty kodu.

## basicConfig — format, poziom, plik

`basicConfig` konfiguruje logowanie dla całego programu. Wołasz go raz, na początku skryptu.

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    filename="skrypt.log",   # logi lecą do pliku, nie na ekran
)

logging.info("start skryptu")
```

W pliku `skrypt.log` pojawi się linia w stylu:

```
2026-06-10 03:00:01,234 [INFO] root: start skryptu
```

I to jest właśnie ratunek dla skryptu o 3 w nocy. Rano otwierasz `skrypt.log` i czytasz, co się działo minuta po minucie. W formacie najczęściej używasz: `%(asctime)s` (czas), `%(levelname)s` (poziom), `%(name)s` (nazwa loggera), `%(message)s` (treść).

Bez `filename` logi idą na konsolę — to dobre przy lokalnym odpalaniu.

## Logger z nazwą modułu

W większych projektach nie używa się `logging.info(...)` bezpośrednio. Zamiast tego tworzy się logger dla każdego pliku:

```python
import logging

logger = logging.getLogger(__name__)

def pobierz_dane():
    logger.info("zaczynam pobieranie")
    # ... logika ...
    logger.info("gotowe")
```

`__name__` to nazwa modułu, np. `pipeline.pobieranie`. Dzięki temu w logu widzisz, KTÓRY plik wypisał daną linię. Gdy pipeline ma 10 modułów i coś pada, od razu wiesz gdzie szukać. To standard — rób tak zawsze, to jedna linijka.

## Logowanie z danymi

Loguj konkrety, nie ogólniki. Porównaj: "błąd" kontra "błąd pobierania użytkownika id=42, status=500". Tylko to drugie da się zdebugować.

```python
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

rekordy = [{"id": 1, "ok": True}, {"id": 2, "ok": False}, {"id": 3, "ok": True}]

poprawne = 0
for rekord in rekordy:
    if rekord["ok"]:
        poprawne += 1
    else:
        logger.warning("rekord id=%s odrzucony", rekord["id"])
        # wypisze: WARNING: rekord id=2 odrzucony

logger.info("przetworzono %s z %s rekordów", poprawne, len(rekordy))
# wypisze: INFO: przetworzono 2 z 3 rekordów
```

Zwróć uwagę na styl `%s` z argumentami po przecinku — logging sam wstawi wartości. Możesz też użyć f-stringa, oba podejścia spotkasz w kodzie.

Czysta funkcja pomocnicza, którą łatwo przetestować: zbuduj komunikat jako string i dopiero potem go zaloguj.

```python
def opisz_wynik(nazwa_zadania: str, ok: int, total: int) -> str:
    procent = round(100 * ok / total) if total > 0 else 0
    return f"{nazwa_zadania}: {ok}/{total} ({procent}%)"

print(opisz_wynik("import", 8, 10))  # wypisze: import: 8/10 (80%)
print(opisz_wynik("import", 0, 0))   # wypisze: import: 0/0 (0%)
```

## Logowanie wyjątków

Najważniejszy patent w automatyzacjach: `logging.exception`. Wołasz go w bloku `except`, a on zapisze komunikat ORAZ pełny traceback — czyli dokładną ścieżkę, gdzie poleciał wyjątek.

```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

dane = {"model": "gpt-5-mini"}

try:
    temperatura = dane["temperature"]
except KeyError:
    logger.exception("brak klucza w konfiguracji")
```

Wynik w logu:

```
ERROR:__main__:brak klucza w konfiguracji
Traceback (most recent call last):
  File "skrypt.py", line 9, in <module>
    temperatura = dane["temperature"]
KeyError: 'temperature'
```

`logger.exception` loguje zawsze na poziomie ERROR i dokleja traceback automatycznie. Bez tego patentu skrypt nocny umiera po cichu i nigdy nie dowiesz się dlaczego.

## Częste błędy

**Błąd 1: `basicConfig` wołany za późno.** Pierwsze wywołanie `logging.info()` przed `basicConfig` skonfiguruje logging domyślnie i twoja konfiguracja zostanie zignorowana — bez żadnego komunikatu błędu. Logi po prostu wyglądają inaczej niż chcesz albo poziom DEBUG się nie pokazuje. Zasada: `basicConfig` zawsze jako pierwsza rzecz po importach.

**Błąd 2: literówka w nazwie poziomu.**

```python
logging.basicConfig(level=logging.INF)
# AttributeError: module 'logging' has no attribute 'INF'
```

Poprawnie: `logging.INFO`. Poziomy to stałe pisane wielkimi literami: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`.

**Błąd 3: `logger.exception` poza blokiem except.** Zadziała, ale dopisze `NoneType: None` zamiast tracebacku, bo nie ma aktywnego wyjątku do złapania. `exception` ma sens tylko wewnątrz `except`. Poza nim używaj `logger.error("opis")`.

## Podsumowanie

`print` jest do zabawy, `logging` do pracy. Na początku skryptu wołasz `logging.basicConfig` z poziomem, formatem i opcjonalnie plikiem. W każdym module robisz `logger = logging.getLogger(__name__)`. Logujesz konkrety: `debug` dla szczegółów, `info` dla normalnych zdarzeń, `warning` dla dziwnych, `error` dla awarii. W blokach `except` używasz `logger.exception`, żeby mieć pełny traceback. Dzięki temu skrypt, który padł o 3 w nocy, sam opowie ci rano, co się stało.
