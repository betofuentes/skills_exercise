import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type LeaderboardEntry = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard')
      .then(({ leaderboard: result }) => { if (active) setLeaderboard(result); })
      .catch(() => { if (active) setError('Unable to load leaderboard. Please try again later.'); });
    return () => { active = false; };
  }, []);

  return (
    <section aria-labelledby="leaderboard-heading">
      <h2 id="leaderboard-heading">Leaderboard</h2>
      <p>Compare team point totals.</p>
      {error ? <p role="alert">{error}</p> : leaderboard === null ? <p role="status">Loading leaderboard...</p> : leaderboard.length === 0 ? (
        <p>No leaderboard rankings yet.</p>
      ) : (
        <ol className="list-group list-group-numbered">
          {leaderboard.map((entry) => (
            <li className="list-group-item" key={`${entry.rank}-${entry.teamName}`}>
              <strong>{entry.teamName}</strong> — {entry.totalPoints} points
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
