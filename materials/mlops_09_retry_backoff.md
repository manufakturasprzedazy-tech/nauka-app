# Obsługa błędów sieci: timeout, retry i backoff

## Sieć zawodzi — i to jest normalne

Każda automatyzacja, która gada z internetem, w końcu trafi na błąd. API LLM odpowie kodem 429 (za dużo zapytań, rate limit). Serwer rzuci 500 (jego wewnętrzny błąd). Albo połączenie po prostu zawiśnie i dostaniesz timeout. To nie są wyjątki od reguły — to codzienność. Różnica między skryptem hobbystycznym a produkcyjnym jest taka, że produkcyjny się tym nie wykłada.

Dobra wiadomość: większość tych błędów jest **przejściowa**. Za 2 sekundy ten sam request przejdzie. Trzeba tylko spróbować jeszcze raz. Mądrze.

## Timeout — zawsze go ustawiaj

Pierwsza zasada: każde wywołanie sieciowe musi mieć timeout. Bez niego skrypt może wisieć w nieskończoność i nigdy się nie dowiesz.

```python
import requests

odpowiedz = requests.get("https://api.example.com/dane", timeout=10)
# jeśli serwer nie odpowie w 10 sekund -> requests.exceptions.Timeout
```

Timeout to nie błąd twojego kodu — to informacja "serwer nie wyrobił". I właśnie taką informację warto złapać i obsłużyć.

## try/except wokół wywołania

Podstawowy wzorzec: opakuj wywołanie w `try/except` i zdecyduj, co dalej.

```python
import requests

try:
    odpowiedz = requests.get("https://api.example.com/dane", timeout=10)
    odpowiedz.raise_for_status()  # rzuci wyjątek dla statusów 4xx/5xx
    dane = odpowiedz.json()
except requests.exceptions.Timeout:
    print("timeout, serwer nie odpowiedział")
except requests.exceptions.HTTPError as e:
    print(f"błąd HTTP: {e}")
# wypisze (przy padzie serwera): błąd HTTP: 500 Server Error: ...
```

`raise_for_status()` to wygodny skrót — zamienia status 4xx/5xx na wyjątek, więc nie musisz ręcznie sprawdzać `if odpowiedz.status_code != 200`.

## Pętla retry z licznikiem prób

Jedna próba to za mało. Robimy pętlę: spróbuj, jak nie wyszło — spróbuj znowu, ale maksymalnie N razy. Bez limitu prób skrypt mógłby młócić w nieskończoność.

```python
max_prob = 3

for proba in range(max_prob):
    print(f"próba {proba + 1} z {max_prob}")
    sukces = proba == 2  # symulacja: udaje się za trzecim razem
    if sukces:
        print("udało się!")
        break
else:
    print("wyczerpano próby")

# wypisze:
# próba 1 z 3
# próba 2 z 3
# próba 3 z 3
# udało się!
```

Zwróć uwagę na `for...else` — blok `else` wykona się tylko, gdy pętla przeszła do końca bez `break`, czyli gdy wszystkie próby zawiodły.

## Exponential backoff — czekaj coraz dłużej

Jeśli serwer jest przeciążony (429), ponawianie co sekundę tylko go dobija. Wzorzec branżowy to **exponential backoff**: po każdej nieudanej próbie czekasz dwa razy dłużej. Próba 1 → czekaj 1 s, próba 2 → 2 s, próba 3 → 4 s, potem 8 s...

```python
import time

for attempt in range(4):
    czas_czekania = 2 ** attempt
    print(f"po próbie {attempt}: czekam {czas_czekania} s")
    # time.sleep(czas_czekania)  # w prawdziwym kodzie

# wypisze:
# po próbie 0: czekam 1 s
# po próbie 1: czekam 2 s
# po próbie 2: czekam 4 s
# po próbie 3: czekam 8 s
```

`2 ** attempt` to potęgowanie: 2 do potęgi numeru próby. Prosty wzór, a daje serwerowi czas na ochłonięcie.

## Kiedy NIE ponawiać

Retry ma sens tylko dla błędów przejściowych. Niektóre statusy mówią "to twoja wina i kolejna próba nic nie zmieni":

- **400 Bad Request** — wysłałeś zły request. Wyślesz go drugi raz — dalej będzie zły.
- **401 Unauthorized** — zły klucz API. Ponawianie nie naprawi klucza.
- **403 Forbidden** — brak uprawnień. Jak wyżej.

Ponawiamy: **429, 500, 502, 503, timeout**. Nie ponawiamy: **400, 401, 403, 404**. Funkcja czysta, która to rozstrzyga:

```python
def czy_ponawiac(status: int) -> bool:
    return status in (429, 500, 502, 503, 504)

print(czy_ponawiac(429))  # wypisze: True
print(czy_ponawiac(401))  # wypisze: False
print(czy_ponawiac(400))  # wypisze: False
```

Dwa słowa o **idempotencji**: operacja idempotentna to taka, którą można powtórzyć wiele razy z tym samym skutkiem (np. "ustaw status na opłacony"). Ponawiaj śmiało tylko operacje idempotentne — bo retry "dodaj zamówienie" przy chwiejnej sieci może utworzyć trzy zamówienia zamiast jednego.

## Pełny wzorzec: retry_request

Składamy wszystko w jedną funkcję. To wzorzec, który będziesz kopiował do każdej automatyzacji.

```python
import time
import requests

def retry_request(url: str, max_prob: int = 3, timeout: int = 10) -> dict:
    """GET z retry i exponential backoff. Zwraca JSON jako słownik."""
    ostatni_blad = None
    for attempt in range(max_prob):
        try:
            odpowiedz = requests.get(url, timeout=timeout)
            if odpowiedz.status_code in (429, 500, 502, 503, 504):
                ostatni_blad = f"status {odpowiedz.status_code}"
            elif odpowiedz.status_code >= 400:
                # 400/401/403 itd. — nie ponawiamy, od razu błąd
                raise ValueError(f"błąd klienta: {odpowiedz.status_code}")
            else:
                return odpowiedz.json()
        except requests.exceptions.Timeout:
            ostatni_blad = "timeout"
        time.sleep(2 ** attempt)  # 1 s, 2 s, 4 s...
    raise RuntimeError(f"wyczerpano {max_prob} prób, ostatni błąd: {ostatni_blad}")
```

Logika: błędy przejściowe → zapamiętaj i czekaj coraz dłużej; błędy klienta (4xx poza 429) → przerwij od razu; sukces → zwróć dane. Po wyczerpaniu prób rzucamy własny wyjątek z opisem — warstwa wyżej zdecyduje, co z tym zrobić (np. zaloguje przez `logger.exception`).

Część decyzyjną można wydzielić i testować offline, bez sieci:

```python
def klasyfikuj_status(status: int) -> str:
    if 200 <= status < 300:
        return "sukces"
    if status in (429, 500, 502, 503, 504):
        return "ponow"
    return "przerwij"

print(klasyfikuj_status(200))  # wypisze: sukces
print(klasyfikuj_status(503))  # wypisze: ponow
print(klasyfikuj_status(401))  # wypisze: przerwij
```

## Częste błędy

**Błąd 1: brak timeoutu.** `requests.get(url)` bez `timeout=` może wisieć godzinami. Żadnego komunikatu — skrypt po prostu stoi. Zawsze dawaj `timeout=`.

**Błąd 2: goły `except:` łapiący wszystko.**

```python
try:
    dane = odpowiedz.json()
except:
    pass  # cisza... i KeyError 50 linijek dalej
```

Łapiąc wszystko, ukrywasz też literówki i prawdziwe bugi. Łap konkretne wyjątki: `requests.exceptions.Timeout`, `ValueError` itd. Goły `except: pass` to najczęstsza przyczyna "skrypt nic nie zrobił i nic nie powiedział".

**Błąd 3: `time.sleep(2 * attempt)` zamiast `2 ** attempt`.** Mnożenie daje 0, 2, 4 — w tym czekanie 0 sekund po pierwszej próbie, czyli natychmiastowy strzał w przeciążony serwer. Potęgowanie `**` daje 1, 2, 4. Jedna gwiazdka różnicy, zupełnie inne zachowanie.

## Podsumowanie

Sieć pada — planuj to z góry. Zawsze ustawiaj timeout. Opakuj wywołanie w `try/except` i pętlę z limitem prób. Między próbami czekaj `2 ** attempt` sekund (exponential backoff). Ponawiaj 429 i 5xx, nie ponawiaj 400/401/403. Powtarzaj tylko operacje idempotentne. Funkcja `retry_request` z tej lekcji to gotowy szablon — zrozum go raz, używaj wszędzie.
