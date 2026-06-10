# Klucze API i sekrety: zmienne środowiskowe

Klucz API to hasło twojego programu do płatnych usług — OpenAI, Anthropic, baz danych. Kto ma klucz, ten wydaje twoje pieniądze. A najczęstszy sposób, w jaki klucze wyciekają? Programista wkleja je prosto do kodu i wypycha do gita. Ta lekcja jest o tym, jak trzymać sekrety poza kodem — to jedna z pierwszych rzeczy sprawdzanych na code review i absolutna podstawa pracy w MLOps.

## Dlaczego NIGDY nie hardkodować

Tak wygląda przepis na katastrofę:

```python
# tak NIE rób — NIGDY
API_KEY = "sk-proj-Abc123PrawdziwyKlucz"
```

Co się dzieje dalej: robisz `git commit`, `git push`, repo jest publiczne (albo stanie się publiczne za rok). Boty skanują GitHuba non stop i znajdują taki klucz w kilka minut. Potem albo ktoś wydaje twoje środki na swoje zapytania, albo dostawca (OpenAI robi to automatycznie) wykrywa wyciek i **unieważnia klucz** — twoja produkcyjna automatyzacja przestaje działać w środku nocy.

I uwaga: usunięcie klucza z kodu w kolejnym commicie NIC nie daje. Git pamięta całą historię — klucz dalej siedzi w starych commitach. Klucz, który raz trafił do gita, traktuj jako spalony: unieważnij i wygeneruj nowy.

## Zmienne środowiskowe — sekrety poza kodem

Zmienna środowiskowa to para nazwa=wartość trzymana przez system operacyjny, nie przez twój kod. Kod tylko ją odczytuje. Dzięki temu ten sam kod działa u ciebie, u kolegi i na serwerze — każdy ma własny klucz u siebie, a w repozytorium kluczy nie ma wcale.

Ustawienie w terminalu (na czas sesji): Windows CMD: `set API_KEY=sk-123`, PowerShell: `$env:API_KEY="sk-123"`, Linux/Mac: `export API_KEY=sk-123`.

Odczyt w Pythonie — moduł `os`:

```python
import os

klucz = os.environ.get("API_KEY")
print(klucz)  # wypisze: sk-123 (jeśli ustawiona) albo None
```

Masz trzy warianty odczytu i różnią się zachowaniem przy braku zmiennej:

```python
import os

# 1) os.environ["NAZWA"] — wybucha, gdy brak:
#    KeyError: 'BRAK_TAKIEJ'
# 2) os.environ.get("NAZWA") — zwraca None, gdy brak
# 3) os.getenv("NAZWA", "domyslna") — None albo wartość domyślna

print(os.getenv("NIE_ISTNIEJE"))           # wypisze: None
print(os.getenv("TRYB", "development"))    # wypisze: development
```

`os.getenv` to to samo co `os.environ.get` — kwestia stylu. Wartość domyślna pasuje do ustawień opcjonalnych (tryb, limit), ale NIE do kluczy API — tam brak ma być głośny, o czym za chwilę.

## Plik .env i python-dotenv

Ustawianie zmiennych w terminalu przy każdym uruchomieniu jest upierdliwe. Standard branżowy: plik `.env` w folderze projektu, w którym trzymasz wszystkie sekrety:

```python
# zawartość pliku .env (to nie jest Python):
# OPENAI_API_KEY=sk-proj-abc123
# DB_PASSWORD=tajnehaslo
# TRYB=development
```

Format: `NAZWA=wartość`, jedna na linię, bez spacji wokół `=`, bez cudzysłowów. Biblioteka `python-dotenv` (instalacja: `pip install python-dotenv`) wczytuje ten plik do zmiennych środowiskowych:

```python
from dotenv import load_dotenv
import os

load_dotenv()  # wczytuje .env do os.environ

klucz = os.getenv("OPENAI_API_KEY")
print(klucz is not None)  # wypisze: True (jeśli .env istnieje i ma ten wpis)
```

`load_dotenv()` wołasz raz, na samym początku programu, przed jakimkolwiek odczytem zmiennych.

## .env w .gitignore — najważniejsza linijka

Plik `.env` zawiera sekrety, więc **nie może trafić do gita**. Do `.gitignore` dodajesz:

```python
# .gitignore
# .env
```

A żeby inni wiedzieli, jakie zmienne są potrzebne, do repo wrzucasz plik `.env.example` — taki sam, ale z atrapami zamiast wartości:

```python
# .env.example (ten plik JEST w gicie):
# OPENAI_API_KEY=sk-tu-wstaw-swoj-klucz
# DB_PASSWORD=
```

Nowa osoba w projekcie kopiuje `.env.example` do `.env`, wpisuje swoje wartości i działa. Ten duet — `.env` w ignorze, `.env.example` w repo — zobaczysz w praktycznie każdym profesjonalnym projekcie.

## Wzorzec: brak klucza = czytelny błąd

Najgorszy scenariusz: klucza nie ma, `os.getenv` zwraca `None`, a program jedzie dalej i wybucha dopiero gdzieś głęboko z bełkotliwym komunikatem typu `TypeError: can only concatenate str (not "NoneType") to str`. Lepiej sprawdzić na starcie i powiedzieć wprost, co jest nie tak:

```python
import os

def pobierz_klucz(nazwa: str) -> str:
    klucz = os.getenv(nazwa)
    if not klucz:
        raise RuntimeError(
            f"Brak zmiennej środowiskowej {nazwa}. "
            f"Dodaj ją do pliku .env albo ustaw w systemie."
        )
    return klucz

# przy braku zmiennej:
# RuntimeError: Brak zmiennej środowiskowej OPENAI_API_KEY. Dodaj ją do pliku .env...
```

Funkcja jest czysta w użyciu i wielokrotnego użytku. Możesz też walidować format klucza zanim go użyjesz:

```python
def wyglada_jak_klucz(wartosc: str) -> bool:
    return wartosc.startswith("sk-") and len(wartosc) > 10

print(wyglada_jak_klucz("sk-proj-abc123xyz"))  # wypisze: True
print(wyglada_jak_klucz("haslo123"))           # wypisze: False
```

Zasada "fail fast": program ma się wywalić od razu, na starcie, z komunikatem mówiącym człowiekowi, co naprawić — a nie po 10 minutach w środku pipeline'u.

## Częste błędy

**Błąd 1: .env zacommitowany do gita.**

Najpoważniejszy błąd w tej lekcji. Jeśli `.gitignore` dodałeś ZA PÓŹNO (po pierwszym commicie z `.env`), plik już jest w historii. `git rm --cached .env` usuwa go z śledzenia, ale ze starych commitów nie zniknie — klucz unieważnij natychmiast i wygeneruj nowy. Nawyk: `.gitignore` z wpisem `.env` tworzysz jako pierwszy plik w projekcie.

**Błąd 2: brak load_dotenv() przed odczytem.**

```python
import os
klucz = os.getenv("OPENAI_API_KEY")
print(klucz)  # wypisze: None — mimo że .env istnieje i ma wpis!
```

Bez `load_dotenv()` Python nie wie nic o pliku `.env`. Żadnego błędu nie będzie — po prostu `None`. Import i wywołanie `load_dotenv()` dawaj na samej górze pliku startowego.

**Błąd 3: spacje albo cudzysłowy w .env.**

Wpis `API_KEY = "sk-123"` (spacje wokół `=`, cudzysłowy) potrafi dać wartość z cudzysłowami w środku: `'"sk-123"'`. Potem API odpowiada `401 Unauthorized: Invalid API key` i nic z komunikatu nie wynika. Poprawny format to dokładnie `API_KEY=sk-123`. Przy debugowaniu wypisz `repr(klucz)` — od razu zobaczysz ukryte znaki.

## Podsumowanie

Sekrety nigdy nie idą do kodu ani do gita — klucz w repozytorium to klucz spalony. Kod czyta je ze zmiennych środowiskowych: `os.environ["X"]` (błąd przy braku), `os.getenv("X")` (None przy braku), `os.getenv("X", "domyslna")`. Lokalnie sekrety trzymasz w pliku `.env`, wczytywanym przez `load_dotenv()` z python-dotenv. `.env` siedzi w `.gitignore`, a do repo idzie `.env.example` z atrapami. Brak klucza obsługuj na starcie czytelnym błędem (fail fast). Ten sam mechanizm spotkasz potem wszędzie: sekrety w GitHub Actions, Dockerze i Kubernetes to też zmienne środowiskowe — uczysz się więc wzorca na całą karierę.
