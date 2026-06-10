# FastAPI: własne API w 10 minut

## Po co własny endpoint

Masz skrypt, który coś liczy — czyści tekst, ocenia leada, odpala model ML. Działa u ciebie na komputerze. Ale automatyzacja w n8n, aplikacja webowa czy kolega z innego zespołu nie mogą go tak po prostu uruchomić. Rozwiązanie: opakowujesz skrypt w HTTP. Od teraz każdy, kto umie wysłać request, może użyć twojej logiki.

To jest kanoniczne pierwsze zadanie MLOps: "weź model od data scientistów i wystaw go jako API". Serwis dostaje JSON z danymi, zwraca JSON z predykcją. Narzędziem numer jeden do tego w Pythonie jest FastAPI — szybkie, nowoczesne i z automatyczną dokumentacją.

Instalacja:

```
pip install fastapi uvicorn
```

FastAPI to framework, uvicorn to serwer, który go uruchamia.

## Pierwszy endpoint: /health

Tworzysz plik `main.py`:

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}
```

Trzy rzeczy: obiekt `app`, dekorator `@app.get("/health")` (czyli "gdy przyjdzie GET na /health, odpal tę funkcję") i funkcja zwracająca słownik. FastAPI sam zamieni słownik na JSON.

Uruchomienie w terminalu:

```
uvicorn main:app --reload
```

`main:app` znaczy "obiekt `app` z pliku `main.py`". Flaga `--reload` restartuje serwer po każdej zmianie kodu — idealne przy nauce. Wynik:

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

Wchodzisz przeglądarką na `http://127.0.0.1:8000/health` i widzisz:

```json
{"status": "ok"}
```

Endpoint `/health` to standard w MLOps — Kubernetes i load balancery odpytują go co kilka sekund, żeby wiedzieć, czy serwis żyje.

## Parametry ścieżki i query

Parametr ścieżki siedzi w URL-u, w nawiasach klamrowych. Parametr query to wszystko po `?`. FastAPI rozpoznaje je po sygnaturze funkcji:

```python
@app.get("/users/{user_id}")
def get_user(user_id: int, szczegoly: bool = False):
    user = {"id": user_id, "name": f"user_{user_id}"}
    if szczegoly:
        user["role"] = "tester"
    return user
```

- `GET /users/7` → `{"id": 7, "name": "user_7"}`
- `GET /users/7?szczegoly=true` → `{"id": 7, "name": "user_7", "role": "tester"}`

Zwróć uwagę na typ `user_id: int`. FastAPI sam zwaliduje wejście: `GET /users/abc` zwróci błąd 422 z opisem, że oczekiwano liczby. Walidacja za darmo, bez pisania ifów.

## POST z modelem Pydantic

GET służy do pobierania, POST do wysyłania danych. Klient śle JSON w body, a ty opisujesz jego kształt klasą dziedziczącą po `BaseModel` z Pydantic:

```python
from pydantic import BaseModel

class PredictRequest(BaseModel):
    tekst: str
    prog: float = 0.5  # pole opcjonalne z domyślną wartością

@app.post("/predict")
def predict(req: PredictRequest):
    wynik = oceń_tekst(req.tekst)
    return {"spam": wynik >= req.prog, "score": wynik}
```

FastAPI sam: sparsuje JSON z requestu, sprawdzi typy (jak `tekst` nie jest stringiem → 422 z czytelnym opisem), zbuduje obiekt `req` z polami pod kropką. Ty piszesz tylko logikę.

A logika powinna być funkcją czystą — testowalną bez serwera i bez sieci:

```python
def oceń_tekst(tekst: str) -> float:
    """Prymitywny detektor spamu: udział słów-kluczy w tekście."""
    spamowe = {"promocja", "gratis", "wygrana", "kliknij"}
    slowa = tekst.lower().split()
    if not slowa:
        return 0.0
    trafienia = sum(1 for s in slowa if s.strip(".,!?") in spamowe)
    return round(trafienia / len(slowa), 2)

print(oceń_tekst("Promocja! Kliknij i odbierz gratis"))  # wypisze: 0.6
print(oceń_tekst("Spotkanie zespołu o 14:00"))           # wypisze: 0.0
print(oceń_tekst(""))                                     # wypisze: 0.0
```

Taki podział — czysta logika osobno, warstwa HTTP osobno — to dobry nawyk: logikę testujesz pytestem, a endpoint tylko skleja kawałki.

## Pełny mini-serwis

Składamy wszystko w jeden działający plik `main.py`:

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Spam Detector")

def oceń_tekst(tekst: str) -> float:
    spamowe = {"promocja", "gratis", "wygrana", "kliknij"}
    slowa = tekst.lower().split()
    if not slowa:
        return 0.0
    trafienia = sum(1 for s in slowa if s.strip(".,!?") in spamowe)
    return round(trafienia / len(slowa), 2)

class PredictRequest(BaseModel):
    tekst: str
    prog: float = 0.5

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
def predict(req: PredictRequest):
    score = oceń_tekst(req.tekst)
    return {"spam": score >= req.prog, "score": score}
```

Start: `uvicorn main:app --reload`. Test z drugiego terminala:

```
curl -X POST http://127.0.0.1:8000/predict -H "Content-Type: application/json" -d "{\"tekst\": \"Wygrana! Kliknij teraz\"}"
```

Odpowiedź:

```json
{"spam": true, "score": 0.67}
```

Masz działający serwis ML — 30 linijek. Podmień `oceń_tekst` na prawdziwy model i wzorzec zostaje ten sam.

## Automatyczna dokumentacja: /docs

Najlepszy bajer FastAPI: wchodzisz na `http://127.0.0.1:8000/docs` i widzisz interaktywną dokumentację (Swagger UI) wygenerowaną z twojego kodu. Każdy endpoint, jego parametry, kształt JSON-a — wszystko opisane automatycznie na bazie typów i modeli Pydantic. Przycisk "Try it out" pozwala odpalać requesty z przeglądarki, bez curla. Wysyłasz komuś link do `/docs` zamiast pisać dokumentację ręcznie.

## Częste błędy

**Błąd 1: zła ścieżka w uvicorn.**

```
ERROR:    Error loading ASGI app. Could not import module "app".
```

Odpaliłeś `uvicorn app:main` zamiast `uvicorn main:app`. Kolejność: `plik:obiekt` — najpierw nazwa pliku bez `.py`, potem nazwa zmiennej z `FastAPI()`.

**Błąd 2: 422 Unprocessable Entity.**

```json
{"detail": [{"loc": ["body", "tekst"], "msg": "Field required", "type": "missing"}]}
```

Klient wysłał JSON bez wymaganego pola (np. `{"text": ...}` zamiast `{"tekst": ...}`). To nie awaria — to Pydantic robi swoją robotę. Czytaj pole `loc`: mówi dokładnie, czego brakuje.

**Błąd 3: port zajęty.**

```
ERROR:    [Errno 10048] error while attempting to bind on address ('127.0.0.1', 8000)
```

Stary serwer dalej chodzi w innym terminalu. Zamknij go (CTRL+C) albo odpal nowy na innym porcie: `uvicorn main:app --port 8001`.

## Podsumowanie

FastAPI zamienia funkcję Pythona w endpoint HTTP: `app = FastAPI()`, dekorator `@app.get` lub `@app.post`, zwracasz słownik — dostajesz JSON. Parametry ścieżki i query bierzesz z sygnatury funkcji, body POST opisujesz klasą `BaseModel`, a walidację typów dostajesz gratis (422 przy złych danych). Serwer odpalasz przez `uvicorn main:app --reload`, dokumentację masz automatycznie pod `/docs`. Wzorzec health + predict to szkielet niemal każdego serwisu ML — logikę trzymaj w funkcjach czystych, HTTP niech tylko ją wystawia.
