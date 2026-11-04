import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createTeam } from '../src/services/octofitService.js';
import { Team, User } from '../src/models/index.js';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([Team.deleteMany({}), User.deleteMany({})]);
});

describe('team membership consistency', () => {
  it('moves members from their previous team when creating a team', async () => {
    const previousTeam = await Team.create({ name: 'Previous team', mascot: 'Mona', members: [] });
    const member = await User.create({
      name: 'Mona',
      email: 'mona@example.com',
      team: previousTeam._id,
      fitnessGoal: 'endurance',
    });
    await Team.updateOne({ _id: previousTeam._id }, { $addToSet: { members: member._id } });

    const team = await createTeam({
      name: 'Octocats',
      mascot: 'Mona',
      members: [member._id.toString()],
    });

    const movedMember = await User.findById(member._id);
    const emptiedPreviousTeam = await Team.findById(previousTeam._id);
    expect(team.members.map((id) => id.toString())).toContain(member._id.toString());
    expect(movedMember?.team?.toString()).toBe(team._id.toString());
    expect(emptiedPreviousTeam?.members.map((id) => id.toString())).not.toContain(member._id.toString());
  });
});
