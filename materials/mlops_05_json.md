# JSON w Pythonie

JSON to format tekstowy do przesyłania danych. Wygląda prawie jak słowniki i listy w Pythonie, ale to zawsze zwykły string. Dlaczego jest tak ważny? Bo to uniwersalny język internetu: każde API (OpenAI, Anthropic, pogoda, banki) odpowiada JSON-em, każdy webhook wysyła JSON, konfiguracje i logi też często są w JSON-ie. LLM-y również zwracają ustrukturyzowane odpowiedzi w tym formacie. Jako inżynier automatyzacji będziesz parsować JSON dziesiątki razy dziennie.

## Jak wygląda JSON

```python
tekst = '{"model": "gpt-mini", "tokeny": 150, "ok": true, "blad": null}'
```

Zasady: klucze zawsze w **podwójnych** cudzysłowach, wartości to stringi, liczby, `true`/`false`, `null`, listy `[]` i obiekty `{}`. Zwróć uwagę na różnice względem Pythona: `true` zamiast `True`, `null` zamiast `None`.

## json.loads — string do Pythona

`loads` (load string) zamienia tekst JSON na obiekty Pythona:

```python
import json

tekst = '{"model": "gpt-mini", "tokeny": 150, "ok": true, "blad": null}'
dane = json.loads(tekst)
print(dane)            # wypisze: {'model': 'gpt-mini', 'tokeny': 150, 'ok': True, 'blad': None}
print(type(dane))      # wypisze: <class 'dict'>
print(dane["tokeny"])  # wypisze: 150
```

Mapowanie typów: obiekt JSON → `dict`, lista → `list`, string → `str`, liczba → `int`/`float`, `true` → `True`, `null` → `None`. Lista też się parsuje:

```python
import json

dane = json.loads('[10, 20, 30]')
print(dane)       # wypisze: [10, 20, 30]
print(sum(dane))  # wypisze: 60
```

## json.dumps — Python do stringa

`dumps` (dump string) robi odwrotnie — z obiektów Pythona buduje tekst JSON. Tak przygotowujesz dane do wysłania do API:

```python
import json

payload = {"model": "gpt-mini", "prompt": "Streść tekst", "max_tokens": 100}
tekst = json.dumps(payload)
print(tekst)
# wypisze: {"model": "gpt-mini", "prompt": "Streść tekst", "max_tokens": 100}
```

Widzisz te dziwne `ś`? Domyślnie `dumps` ucieka znaki spoza ASCII. Dla ludzi czytelniej z `ensure_ascii=False`, a `indent` ładnie formatuje:

```python
import json

payload = {"model": "gpt-mini", "prompt": "Streść tekst"}
print(json.dumps(payload, ensure_ascii=False, indent=2))
# wypisze:
# {
#   "model": "gpt-mini",
#   "prompt": "Streść tekst"
# }
```

`indent=2` przydaje się do logów i debugowania, `ensure_ascii=False` — zawsze gdy w danych są polskie znaki.

## Zagnieżdżone struktury — prawdziwe payloady API

Prawdziwe odpowiedzi API to słowniki w słownikach w listach. Tak wygląda typowa odpowiedź LLM-a:

```python
import json

odpowiedz = '''
{
  "id": "chat-123",
  "model": "gpt-mini",
  "choices": [
    {"index": 0, "message": {"role": "assistant", "content": "Cześć!"}}
  ],
  "usage": {"prompt_tokens": 10, "completion_tokens": 3}
}
'''
dane = json.loads(odpowiedz)
```

Do zagnieżdżonych wartości schodzisz krok po kroku, łącząc klucze i indeksy:

```python
tresc = dane["choices"][0]["message"]["content"]
print(tresc)  # wypisze: Cześć!

tokeny = dane["usage"]["prompt_tokens"] + dane["usage"]["completion_tokens"]
print(tokeny)  # wypisze: 13
```

Czytaj ścieżkę od lewej: `dane["choices"]` to lista → `[0]` pierwszy element → `["message"]` słownik → `["content"]` string. Z listą rekordów łączysz to z pętlą albo komprehensją:

```python
import json

surowe = '{"users": [{"name": "Ala", "xp": 120}, {"name": "Bartek", "xp": 80}]}'
dane = json.loads(surowe)
imiona = [u["name"] for u in dane["users"]]
print(imiona)  # wypisze: ['Ala', 'Bartek']
```

## Bezpieczny dostęp przez .get()

API potrafi zwrócić odpowiedź bez jakiegoś pola — np. `"error"` jest tylko czasem. Twardy dostęp `dane["error"]` wybucha, gdy klucza nie ma. `.get()` zwraca wtedy `None` albo wartość domyślną:

```python
import json

dane = json.loads('{"status": "ok", "result": 42}')

print(dane.get("result"))          # wypisze: 42
print(dane.get("error"))           # wypisze: None
print(dane.get("error", "brak"))   # wypisze: brak
```

Przy zagnieżdżeniu łańcuchujesz `.get()` z domyślnym pustym słownikiem, żeby nie wywalić się w połowie ścieżki:

```python
import json

dane = json.loads('{"user": {"name": "Ala"}}')
miasto = dane.get("user", {}).get("address", {}).get("city", "nieznane")
print(miasto)  # wypisze: nieznane
```

Wzorzec do zapamiętania: pola obowiązkowe czytaj przez `[...]` (lepiej, żeby brakujące od razu krzyknęło), pola opcjonalne przez `.get()` z sensownym domyślnym.

## Walidacja danych z zewnątrz

Nigdy nie ufaj, że JSON z zewnątrz jest poprawny. Funkcja czysta, która parsuje i sprawdza:

```python
import json

def parsuj_zdarzenie(tekst: str) -> dict:
    try:
        dane = json.loads(tekst)
    except json.JSONDecodeError:
        return {"ok": False, "blad": "niepoprawny JSON"}
    if "event" not in dane:
        return {"ok": False, "blad": "brak pola event"}
    return {"ok": True, "event": dane["event"]}

print(parsuj_zdarzenie('{"event": "deploy"}'))
# wypisze: {'ok': True, 'event': 'deploy'}
print(parsuj_zdarzenie('to nie json'))
# wypisze: {'ok': False, 'blad': 'niepoprawny JSON'}
print(parsuj_zdarzenie('{"x": 1}'))
# wypisze: {'ok': False, 'blad': 'brak pola event'}
```

Ten wzorzec — parsuj, złap błąd, sprawdź wymagane pola, zwróć czytelny wynik — to chleb powszedni przy webhookach i odpowiedziach LLM.

## Częste błędy

**Błąd 1: pojedyncze cudzysłowy w JSON-ie.**

```python
import json
json.loads("{'model': 'gpt'}")
```

Wynik: `json.decoder.JSONDecodeError: Expecting property name enclosed in double quotes`. JSON wymaga podwójnych cudzysłowów — to, że Python akceptuje pojedyncze w słownikach, nie ma znaczenia. Częsta wpadka: ktoś zrobił `str(slownik)` zamiast `json.dumps(slownik)` i taki "JSON" nie da się sparsować.

**Błąd 2: loads na słowniku albo dumps zamiast loads.**

```python
import json
dane = {"a": 1}
json.loads(dane)
```

Wynik: `TypeError: the JSON object must be str, bytes or bytearray, not dict`. Kierunki: `loads` = string → Python, `dumps` = Python → string. Jak masz już słownik, nie parsuj go drugi raz.

**Błąd 3: indeksowanie stringa zamiast sparsowanych danych.**

```python
tekst = '{"status": "ok"}'
print(tekst["status"])
```

Wynik: `TypeError: string indices must be integers`. Zapomniałeś o `json.loads` — `tekst` to nadal string i `["status"]` nie ma sensu. Najpierw `dane = json.loads(tekst)`, dopiero potem `dane["status"]`.

## Podsumowanie

JSON to tekstowy format wymiany danych: `json.loads` zamienia string na słowniki/listy Pythona, `json.dumps` odwrotnie. Pamiętaj o mapowaniu `true`→`True`, `null`→`None` i o obowiązkowych podwójnych cudzysłowach. Po zagnieżdżonych strukturach schodzisz łańcuchem `["klucz"][indeks]["klucz"]`, a pola opcjonalne czytasz przez `.get()` z wartością domyślną. Do czytelnego wypisywania: `indent=2, ensure_ascii=False`. Dane z zewnątrz zawsze parsuj w `try/except JSONDecodeError` i sprawdzaj wymagane pola. Opanujesz to — i każda integracja z API czy LLM-em stanie się rutyną.
