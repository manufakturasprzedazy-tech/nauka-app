# Pliki CSV: dane biznesowe w Pythonie

CSV (comma-separated values) to najprostszy format danych tabelarycznych: każda linia to wiersz, wartości oddzielone przecinkami. Excel, Google Sheets, systemy księgowe, eksporty z CRM — wszystko potrafi zapisać CSV. W automatyzacjach to chleb powszedni: klient przysyła CSV ze sprzedażą, Ty masz policzyć sumy i wysłać raport. Python ma do tego wbudowany moduł `csv` — bez instalowania czegokolwiek.

## Skąd się bierze CSV i jak go czytać

CSV to zwykły tekst. Pierwsza linia to często nagłówki (nazwy kolumn):

```python
dane = """produkt,kategoria,cena
Laptop,elektronika,3500
Mysz,elektronika,89
Biurko,meble,1200"""
```

Moduł `csv` czyta z obiektu plikopodobnego. W przykładach użyjemy `io.StringIO` — opakowuje string tak, że zachowuje się jak otwarty plik. To świetny trik do testów i ćwiczeń: ten sam kod zadziała potem na prawdziwym pliku z `open()`.

```python
import csv
import io

dane = """produkt,kategoria,cena
Laptop,elektronika,3500
Mysz,elektronika,89"""

czytnik = csv.reader(io.StringIO(dane))
for wiersz in czytnik:
    print(wiersz)
# wypisze: ['produkt', 'kategoria', 'cena']
# wypisze: ['Laptop', 'elektronika', '3500']
# wypisze: ['Mysz', 'elektronika', '89']
```

`csv.reader` zwraca każdy wiersz jako listę stringów. Nagłówek to po prostu pierwszy wiersz — sam musisz go pominąć (`next(czytnik)`), jeśli go nie chcesz.

## DictReader — wiersze jako słowniki

W praktyce wygodniejszy jest `DictReader`: pierwszą linię traktuje jako nagłówki i każdy wiersz oddaje jako słownik. Kod robi się czytelny — zamiast `wiersz[2]` piszesz `wiersz["cena"]`:

```python
import csv
import io

dane = """produkt,kategoria,cena
Laptop,elektronika,3500
Biurko,meble,1200"""

for wiersz in csv.DictReader(io.StringIO(dane)):
    print(wiersz["produkt"], wiersz["cena"])
# wypisze: Laptop 3500
# wypisze: Biurko 1200
```

## Wszystko jest stringiem — konwersja typów

Najważniejsza pułapka CSV: **każda wartość to string**. `"3500"` to nie liczba. Zanim policzysz sumę, musisz skonwertować typy sam:

```python
import csv
import io

dane = """produkt,cena,sztuk
Laptop,3500,2
Mysz,89,10"""

suma = 0
for wiersz in csv.DictReader(io.StringIO(dane)):
    suma += int(wiersz["cena"]) * int(wiersz["sztuk"])

print(suma)  # wypisze: 7890
```

Dla cen z częścią dziesiętną użyj `float(...)`. Uważaj na polski zapis `"12,50"` — przed konwersją zamień przecinek na kropkę: `float(tekst.replace(",", "."))`.

## Średnik — polski Excel

Polski Excel zapisuje CSV ze **średnikami**, bo przecinek jest u nas separatorem dziesiętnym. Jeśli wczytasz taki plik domyślnym readerem, dostaniesz jeden wielki string w każdym wierszu. Ratunek: parametr `delimiter`:

```python
import csv
import io

dane = """produkt;cena
Laptop;3500
Mysz;89"""

for wiersz in csv.DictReader(io.StringIO(dane), delimiter=";"):
    print(wiersz["produkt"], wiersz["cena"])
# wypisze: Laptop 3500
# wypisze: Mysz 89
```

Zasada praktyczna: zanim napiszesz kod, otwórz plik w notatniku i sprawdź, co oddziela wartości. Plik "z Excela od klienta" to prawie zawsze średnik.

## Zapisywanie: writer i DictWriter

Zapis działa lustrzanie. `csv.writer` przyjmuje listy, `DictWriter` — słowniki (musisz podać `fieldnames` i wywołać `writeheader()`):

```python
import csv
import io

bufor = io.StringIO()
piszacy = csv.DictWriter(bufor, fieldnames=["produkt", "cena"])
piszacy.writeheader()
piszacy.writerow({"produkt": "Laptop", "cena": 3500})
piszacy.writerow({"produkt": "Mysz", "cena": 89})

print(bufor.getvalue())
# wypisze:
# produkt,cena
# Laptop,3500
# Mysz,89
```

Przy zapisie do prawdziwego pliku otwieraj go z `newline=""` — inaczej na Windows dostaniesz puste linie między wierszami: `open("raport.csv", "w", newline="", encoding="utf-8")`.

## Agregacja — prosty raport per kategoria

Najczęstsze zadanie biznesowe: zsumuj wartości w grupach. Wzorzec to słownik akumulujący:

```python
import csv
import io

dane = """produkt,kategoria,cena
Laptop,elektronika,3500
Mysz,elektronika,89
Biurko,meble,1200
Krzeslo,meble,400"""

sumy = {}
liczniki = {}
for wiersz in csv.DictReader(io.StringIO(dane)):
    kat = wiersz["kategoria"]
    sumy[kat] = sumy.get(kat, 0) + int(wiersz["cena"])
    liczniki[kat] = liczniki.get(kat, 0) + 1

print(sumy)  # wypisze: {'elektronika': 3589, 'meble': 1600}

for kat, suma in sumy.items():
    srednia = suma / liczniki[kat]
    print(f"{kat}: suma {suma}, średnia {srednia:.1f}")
# wypisze: elektronika: suma 3589, średnia 1794.5
# wypisze: meble: suma 1600, średnia 800.0
```

Ten wzorzec (pętla + `dict.get(klucz, 0)`) wystarcza na 80% raportów, zanim w ogóle sięgniesz po pandas.

## Częste błędy

**1. Liczenie na stringach zamiast liczbach.**

```python
suma = "3500" + "89"
print(suma)  # wypisze: 350089
```

Bez błędu, ale wynik to sklejka, nie suma! A przy `int("3 500")` dostaniesz: `ValueError: invalid literal for int() with base 10: '3 500'`. Czyść dane (`replace(" ", "")`) i konwertuj świadomie.

**2. Zły delimiter — wszystko w jednej kolumnie.**

```python
import csv, io

dane = "produkt;cena\nLaptop;3500"
wiersz = next(csv.DictReader(io.StringIO(dane)))
print(wiersz["cena"])
# KeyError: 'cena'
```

Reader szukał przecinków, więc cały nagłówek `produkt;cena` stał się jedną kolumną. Dodaj `delimiter=";"`.

**3. Literówka w nazwie kolumny.**

```python
print(wiersz["Cena"])
# KeyError: 'Cena'
```

Klucze słownika są wrażliwe na wielkość liter i spacje z nagłówka. Wypisz `wiersz.keys()` i sprawdź, jak kolumny nazywają się naprawdę.

## Podsumowanie

CSV to tekstowa tabela: `reader`/`DictReader` do czytania, `writer`/`DictWriter` do zapisu, `io.StringIO` pozwala ćwiczyć na stringach. Pamiętaj o trzech rzeczach: wszystko przychodzi jako string (konwertuj `int`/`float`), polski Excel używa średnika (`delimiter=";"`), a agregację robisz słownikiem z `get(klucz, 0)`. Z tym zestawem zbudujesz większość raportów, jakie zleci Ci biznes.
