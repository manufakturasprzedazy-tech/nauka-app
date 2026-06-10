# Testy z pytest

## Po co testy

W MLOps nie ma dyskusji: bez testów nie ma CI/CD, a bez CI/CD nie ma MLOps. Każdy pipeline na GitHubie czy GitLabie przed wdrożeniem odpala testy. Jeśli test padnie — kod nie wchodzi na produkcję. To serce całego procesu.

Testy odpowiadają na jedno pytanie: "czy mój kod nadal robi to, co miał robić?". Zmieniasz funkcję parsującą dane, odpalasz testy, masz odpowiedź w 2 sekundy. Bez testów odpowiedź przychodzi o 3 w nocy, gdy pipeline padnie. Testy to nie biurokracja — to automat, który sprawdza twoją robotę za każdym razem, za darmo.

Najpopularniejsze narzędzie w Pythonie to `pytest`. Instalacja: `pip install pytest`.

## assert — fundament

Wszystko opiera się na jednym słowie kluczowym: `assert`. Sprawdza warunek. Prawda — leci dalej. Fałsz — rzuca `AssertionError`.

```python
assert 2 + 2 == 4      # nic się nie dzieje, jest ok
assert "py" in "pytest"  # też ok

assert 2 + 2 == 5
# AssertionError
```

W zwykłym skrypcie `AssertionError` wywala program. W pytest — oznacza test jako oblany i pokazuje dokładnie, co się nie zgadzało.

## Plik test_*.py i funkcje test_*

Pytest znajduje testy po nazwach. Dwie reguły:

1. Plik nazywa się `test_costam.py` (albo `costam_test.py`).
2. Funkcje testowe zaczynają się od `test_`.

Powiedzmy, że mamy plik `parsowanie.py` z funkcją czystą — taką, która dla tych samych wejść zawsze daje to samo wyjście i niczego nie dotyka na zewnątrz:

```python
def wyciagnij_model(linia: str) -> dict:
    """Parsuje linię 'model=gpt-5-mini;tokens=120' na słownik."""
    wynik = {}
    for czesc in linia.split(";"):
        klucz, wartosc = czesc.split("=")
        wynik[klucz.strip()] = wartosc.strip()
    return wynik

print(wyciagnij_model("model=gpt-5-mini;tokens=120"))
# wypisze: {'model': 'gpt-5-mini', 'tokens': '120'}
```

Obok kładziemy plik `test_parsowanie.py`:

```python
from parsowanie import wyciagnij_model

def test_parsuje_dwa_pola():
    wynik = wyciagnij_model("model=gpt-5-mini;tokens=120")
    assert wynik == {"model": "gpt-5-mini", "tokens": "120"}

def test_obcina_spacje():
    wynik = wyciagnij_model("model = gpt-5-mini")
    assert wynik["model"] == "gpt-5-mini"
```

Funkcje czyste testuje się najłatwiej — nie trzeba sieci, bazy ani plików. Dlatego w automatyzacjach warto wydzielać logikę (parsowanie, liczenie, budowanie słowników) do funkcji czystych, a sieć trzymać osobno.

## Uruchamianie i czytanie raportu

W terminalu, w folderze projektu, wpisujesz po prostu:

```
pytest
```

Pytest sam znajdzie wszystkie pliki `test_*.py` i odpali wszystkie funkcje `test_*`. Wynik przy sukcesie:

```
test_parsowanie.py ..                                [100%]
========== 2 passed in 0.01s ==========
```

Każda kropka to jeden zaliczony test. A teraz zepsujmy coś — niech funkcja przestanie obcinać spacje. Raport:

```
test_parsowanie.py .F                                [100%]
=================== FAILURES ===================
______________ test_obcina_spacje _____________

    def test_obcina_spacje():
        wynik = wyciagnij_model("model = gpt-5-mini")
>       assert wynik["model"] == "gpt-5-mini"
E       AssertionError: assert ' gpt-5-mini' == 'gpt-5-mini'
E         -  gpt-5-mini
E         + gpt-5-mini
========== 1 failed, 1 passed in 0.02s ==========
```

Jak to czytać? `F` to oblany test. Linia ze strzałką `>` pokazuje, który assert padł. Linie z `E` pokazują wartości: dostaliśmy `' gpt-5-mini'` (ze spacją!), oczekiwaliśmy `'gpt-5-mini'`. Pytest sam wypisuje różnicę — nie musisz dodawać żadnych printów. To jest właśnie jego supermoc.

Przydatne flagi: `pytest -v` (pokazuje nazwy testów zamiast kropek), `pytest -k spacje` (odpala tylko testy z "spacje" w nazwie).

## Arrange–Act–Assert

Dobry test ma trzy kroki: przygotuj dane (arrange), wywołaj funkcję (act), sprawdź wynik (assert). Trzymanie się tej struktury sprawia, że testy czyta się jak instrukcję.

```python
def policz_koszt(tokeny: int, cena_za_1m: float) -> float:
    return round(tokeny / 1_000_000 * cena_za_1m, 6)

def test_koszt_miliona_tokenow():
    # arrange
    tokeny = 1_000_000
    cena = 0.25
    # act
    koszt = policz_koszt(tokeny, cena)
    # assert
    assert koszt == 0.25
```

W krótkich testach komentarze można pominąć, ale kolejność zostaje.

## Parametrize — jeden test, wiele przypadków

Zamiast kopiować test pięć razy dla pięciu wejść, używasz `@pytest.mark.parametrize`. Podajesz listę krotek (wejście, oczekiwany wynik), a pytest odpali test dla każdej.

```python
import pytest

def czy_ponawiac(status: int) -> bool:
    return status in (429, 500, 502, 503, 504)

@pytest.mark.parametrize("status, oczekiwane", [
    (429, True),
    (500, True),
    (200, False),
    (401, False),
])
def test_czy_ponawiac(status, oczekiwane):
    assert czy_ponawiac(status) == oczekiwane
```

Raport pokaże 4 osobne testy:

```
test_retry.py ....                                   [100%]
========== 4 passed in 0.01s ==========
```

Jeśli jeden przypadek padnie, zobaczysz dokładnie który, np. `test_czy_ponawiac[401-False]`. Parametrize to ulubione narzędzie do testowania edge case'ów: pusty string, zero, wartości ujemne, brakujący klucz.

## Częste błędy

**Błąd 1: funkcja testowa bez prefiksu `test_`.** Nazwiesz ją `sprawdz_parsowanie()` i pytest ją po cichu zignoruje. Raport powie `collected 0 items` albo po prostu pominie twój test — a ty myślisz, że wszystko przeszło. Zawsze `test_` na początku nazwy funkcji i pliku.

**Błąd 2: ModuleNotFoundError przy imporcie.**

```
E   ModuleNotFoundError: No module named 'parsowanie'
```

Pytest nie widzi twojego modułu, bo odpalasz go z innego folderu. Rozwiązanie: uruchamiaj `pytest` z katalogu głównego projektu, w którym leżą oba pliki.

**Błąd 3: assert z porównaniem floatów.**

```python
assert 0.1 + 0.2 == 0.3
# E  AssertionError: assert 0.30000000000000004 == 0.3
```

Floaty mają błędy zaokrągleń. Używaj `pytest.approx`: `assert 0.1 + 0.2 == pytest.approx(0.3)` — przechodzi.

## Podsumowanie

Testy to automat sprawdzający twój kod — fundament CI/CD i MLOps. Piszesz plik `test_*.py`, w nim funkcje `test_*` z assertami, odpalasz komendą `pytest`. Raport czytasz od linii `E` — tam są prawdziwe i oczekiwane wartości. Strukturę testu trzymaj w rytmie arrange–act–assert. Wiele przypadków ogarniaj przez `@pytest.mark.parametrize`. I projektuj kod tak, by logika siedziała w funkcjach czystych — wtedy testowanie jest szybkie i przyjemne.
