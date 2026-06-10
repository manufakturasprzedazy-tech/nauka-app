# HTTP i biblioteka requests

Cała automatyzacja i AI kręci się wokół jednego: programy gadają ze sobą przez HTTP. Twój skrypt wysyła żądanie (request) do serwera, serwer odsyła odpowiedź (response). Tak działa pobieranie danych z API, wysyłanie promptów do LLM-a, wyzwalanie webhooków w n8n. W Pythonie robi się to biblioteką `requests` — instalujesz przez `pip install requests`.

## Request i response — jak to działa

Żądanie HTTP składa się z: adresu URL, metody (co chcesz zrobić), nagłówków (metadane, np. autoryzacja) i czasem ciała (dane, które wysyłasz). Odpowiedź zawiera: kod statusu (czy się udało), nagłówki i ciało (zwykle JSON).

Dwie najważniejsze metody:

- **GET** — "daj mi dane". Pobieranie. Nie wysyłasz ciała, parametry idą w URL-u.
- **POST** — "przyjmij dane". Wysyłanie. Ciało zawiera dane, najczęściej JSON. Tak wysyła się prompty do API LLM-ów.

Są jeszcze PUT (podmień), PATCH (zmień częściowo), DELETE (usuń) — spotkasz je w API typu REST.

## Kody statusu

Serwer zawsze odpowiada trzycyfrowym kodem. Pierwszą cyfrę czytaj jak kategorię:

- **200** — OK, sukces. (201 = utworzono, częste po POST)
- **3xx** — przekierowanie (requests zwykle ogarnia je sam)
- **404** — Not Found, zły adres albo zasób nie istnieje
- **401/403** — brak autoryzacji / brak uprawnień (zły lub brakujący klucz API)
- **429** — Too Many Requests, przekroczyłeś limit zapytań. W pracy z API LLM-ów zobaczysz go często — trzeba zwolnić i ponowić
- **500/502/503** — błąd po stronie serwera. To nie twoja wina, ale musisz to obsłużyć

Zasada: 2xx = sukces, 4xx = twój błąd, 5xx = ich błąd.

## requests.get — pobieranie danych

```python
import requests

response = requests.get("https://api.example.com/users", timeout=10)
print(response.status_code)  # wypisze: 200
dane = response.json()
print(dane)
# wypisze np.: {'users': [{'id': 1, 'name': 'Ala'}, {'id': 2, 'name': 'Bartek'}]}
```

`response.json()` parsuje ciało odpowiedzi z JSON-a prosto do słownika/listy — to skrót na `json.loads(response.text)`. Inne przydatne pola: `response.text` (surowy tekst), `response.headers` (nagłówki odpowiedzi jako słownik).

Dalsza obróbka odpowiedzi to już czysty Python na słownikach (to działa wszędzie, też offline):

```python
dane = {"users": [{"id": 1, "name": "Ala"}, {"id": 2, "name": "Bartek"}]}
imiona = [u["name"] for u in dane["users"]]
print(imiona)  # wypisze: ['Ala', 'Bartek']
```

## Parametry zapytania — params

Zamiast ręcznie kleić URL `...?city=Krakow&limit=10`, podajesz słownik:

```python
import requests

response = requests.get(
    "https://api.example.com/weather",
    params={"city": "Krakow", "limit": 10},
    timeout=10,
)
print(response.url)
# wypisze: https://api.example.com/weather?city=Krakow&limit=10
```

`requests` sam zakoduje znaki specjalne i spacje. Nigdy nie sklejaj URL-i ręcznie f-stringami z danymi od użytkownika.

## requests.post — wysyłanie danych

Najczęstszy wzorzec w pracy z AI: POST z JSON-em w ciele i kluczem API w nagłówku:

```python
import requests

payload = {"model": "gpt-mini", "prompt": "Streść ten tekst", "max_tokens": 100}
headers = {
    "Authorization": "Bearer sk-tajny-klucz",
    "Content-Type": "application/json",
}
response = requests.post(
    "https://api.example.com/v1/completions",
    json=payload,
    headers=headers,
    timeout=30,
)
print(response.status_code)  # wypisze: 200
wynik = response.json()
print(wynik)
# wypisze np.: {'id': 'cmpl-1', 'choices': [{'text': 'Krótkie streszczenie...'}], 'usage': {'total_tokens': 57}}
print(wynik["choices"][0]["text"])  # wypisze: Krótkie streszczenie...
```

Kluczowy szczegół: parametr `json=payload` sam zamienia słownik na JSON i ustawia odpowiedni Content-Type. Nagłówek `Authorization: Bearer <klucz>` to standardowy sposób uwierzytelniania w API (OpenAI, Anthropic i większość innych).

## Timeout i sprawdzanie statusu

Dwa nawyki, które odróżniają kod produkcyjny od skryptu na kolanie.

**Timeout, zawsze.** Bez niego, gdy serwer zamilknie, twój skrypt wisi w nieskończoność — w automatyzacji to zabójcze:

```python
response = requests.get("https://api.example.com/data", timeout=10)
```

**Sprawdzaj status przed użyciem danych.** Czysta funkcja, którą łatwo testować:

```python
def obsluz_odpowiedz(status_code: int, dane: dict) -> str:
    if status_code == 200:
        return f"OK: {dane.get('result', 'brak wyniku')}"
    if status_code == 429:
        return "Limit zapytań — spróbuj później"
    if status_code == 404:
        return "Nie znaleziono zasobu"
    if status_code >= 500:
        return "Błąd serwera — ponów próbę"
    return f"Nieobsłużony status: {status_code}"

print(obsluz_odpowiedz(200, {"result": 42}))  # wypisze: OK: 42
print(obsluz_odpowiedz(429, {}))              # wypisze: Limit zapytań — spróbuj później
print(obsluz_odpowiedz(503, {}))              # wypisze: Błąd serwera — ponów próbę
```

Alternatywa: `response.raise_for_status()` — rzuca wyjątek `requests.HTTPError` dla kodów 4xx/5xx, który łapiesz w `try/except`.

## Częste błędy

**Błąd 1: .json() na odpowiedzi, która nie jest JSON-em.**

Serwer przy błędzie 500 często odsyła HTML. Wtedy `response.json()` rzuci: `requests.exceptions.JSONDecodeError: Expecting value: line 1 column 1 (char 0)`. Dlatego najpierw sprawdzasz `status_code`, dopiero potem parsujesz.

**Błąd 2: data= zamiast json= przy POST.**

```python
requests.post(url, data={"prompt": "hej"})
```

`data=` wysyła dane jako formularz, nie JSON. API odpowie np. 400 z komunikatem `{"error": "Invalid JSON body"}` i będziesz godzinę szukać przyczyny. Do API zawsze `json=payload` (albo ręcznie `data=json.dumps(payload)` + nagłówek Content-Type).

**Błąd 3: brak obsługi błędów połączenia.**

Brak internetu albo literówka w domenie to nie kod 4xx, tylko wyjątek: `requests.exceptions.ConnectionError: Failed to resolve 'api.exampl.com'`. Przy zbyt wolnym serwerze: `requests.exceptions.Timeout`. Sieciówkę opakowuj w try/except:

```python
try:
    response = requests.get(url, timeout=10)
except requests.exceptions.RequestException as e:
    print(f"Problem z połączeniem: {e}")
```

`RequestException` to rodzic wszystkich wyjątków requests — łapie i timeout, i błąd połączenia.

## Podsumowanie

HTTP to rozmowa request → response. GET pobiera, POST wysyła (prompty do LLM-ów = POST z `json=payload` i nagłówkiem `Authorization: Bearer ...`). Kody: 2xx sukces, 404 nie znaleziono, 429 limit zapytań, 5xx błąd serwera. Z odpowiedzi czytasz `response.status_code` i `response.json()`, parametry GET podajesz przez `params=`, a `timeout=` ustawiasz ZAWSZE. Status sprawdzaj przed parsowaniem, sieć opakowuj w try/except. Ten schemat — zbuduj payload, wyślij, sprawdź status, sparsuj JSON, obsłuż błędy — to dosłownie 80% kodu każdej integracji, jaką napiszesz.
