# System Organizacji Egzaminow

Aplikacja webowa do zarzadzania harmonogramem egzaminow z systemem zatwierdzania.

## Spis tresci

1. [Uruchomienie](#uruchomienie)
2. [Architektura](#architektura)
3. [Role uzytkownikow](#role-uzytkownikow)
4. [API Endpoints](#api-endpoints)
5. [Baza danych](#baza-danych)
6. [Komponenty Frontend](#komponenty-frontend)
7. [Walidacje](#walidacje)

---

## Uruchomienie

### Docker Compose (zalecane)

```bash
docker-compose up
```

Aplikacja bedzie dostepna:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs

### Reczne uruchomienie

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python init_db.py
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

---

## Architektura

```
WebDev/
├── backend/                 # FastAPI (Python)
│   ├── app/
│   │   ├── main.py         # Punkt wejscia aplikacji
│   │   ├── models.py       # Modele SQLAlchemy
│   │   ├── schemas.py      # Schematy Pydantic
│   │   ├── crud.py         # Operacje bazodanowe
│   │   ├── database.py     # Konfiguracja bazy
│   │   └── routers/        # Endpointy API
│   └── init_db.py          # Inicjalizacja bazy z danymi demo
├── frontend/                # React (JavaScript)
│   └── src/
│       ├── App.js          # Glowny komponent
│       ├── components/     # Komponenty UI
│       └── services/api.js # Klient HTTP
└── docker-compose.yml
```

**Technologie:**
- Backend: FastAPI, SQLAlchemy, SQLite
- Frontend: React, Axios
- Deployment: Docker Compose

---

## Role uzytkownikow

| Rola | Uprawnienia |
|------|-------------|
| **student** | Przegladanie egzaminow swojego kierunku |
| **starosta** | Proponowanie terminow, zatwierdzanie propozycji prowadzacych |
| **prowadzacy** | Proponowanie terminow, zatwierdzanie propozycji starostow |
| **admin** | Pelne uprawnienia, moze dodawac egzaminy poza sesja |

---

## API Endpoints

### Egzaminy

| Metoda | Sciezka | Opis |
|--------|---------|------|
| GET | `/api/exams` | Lista egzaminow (filtry: kierunek, typ_studiow, rok) |
| POST | `/api/exams` | Utworz egzamin |
| GET | `/api/exams/{id}` | Szczegoly egzaminu |

### Terminy egzaminow

| Metoda | Sciezka | Opis |
|--------|---------|------|
| GET | `/api/exam-terms` | Lista terminow (filtry: kierunek, typ_studiow, rok, status) |
| POST | `/api/exam-terms` | Zaproponuj termin |
| GET | `/api/exam-terms/{id}` | Szczegoly terminu |
| PUT | `/api/exam-terms/{id}` | Zatwierdz/odrzuc termin |

### Walidacja

| Metoda | Sciezka | Opis |
|--------|---------|------|
| GET | `/api/exam-terms/validation/check-room` | Sprawdz dostepnosc sali |
| GET | `/api/exam-terms/validation/check-students` | Sprawdz konflikty studentow |
| GET | `/api/exam-terms/validation/check-session-date` | Sprawdz czy data w sesji |

### Sesje

| Metoda | Sciezka | Opis |
|--------|---------|------|
| GET | `/api/session-periods` | Lista okresow sesji |
| GET | `/api/session-periods/current` | Aktualne terminy sesji |
| POST | `/api/session-periods` | Utworz okres sesji |

### Sale

| Metoda | Sciezka | Opis |
|--------|---------|------|
| GET | `/api/rooms` | Lista sal |
| POST | `/api/rooms` | Utworz sale |
| POST | `/api/rooms/check-availability` | Sprawdz pojemnosc i dostepnosc |

### Inne

| Metoda | Sciezka | Opis |
|--------|---------|------|
| GET | `/api/demo-users` | Lista uzytkownikow demo |
| GET | `/api/subjects` | Lista przedmiotow |
| DELETE | `/api/admin/remove-duplicates` | Usun duplikaty z bazy |

---

## Baza danych

### Model: DemoUser
Uzytkownicy demo do testowania.

| Pole | Typ | Opis |
|------|-----|------|
| id | Integer | Klucz glowny |
| name | String | Imie i nazwisko |
| role | Enum | student/starosta/prowadzacy/admin |
| kierunek | String | Kierunek studiow (opcjonalne) |
| typ_studiow | Enum | Typ studiow (opcjonalne) |
| rok | Integer | Rok studiow (opcjonalne) |

### Model: Subject
Przedmioty z planu studiow.

| Pole | Typ | Opis |
|------|-----|------|
| id | Integer | Klucz glowny |
| nazwa | String | Nazwa przedmiotu |
| kierunek | String | Kierunek studiow |
| typ_studiow | Enum | stacjonarne_I/II, niestacjonarne_I/II |
| rok | Integer | Rok studiow |

### Model: Exam
Definicje egzaminow.

| Pole | Typ | Opis |
|------|-----|------|
| id | Integer | Klucz glowny |
| subject_id | Integer | FK do Subject |
| prowadzacy_name | String | Nazwa prowadzacego |

### Model: ExamTerm
Terminy egzaminow z workflow zatwierdzania.

| Pole | Typ | Opis |
|------|-----|------|
| id | Integer | Klucz glowny |
| exam_id | Integer | FK do Exam |
| data | String | Data (YYYY-MM-DD) |
| godzina | String | Godzina (HH:MM) |
| sala | String | Nazwa sali |
| proposed_by_role | Enum | Rola proponujacego |
| proposed_by_name | String | Nazwa proponujacego |
| approved_by_role | Enum | Rola zatwierdzajacego |
| approved_by_name | String | Nazwa zatwierdzajacego |
| status | Enum | proposed/approved/rejected |
| created_at | DateTime | Data utworzenia |

### Model: SessionPeriod
Okresy sesji egzaminacyjnych.

| Pole | Typ | Opis |
|------|-----|------|
| id | Integer | Klucz glowny |
| semestr | String | zimowy/letni |
| rok_akademicki | String | np. 2025/2026 |
| data_start | String | Data poczatku |
| data_end | String | Data konca |

### Model: Room
Sale egzaminacyjne.

| Pole | Typ | Opis |
|------|-----|------|
| id | Integer | Klucz glowny |
| nazwa | String | Nazwa sali (unikalna) |
| budynek | String | Budynek |
| pojemnosc | Integer | Liczba miejsc |
| typ | String | Typ sali (opcjonalne) |

---

## Komponenty Frontend

### App.js
Glowny kontener aplikacji z nawigacja miedzy widokami.

### SessionBanner.js
Banner wyswietlajacy terminy sesji:
- Sesja zasadnicza i poprawkowa
- Licznik dni do sesji
- Kolorowy wskaznik statusu

### UserSelector.js
Dropdown do wyboru uzytkownika demo (symulacja logowania).

### ProposeTermForm.js
Formularz proponowania terminu egzaminu:
- Wybor egzaminu, daty, godziny, sali
- Walidacja w czasie rzeczywistym
- Info o dozwolonych terminach sesji

### ExamList.js
Tabela terminow egzaminow:
- Filtry: wszystkie/oczekujace/zatwierdzone
- Przyciski zatwierdzania/odrzucania
- Kodowanie kolorami statusu

### GanttChart.js
Wykres Gantta harmonogramu egzaminow:
- Wizualizacja w siatce czas/data
- Kolorowanie wedlug statusu
- Legenda i szczegoly

---

## Walidacje

Przy tworzeniu terminu egzaminu system sprawdza:

1. **Dostepnosc sali** - czy sala nie jest zajeta w danym terminie
2. **Pojemnosc sali** - czy sala pomiesci wszystkich studentow
3. **Konflikty studentow** - czy studenci danego kierunku/roku nie maja juz egzaminu tego dnia
4. **Termin sesji** - czy data miesci sie w okresie sesji (admin moze obejsc)

### Terminy sesji (symulowane)
- Sesja zasadnicza: 01-07.02.2026
- Sesja poprawkowa: 13-27.02.2026

---

## Komendy administracyjne

### Usuwanie duplikatow z bazy
```bash
curl -X DELETE http://localhost:8000/api/admin/remove-duplicates
```

### Reinicjalizacja bazy
```bash
cd backend
rm data/exam_system.db
python init_db.py
```

---

## Zmienne srodowiskowe

```env
# Backend
PYTHONUNBUFFERED=1

# Frontend
REACT_APP_API_URL=http://localhost:8000
```
