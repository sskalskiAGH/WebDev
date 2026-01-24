import React, { useState, useEffect } from 'react';
import { getCurrentSessions } from '../services/api';

function SessionBanner() {
  const [sessions, setSessions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await getCurrentSessions();
      setSessions(response.data);
    } catch (error) {
      console.error('Blad pobierania sesji:', error);
    } finally {
      setLoading(false);
    }
  };

  // Formatuje date do czytelnej postaci (np. "1 lut")
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const months = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paz', 'lis', 'gru'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  // Oblicza dni do rozpoczecia sesji
  const getDaysUntil = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading || !sessions) {
    return null;
  }

  const zasadnicza = sessions.zasadnicza;
  const poprawkowa = sessions.poprawkowa;
  const daysUntilZasadnicza = getDaysUntil(zasadnicza.data_start);
  const daysUntilPoprawkowa = getDaysUntil(poprawkowa.data_start);

  // Ustal aktualny status
  let statusText = '';
  let statusColor = '#3498db';

  if (sessions.is_session_active) {
    statusText = 'Sesja w trakcie';
    statusColor = '#27ae60';
  } else if (daysUntilZasadnicza > 0 && daysUntilZasadnicza <= 14) {
    statusText = `${daysUntilZasadnicza} dni do sesji`;
    statusColor = '#e67e22';
  } else if (daysUntilZasadnicza > 14) {
    statusText = `${daysUntilZasadnicza} dni do sesji`;
    statusColor = '#3498db';
  } else if (daysUntilPoprawkowa > 0) {
    statusText = `${daysUntilPoprawkowa} dni do poprawkowej`;
    statusColor = '#9b59b6';
  }

  return (
    <div style={{ ...styles.banner, borderLeftColor: statusColor }}>
      <div style={styles.content}>
        <div style={styles.statusBadge}>
          <span style={{ ...styles.statusDot, backgroundColor: statusColor }}></span>
          <span style={styles.statusText}>{statusText}</span>
        </div>

        <div style={styles.sessionsContainer}>
          <div style={styles.sessionBlock}>
            <span style={styles.sessionLabel}>Sesja zasadnicza</span>
            <span style={styles.sessionDates}>
              {formatDate(zasadnicza.data_start)} - {formatDate(zasadnicza.data_end)} 2026
            </span>
          </div>

          <div style={styles.divider}></div>

          <div style={styles.sessionBlock}>
            <span style={styles.sessionLabel}>Sesja poprawkowa</span>
            <span style={styles.sessionDates}>
              {formatDate(poprawkowa.data_start)} - {formatDate(poprawkowa.data_end)} 2026
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  banner: {
    backgroundColor: '#fff',
    borderLeft: '4px solid #3498db',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    margin: '20px auto 0 auto',
    maxWidth: '1400px',
    padding: '12px 20px',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '15px',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  statusText: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#2c3e50',
  },
  sessionsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  sessionBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  sessionLabel: {
    fontSize: '11px',
    color: '#7f8c8d',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  sessionDates: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#2c3e50',
  },
  divider: {
    width: '1px',
    height: '30px',
    backgroundColor: '#ecf0f1',
  },
};

export default SessionBanner;
