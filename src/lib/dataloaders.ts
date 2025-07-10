import DataLoader from 'dataloader';
import { PrismaClient, User } from '@prisma/client';

const prisma = new PrismaClient();

const batchUsers = async (ids: readonly string[]) => {
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: [...ids],
      },
    },
  });
  const userMap: { [key: string]: User } = {};
  users.forEach(user => {
    userMap[user.id] = user;
  });
  return ids.map(id => userMap[id] || null);
};

export const createUserLoader = () => new DataLoader<string, User | null>(batchUsers);