# Git dla projektów Pythona

## Po co kontrola wersji

Git to system, który zapamiętuje każdą wersję twojego kodu. Zepsułeś coś w piątek? Wracasz do wersji z czwartku jedną komendą. Chcesz przetestować ryzykowny pomysł? Robisz to na osobnej gałęzi, nie ruszając działającego kodu. Pracujesz z kimś? Git scala wasze zmiany.

W MLOps git to nie opcja, tylko podstawa. Pipeline'y CI/CD startują od pusha do repozytorium. Wdrożenia robi się z konkretnych commitów. Code review odbywa się na pull requestach. Bez gita nie ma pracy w tym zawodzie — to tak fundamentalne jak umiejętność pisania pętli.

## Start: init, status, add, commit

Cykl pracy z gitem to cztery komendy. Najpierw, raz na projekt, inicjalizacja:

```
git init
```

Wynik: `Initialized empty Git repository in .../moj-projekt/.git/`. Od teraz git obserwuje folder.

`git status` pokazuje, co się zmieniło:

```
git status
```

Wynik (po dodaniu pliku `main.py`):

```
Untracked files:
  (use "git add <file>..." to include in what will be committed)
        main.py
```

Git widzi nowy plik, ale jeszcze go nie śledzi. Dodajesz go do "poczekalni" (staging area):

```
git add main.py
```

Możesz też dodać wszystko naraz: `git add .` — ale wtedy uważaj, żeby nie wciągnąć śmieci (o tym za chwilę). Na koniec commit, czyli zapisanie wersji z opisem:

```
git commit -m "Dodaj parser logów"
```

Wynik:

```
[main a1b2c3d] Dodaj parser logów
 1 file changed, 25 insertions(+)
```

Ten dziwny ciąg `a1b2c3d` to skrót identyfikatora commita. Historia commitów to twoja maszyna czasu — `git log --oneline` pokaże listę wszystkich wersji.

Rytm pracy: zmieniasz kod → `git status` (co się zmieniło?) → `git add` → `git commit -m "opis"`. Commituj często, małymi porcjami, z opisami mówiącymi CO i PO CO ("Dodaj retry do wywołań API", nie "poprawki").

## Gałęzie: branch i checkout

Gałąź (branch) to równoległa linia rozwoju. Domyślna nazywa się `main`. Chcesz dodać nową funkcję bez ryzyka? Tworzysz gałąź:

```
git branch nowa-funkcja
git checkout nowa-funkcja
```

Wynik: `Switched to branch 'nowa-funkcja'`. Albo oba kroki naraz: `git checkout -b nowa-funkcja`. Od teraz commity lądują na nowej gałęzi, a `main` zostaje nietknięty. Lista gałęzi: `git branch` (gwiazdka pokazuje aktualną):

```
  main
* nowa-funkcja
```

Powrót: `git checkout main`. Gdy funkcja działa, scalasz ją do main przez `git merge nowa-funkcja` (albo, w pracy zespołowej, przez pull request — patrz niżej).

## .gitignore — co NIGDY nie wchodzi do repo

Nie wszystko powinno trafić do gita. Plik `.gitignore` w katalogu głównym projektu mówi gitowi, co ignorować. Dla projektu Pythona minimalny zestaw to:

```
.venv/
.env
__pycache__/
*.pyc
```

Po kolei:

- `.venv/` — środowisko wirtualne. Setki megabajtów bibliotek, które każdy odtworzy sobie z `requirements.txt`. Nigdy do repo.
- `.env` — plik z sekretami: klucze API, hasła do baz. **NIGDY, przenigdy do repo.** Wycieka klucz OpenAI na publicznym GitHubie → boty znajdą go w kilka minut i nabiją ci rachunek. Jeśli kiedyś commitniesz sekret, sama zmiana pliku nie wystarczy — klucz został w historii. Trzeba go natychmiast unieważnić (zrotować) u dostawcy.
- `__pycache__/` i `*.pyc` — pliki tymczasowe Pythona, czysty śmieć w historii.

Dobra praktyka: zamiast `.env` commitujesz `.env.example` z nazwami zmiennych, ale bez wartości:

```
OPENAI_API_KEY=
DATABASE_URL=
```

Każdy klonujący projekt widzi, jakie zmienne ustawić, a sekrety zostają u niego lokalnie.

## GitHub: push, pull i pull requesty

GitHub to serwer, na którym trzymasz kopię repozytorium — backup plus miejsce współpracy. Łączysz lokalne repo ze zdalnym raz:

```
git remote add origin https://github.com/twoj-login/moj-projekt.git
git push -u origin main
```

Od tej pory:

- `git push` — wysyła twoje commity na GitHub.
- `git pull` — pobiera zmiany z GitHuba (np. zrobione przez kogoś innego albo przez ciebie z innego komputera).

**Pull request (PR)** to prośba o scalenie twojej gałęzi do main. Pushujesz gałąź `nowa-funkcja`, na GitHubie klikasz "Create pull request", ktoś z zespołu przegląda zmiany (code review), zostawia komentarze, a po akceptacji zmiany wchodzą do main. W firmach to standardowy obieg: nikt nie pushuje prosto do main. PR to też moment, w którym CI automatycznie odpala testy — oblane testy blokują merge.

Typowy dzień pracy wygląda więc tak:

```
git checkout -b fix-timeout      # nowa gałąź
# ...kodzenie...
git add .
git status                       # kontrola: czy nie wciągam .env?
git commit -m "Dodaj timeout do requestów"
git push -u origin fix-timeout   # wyślij gałąź
# na GitHubie: otwórz PR, czekaj na review i zielone testy
```

## Częste błędy

**Błąd 1: commit bez skonfigurowanej tożsamości.**

```
fatal: unable to auto-detect email address
```

Git nie wie, kim jesteś. Jednorazowa konfiguracja:

```
git config --global user.name "Twoje Imię"
git config --global user.email "ty@example.com"
```

**Błąd 2: `git push` odrzucony.**

```
! [rejected]        main -> main (fetch first)
error: failed to push some refs
```

Na GitHubie są commity, których nie masz lokalnie (np. ktoś inny pushnął). Rozwiązanie: najpierw `git pull`, rozwiąż ewentualne konflikty, potem `git push`. Nie używaj `--force` na wspólnych gałęziach — nadpiszesz cudzą pracę.

**Błąd 3: commit zrobiony, ale plik "nie ma zmian".** Zmieniłeś plik PO `git add` — git zapisał starą wersję z poczekalni. `git status` pokaże plik jednocześnie jako "staged" i "modified". Rozwiązanie: ponowne `git add` przed commitem. Zasada: `git status` zawsze przed `git commit`.

## Podsumowanie

Git zapamiętuje wersje kodu i umożliwia bezpieczne eksperymenty oraz pracę zespołową. Podstawowy cykl: `git status` → `git add` → `git commit -m "opis"`. Nowe rzeczy rób na gałęziach (`git checkout -b nazwa`), do main scala się je przez pull requesty z code review i testami CI. Plik `.gitignore` musi zawierać `.venv/`, `.env` i `__pycache__/` — a sekretów nie commituje się nigdy; jak wycieknie klucz, natychmiast go rotujesz. `git push` wysyła na GitHub, `git pull` pobiera. To kompletny zestaw na start w każdym projekcie.
