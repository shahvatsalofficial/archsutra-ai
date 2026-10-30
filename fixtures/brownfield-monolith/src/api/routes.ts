import { findUser } from '../db/repo.js';
export const getUser = (id: string) => findUser(id);
