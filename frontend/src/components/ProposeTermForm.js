import React, { useState, useEffect } from 'react';
import { getExams, createExamTerm, getRooms, checkRoomCapacityAndAvailability, getCurrentSessions, checkSessionDate } from '../services/api';

function ProposeTermForm({ currentUser, onSuccess }) {
  const [exams, setExams] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [formData, setFormData] = useState({
    exam_id: '',
    data: '',
    godzina: '',
    sala: '',
    liczba_osob: 30,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const [sessions, setSessions] = useState(null);
  const [dateValidation, setDateValidation] = useState({ valid: true, message: '' });

  useEffect(() => {
    fetchExams();
    fetchRooms();
    fetchSessions();
  }, [currentUser]);

  const fetchSessions = async () => {
    try {
      const response = await getCurrentSessions();
      setSessions(response.data);
    } catch (error) {
      console.error('Blad pobierania sesji:', error);
    }
  };

  const fetchExams = async () => {
    if (!currentUser) return;

    try {
      const params = {};

      // Prowadzący widzi tylko swoje egzaminy
      if (currentUser.role === 'prowadzacy') {
        params.prowadzacy_name = currentUser.przedmiot;
      }
      // Starosta widzi egzaminy swojego kierunku
      else if (currentUser.role === 'starosta') {
        params.kierunek = currentUser.kierunek;
        params.typ_studiow = currentUser.typ_studiow;
        params.rok = currentUser.rok;
      }

      const response = await getExams(params);
      setExams(response.data);
    } catch (error) {
      console.error('Błąd pobierania egzaminów:', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await getRooms();
      setRooms(response.data);
    } catch (error) {
      console.error('Błąd pobierania sal:', error);
    }
  };

  const validateRoomAvailability = async () => {
    if (!formData.sala || !formData.data || !formData.godzina || !formData.liczba_osob) {
      return;
    }

    try {
      const response = await checkRoomCapacityAndAvailability({
        sala: formData.sala,
        data: formData.data,
        godzina: formData.godzina,
        liczba_osob: parseInt(formData.liczba_osob),
      });

      if (response.data.available) {
        setValidationMessage(`Sala dostepna: ${response.data.message}`);
        setError('');
      } else {
        setValidationMessage('');
        setError(response.data.message);
      }
    } catch (error) {
      console.error('Blad walidacji sali:', error);
    }
  };

  // Walidacja daty sesji (admin pomija te walidacje)
  const validateSessionDate = async (dateValue) => {
    if (!dateValue) {
      setDateValidation({ valid: true, message: '' });
      return;
    }

    // Admin moze dodawac egzaminy poza sesja
    if (currentUser?.role === 'admin') {
      setDateValidation({ valid: true, message: '' });
      return;
    }

    try {
      const response = await checkSessionDate(dateValue);
      setDateValidation({
        valid: response.data.valid,
        message: response.data.message || ''
      });
    } catch (error) {
      console.error('Blad walidacji daty:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Walidacja przed wysłaniem
      if (!formData.exam_id || !formData.data || !formData.godzina || !formData.sala) {
        setError('Wszystkie pola są wymagane');
        setLoading(false);
        return;
      }

      await createExamTerm({
        ...formData,
        exam_id: parseInt(formData.exam_id),
        proposed_by_role: currentUser.role,
        proposed_by_name: currentUser.name,
      });

      alert('Propozycja terminu została dodana!');
      setFormData({ exam_id: '', data: '', godzina: '', sala: '' });
      if (onSuccess) onSuccess();
    } catch (error) {
      setError(error.response?.data?.detail || 'Błąd dodawania propozycji');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value,
    };
    setFormData(newFormData);

    // Walidacja daty sesji przy zmianie daty
    if (name === 'data') {
      validateSessionDate(value);
    }
  };

  // Walidacja po zmianie formData
  useEffect(() => {
    if (formData.sala && formData.data && formData.godzina && formData.liczba_osob) {
      const timer = setTimeout(() => {
        validateRoomAvailability();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.sala, formData.data, formData.godzina, formData.liczba_osob]);

  // Tylko prowadzący i starosta mogą proponować terminy
  if (!currentUser || (currentUser.role !== 'prowadzacy' && currentUser.role !== 'starosta')) {
    return null;
  }

  // Formatuje date do czytelnej postaci
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const months = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paz', 'lis', 'gru'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  return (
    <div style={styles.container}>
      <h3>Zaproponuj termin egzaminu</h3>

      {sessions && (
        <div style={styles.sessionInfo}>
          <div style={styles.sessionInfoTitle}>Dozwolone terminy egzaminow:</div>
          <div style={styles.sessionInfoContent}>
            <div>Zasadnicza: {formatDate(sessions.zasadnicza?.data_start)} - {formatDate(sessions.zasadnicza?.data_end)}</div>
            <div>Poprawkowa: {formatDate(sessions.poprawkowa?.data_start)} - {formatDate(sessions.poprawkowa?.data_end)}</div>
          </div>
        </div>
      )}

      {exams.length === 0 ? (
        <p style={styles.warning}>Brak dostępnych egzaminów do zaproponowania terminu</p>
      ) : (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Egzamin:</label>
            <select 
              name="exam_id"
              value={formData.exam_id}
              onChange={handleChange}
              style={styles.select}
              required
            >
              <option value="">-- Wybierz egzamin --</option>
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>
                  {exam.subject.nazwa} - {exam.prowadzacy_name} 
                  ({exam.subject.kierunek}, {exam.subject.typ_studiow}, rok {exam.subject.rok})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Data:</label>
            <input
              type="date"
              name="data"
              value={formData.data}
              onChange={handleChange}
              style={{
                ...styles.input,
                borderColor: !dateValidation.valid ? '#dc3545' : '#ccc'
              }}
              required
            />
            {!dateValidation.valid && (
              <div style={styles.dateWarning}>{dateValidation.message}</div>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Godzina:</label>
            <input 
              type="time"
              name="godzina"
              value={formData.godzina}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Liczba osób:</label>
            <input
              type="number"
              name="liczba_osob"
              value={formData.liczba_osob}
              onChange={handleChange}
              min="1"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Sala:</label>
            <select
              name="sala"
              value={formData.sala}
              onChange={handleChange}
              style={styles.select}
              required
            >
              <option value="">-- Wybierz salę --</option>
              {rooms.map(room => (
                <option key={room.id} value={room.nazwa}>
                  {room.nazwa} - {room.budynek} (pojemność: {room.pojemnosc}, {room.typ})
                </option>
              ))}
            </select>
          </div>

          {validationMessage && <div style={styles.success}>{validationMessage}</div>}
          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            style={{
              ...styles.button,
              opacity: (loading || !dateValidation.valid) ? 0.6 : 1,
              cursor: (loading || !dateValidation.valid) ? 'not-allowed' : 'pointer'
            }}
            disabled={loading || !dateValidation.valid}
          >
            {loading ? 'Dodawanie...' : 'Zaproponuj termin'}
          </button>
        </form>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontWeight: 'bold',
    fontSize: '14px',
  },
  input: {
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
  },
  select: {
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  error: {
    padding: '10px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '4px',
    fontSize: '14px',
  },
  success: {
    padding: '10px',
    backgroundColor: '#d4edda',
    color: '#155724',
    borderRadius: '4px',
    fontSize: '14px',
  },
  warning: {
    padding: '15px',
    backgroundColor: '#fff3cd',
    color: '#856404',
    borderRadius: '4px',
  },
  sessionInfo: {
    backgroundColor: '#e8f4fd',
    border: '1px solid #b8daff',
    borderRadius: '4px',
    padding: '12px',
    marginBottom: '15px',
  },
  sessionInfoTitle: {
    fontWeight: '600',
    fontSize: '13px',
    color: '#004085',
    marginBottom: '6px',
  },
  sessionInfoContent: {
    fontSize: '12px',
    color: '#004085',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  dateWarning: {
    fontSize: '12px',
    color: '#dc3545',
    marginTop: '4px',
  },
};

export default ProposeTermForm;
