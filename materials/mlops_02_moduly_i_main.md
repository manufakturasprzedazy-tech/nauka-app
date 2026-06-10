# Moduły, importy i if __name__ == '__main__'

Na początku wszystko piszesz w jednym pliku. Działa, ale przy 200 linijkach robi się bałagan, a przy automatyzacji dla klienta — koszmar. Python rozwiązuje to modułami: każdy plik `.py` to moduł, który możesz zaimportować w innym pliku. Tak buduje się prawdziwe projekty — i tak wyglądają wszystkie biblioteki, których będziesz używać w MLOps.

## Import — korzystanie z gotowego kodu

Najprostsza forma to `import nazwa_modulu`. Potem do wszystkiego sięgasz przez kropkę:

```python
import math

print(math.sqrt(16))  # wypisze: 4.0
print(math.pi)        # wypisze: 3.141592653589793
```

Druga forma: `from modul import konkretna_rzecz`. Wtedy używasz nazwy bez prefiksu:

```python
from math import sqrt, pi

print(sqrt(25))  # wypisze: 5.0
print(pi)        # wypisze: 3.141592653589793
```

Można też zmienić nazwę przez `as` — przydatne przy długich nazwach:

```python
import json as j

dane = j.loads('{"status": "ok"}')
print(dane)  # wypisze: {'status': 'ok'}
```

Czego unikać: `from modul import *`. To wciąga wszystkie nazwy naraz i nie wiadomo potem, skąd co pochodzi. W kodzie produkcyjnym tego nie zobaczysz.

## Własny moduł

Załóżmy, że masz plik `narzedzia.py`:

```python
# narzedzia.py
def policz_koszt(tokeny: int, cena_za_1m: float) -> float:
    return tokeny / 1_000_000 * cena_za_1m

DOMYSLNY_MODEL = "gpt-mini"
```

W drugim pliku w tym samym folderze, np. `main.py`, importujesz go po nazwie pliku (bez `.py`):

```python
# main.py
from narzedzia import policz_koszt, DOMYSLNY_MODEL

koszt = policz_koszt(500_000, 0.25)
print(koszt)            # wypisze: 0.125
print(DOMYSLNY_MODEL)   # wypisze: gpt-mini
```

I tyle. Funkcje, stałe, klasy — wszystko, co jest w module, da się zaimportować.

## Struktura projektu

Typowy mały projekt automatyzacji wygląda tak:

```
moj_projekt/
    main.py          # punkt startowy, tu się wszystko zaczyna
    api_client.py    # funkcje do gadania z API
    przetwarzanie.py # czyszczenie i transformacja danych
    config.py        # stałe: adresy, nazwy modeli, limity
```

Zasada podziału: jeden plik = jedna odpowiedzialność. `main.py` tylko skleja kawałki, logika siedzi w modułach. Dzięki temu funkcję `policz_koszt` możesz przetestować osobno i użyć w trzech różnych skryptach zamiast kopiować ją wszędzie.

## Po co `if __name__ == "__main__"`

Tu jest haczyk, który łapie każdego początkującego. Gdy Python importuje moduł, to **wykonuje cały jego kod od góry do dołu**. Zobacz:

```python
# raport.py
def generuj(nazwa: str) -> str:
    return f"Raport: {nazwa}"

print(generuj("test"))  # to się wykona też przy imporcie!
```

Jeśli teraz w innym pliku napiszesz `import raport`, na ekranie wyskoczy `Raport: test`, mimo że niczego nie wywołałeś. Import = wykonanie pliku.

Rozwiązanie: zmienna `__name__`. Python ustawia ją automatycznie. Gdy plik uruchamiasz bezpośrednio (`python raport.py`), `__name__` ma wartość `"__main__"`. Gdy plik jest importowany, `__name__` to nazwa modułu, czyli `"raport"`.

```python
# raport.py — wersja poprawna
def generuj(nazwa: str) -> str:
    return f"Raport: {nazwa}"

if __name__ == "__main__":
    print(generuj("test"))
```

Teraz `python raport.py` wypisze `Raport: test`, a `import raport` w innym pliku — nic. Dostajesz dwa w jednym: plik działa jako samodzielny skrypt I jako biblioteka do importu. Każdy porządny moduł w Pythonie tak wygląda.

## Funkcje zamiast płaskiego skryptu

Płaski skrypt to kod wylany luzem na poziomie pliku:

```python
# tak NIE rób
dane = [1, 2, 3, 4, 5]
suma = 0
for x in dane:
    suma = suma + x
srednia = suma / len(dane)
print(srednia)
```

Działa, ale: nie da się tego zaimportować bez efektów ubocznych, nie da się przetestować, nie da się użyć dla innych danych. Wersja poukładana:

```python
def srednia(liczby: list) -> float:
    return sum(liczby) / len(liczby)

def main():
    dane = [1, 2, 3, 4, 5]
    print(srednia(dane))  # wypisze: 3.0

if __name__ == "__main__":
    main()
```

Wzorzec do zapamiętania: logika w małych funkcjach, funkcja `main()` jako dyrygent, na dole strażnik `if __name__ == "__main__": main()`. W projektach MLOps to standard — pipeline'y, skrypty treningowe, narzędzia CLI, wszystko jest tak zbudowane, żeby dało się i uruchomić, i zaimportować do testów.

## Częste błędy

**Błąd 1: nazwa pliku taka jak nazwa biblioteki.**

Nazwiesz swój plik `json.py`, a w środku napiszesz `import json`. Python zaimportuje... twój własny plik zamiast biblioteki i dostaniesz np. `AttributeError: module 'json' has no attribute 'loads'`. To samo z `requests.py` czy `random.py`. Nigdy nie nazywaj plików tak jak popularne moduły.

**Błąd 2: literówka albo zły folder.**

```python
import narzedzia
```

Wynik: `ModuleNotFoundError: No module named 'narzedzia'`. Najczęstsze przyczyny: plik nazywa się inaczej, leży w innym folderze niż uruchamiany skrypt, albo uruchamiasz Pythona z innego katalogu. Python szuka modułów m.in. w folderze uruchamianego pliku — sprawdź, gdzie naprawdę leżą twoje pliki.

**Błąd 3: literówka w stringu strażnika.**

```python
if __name__ == "main":   # brakuje podkreślników!
    main()
```

Żadnego błędu nie będzie — po prostu `main()` nigdy się nie wykona, bo `__name__` to `"__main__"`, nie `"main"`. Skrypt odpalony z terminala "nic nie robi" i siedzisz zdziwiony. Podwójne podkreślniki z obu stron, zawsze.

## Podsumowanie

Każdy plik `.py` to moduł. `import modul` daje dostęp przez kropkę, `from modul import nazwa` — bezpośrednio. Import wykonuje cały kod modułu, dlatego kod startowy chowamy za `if __name__ == "__main__":` — wtedy plik działa i jako skrypt, i jako biblioteka. Projekt dziel na pliki według odpowiedzialności, logikę pakuj w funkcje, a `main()` niech tylko skleja całość. Ten nawyk to fundament: każdy pipeline, każde API i każdy skrypt automatyzacji, który napiszesz zawodowo, będzie tak zorganizowany.
