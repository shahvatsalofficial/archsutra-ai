export async function lookup(db: any, id: string, expr: string) {
  const rows = await db.query(`SELECT * FROM users WHERE id = ${id}`);
  const score = eval(expr);
  return { rows, score };
}
