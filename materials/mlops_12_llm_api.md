# Wywoływanie API LLM z Pythona

## Najważniejsza umiejętność AI automation

Praktycznie każda automatyzacja AI sprowadza się do jednego ruchu: wysyłasz tekst do API modelu językowego, dostajesz tekst z powrotem, robisz coś z wynikiem. Klasyfikacja maili, podsumowania dokumentów, ekstrakcja danych z faktur — wszystko to jest jedno i to samo wywołanie HTTP w różnych przebraniach. Opanujesz ten wzorzec — opanujesz fundament zawodu.

## Struktura wywołania: model i messages

Standard branżowy to tzw. chat completions. Wysyłasz słownik z dwoma kluczowymi polami: `model` (który model) i `messages` (lista wiadomości). Każda wiadomość ma rolę:

- `system` — instrukcja dla modelu: kim jest i jak ma odpowiadać,
- `user` — to, co "mówi" użytkownik (twoje dane, pytanie),
- `assistant` — wcześniejsze odpowiedzi modelu (przy dłuższej rozmowie).

Budowanie takiej struktury to czysty Python — słowniki i listy, zero internetu:

```python
def zbuduj_messages(instrukcja: str, tekst_uzytkownika: str) -> list:
    return [
        {"role": "system", "content": instrukcja},
        {"role": "user", "content": tekst_uzytkownika},
    ]

messages = zbuduj_messages(
    "Jesteś asystentem klasyfikującym maile. Odpowiadaj jednym słowem.",
    "Mail: 'Faktura za maj w załączniku'",
)
print(messages[0]["role"])     # wypisze: system
print(len(messages))           # wypisze: 2
print(messages[1]["content"])  # wypisze: Mail: 'Faktura za maj w załączniku'
```

## Klucz API z os.environ

Klucz API to hasło do twojego portfela — każde wywołanie kosztuje. Dlatego nigdy nie wpisujesz go w kod. Trzymasz go w zmiennej środowiskowej i czytasz przez `os.environ`:

```python
import os

klucz = os.environ.get("OPENAI_API_KEY")
if klucz is None:
    raise RuntimeError("Ustaw zmienną OPENAI_API_KEY")
```

`os.environ.get("NAZWA")` zwraca `None`, gdy zmiennej nie ma — dzięki temu możesz dać czytelny komunikat zamiast tajemniczego błędu autoryzacji. Klucz w kodzie + push na GitHub = klucz skradziony w minuty.

## Wywołanie przez openai SDK

Najprostsza droga: `pip install openai`, a potem:

```python
from openai import OpenAI

client = OpenAI()  # klucz weźmie sam z OPENAI_API_KEY

odpowiedz = client.chat.completions.create(
    model="gpt-5-mini",
    messages=[
        {"role": "system", "content": "Odpowiadaj po polsku, krótko."},
        {"role": "user", "content": "Czym jest token?"},
    ],
)
print(odpowiedz.choices[0].message.content)
# wypisze np.: Token to mały fragment tekstu, na które model dzieli wejście.
```

Kluczowa ścieżka do tekstu: `choices[0].message.content`. API zwraca listę `choices` (zwykle jednoelementową), w środku `message` z polem `content`. Tę ścieżkę warto znać na pamięć.

## Wywołanie czystym requests.post

SDK to wygoda, ale pod spodem siedzi zwykły POST. Warto raz zobaczyć, co naprawdę leci po sieci:

```python
import os
import requests

odpowiedz = requests.post(
    "https://api.openai.com/v1/chat/completions",
    headers={
        "Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}",
        "Content-Type": "application/json",
    },
    json={
        "model": "gpt-5-mini",
        "messages": [{"role": "user", "content": "Powiedz cześć"}],
    },
    timeout=30,
)
dane = odpowiedz.json()
print(dane["choices"][0]["message"]["content"])  # wypisze np.: Cześć!
```

To samo, tylko bez magii: nagłówek `Authorization: Bearer <klucz>`, body jako JSON, timeout (lekcja o retry się kłania). SDK zamienia słowniki na obiekty z kropkami — `requests` zostawia surowe słowniki.

Parsowanie takiej odpowiedzi możesz ćwiczyć całkowicie offline:

```python
def wyciagnij_tekst(odpowiedz_api: dict) -> str:
    return odpowiedz_api["choices"][0]["message"]["content"]

przykladowa = {
    "choices": [{"message": {"role": "assistant", "content": "spam"}}],
    "usage": {"prompt_tokens": 50, "completion_tokens": 3},
}
print(wyciagnij_tekst(przykladowa))  # wypisze: spam
```

## Wymuszanie JSON-a od modelu

W automatyzacjach nie chcesz "ładnej" odpowiedzi. Chcesz dane, które kod może przetworzyć — czyli JSON. Dwa kroki: w system prompcie żądasz wyłącznie JSON-a, a odpowiedź parsujesz przez `json.loads` z obsługą błędu, bo model czasem dorzuci coś od siebie.

```python
import json

def parsuj_json_modelu(tekst: str) -> dict:
    """Parsuje odpowiedź modelu; zwraca {} gdy to nie JSON."""
    try:
        wynik = json.loads(tekst)
    except json.JSONDecodeError:
        return {}
    if not isinstance(wynik, dict):
        return {}
    return wynik

print(parsuj_json_modelu('{"kategoria": "faktura", "pewnosc": 0.9}'))
# wypisze: {'kategoria': 'faktura', 'pewnosc': 0.9}
print(parsuj_json_modelu("Jasne! Oto JSON: {..."))
# wypisze: {}
```

System prompt w stylu: `"Zwróć WYŁĄCZNIE poprawny JSON z polami: kategoria (string), pewnosc (liczba 0-1). Bez żadnego tekstu przed ani po."` W API OpenAI możesz dodatkowo wymusić format parametrem `response_format={"type": "json_object"}`. Ale obsługa `JSONDecodeError` zostaje zawsze — model to nie funkcja deterministyczna, traktuj jego wyjście jak dane od użytkownika: sprawdzaj zanim użyjesz.

## Koszty: tokeny

Płacisz za tokeny — kawałki tekstu, mniej więcej 3-4 znaki każdy. Osobna stawka za wejście (prompt) i wyjście (odpowiedź). Pole `usage` w odpowiedzi mówi, ile zużyłeś. Policzmy koszt funkcją czystą:

```python
def koszt_wywolania(usage: dict, cena_in: float, cena_out: float) -> float:
    """Ceny podane za 1M tokenów, wynik w dolarach."""
    koszt = (usage["prompt_tokens"] / 1_000_000 * cena_in
             + usage["completion_tokens"] / 1_000_000 * cena_out)
    return round(koszt, 6)

usage = {"prompt_tokens": 1200, "completion_tokens": 300}
print(koszt_wywolania(usage, 0.25, 2.00))  # wypisze: 0.0009
```

Niecały grosz za wywołanie — ale przy pętli po 100 000 maili to już 90 dolarów. Dlatego: krótkie prompty, tani model do prostych zadań, licz `usage` i loguj koszty.

## Częste błędy

**Błąd 1: brak klucza lub zły klucz.**

```
openai.AuthenticationError: Error code: 401 - Incorrect API key provided
```

Klucz nieustawiony, z literówką albo unieważniony. Sprawdź `os.environ.get("OPENAI_API_KEY")` — i pamiętaj, że 401 NIE ponawiamy retry'em.

**Błąd 2: `json.loads` na nie-JSON-ie bez try/except.**

```
json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)
```

Model zaczął odpowiedź od "Oczywiście! Oto wynik:". Zawsze owijaj `json.loads` w try/except i wymuszaj czysty JSON promptem.

**Błąd 3: `KeyError: 'choices'`.** Odpowiedź nie zawiera `choices`, bo to odpowiedź BŁĘDU — ma za to pole `error`. Sprawdzaj status HTTP (`odpowiedz.raise_for_status()`) przed sięganiem po `choices`.

## Podsumowanie

Wywołanie LLM to POST ze słownikiem: `model` plus `messages` z rolami system/user. Klucz API zawsze z `os.environ`, nigdy w kodzie. Tekst odpowiedzi siedzi w `choices[0].message.content`. W automatyzacjach wymuszasz JSON i parsujesz go przez `json.loads` w try/except, bo wyjście modelu to niepewne dane. Koszt liczysz z pola `usage` — tokeny wejścia i wyjścia mają osobne stawki. SDK i goły `requests.post` robią to samo; zrozum oba, używaj wygodniejszego.
