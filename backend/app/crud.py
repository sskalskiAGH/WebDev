from sqlalchemy.orm import Session
from app import models, schemas
from typing import List, Optional
from datetime import datetime


# Demo Users
def get_demo_users(db: Session) -> List[models.DemoUser]:
    return db.query(models.DemoUser).all()


# Subjects
def create_subject(db: Session, subject: schemas.SubjectCreate) -> models.Subject:
    db_subject = models.Subject(**subject.dict())
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject


def get_subjects(
    db: Session, 
    kierunek: Optional[str] = None,
    typ_studiow: Optional[models.TypStudiow] = None,
    rok: Optional[int] = None
) -> List[models.Subject]:
    query = db.query(models.Subject)
    if kierunek:
        query = query.filter(models.Subject.kierunek == kierunek)
    if typ_studiow:
        query = query.filter(models.Subject.typ_studiow == typ_studiow)
    if rok:
        query = query.filter(models.Subject.rok == rok)
    return query.all()


# Exams
def create_exam(db: Session, exam: schemas.ExamCreate) -> models.Exam:
    db_exam = models.Exam(**exam.dict())
    db.add(db_exam)
    db.commit()
    db.refresh(db_exam)
    return db_exam


def get_exams(
    db: Session,
    kierunek: Optional[str] = None,
    typ_studiow: Optional[models.TypStudiow] = None,
    rok: Optional[int] = None,
    prowadzacy_name: Optional[str] = None
) -> List[models.Exam]:
    query = db.query(models.Exam).join(models.Subject)
    
    if kierunek:
        query = query.filter(models.Subject.kierunek == kierunek)
    if typ_studiow:
        query = query.filter(models.Subject.typ_studiow == typ_studiow)
    if rok:
        query = query.filter(models.Subject.rok == rok)
    if prowadzacy_name:
        query = query.filter(models.Exam.prowadzacy_name == prowadzacy_name)
    
    return query.all()


def get_exam(db: Session, exam_id: int) -> Optional[models.Exam]:
    return db.query(models.Exam).filter(models.Exam.id == exam_id).first()


# Exam Terms
def create_exam_term(db: Session, term: schemas.ExamTermCreate) -> models.ExamTerm:
    db_term = models.ExamTerm(**term.dict())
    db.add(db_term)
    db.commit()
    db.refresh(db_term)
    return db_term


def get_exam_terms(
    db: Session,
    kierunek: Optional[str] = None,
    typ_studiow: Optional[models.TypStudiow] = None,
    rok: Optional[int] = None,
    status: Optional[models.TermStatus] = None
) -> List[models.ExamTerm]:
    query = db.query(models.ExamTerm).join(models.Exam).join(models.Subject)
    
    if kierunek:
        query = query.filter(models.Subject.kierunek == kierunek)
    if typ_studiow:
        query = query.filter(models.Subject.typ_studiow == typ_studiow)
    if rok:
        query = query.filter(models.Subject.rok == rok)
    if status:
        query = query.filter(models.ExamTerm.status == status)
    
    return query.order_by(models.ExamTerm.data, models.ExamTerm.godzina).all()


def get_exam_term(db: Session, term_id: int) -> Optional[models.ExamTerm]:
    return db.query(models.ExamTerm).filter(models.ExamTerm.id == term_id).first()


def update_exam_term(
    db: Session, 
    term_id: int, 
    approval: schemas.ExamTermApprove
) -> Optional[models.ExamTerm]:
    db_term = get_exam_term(db, term_id)
    if db_term:
        db_term.approved_by_role = approval.approved_by_role
        db_term.approved_by_name = approval.approved_by_name
        db_term.status = approval.status
        db.commit()
        db.refresh(db_term)
    return db_term


# Session Periods
def create_session_period(db: Session, period: schemas.SessionPeriodCreate) -> models.SessionPeriod:
    db_period = models.SessionPeriod(**period.dict())
    db.add(db_period)
    db.commit()
    db.refresh(db_period)
    return db_period


def get_session_periods(db: Session) -> List[models.SessionPeriod]:
    return db.query(models.SessionPeriod).order_by(models.SessionPeriod.data_start.desc()).all()


def get_current_sessions(db: Session) -> dict:
    """
    Pobiera aktualne/nadchodzące sesje (zasadniczą i poprawkową).
    Na razie zwraca zasymulowane dane.
    """
    # Symulowane dane sesji
    zasadnicza = models.SessionPeriod(
        id=1,
        semestr="zimowy",
        rok_akademicki="2025/2026",
        data_start="2026-02-01",
        data_end="2026-02-07"
    )
    poprawkowa = models.SessionPeriod(
        id=2,
        semestr="zimowy_poprawkowa",
        rok_akademicki="2025/2026",
        data_start="2026-02-13",
        data_end="2026-02-27"
    )

    today = datetime.now().strftime("%Y-%m-%d")
    is_active = (zasadnicza.data_start <= today <= zasadnicza.data_end or
                 poprawkowa.data_start <= today <= poprawkowa.data_end)

    return {
        "zasadnicza": zasadnicza,
        "poprawkowa": poprawkowa,
        "is_session_active": is_active,
        "message": "Sesja zimowa 2025/2026"
    }


def is_date_in_session(db: Session, data: str) -> bool:
    """Sprawdza czy podana data mieści się w terminie sesji."""
    sessions = get_current_sessions(db)
    zasadnicza = sessions["zasadnicza"]
    poprawkowa = sessions["poprawkowa"]

    in_zasadnicza = zasadnicza.data_start <= data <= zasadnicza.data_end
    in_poprawkowa = poprawkowa.data_start <= data <= poprawkowa.data_end

    return in_zasadnicza or in_poprawkowa


# Walidacje
def check_room_availability(db: Session, data: str, godzina: str, sala: str, exclude_term_id: Optional[int] = None) -> bool:
    """Sprawdza czy sala jest wolna w danym terminie"""
    query = db.query(models.ExamTerm).filter(
        models.ExamTerm.data == data,
        models.ExamTerm.godzina == godzina,
        models.ExamTerm.sala == sala,
        models.ExamTerm.status != models.TermStatus.REJECTED
    )
    
    if exclude_term_id:
        query = query.filter(models.ExamTerm.id != exclude_term_id)
    
    return query.first() is None


def check_student_availability(
    db: Session,
    data: str,
    kierunek: str,
    typ_studiow: models.TypStudiow,
    rok: int,
    exclude_term_id: Optional[int] = None
) -> bool:
    """Sprawdza czy studenci danego kierunku nie mają już egzaminu tego dnia"""
    query = db.query(models.ExamTerm).join(models.Exam).join(models.Subject).filter(
        models.ExamTerm.data == data,
        models.Subject.kierunek == kierunek,
        models.Subject.typ_studiow == typ_studiow,
        models.Subject.rok == rok,
        models.ExamTerm.status != models.TermStatus.REJECTED
    )

    if exclude_term_id:
        query = query.filter(models.ExamTerm.id != exclude_term_id)

    return query.first() is None


# Rooms
def create_room(db: Session, room: schemas.RoomCreate) -> models.Room:
    """Tworzy nową salę"""
    db_room = models.Room(**room.dict())
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room


def get_rooms(db: Session) -> List[models.Room]:
    """Pobiera wszystkie sale"""
    return db.query(models.Room).order_by(models.Room.nazwa).all()


def get_room_by_name(db: Session, nazwa: str) -> Optional[models.Room]:
    """Pobiera salę po nazwie"""
    return db.query(models.Room).filter(models.Room.nazwa == nazwa).first()


def remove_duplicates(db: Session) -> dict:
    """
    Usuwa duplikaty z wszystkich tabel.
    Zwraca liczbę usuniętych rekordów dla każdej tabeli.
    """
    removed = {
        "subjects": 0,
        "exams": 0,
        "exam_terms": 0,
        "rooms": 0,
        "demo_users": 0
    }

    # Duplikaty Subject (ta sama nazwa, kierunek, typ_studiow, rok)
    subjects = db.query(models.Subject).all()
    seen_subjects = set()
    for s in subjects:
        key = (s.nazwa, s.kierunek, s.typ_studiow, s.rok)
        if key in seen_subjects:
            db.delete(s)
            removed["subjects"] += 1
        else:
            seen_subjects.add(key)

    # Duplikaty Exam (ten sam subject_id i prowadzacy_name)
    exams = db.query(models.Exam).all()
    seen_exams = set()
    for e in exams:
        key = (e.subject_id, e.prowadzacy_name)
        if key in seen_exams:
            db.delete(e)
            removed["exams"] += 1
        else:
            seen_exams.add(key)

    # Duplikaty ExamTerm (ten sam exam_id, data, godzina, sala)
    terms = db.query(models.ExamTerm).all()
    seen_terms = set()
    for t in terms:
        key = (t.exam_id, t.data, t.godzina, t.sala)
        if key in seen_terms:
            db.delete(t)
            removed["exam_terms"] += 1
        else:
            seen_terms.add(key)

    # Duplikaty Room (ta sama nazwa)
    rooms = db.query(models.Room).all()
    seen_rooms = set()
    for r in rooms:
        if r.nazwa in seen_rooms:
            db.delete(r)
            removed["rooms"] += 1
        else:
            seen_rooms.add(r.nazwa)

    # Duplikaty DemoUser (ta sama nazwa i rola)
    users = db.query(models.DemoUser).all()
    seen_users = set()
    for u in users:
        key = (u.name, u.role)
        if key in seen_users:
            db.delete(u)
            removed["demo_users"] += 1
        else:
            seen_users.add(key)

    db.commit()
    return removed


def check_room_capacity_and_availability(
    db: Session,
    sala: str,
    data: str,
    godzina: str,
    liczba_osob: int
) -> dict:
    """
    Sprawdza czy sala istnieje, ma odpowiednią pojemność i jest dostępna w danym terminie

    Returns:
        dict z kluczami: available (bool), message (str), room (Room lub None)
    """
    # Sprawdź czy sala istnieje
    room = get_room_by_name(db, sala)
    if not room:
        return {
            "available": False,
            "message": f"Sala '{sala}' nie istnieje w systemie",
            "room": None
        }

    # Sprawdź pojemność
    if room.pojemnosc < liczba_osob:
        return {
            "available": False,
            "message": f"Sala '{sala}' ma pojemność {room.pojemnosc} miejsc, a potrzeba {liczba_osob} miejsc",
            "room": room
        }

    # Sprawdź dostępność czasową
    is_available = check_room_availability(db, data, godzina, sala)
    if not is_available:
        return {
            "available": False,
            "message": f"Sala '{sala}' jest już zajęta w dniu {data} o godzinie {godzina}",
            "room": room
        }

    return {
        "available": True,
        "message": f"Sala '{sala}' jest dostępna (pojemność: {room.pojemnosc} miejsc)",
        "room": room
    }
