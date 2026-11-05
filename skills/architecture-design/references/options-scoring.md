# Comparing options

## Procedure

1. List 2 to 3 options that all meet the hard requirements. Drop any that fail a must-have before scoring.
2. Choose 5 to 8 criteria from the requirements (not from habit). Typical: time to first release, operability for this team, cost at expected scale, scalability headroom, security surface, data consistency fit, hiring and skills, lock-in.
3. Give each criterion a weight; weights sum to 100. Ask the user to confirm the top three.
4. Score each option 1 to 5 per criterion with one sentence of reasoning.
5. Compute weighted totals. Show the table.
6. Run a sensitivity check: change the two least certain assumptions (for example traffic is 5x higher, or the team is half the size) and show whether the winner changes. If it flips, say so plainly.

## Table

| Criterion | Weight | A: modular monolith | B: event-driven services | C: serverless |
|---|---|---|---|---|
| Time to first release | 25 | 5 (one deployable) | 2 (infrastructure first) | 4 |
| Operability for a 4-person team | 25 | 5 | 2 | 3 |
| Scale headroom to 10x | 15 | 3 | 5 | 5 |
| Cost at expected load | 15 | 4 | 3 | 4 |
| Consistency fit | 10 | 5 | 2 | 3 |
| Lock-in | 10 | 5 | 4 | 2 |
| **Weighted total (of 5)** | 100 | **4.5** | 2.9 | 3.5 |

The numbers above are illustrative. Never reuse them without the real requirements.

## Sensitivity example

"If traffic is 10x the stated 50 rps, A drops to 3.6 and C rises to 4.0: the decision flips. Revisit when sustained traffic passes 200 rps." Put the trigger in the ADR under "Revisit when".

## Rules

- Scores without reasons are opinions; always write the reason.
- If the options tie, prefer the one that is cheaper to reverse.
- Do not include an option only to make the favorite look good.
