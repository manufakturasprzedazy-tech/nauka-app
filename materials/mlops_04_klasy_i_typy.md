# Klasy, obiekty i type hints

Słowniki są super, ale mają wadę: nic nie pilnuje, co w nich siedzi. Literówka w kluczu, brakujące pole — dowiadujesz się dopiero, gdy program wybuchnie. Klasy pozwalają zdefiniować własny typ danych z konkretnymi polami i zachowaniami. A type hints mówią Pythonowi (i tobie), jakie typy gdzie pasują. Po co ci to w AI/MLOps? Pydantic i FastAPI — dwie najważniejsze biblioteki w tym świecie — są zbudowane w stu procentach na klasach i type hints. Bez tej podstawy nie ruszysz dalej.

## Pierwsza klasa

Klasa to szablon. Obiekt to konkretny egzemplarz zrobiony z tego szablonu.

```python
class Task:
    def __init__(self, nazwa, priorytet):
        self.nazwa = nazwa
        self.priorytet = priorytet

zadanie = Task("pobierz dane", 1)
print(zadanie.nazwa)      # wypisze: pobierz dane
print(zadanie.priorytet)  # wypisze: 1
```

Rozbierzmy to. `__init__` to specjalna metoda wywoływana automatycznie przy tworzeniu obiektu (`Task(...)`). `self` to odniesienie do tworzonego obiektu — przez `self.nazwa = nazwa` zapisujesz wartość w obiekcie jako atrybut. Każdy obiekt ma własne atrybuty:

```python
a = Task("trening modelu", 2)
b = Task("wysylka raportu", 5)
print(a.nazwa)  # wypisze: trening modelu
print(b.nazwa)  # wypisze: wysylka raportu
```

## Metody — funkcje należące do klasy

Metoda to funkcja zdefiniowana w klasie. Pierwszym parametrem zawsze jest `self` — dzięki temu metoda ma dostęp do atrybutów obiektu:

```python
class Task:
    def __init__(self, nazwa, priorytet):
        self.nazwa = nazwa
        self.priorytet = priorytet
        self.zrobione = False

    def zakoncz(self):
        self.zrobione = True

    def opis(self):
        status = "OK" if self.zrobione else "czeka"
        return f"[{status}] {self.nazwa} (prio {self.priorytet})"

t = Task("czyszczenie danych", 1)
print(t.opis())   # wypisze: [czeka] czyszczenie danych (prio 1)
t.zakoncz()
print(t.opis())   # wypisze: [OK] czyszczenie danych (prio 1)
```

Zwróć uwagę: wywołujesz `t.zakoncz()` bez argumentów — Python sam podstawia `t` jako `self`.

## Praktyczny przykład: Pipeline

W automatyzacji często budujesz "potok" kroków do wykonania po kolei. Klasa nadaje się idealnie:

```python
class Pipeline:
    def __init__(self, nazwa):
        self.nazwa = nazwa
        self.kroki = []

    def dodaj(self, krok):
        self.kroki.append(krok)

    def uruchom(self, dane):
        for krok in self.kroki:
            dane = krok(dane)
        return dane

p = Pipeline("czyszczenie")
p.dodaj(lambda t: t.strip())
p.dodaj(lambda t: t.lower())
wynik = p.uruchom("  Hello MLOps  ")
print(wynik)          # wypisze: hello mlops
print(len(p.kroki))   # wypisze: 2
```

Obiekt trzyma stan (listę kroków) i zachowanie (uruchamianie) w jednym miejscu. Tak właśnie wyglądają w środku narzędzia typu scikit-learn czy Airflow.

## Type hints — podpowiedzi typów

Type hints to adnotacje mówiące, jakiego typu jest zmienna, parametr albo wynik funkcji:

```python
def policz_tokeny(tekst: str) -> int:
    return len(tekst.split())

print(policz_tokeny("ala ma kota"))  # wypisze: 3
```

`tekst: str` znaczy "tekst powinien być stringiem", `-> int` znaczy "funkcja zwraca int". Ważne: Python tego **nie wymusza** w trakcie działania — to dokumentacja plus paliwo dla narzędzi. Edytor podpowiada lepiej, narzędzia typu mypy łapią błędy przed uruchomieniem, a Pydantic i FastAPI używają hintów do realnej walidacji danych z API.

Typy złożone:

```python
def srednia(liczby: list[float]) -> float:
    return sum(liczby) / len(liczby)

def zlicz_statusy(kody: list[int]) -> dict[int, int]:
    wynik: dict[int, int] = {}
    for kod in kody:
        wynik[kod] = wynik.get(kod, 0) + 1
    return wynik

print(zlicz_statusy([200, 404, 200]))  # wypisze: {200: 2, 404: 1}
```

A gdy wartość może nie istnieć — `Optional`:

```python
from typing import Optional

def znajdz_email(tekst: str) -> Optional[str]:
    for slowo in tekst.split():
        if "@" in slowo:
            return slowo
    return None

print(znajdz_email("napisz na jan@firma.pl"))  # wypisze: jan@firma.pl
print(znajdz_email("brak adresu"))             # wypisze: None
```

`Optional[str]` czytasz jako "string albo None". W nowszym Pythonie to samo zapiszesz jako `str | None`. To bardzo częsty wzorzec: funkcja szuka czegoś i może nic nie znaleźć.

## @dataclass — klasa bez pisania __init__

Jeśli klasa służy głównie do trzymania danych, `__init__` to nudna powtarzalna robota. Dekorator `@dataclass` pisze go za ciebie na podstawie type hints:

```python
from dataclasses import dataclass

@dataclass
class Task:
    nazwa: str
    priorytet: int
    zrobione: bool = False

t = Task("eksport danych", 2)
print(t.nazwa)     # wypisze: eksport danych
print(t.zrobione)  # wypisze: False
print(t)           # wypisze: Task(nazwa='eksport danych', priorytet=2, zrobione=False)
```

Dostajesz gratis: `__init__`, czytelny wydruk i porównywanie obiektów:

```python
a = Task("x", 1)
b = Task("x", 1)
print(a == b)  # wypisze: True (zwykłe klasy dałyby False!)
```

Pydantic, którego użyjesz przy każdym API, wygląda prawie identycznie — tylko dodatkowo waliduje typy naprawdę. Ucząc się dataclass, uczysz się składni połowy nowoczesnego ekosystemu Pythona.

## Częste błędy

**Błąd 1: zapomniany `self` w definicji metody.**

```python
class Task:
    def opis():
        return "cos"

t = Task()
t.opis()
```

Wynik: `TypeError: Task.opis() takes 0 positional arguments but 1 was given`. Python przy wywołaniu `t.opis()` przekazuje obiekt jako pierwszy argument, a metoda nie ma gdzie go przyjąć. Każda zwykła metoda zaczyna się od `self`.

**Błąd 2: atrybut klasowy zamiast atrybutu obiektu (mutowalna pułapka).**

```python
class Pipeline:
    kroki = []          # wspólna lista dla WSZYSTKICH obiektów!

    def dodaj(self, k):
        self.kroki.append(k)

a = Pipeline()
b = Pipeline()
a.dodaj("krok1")
print(b.kroki)  # wypisze: ['krok1']  <- b "widzi" krok dodany do a!
```

Lista zdefiniowana na poziomie klasy jest jedna i wspólna. Mutowalne atrybuty zawsze twórz w `__init__`: `self.kroki = []`.

**Błąd 3: wywołanie metody bez nawiasów.**

```python
t = Task("x", 1)
print(t.opis)   # wypisze: <bound method Task.opis of ...>
```

Bez nawiasów dostajesz samą metodę, nie jej wynik. Żadnego błędu — tylko dziwny napis. Poprawnie: `t.opis()`.

## Podsumowanie

Klasa to szablon: `__init__` ustawia atrybuty przez `self`, metody to funkcje z `self` jako pierwszym parametrem, a każdy obiekt ma własny stan. Type hints (`str`, `int`, `list[str]`, `dict[str, int]`, `Optional[str]`) dokumentują kod i napędzają narzędzia — Python ich nie wymusza, ale Pydantic i FastAPI tak. `@dataclass` generuje `__init__` i porównywanie z samych deklaracji pól — idealne do obiektów-danych. Opanuj ten rozdział dobrze: definiowanie modeli danych klasami z type hints to dosłownie codzienność pracy z API i LLM-ami.
