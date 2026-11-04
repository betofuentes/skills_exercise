import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type WorkoutSuggestion = { title: string; focus?: string; minutes?: number; difficulty?: string; reason?: string };
const userEmail = 'mona@example.com';

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<{ suggestions: WorkoutSuggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`)
      .then(({ suggestions: result }) => { if (active) setSuggestions(result); })
      .catch(() => { if (active) setError('Unable to load workout suggestions. Please try again later.'); });
    return () => { active = false; };
  }, []);

  return (
    <section aria-labelledby="workouts-heading">
      <h2 id="workouts-heading">Workout suggestions</h2>
      <p>Recommended workouts for {userEmail}.</p>
      {error ? <p role="alert">{error}</p> : suggestions === null ? <p role="status">Loading workout suggestions...</p> : suggestions.length === 0 ? (
        <p>No workout suggestions available.</p>
      ) : (
        <ul className="list-group">
          {suggestions.map((workout, index) => (
            <li className="list-group-item" key={`${workout.title}-${index}`}>
              <strong>{workout.title}</strong>
              {workout.focus && <span> · Focus: {workout.focus}</span>}
              {workout.minutes !== undefined && <span> · {workout.minutes} minutes</span>}
              {workout.difficulty && <span> · {workout.difficulty}</span>}
              {workout.reason && <p className="mb-0">{workout.reason}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
