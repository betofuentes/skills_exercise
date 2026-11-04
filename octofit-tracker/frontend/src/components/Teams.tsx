import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = { name: string; mascot: string; members: unknown[] };

export default function Teams() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<{ teams: Team[] }>('/api/teams')
      .then(({ teams: result }) => { if (active) setTeams(result); })
      .catch(() => { if (active) setError('Unable to load teams. Please try again later.'); });
    return () => { active = false; };
  }, []);

  return (
    <section aria-labelledby="teams-heading">
      <h2 id="teams-heading">Teams</h2>
      <p>Manage teams and members.</p>
      {error ? <p role="alert">{error}</p> : teams === null ? <p role="status">Loading teams...</p> : teams.length === 0 ? (
        <p>No teams yet.</p>
      ) : (
        <ul className="list-group">
          {teams.map((team) => (
            <li className="list-group-item" key={team.name}>
              <strong>{team.name}</strong> · Mascot: {team.mascot} · {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
