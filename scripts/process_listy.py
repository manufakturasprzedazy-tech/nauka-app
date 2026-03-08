#!/usr/bin/env python3
"""Process Listy.md into learning.db"""
import sqlite3, json, datetime, os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'learning.db')
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Check if already processed
cur.execute("SELECT id FROM source_materials WHERE filename = 'Listy.md'")
if cur.fetchone():
    print("Listy.md already processed, skipping.")
    conn.close()
    exit()

# 1. Source material
cur.execute(
    'INSERT INTO source_materials (filename, filepath, title, summary, topics, processed_at) VALUES (?, ?, ?, ?, ?, ?)',
    (
        'Listy.md',
        r'C:\Users\DELL\OneDrive\Dokumenty\Kodowanko\Aplikacja do nauki\materials\Listy.md',
        'Listy w Pythonie \u2013 kolekcje danych, indeksowanie i iteracja',
        'Materia\u0142 wprowadza poj\u0119cie list jako pierwszej struktury danych (kolekcji) w Pythonie. '
        'Listy pozwalaj\u0105 przechowywa\u0107 wiele warto\u015bci w jednej zmiennej, u\u017cywaj\u0105c sk\u0142adni z nawiasami kwadratowymi. '
        'Om\u00f3wiono sta\u0142e listowe (list constants), mo\u017cliwo\u015b\u0107 mieszania typ\u00f3w danych w jednej li\u015bcie, '
        'zagnie\u017cd\u017canie list oraz listy puste. Kluczow\u0105 cech\u0105 list jest ich mutowalno\u015b\u0107 (zmienialno\u015b\u0107) \u2014 '
        'w przeciwie\u0144stwie do string\u00f3w, elementy listy mo\u017cna modyfikowa\u0107 przez przypisanie do indeksu. '
        'Materia\u0142 pokazuje operator indeksowania (numeracja od 0), funkcj\u0119 len() zwracaj\u0105c\u0105 d\u0142ugo\u015b\u0107 listy '
        'oraz funkcj\u0119 range() generuj\u0105c\u0105 sekwencje liczb. Na ko\u0144cu przedstawiono dwa sposoby iteracji po listach: '
        'bezpo\u015bredni (for element in lista) oraz zliczany z u\u017cyciem range(len(lista)), '
        'kt\u00f3ry daje dost\u0119p do pozycji elementu.',
        json.dumps([
            "Struktury danych vs algorytmy",
            "Sta\u0142e listowe (list constants) i nawiasy kwadratowe",
            "Mieszane typy danych w listach",
            "Zagnie\u017cd\u017cone listy",
            "Mutowalno\u015b\u0107 list vs niemutowalno\u015b\u0107 string\u00f3w",
            "Operator indeksowania (index operator)",
            "Funkcja len() dla list",
            "Funkcja range()",
            "Iteracja bezpo\u015brednia vs zliczana (counted loop)",
            "P\u0119tle for z listami",
        ], ensure_ascii=False),
        datetime.datetime.now().isoformat(),
    )
)
material_id = cur.lastrowid
print(f"Material ID: {material_id}")

# 2. Flashcards (10)
flashcards = [
    ("Czym r\u00f3\u017cni\u0105 si\u0119 algorytmy od struktur danych?",
     "Algorytmy to \u015bcie\u017cki (kroki) w kodzie \u2014 jak nawigacja GPS. Struktury danych to sposoby organizacji zmiennych w pami\u0119ci \u2014 jak dane s\u0105 przechowywane podczas dzia\u0142ania programu.",
     "Struktury danych w Pythonie"),
    ("Jak wygl\u0105da sk\u0142adnia sta\u0142ej listowej (list constant) w Pythonie?",
     "Elementy umieszcza si\u0119 w nawiasach kwadratowych, oddzielone przecinkami, np. [1, 24, 76] lub [\"red\", \"yellow\", \"blue\"].",
     "Listy w Pythonie"),
    ("Czy lista w Pythonie mo\u017ce zawiera\u0107 r\u00f3\u017cne typy danych?",
     "Tak \u2014 jedna lista mo\u017ce zawiera\u0107 stringi, liczby ca\u0142kowite i zmiennoprzecinkowe jednocze\u015bnie, np. [\"red\", 24, 98.6]. Mo\u017ce nawet zawiera\u0107 inne listy.",
     "Listy w Pythonie"),
    ("Co oznacza, \u017ce listy s\u0105 mutowalne (mutable)?",
     "Mutowalno\u015b\u0107 oznacza, \u017ce elementy listy mo\u017cna zmienia\u0107 po jej utworzeniu. Np. lotto[2] = 28 zmieni trzeci element listy. Stringi nie s\u0105 mutowalne \u2014 nie mo\u017cna zmieni\u0107 pojedynczego znaku.",
     "Mutowalno\u015b\u0107 list"),
    ("Dlaczego stringi nie s\u0105 mutowalne w Pythonie?",
     "Python nie pozwala na zmian\u0119 pojedynczych znak\u00f3w w stringu (fruit[0] = \"b\" wywo\u0142a b\u0142\u0105d TypeError). Metody jak .lower() tworz\u0105 kopi\u0119 stringa zamiast modyfikowa\u0107 orygina\u0142.",
     "Mutowalno\u015b\u0107 list"),
    ("Jak dzia\u0142a operator indeksowania w listach?",
     "Operator [] pozwala odczyta\u0107 element na danej pozycji. Indeksowanie zaczyna si\u0119 od 0, wi\u0119c lista[0] to pierwszy element, lista[1] to drugi itd.",
     "Indeksowanie list"),
    ("Co zwraca funkcja len() dla listy?",
     "Funkcja len() zwraca liczb\u0119 element\u00f3w w li\u015bcie. Np. len([1, \"dwa\", 3.0, True]) zwr\u00f3ci 4. Dzia\u0142a tak samo jak dla string\u00f3w.",
     "Funkcje dla list"),
    ("Co zwraca funkcja range(4)?",
     "range(4) zwraca sekwencj\u0119 liczb od 0 do 3 (0, 1, 2, 3) \u2014 cztery liczby zaczynaj\u0105c od 0, do ale nie w\u0142\u0105czaj\u0105c 4. Odpowiada to indeksom 4-elementowej listy.",
     "Funkcja range()"),
    ("Jaka jest r\u00f3\u017cnica mi\u0119dzy iteracj\u0105 bezpo\u015bredni\u0105 a zliczan\u0105 po li\u015bcie?",
     "Bezpo\u015brednia: for friend in friends \u2014 zmienna iteracyjna przyjmuje warto\u015bci element\u00f3w. Zliczana: for i in range(len(friends)) \u2014 zmienna iteracyjna przyjmuje indeksy (0, 1, 2...), a elementy odczytujemy przez friends[i].",
     "Iteracja po listach"),
    ("Kiedy warto u\u017cy\u0107 p\u0119tli zliczanej (counted loop) zamiast bezpo\u015bredniej iteracji po li\u015bcie?",
     "Gdy potrzebujemy zna\u0107 pozycj\u0119 (indeks) elementu w li\u015bcie, np. aby wypisa\u0107 \"znaleziono na pozycji 3\". Bezpo\u015brednia iteracja nie daje dost\u0119pu do indeksu.",
     "Iteracja po listach"),
]
for front, back, topic in flashcards:
    cur.execute('INSERT INTO flashcards (material_id, front, back, topic) VALUES (?, ?, ?, ?)',
                (material_id, front, back, topic))
print(f"Flashcards: {len(flashcards)}")

# 3. Quiz questions (10)
quizzes = [
    ("Kt\u00f3re nawiasy s\u0142u\u017c\u0105 do tworzenia list w Pythonie?",
     ["Okr\u0105g\u0142e ()", "Kwadratowe []", "Klamrowe {}", "Ostre <>"],
     1, "Listy w Pythonie definiujemy za pomoc\u0105 nawias\u00f3w kwadratowych [], np. [1, 2, 3].", "easy", "Sta\u0142e listowe"),
    ("Co si\u0119 stanie gdy spr\u00f3bujemy wykona\u0107: fruit = \"banana\"; fruit[0] = \"b\"?",
     ["Zmieni pierwsz\u0105 liter\u0119 na ma\u0142\u0105", "Nic si\u0119 nie stanie", "Powstanie b\u0142\u0105d TypeError", "Utworzy nowy string"],
     2, "Stringi nie s\u0105 mutowalne \u2014 pr\u00f3ba przypisania do indeksu wywo\u0142a TypeError.", "easy", "Mutowalno\u015b\u0107"),
    ("Jaki b\u0119dzie wynik: lista = [2, 14, 26, 41, 63]; lista[2] = 28; print(lista)?",
     ["[2, 14, 26, 28, 63]", "[2, 28, 26, 41, 63]", "[2, 14, 28, 41, 63]", "B\u0142\u0105d"],
     2, "lista[2] = 28 zmienia trzeci element (indeks 2) z 26 na 28.", "medium", "Mutowalno\u015b\u0107 list"),
    ("Co zwr\u00f3ci len([\"red\", 24, 98.6, True])?",
     ["3", "4", "10", "B\u0142\u0105d"],
     1, "len() zwraca liczb\u0119 element\u00f3w w li\u015bcie. Lista ma 4 elementy.", "easy", "Funkcja len()"),
    ("Co zwraca range(3)?",
     ["[1, 2, 3]", "[0, 1, 2]", "[0, 1, 2, 3]", "[1, 2, 3, 4]"],
     1, "range(3) generuje sekwencj\u0119 0, 1, 2 \u2014 trzy liczby od 0 do ale nie w\u0142\u0105czaj\u0105c 3.", "easy", "Funkcja range()"),
    ("Jaki jest indeks pierwszego elementu listy w Pythonie?",
     ["1", "0", "-1", "Zale\u017cy od typu"],
     1, "Indeksowanie zaczyna si\u0119 od 0. Pierwszy element ma indeks 0.", "easy", "Indeksowanie list"),
    ("Kt\u00f3ra p\u0119tla daje dost\u0119p do indeksu elementu podczas iteracji?",
     ["for friend in friends", "for i in range(len(friends))", "while friends", "for i in friends.index()"],
     1, "for i in range(len(friends)) to p\u0119tla zliczana \u2014 i przyjmuje warto\u015bci indeks\u00f3w.", "medium", "Iteracja po listach"),
    ("Czy lista mo\u017ce zawiera\u0107 inn\u0105 list\u0119 jako element?",
     ["Nie, to b\u0142\u0105d", "Tak, listy mog\u0105 by\u0107 zagnie\u017cd\u017cone", "Tylko puste listy", "Tylko w Pythonie 3"],
     1, "Listy mog\u0105 zawiera\u0107 inne listy, np. [1, [5, 6], 7].", "easy", "Zagnie\u017cd\u017cone listy"),
    ("Co oznacza friends[1] je\u015bli friends = [\"Joseph\", \"Glenn\", \"Sally\"]?",
     ["\"Joseph\"", "\"Glenn\"", "\"Sally\"", "B\u0142\u0105d"],
     1, "friends[1] to drugi element (indeksowanie od 0). friends[0] = \"Joseph\", friends[1] = \"Glenn\".", "easy", "Indeksowanie list"),
    ("Ile element\u00f3w ma lista [1, [5, 6], 7]?",
     ["2", "3", "4", "5"],
     1, "Lista ma 3 elementy: 1, [5, 6] (jeden element), 7.", "medium", "Zagnie\u017cd\u017cone listy"),
]
for q, choices, correct, explanation, difficulty, topic in quizzes:
    cur.execute('INSERT INTO quiz_questions (material_id, question, choices, correct_index, explanation, difficulty, topic) VALUES (?, ?, ?, ?, ?, ?, ?)',
                (material_id, q, json.dumps(choices, ensure_ascii=False), correct, explanation, difficulty, topic))
print(f"Quiz questions: {len(quizzes)}")

# 4. Coding exercises (4)
exercises = [
    ("Tworzenie i wypisywanie listy",
     "Napisz funkcj\u0119 `create_greeting_list(names, greeting)`, kt\u00f3ra przyjmuje list\u0119 imion i tekst powitania, a zwraca now\u0105 list\u0119 string\u00f3w w formacie \"{greeting}, {imie}!\".\n\nPrzyk\u0142ad: `create_greeting_list([\"Anna\", \"Jan\"], \"Cze\u015b\u0107\")` zwraca `[\"Cze\u015b\u0107, Anna!\", \"Cze\u015b\u0107, Jan!\"]`.",
     "def create_greeting_list(names, greeting):\n    # TODO: Stw\u00f3rz pust\u0105 list\u0119 wynikow\u0105\n    # TODO: Iteruj po li\u015bcie imion\n    # TODO: Dla ka\u017cdego imienia dodaj sformatowany string do listy\n    # TODO: Zwr\u00f3\u0107 list\u0119\n    pass",
     "def create_greeting_list(names, greeting):\n    result = []\n    for name in names:\n        result.append(f\"{greeting}, {name}!\")\n    return result",
     "def test_basic():\n    assert create_greeting_list([\"Anna\", \"Jan\"], \"Cze\u015b\u0107\") == [\"Cze\u015b\u0107, Anna!\", \"Cze\u015b\u0107, Jan!\"]\n\ndef test_single():\n    assert create_greeting_list([\"Ola\"], \"Hej\") == [\"Hej, Ola!\"]\n\ndef test_empty():\n    assert create_greeting_list([], \"Witaj\") == []",
     "easy", "Tworzenie list i iteracja"),
    ("Modyfikacja element\u00f3w listy",
     "Napisz funkcj\u0119 `double_values(numbers)`, kt\u00f3ra przyjmuje list\u0119 liczb i modyfikuje j\u0105 w miejscu (in-place), podwajaj\u0105c ka\u017cd\u0105 warto\u015b\u0107. Funkcja powinna zwr\u00f3ci\u0107 zmodyfikowan\u0105 list\u0119.\n\nPrzyk\u0142ad: `double_values([1, 2, 3])` zwraca `[2, 4, 6]`.",
     "def double_values(numbers):\n    # TODO: U\u017cyj p\u0119tli zliczanej (range + len)\n    # TODO: Dla ka\u017cdego indeksu podw\u00f3j warto\u015b\u0107\n    # TODO: Zwr\u00f3\u0107 list\u0119\n    pass",
     "def double_values(numbers):\n    for i in range(len(numbers)):\n        numbers[i] = numbers[i] * 2\n    return numbers",
     "def test_basic():\n    assert double_values([1, 2, 3]) == [2, 4, 6]\n\ndef test_zeros():\n    assert double_values([0, 5, 0]) == [0, 10, 0]\n\ndef test_negative():\n    assert double_values([-1, 3, -2]) == [-2, 6, -4]\n\ndef test_empty():\n    assert double_values([]) == []",
     "medium", "Mutowalno\u015b\u0107 list i p\u0119tla zliczana"),
    ("Znajdowanie indeksu elementu",
     "Napisz funkcj\u0119 `find_index(lst, target)`, kt\u00f3ra zwraca indeks pierwszego wyst\u0105pienia warto\u015bci target w li\u015bcie. Je\u015bli nie istnieje, zwr\u00f3\u0107 -1. Nie u\u017cywaj .index().\n\nPrzyk\u0142ad: `find_index([10, 20, 30, 20], 20)` zwraca `1`.",
     "def find_index(lst, target):\n    # TODO: U\u017cyj p\u0119tli zliczanej\n    # TODO: Sprawd\u017a czy element == target\n    # TODO: Je\u015bli tak, zwr\u00f3\u0107 indeks\n    # TODO: Je\u015bli nie znaleziono, zwr\u00f3\u0107 -1\n    pass",
     "def find_index(lst, target):\n    for i in range(len(lst)):\n        if lst[i] == target:\n            return i\n    return -1",
     "def test_found():\n    assert find_index([10, 20, 30, 20], 20) == 1\n\ndef test_first():\n    assert find_index([5, 10, 15], 5) == 0\n\ndef test_not_found():\n    assert find_index([1, 2, 3], 99) == -1\n\ndef test_empty():\n    assert find_index([], 5) == -1",
     "medium", "Indeksowanie i p\u0119tla zliczana"),
    ("Zamiana element\u00f3w listy",
     "Napisz funkcj\u0119 `swap_first_last(lst)`, kt\u00f3ra zamienia miejscami pierwszy i ostatni element listy (in-place). Je\u015bli lista ma mniej ni\u017c 2 elementy, zwr\u00f3\u0107 j\u0105 bez zmian.\n\nPrzyk\u0142ad: `swap_first_last([1, 2, 3, 4])` zwraca `[4, 2, 3, 1]`.",
     "def swap_first_last(lst):\n    # TODO: Sprawd\u017a d\u0142ugo\u015b\u0107 listy\n    # TODO: Zamie\u0144 pierwszy i ostatni element\n    # TODO: Zwr\u00f3\u0107 list\u0119\n    pass",
     "def swap_first_last(lst):\n    if len(lst) >= 2:\n        lst[0], lst[-1] = lst[-1], lst[0]\n    return lst",
     "def test_basic():\n    assert swap_first_last([1, 2, 3, 4]) == [4, 2, 3, 1]\n\ndef test_two():\n    assert swap_first_last([10, 20]) == [20, 10]\n\ndef test_one():\n    assert swap_first_last([5]) == [5]\n\ndef test_empty():\n    assert swap_first_last([]) == []",
     "medium", "Mutowalno\u015b\u0107 list i indeksowanie"),
]
for title, desc, starter, solution, test, difficulty, topic in exercises:
    cur.execute('INSERT INTO coding_exercises (material_id, title, description, starter_code, solution, test_code, difficulty, topic) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                (material_id, title, desc, starter, solution, test, difficulty, topic))
print(f"Coding exercises: {len(exercises)}")

conn.commit()
conn.close()
print("Done!")
