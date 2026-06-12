# Harmonogramy: cron i uruchamianie o czasie

Automatyzacja, którą trzeba odpalać ręcznie, to nie automatyzacja. Prawdziwe skrypty budzą się same: raport o 6:00, synchronizacja co 5 minut, backup w niedzielę w nocy. Do opisywania takich harmonogramów świat od dekad używa jednej składni — **cron**. Znajdziesz ją na serwerach Linux, w GitHub Actions, w n8n, w Kubernetesie. Pięć pól, które warto umieć czytać jak drugi język.

## Składnia cron — 5 pól

Wyrażenie cron to pięć wartości oddzielonych spacjami, czytanych od lewej:

```python
# pole:     minuta  godzina  dzień_miesiąca  miesiąc  dzień_tygodnia
# zakres:   0-59    0-23     1-31            1-12     0-6 (0=niedziela)
wzor = "30 6 * * 1-5"
# Wynik: "o 6:30 w dni robocze (poniedziałek-piątek)"
```

Znaki specjalne: `*` znaczy "każdy", `*/5` — "co 5", `1-5` — zakres, `1,15` — lista. Najczęstsze wzorce:

```python
przyklady = {
    "*/5 * * * *":  "co 5 minut",
    "0 6 * * *":    "codziennie o 6:00",
    "30 8 * * 1-5": "o 8:30 od poniedziałku do piątku",
    "0 0 1 * *":    "pierwszego dnia miesiąca o północy",
    "0 22 * * 0":   "w każdą niedzielę o 22:00",
}
for wzor, opis in przyklady.items():
    print(wzor, "->", opis)
# wypisze: */5 * * * * -> co 5 minut
# wypisze: 0 6 * * * -> codziennie o 6:00
# wypisze: 30 8 * * 1-5 -> o 8:30 od poniedziałku do piątku
# wypisze: 0 0 1 * * -> pierwszego dnia miesiąca o północy
# wypisze: 0 22 * * 0 -> w każdą niedzielę o 22:00
```

Pułapka początkującego: `* 6 * * *` to NIE "o 6:00", tylko "co minutę między 6:00 a 6:59" (60 uruchomień!). "Raz o 6:00" wymaga konkretnej minuty: `0 6 * * *`.

## Gdzie cron żyje

Ta sama składnia pojawia się w wielu miejscach. Na **Linuksie** wpisy trzyma `crontab` — linia to wyrażenie plus polecenie: `0 6 * * * python /home/app/raport.py --dni 1`. W **GitHub Actions** harmonogram definiujesz w workflow YAML (`on: schedule: - cron: "0 6 * * *"`) — i uwaga, czas jest w UTC, więc polskie 8:00 latem to `0 6 * * *`. W **n8n** node Schedule Trigger ma tryb "Custom (Cron)" — wklejasz dokładnie to samo wyrażenie. Uczysz się raz, używasz wszędzie.

Na **Windows** odpowiednikiem jest Harmonogram zadań (Task Scheduler): zamiast wyrażenia klikasz wyzwalacz ("codziennie 6:00") i wskazujesz program (`python.exe` + ścieżka skryptu). Koncepcja ta sama — system budzi Twój skrypt o czasie — tylko zapis inny.

## Biblioteka schedule — harmonogram w samym Pythonie

Czasem nie masz dostępu do crona, a skrypt i tak działa non stop. Wtedy pomaga biblioteka `schedule` (`pip install schedule`). Czyta się jak zdanie:

```python
# import schedule, time
#
# def raport():
#     print("Generuję raport...")
#
# schedule.every().day.at("06:00").do(raport)
# schedule.every(5).minutes.do(raport)
#
# while True:
#     schedule.run_pending()
#     time.sleep(1)
# Wynik: pętla działa wiecznie i odpala raport() o zaplanowanych porach
```

Wada: proces musi żyć cały czas — restart maszyny zabija harmonogram. Dlatego w produkcji częściej cron/Actions budzi krótki skrypt, niż Python sam czeka w pętli.

## Idempotencja — bezpieczne podwójne odpalenie

Harmonogramy lubią się dublować: cron odpali zadanie ponownie po awarii, ktoś kliknie "Run workflow" ręcznie, zmiana czasu zduplikuje 2:30 w nocy. Skrypt **idempotentny** to taki, który uruchomiony dwa razy z rzędu daje ten sam efekt co raz — nie wyśle drugiego maila, nie zdubluje wierszy. Najprostszy wzorzec: przed pracą sprawdź, czy efekt już istnieje:

```python
def wyslij_raport(data, wyslane):
    """wyslane: zbiór dat już obsłużonych (w realu: plik/baza)."""
    if data in wyslane:
        return f"pomijam — raport za {data} już wysłany"
    wyslane.add(data)
    return f"wysłano raport za {data}"

wyslane = set()
print(wyslij_raport("2026-06-12", wyslane))  # wypisze: wysłano raport za 2026-06-12
print(wyslij_raport("2026-06-12", wyslane))  # wypisze: pomijam — raport za 2026-06-12 już wysłany
```

Drugie wywołanie nic nie psuje. W praktyce "zbiór wysłanych" to plik znacznika, wiersz w bazie albo nazwa pliku z datą (nadpisanie tego samego pliku też jest idempotentne).

## Parsujemy cron na opis słowny

Skoro cron to string z pięcioma polami, możemy go rozłożyć `splitem` — świetne ćwiczenie i przydatne narzędzie do czytania cudzych konfiguracji:

```python
def opisz_cron(wyrazenie):
    pola = wyrazenie.split()
    if len(pola) != 5:
        return "błąd: cron musi mieć 5 pól"
    minuta, godzina, _, _, dzien_tyg = pola

    if minuta.startswith("*/"):
        return f"co {minuta[2:]} minut"
    if godzina == "*":
        return "co godzinę" if minuta == "0" else f"co godzinę o minucie {minuta}"

    kiedy = f"{godzina}:{int(minuta):02d}"
    if dzien_tyg == "*":
        return f"codziennie o {kiedy}"
    if dzien_tyg == "1-5":
        return f"w dni robocze o {kiedy}"
    return f"o {kiedy} (dzień tygodnia: {dzien_tyg})"

print(opisz_cron("*/15 * * * *"))   # wypisze: co 15 minut
print(opisz_cron("0 6 * * *"))      # wypisze: codziennie o 6:00
print(opisz_cron("30 8 * * 1-5"))   # wypisze: w dni robocze o 8:30
print(opisz_cron("0 6 * *"))        # wypisze: błąd: cron musi mieć 5 pól
```

## Częste błędy

**1. `* 6 * * *` zamiast `0 6 * * *`.** Skrypt odpala się 60 razy między 6:00 a 7:00. Bez komunikatu błędu — zauważysz po 60 mailach w skrzynce. Minuta zawsze konkretna.

**2. Strefa czasowa.** GitHub Actions i większość serwerów chodzi w UTC. `0 6 * * *` w Polsce latem znaczy 8:00. Objaw: "raport przychodzi 2 godziny za późno". Planuj w UTC i przelicz.

**3. Liczba pól.**

```python
pola = "0 6 * *".split()
print(len(pola))  # wypisze: 4
# crontab przy zapisie zgłosi: "bad day-of-week errors in crontab file"
```

Cztery pola zamiast pięciu — cron odrzuci wpis albo (gorzej) zinterpretuje go inaczej, niż chciałeś. Zawsze licz pola.

## Podsumowanie

Cron to pięć pól: minuta, godzina, dzień miesiąca, miesiąc, dzień tygodnia; `*` = każdy, `*/5` = co 5, `1-5` = zakres. Ta sama składnia działa w crontabie, GitHub Actions i n8n; Windows ma Task Scheduler, a biblioteka `schedule` pozwala czekać w samym Pythonie. Dwie żelazne zasady produkcyjne: pamiętaj o UTC i pisz skrypty idempotentne — podwójne odpalenie ma być nudne, nie groźne.
