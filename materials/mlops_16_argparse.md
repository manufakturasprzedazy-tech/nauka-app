# Argumenty CLI: argparse

Skrypt z wartościami wpisanymi na sztywno działa tylko dla jednego przypadku. Skrypt z argumentami staje się narzędziem: ten sam kod generuje raport za wczoraj, za cały miesiąc albo w trybie testowym — zależnie od tego, jak go zawołasz. To kluczowe w automatyzacji, bo Twoje skrypty rzadko odpala człowiek. Odpala je cron, pipeline CI/CD albo orkiestrator (n8n, Airflow), a one przekazują parametry właśnie przez linię poleceń: `python raport.py --dni 7 --format csv`. Modułem do obsługi takich argumentów jest wbudowany `argparse`.

## sys.argv — co dostaje skrypt

Zanim poznasz argparse, zobacz surowiec. Wszystko, co wpisano po `python skrypt.py`, ląduje w liście `sys.argv`:

```python
import sys

# uruchomienie: python raport.py sprzedaz 7
print(sys.argv)
# wypisze: ['raport.py', 'sprzedaz', '7']
```

Można by czytać `sys.argv[1]` ręcznie, ale wtedy sam musisz walidować, konwertować typy i pisać pomoc. argparse robi to wszystko za Ciebie.

## ArgumentParser — pierwszy parser

Trzy kroki: stwórz parser, zadeklaruj argumenty, sparsuj. W przykładach przekażemy listę argumentów wprost do `parse_args()` — dzięki temu kod działa wszędzie (także w Pyodide); w prawdziwym skrypcie wołasz `parse_args()` bez argumentu i bierze on `sys.argv` sam.

```python
import argparse

parser = argparse.ArgumentParser(description="Generator raportu sprzedaży")
parser.add_argument("zrodlo", help="nazwa źródła danych")

args = parser.parse_args(["sprzedaz"])
print(args.zrodlo)  # wypisze: sprzedaz
```

`"zrodlo"` (bez myślników) to argument **pozycyjny** — wymagany, rozpoznawany po kolejności. Wartość odbierasz jako atrybut: `args.zrodlo`.

## Argumenty opcjonalne, default i type

Argumenty zaczynające się od `--` są **opcjonalne**. Możesz dać im wartość domyślną i typ — argparse sam skonwertuje string na liczbę:

```python
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("zrodlo")
parser.add_argument("--dni", type=int, default=7, help="ile dni wstecz")
parser.add_argument("--format", default="csv", choices=["csv", "json"])

args = parser.parse_args(["sprzedaz", "--dni", "30"])
print(args.zrodlo)   # wypisze: sprzedaz
print(args.dni)      # wypisze: 30
print(type(args.dni))  # wypisze: <class 'int'>
print(args.format)   # wypisze: csv
```

Zwróć uwagę: `--dni` nie podano by nie trzeba — wtedy byłoby `7` (default). `type=int` oznacza, że `args.dni` to prawdziwa liczba, nie string. `choices` ogranicza dozwolone wartości — przy złej argparse sam zgłosi błąd i przerwie skrypt.

## Flagi: action="store_true"

Flaga to opcja bez wartości — jest albo jej nie ma. Klasyka: `--dry-run` (pokaż, co byś zrobił, ale nic nie zmieniaj) i `--verbose` (gadatliwe logi):

```python
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--dry-run", action="store_true")

args = parser.parse_args(["--dry-run"])
print(args.dry_run)  # wypisze: True

args2 = parser.parse_args([])
print(args2.dry_run)  # wypisze: False
```

Uwaga na drobiazg: myślnik w nazwie (`--dry-run`) zamienia się w podkreślnik w atrybucie (`args.dry_run`).

## --help za darmo

Największy bonus argparse: definiując argumenty z `help=...`, dostajesz gotową dokumentację. Użytkownik (albo Ty za pół roku) wpisuje `python raport.py --help` i widzi:

```python
# Wynik: (tak wygląda automatyczny ekran pomocy)
# usage: raport.py [-h] [--dni DNI] [--format {csv,json}] zrodlo
#
# Generator raportu sprzedaży
#
# positional arguments:
#   zrodlo               nazwa źródła danych
#
# options:
#   -h, --help           show this help message and exit
#   --dni DNI            ile dni wstecz
#   --format {csv,json}  csv albo json
```

Nie napisałeś ani linijki tej pomocy. Dlatego nawet w małych skryptach warto używać argparse zamiast ręcznego `sys.argv`.

## Wzorzec: main(args) + if __name__

Dojrzały skrypt oddziela parsowanie od logiki. Funkcja `main` przyjmuje sparsowane argumenty, a parsowanie dzieje się tylko przy bezpośrednim uruchomieniu. Dzięki temu logikę testujesz bez linii poleceń:

```python
import argparse


def zbuduj_parser():
    parser = argparse.ArgumentParser(description="Raport sprzedaży")
    parser.add_argument("zrodlo")
    parser.add_argument("--dni", type=int, default=7)
    parser.add_argument("--dry-run", action="store_true")
    return parser


def main(args):
    tryb = "TEST" if args.dry_run else "PROD"
    return f"[{tryb}] raport z {args.zrodlo} za {args.dni} dni"


if __name__ == "__main__":
    args = zbuduj_parser().parse_args()
    print(main(args))

# uruchomienie: python raport.py sprzedaz --dni 14 --dry-run
# wypisze: [TEST] raport z sprzedaz za 14 dni
```

W teście robisz po prostu `main(zbuduj_parser().parse_args(["sprzedaz", "--dni", "3"]))` — zero magii.

## Częste błędy

**1. Brak wymaganego argumentu pozycyjnego.**

```python
# python raport.py
# wypisze na stderr:
# usage: raport.py [-h] [--dni DNI] zrodlo
# raport.py: error: the following arguments are required: zrodlo
```

argparse przerywa skrypt z kodem wyjścia 2. To dobrze — cron/CI zobaczy porażkę zamiast cichego błędnego raportu.

**2. Zła wartość przy type=int.**

```python
# python raport.py sprzedaz --dni tydzien
# raport.py: error: argument --dni: invalid int value: 'tydzien'
```

Konwersja i komunikat za darmo — nie musisz pisać własnego `try/except`.

**3. Myślnik vs podkreślnik.**

```python
args = parser.parse_args(["--dry-run"])
print(args.dry-run)
# AttributeError: 'Namespace' object has no attribute 'dry'
```

Python czyta `args.dry - run` jako odejmowanie! W definicji argument ma myślnik (`--dry-run`), ale atrybut zawsze podkreślnik: `args.dry_run`.

## Podsumowanie

argparse zamienia skrypt w parametryzowane narzędzie: argumenty pozycyjne są wymagane, `--opcjonalne` mają `default`, `type=int` konwertuje typy, `action="store_true"` tworzy flagi typu `--dry-run`, a `--help` generuje się sam. Trzymaj się wzorca `zbuduj_parser()` + `main(args)` + `if __name__ == "__main__"` — wtedy ten sam kod łatwo testujesz, a cron i CI mogą wołać go z dowolnymi parametrami.
