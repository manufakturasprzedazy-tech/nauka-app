# Daty i czas: datetime w automatyzacjach

Każda automatyzacja żyje w czasie. Skrypt budzi się o 6:00, raport obejmuje "wczoraj", log ma znacznik czasu, token wygasa za godzinę. Dlatego moduł `datetime` to jedno z najczęściej używanych narzędzi w pracy inżyniera automatyzacji. Bez niego nie nazwiesz pliku raportu, nie policzysz "7 dni wstecz" i nie sparsujesz daty z API. W tej lekcji nauczysz się tworzyć daty, liczyć na nich, formatować je dla ludzi i parsować ze stringów.

## datetime.now() i date — punkt w czasie

Moduł `datetime` ma dwie główne klasy: `datetime` (data + godzina) i `date` (sama data). Aktualny moment pobierasz przez `datetime.now()`:

```python
from datetime import datetime, date

teraz = datetime.now()
print(type(teraz))  # wypisze: <class 'datetime.datetime'>

# Konkretny moment budujesz podając rok, miesiąc, dzień, godzinę, minutę:
start = datetime(2026, 6, 12, 6, 30)
print(start)        # wypisze: 2026-06-12 06:30:00
print(start.year)   # wypisze: 2026
print(start.hour)   # wypisze: 6
```

Sama data (bez godziny) to klasa `date`:

```python
from datetime import date

dzien = date(2026, 6, 12)
print(dzien)          # wypisze: 2026-06-12
print(dzien.weekday())  # wypisze: 4  (0=poniedziałek, więc 4=piątek)
```

`weekday()` przydaje się w harmonogramach: "wysyłaj raport tylko w dni robocze" to po prostu `if dzien.weekday() < 5`.

## timedelta — arytmetyka na datach

Nie możesz dodać do daty liczby. Do liczenia służy `timedelta` — odcinek czasu. Dodajesz go i odejmujesz jak liczbę:

```python
from datetime import datetime, timedelta

start = datetime(2026, 6, 12, 8, 0)

jutro = start + timedelta(days=1)
print(jutro)  # wypisze: 2026-06-13 08:00:00

tydzien_temu = start - timedelta(days=7)
print(tydzien_temu)  # wypisze: 2026-06-05 08:00:00

za_90_minut = start + timedelta(minutes=90)
print(za_90_minut)  # wypisze: 2026-06-12 09:30:00
```

Różnica dwóch dat to też `timedelta`:

```python
from datetime import datetime

deadline = datetime(2026, 6, 15, 12, 0)
teraz = datetime(2026, 6, 12, 9, 0)

zostalo = deadline - teraz
print(zostalo)                  # wypisze: 3 days, 3:00:00
print(zostalo.days)             # wypisze: 3
print(zostalo.total_seconds())  # wypisze: 270000.0
```

`total_seconds()` jest kluczowe przy sprawdzaniu, czy token API jeszcze żyje albo czy cache jest świeży.

## strftime — data do stringa

Ludzie i pliki potrzebują tekstu. `strftime` (string format time) zamienia datę na string według wzorca. Najważniejsze kody: `%Y` rok, `%m` miesiąc, `%d` dzień, `%H` godzina, `%M` minuta, `%S` sekunda.

```python
from datetime import datetime

moment = datetime(2026, 6, 12, 14, 5, 9)

print(moment.strftime("%Y-%m-%d"))           # wypisze: 2026-06-12
print(moment.strftime("%d.%m.%Y %H:%M"))     # wypisze: 12.06.2026 14:05
print(moment.strftime("raport_%Y%m%d.csv"))  # wypisze: raport_20260612.csv
```

Ostatni przykład to klasyka automatyzacji: nazwa pliku z datą, dzięki czemu codzienny raport nie nadpisuje wczorajszego.

## strptime — string do daty

`strptime` (string parse time) działa w drugą stronę: dostaje string i wzorzec, zwraca obiekt `datetime`. Wzorzec musi pasować co do znaku:

```python
from datetime import datetime

tekst = "12.06.2026 14:05"
moment = datetime.strptime(tekst, "%d.%m.%Y %H:%M")
print(moment)       # wypisze: 2026-06-12 14:05:00
print(moment.year)  # wypisze: 2026
```

## ISO 8601 — standard, którym mówią API

Format `2026-06-12T14:05:09` to ISO 8601 — międzynarodowy standard. Tak daty zapisują API, bazy danych i logi. Python ma do niego skróty:

```python
from datetime import datetime

moment = datetime(2026, 6, 12, 14, 5, 9)
print(moment.isoformat())  # wypisze: 2026-06-12T14:05:09

z_api = datetime.fromisoformat("2026-06-12T14:05:09")
print(z_api.hour)  # wypisze: 14
```

Gdy projektujesz własne dane, zawsze zapisuj daty w ISO 8601. Sortują się alfabetycznie tak samo jak chronologicznie — to ogromna zaleta.

## Strefy czasowe — dlaczego logi w UTC

`datetime.now()` zwraca czas lokalny komputera. Problem: serwer w Niemczech, kontener w chmurze i Twój laptop mogą mieć różne strefy. Gdy automatyzacja działa na kilku maszynach, "14:00" znaczy co innego w każdej z nich. Dlatego w logach, bazach i API używa się UTC — czasu uniwersalnego, takiego samego wszędzie. W Pythonie: `datetime.now(timezone.utc)`. Taki obiekt jest "świadomy" strefy (aware) i w `isoformat()` ma końcówkę `+00:00`.

Typowy bug w harmonogramach: skrypt ma ruszać "codziennie o 6:00", ale serwer (np. GitHub Actions) chodzi w UTC, więc w Polsce latem odpala się o 8:00. Drugi klasyk: zmiana czasu letni/zimowy — zadanie ustawione lokalnie nagle przesuwa się o godzinę albo odpala dwa razy. Zasada: licz i zapisuj w UTC, konwertuj na czas lokalny dopiero przy pokazywaniu człowiekowi.

```python
from datetime import datetime, timezone

teraz_utc = datetime.now(timezone.utc)
print(teraz_utc.tzinfo)  # wypisze: UTC

moment = datetime(2026, 6, 12, 6, 0, tzinfo=timezone.utc)
print(moment.isoformat())  # wypisze: 2026-06-12T06:00:00+00:00
```

## Częste błędy

**1. Dodanie liczby do daty.**

```python
from datetime import datetime

start = datetime(2026, 6, 12)
jutro = start + 1
# TypeError: unsupported operand type(s) for +: 'datetime.datetime' and 'int'
```

Zawsze przez `timedelta`: `start + timedelta(days=1)`.

**2. Wzorzec strptime nie pasuje do stringa.**

```python
from datetime import datetime

moment = datetime.strptime("12/06/2026", "%d.%m.%Y")
# ValueError: time data '12/06/2026' does not match format '%d.%m.%Y'
```

W stringu są ukośniki, we wzorcu kropki. Wzorzec musi odwzorować każdy znak separatora.

**3. Mieszanie dat naive i aware.**

```python
from datetime import datetime, timezone

a = datetime.now(timezone.utc)
b = datetime(2026, 6, 12, 8, 0)
roznica = a - b
# TypeError: can't subtract offset-naive and offset-aware datetimes
```

Jedna data ma strefę, druga nie — Python odmawia porównania. Trzymaj się jednej konwencji: w automatyzacjach wszystko aware, w UTC.

## Podsumowanie

`datetime` i `date` opisują punkt w czasie, `timedelta` — odcinek, którym liczysz "jutro" i "7 dni temu". `strftime` formatuje datę do stringa (nazwy plików, raporty), `strptime` parsuje string na datę. Między systemami używaj ISO 8601 (`isoformat`/`fromisoformat`). Loguj i planuj w UTC (`datetime.now(timezone.utc)`), a na czas lokalny przeliczaj tylko dla ludzi — to uchroni Cię przed klasycznymi bugami harmonogramów.
