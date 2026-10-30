import { getUser } from '../api/routes.js';
export const findUser = (id: string) => getUser(id);
