# Wirtualne środowiska i pip

Wyobraź sobie: masz dwa projekty. Stary używa biblioteki `pandas` w wersji 1.5, nowy potrzebuje 2.2. Instalujesz nową wersję — stary projekt przestaje działać. Witaj w piekle zależności. Rozwiązaniem są wirtualne środowiska: każdy projekt dostaje własną, odizolowaną "skrzynkę" z bibliotekami. W MLOps to nie jest opcja, to fundament — bo model wytrenowany u ciebie musi dać się odtworzyć na serwerze, u kolegi i za pół roku. Reprodukowalność zaczyna się od kontroli wersji pakietów.

## Czym jest venv

Wirtualne środowisko to po prostu folder (zwykle `.venv`) z własną kopią Pythona i własnym miejscem na biblioteki. Gdy środowisko jest "aktywne", `pip install` instaluje pakiety do tego folderu, a nie globalnie do systemu. Projekty przestają sobie wchodzić w drogę.

Zasada: **jeden projekt = jedno środowisko**. Zawsze. Nawet do małego skryptu.

## Tworzenie środowiska

W folderze projektu odpalasz:

```python
# w terminalu (to nie jest kod Pythona):
# python -m venv .venv
```

To tworzy folder `.venv` z czystym środowiskiem. Nazwa `.venv` to konwencja — kropka na początku oznacza "plik roboczy, nie ruszać", a narzędzia typu VS Code automatycznie ją wykrywają.

## Aktywacja — Windows i Linux

Środowisko trzeba aktywować w terminalu. Na Windows (CMD):

```python
# .venv\Scripts\activate
```

Na Windows w PowerShell:

```python
# .venv\Scripts\Activate.ps1
```

Na Linux/Mac:

```python
# source .venv/bin/activate
```

Po aktywacji w terminalu pojawia się prefiks `(.venv)` przed ścieżką — to znak, że jesteś "w środku". Od teraz `python` i `pip` to te ze środowiska. Wyjście: komenda `deactivate`.

Jak sprawdzić w kodzie, którego Pythona używasz?

```python
import sys
print(sys.executable)
# wypisze np.: C:\projekty\moj_projekt\.venv\Scripts\python.exe
```

Jeśli ścieżka prowadzi do `.venv` — wszystko gra.

## pip — instalowanie pakietów

`pip` to menedżer pakietów Pythona. Pobiera biblioteki z PyPI (publiczny katalog z setkami tysięcy pakietów):

```python
# pip install requests
# pip install pandas==2.2.0        <- konkretna wersja
# pip install "fastapi>=0.100"     <- minimalna wersja
```

Po instalacji import działa od ręki:

```python
import requests
print(requests.__version__)  # wypisze np.: 2.32.3
```

Inne przydatne komendy: `pip list` (co jest zainstalowane), `pip show requests` (szczegóły pakietu), `pip uninstall requests` (usunięcie).

## requirements.txt — przepis na środowisko

Tu zaczyna się prawdziwy MLOps. Komenda `pip freeze` wypisuje wszystkie zainstalowane pakiety z dokładnymi wersjami:

```python
# pip freeze
# wypisze np.:
# requests==2.32.3
# pandas==2.2.0
# numpy==1.26.4
```

Zapisujesz to do pliku:

```python
# pip freeze > requirements.txt
```

A ktokolwiek inny (albo serwer CI/CD, albo kontener Dockera) odtwarza identyczne środowisko jedną komendą:

```python
# pip install -r requirements.txt
```

To jest serce reprodukowalności: kod w gicie + `requirements.txt` = każdy może odpalić twój projekt z dokładnie tymi samymi wersjami bibliotek. Bez tego pliku "u mnie działa" staje się twoim przekleństwem. W ogłoszeniach o pracę MLOps "zarządzanie zależnościami" to standardowy wymóg — chodzi dokładnie o to.

Możesz też napisać `requirements.txt` ręcznie i prościej, tylko z głównymi pakietami:

```python
# requirements.txt
# requests>=2.31
# python-dotenv
# openai
```

Sprawdźmy wzorzec parsowania takiego pliku w czystym Pythonie (przyda się do rozumienia formatu):

```python
zawartosc = "requests==2.32.3\npandas==2.2.0\nnumpy==1.26.4"
pakiety = {}
for linia in zawartosc.split("\n"):
    nazwa, wersja = linia.split("==")
    pakiety[nazwa] = wersja
print(pakiety)
# wypisze: {'requests': '2.32.3', 'pandas': '2.2.0', 'numpy': '1.26.4'}
print(pakiety["pandas"])  # wypisze: 2.2.0
```

## .venv w .gitignore

Folder `.venv` potrafi ważyć setki megabajtów i jest specyficzny dla twojego komputera (ścieżki, system operacyjny). **Nigdy nie wrzucaj go do gita.** Do repozytorium trafia tylko `requirements.txt` — to z niego każdy odtworzy środowisko u siebie.

W pliku `.gitignore` w głównym folderze projektu dodajesz linijkę:

```python
# .gitignore
# .venv/
```

Typowy start nowego projektu wygląda więc tak: utwórz folder → `python -m venv .venv` → aktywuj → `pip install` co trzeba → `pip freeze > requirements.txt` → dodaj `.venv/` do `.gitignore` → commit.

## Częste błędy

**Błąd 1: instalacja poza środowiskiem.**

Zapomniałeś aktywować `.venv`, robisz `pip install requests`, pakiet ląduje globalnie. Potem w projekcie: `ModuleNotFoundError: No module named 'requests'` — bo środowisko projektu jest puste. Zawsze sprawdzaj, czy w terminalu widzisz `(.venv)` przed ścieżką. Ratunek doraźny: `python -m pip install requests` — instaluje pakiet dokładnie dla tego Pythona, który wywołujesz.

**Błąd 2: PowerShell blokuje aktywację.**

Na Windows przy `Activate.ps1` możesz dostać: `cannot be loaded because running scripts is disabled on this system`. To polityka bezpieczeństwa PowerShella, nie twój błąd. Najprostsze obejście: użyj CMD zamiast PowerShella (`,.venv\Scripts\activate` działa tam bez problemu) albo odblokuj skrypty komendą `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`.

**Błąd 3: brak requirements.txt w repo.**

Kolega klonuje twój projekt, odpala i sypie się dziesiątka `ModuleNotFoundError`. Nie wie, co instalować ani w jakich wersjach. Każda zmiana zależności (nowy pakiet, podbicie wersji) powinna kończyć się świeżym `pip freeze > requirements.txt` i commitem.

## Podsumowanie

Wirtualne środowisko izoluje pakiety projektu od reszty systemu: `python -m venv .venv`, potem aktywacja (`.venv\Scripts\activate` na Windows, `source .venv/bin/activate` na Linux). `pip install` instaluje biblioteki, `pip freeze > requirements.txt` zapisuje przepis na środowisko, `pip install -r requirements.txt` odtwarza je w dowolnym miejscu. `.venv/` trzymaj w `.gitignore`, `requirements.txt` w repozytorium. Ten cykl — izolacja, zapis wersji, odtworzenie — to dokładnie ten sam mechanizm, który później spotkasz w Dockerze i pipeline'ach CI/CD, tylko na większą skalę.
