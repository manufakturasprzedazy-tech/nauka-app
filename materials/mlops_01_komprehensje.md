# Komprehensje list i słowników

Komprehensja to skrócony zapis pętli, która buduje nową listę, słownik albo zbiór. Zamiast trzech linijek z `for` i `append` piszesz jedną. W pracy z API i danymi do modeli AI robisz to non stop: dostajesz listę słowników z odpowiedzi serwera i musisz ją przekształcić w coś użytecznego. Komprehensje to twoje podstawowe narzędzie do takich przekształceń.

## Zwykła pętla kontra komprehensja

Klasycznie napisałbyś tak:

```python
ceny = [10, 25, 40]
ceny_brutto = []
for cena in ceny:
    ceny_brutto.append(cena * 1.23)
print(ceny_brutto)  # wypisze: [12.3, 30.75, 49.2]
```

To samo komprehensją:

```python
ceny = [10, 25, 40]
ceny_brutto = [cena * 1.23 for cena in ceny]
print(ceny_brutto)  # wypisze: [12.3, 30.75, 49.2]
```

Schemat jest zawsze taki sam: `[wyrażenie for element in kolekcja]`. Czytasz to od środka: "dla każdej ceny w cenach weź cenę razy 1.23 i wrzuć do nowej listy".

## Warunek w komprehensji — filtrowanie

Możesz dorzucić `if` na końcu. Wtedy do nowej listy trafią tylko elementy spełniające warunek:

```python
odpowiedzi = [200, 404, 200, 500, 200]
bledy = [kod for kod in odpowiedzi if kod >= 400]
print(bledy)  # wypisze: [404, 500]
```

Typowy przykład z API: serwer zwrócił listę użytkowników, a ty chcesz tylko aktywnych:

```python
users = [
    {"name": "Ala", "active": True},
    {"name": "Bartek", "active": False},
    {"name": "Celina", "active": True},
]
aktywni = [u["name"] for u in users if u["active"]]
print(aktywni)  # wypisze: ['Ala', 'Celina']
```

Jest też drugi rodzaj `if` — taki, który zmienia wartość zamiast filtrować. Wtedy stoi PRZED `for` i wymaga `else`:

```python
kody = [200, 404, 200]
statusy = ["ok" if kod == 200 else "blad" for kod in kody]
print(statusy)  # wypisze: ['ok', 'blad', 'ok']
```

Zapamiętaj różnicę: `if` po `for` filtruje (mniej elementów), `if/else` przed `for` mapuje (tyle samo elementów, inne wartości).

## Komprehensja słownikowa

Działa tak samo, tylko używasz nawiasów klamrowych i pary `klucz: wartość`. Mega przydatne, gdy z listy rekordów chcesz zrobić szybki "indeks" po jakimś polu:

```python
modele = [
    {"id": "gpt-mini", "cena": 0.25},
    {"id": "gpt-duzy", "cena": 2.00},
]
cennik = {m["id"]: m["cena"] for m in modele}
print(cennik)  # wypisze: {'gpt-mini': 0.25, 'gpt-duzy': 2.0}
print(cennik["gpt-mini"])  # wypisze: 0.25
```

Albo odwrócenie słownika:

```python
skroty = {"ml": "machine learning", "ai": "sztuczna inteligencja"}
odwrocony = {pelna: skrot for skrot, pelna in skroty.items()}
print(odwrocony)  # wypisze: {'machine learning': 'ml', 'sztuczna inteligencja': 'ai'}
```

## Komprehensja zbioru

Nawiasy klamrowe, ale bez dwukropka. Zbiór (`set`) sam usuwa duplikaty:

```python
logi = ["error", "info", "error", "warning", "info"]
poziomy = {poziom for poziom in logi}
print(sorted(poziomy))  # wypisze: ['error', 'info', 'warning']
```

Przydaje się, gdy chcesz wiedzieć "jakie unikalne wartości w ogóle przyszły z API".

## Wyrażenie generatorowe

Jeśli użyjesz zwykłych nawiasów okrągłych, dostaniesz generator. Generator nie buduje całej listy w pamięci — produkuje elementy po jednym, dopiero gdy ktoś o nie poprosi:

```python
liczby = [1, 2, 3, 4]
suma_kwadratow = sum(x * x for x in liczby)
print(suma_kwadratow)  # wypisze: 30
```

Tu nigdy nie powstała lista `[1, 4, 9, 16]` — `sum` zjadał liczby na bieżąco. Przy małych danych różnicy nie zauważysz, ale gdy przetwarzasz plik z milionem linii logów, generator oszczędza pamięć. Zasada praktyczna: jeśli wynik tylko przekazujesz dalej do `sum`, `max`, `any`, `all` — używaj generatora. Jeśli chcesz wynik wypisać, posortować albo użyć kilka razy — buduj listę.

```python
kody = [200, 404, 200]
czy_jest_blad = any(kod >= 400 for kod in kody)
print(czy_jest_blad)  # wypisze: True
```

## Kiedy NIE używać komprehensji

Komprehensja ma być krótsza I czytelniejsza. Jeśli jest tylko krótsza — to porażka. Zły przykład:

```python
# tak NIE rób — nikt tego nie przeczyta
wynik = [x["v"] * 2 if x["v"] > 0 else 0 for x in dane if "v" in x and x.get("ok")]
```

Jak masz dwa warunki, zagnieżdżone pętle i jeszcze `if/else` w środku — wróć do zwykłej pętli `for`:

```python
wynik = []
for x in dane:
    if "v" in x and x.get("ok"):
        if x["v"] > 0:
            wynik.append(x["v"] * 2)
        else:
            wynik.append(0)
```

Dłużej, ale każdy (łącznie z tobą za pół roku) zrozumie to w 5 sekund. Druga zasada: komprehensja służy do BUDOWANIA kolekcji. Jeśli chcesz tylko wykonać akcję (np. wypisać coś), użyj pętli, nie pisz `[print(x) for x in lista]`.

## Częste błędy

**Błąd 1: przecinek zamiast dwukropka w komprehensji słownikowej.**

```python
slownik = {m["id"], m["cena"] for m in modele}
```

To nie jest błąd składni, ale dostaniesz zbiór krotek zamiast słownika. Potem `slownik["gpt-mini"]` rzuci: `TypeError: 'set' object is not subscriptable`. Pamiętaj o dwukropku: `{m["id"]: m["cena"] for m in modele}`.

**Błąd 2: samotny `if` przed `for`.**

```python
wynik = [x for x in liczby if x > 0 else 0]
```

Wynik: `SyntaxError: invalid syntax`. Filtr (`if` po `for`) nie może mieć `else`. Jeśli chcesz `else`, cała konstrukcja `x if warunek else cos` musi stać przed `for`.

**Błąd 3: zużyty generator.**

```python
gen = (x * 2 for x in [1, 2, 3])
print(list(gen))  # wypisze: [2, 4, 6]
print(list(gen))  # wypisze: []
```

Generator da się przeczytać tylko RAZ. Drugie czytanie zwraca pustkę, bez żadnego błędu — to podstępne. Jeśli potrzebujesz danych wielokrotnie, zrób z nich listę.

## Podsumowanie

Komprehensja listy: `[wyrazenie for x in kolekcja]`. Filtr: dopisz `if warunek` na końcu. Mapowanie z `else`: `wartosc if warunek else inna` przed `for`. Słownik: `{klucz: wartosc for ...}`, zbiór: `{wartosc for ...}`. Nawiasy okrągłe dają generator — jednorazowy, ale oszczędny w pamięci, idealny do `sum`/`any`/`all`. I najważniejsze: jak komprehensja przestaje być czytelna na pierwszy rzut oka, wracaj do zwykłej pętli. W automatyzacji będziesz tego używać codziennie: filtrowanie rekordów z API, budowanie słowników-indeksów, wyciąganie pojedynczych pól z listy obiektów.
