import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Activity payload must be an object'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (
    typeof userId !== 'string' ||
    !/^[a-f\d]{24}$/i.test(userId) ||
    typeof teamId !== 'string' ||
    !/^[a-f\d]{24}$/i.test(teamId) ||
    typeof type !== 'string' ||
    type.trim().length === 0 ||
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    throw Object.assign(new Error('Activity payload is invalid'), { status: 400 });
  }

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) {
    throw Object.assign(new Error('Activity user or team was not found'), { status: 404 });
  }

  return Activity.create({
    user: user._id,
    team: team._id,
    type,
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Team payload must be an object'), { status: 400 });
  }

  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (
    typeof name !== 'string' ||
    name.trim().length === 0 ||
    typeof mascot !== 'string' ||
    mascot.trim().length === 0 ||
    !Array.isArray(members) ||
    !members.every((member) => typeof member === 'string' && /^[a-f\d]{24}$/i.test(member))
  ) {
    throw Object.assign(new Error('Team payload is invalid'), { status: 400 });
  }

  if (members.length > 0) {
    const existingMembers = await User.countDocuments({ _id: { $in: members } });
    if (existingMembers !== members.length) {
      throw Object.assign(new Error('One or more team members were not found'), { status: 404 });
    }
  }

  const team = await Team.create({ name, mascot, members });
  if (members.length > 0) {
    await Promise.all([
      Team.updateMany(
        { _id: { $ne: team._id }, members: { $in: members } },
        { $pull: { members: { $in: members } } },
      ),
      User.updateMany({ _id: { $in: members } }, { $set: { team: team._id } }),
    ]);
  }

  return team;
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().lean(),
    Activity.aggregate<{ _id: InstanceType<typeof Team>['_id']; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));
  const leaderboard = teams
    .map((team) => ({
      teamName: team.name,
      totalPoints: pointsByTeam.get(team._id.toString()) ?? 0,
    }))
    .sort((left, right) => right.totalPoints - left.totalPoints);

  return leaderboard.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User was not found'), { status: 404 });
  }

  const workouts = await Workout.find().lean();
  const goalMatches = workouts.filter((workout) => workout.focus.toLowerCase() === user.fitnessGoal.toLowerCase());
  if (goalMatches.length > 0) {
    return goalMatches.map((workout) => ({
      ...workout,
      reason: `Recommended to support your ${user.fitnessGoal} goal.`,
    }));
  }

  const recentActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  if (!recentActivity) return [];

  const activityFocus = ['run', 'cycle', 'walk'].includes(recentActivity.type.toLowerCase())
    ? 'endurance'
    : recentActivity.type.toLowerCase();
  return workouts
    .filter((workout) => workout.focus.toLowerCase() === activityFocus)
    .map((workout) => ({
      ...workout,
      reason: `Recommended based on your recent ${recentActivity.type} activity.`,
    }));
}

export { User };
