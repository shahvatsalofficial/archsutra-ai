# STRIDE checklist

Apply per data-flow element and per boundary crossing. Write only threats that are plausible for this system.

| Category | Question | Typical controls | Example test |
|---|---|---|---|
| Spoofing | Can someone pretend to be another user, service or device? | strong authentication, mutual TLS, signed tokens with audience and expiry checks, no trust in client-supplied identity | Call the API with a token for a different audience: expect 401 |
| Tampering | Can data or code be changed in transit, at rest or in a build? | TLS, integrity checks, signed artifacts, server-side validation, least-privilege writes | Modify a signed payload by one byte: expect rejection |
| Repudiation | Can an actor deny an action because nothing recorded it? | audit logs with actor, action, time, target; append-only storage; clock sync | Perform an admin action and find it in the audit log |
| Information disclosure | Can data leak through responses, logs, errors, backups or side channels? | authorization on every object, field-level filtering, redaction, encryption, least-privilege reads | Request another tenant's object id: expect 403 or 404 |
| Denial of service | Can the system be exhausted or locked? | rate limits, quotas, timeouts, back-pressure, bounded inputs, autoscaling limits | Send a 100 MB body or 10 000 requests: expect rejection and a healthy service |
| Elevation of privilege | Can a user or process gain rights it should not have? | deny by default, role checks server-side, sandboxing, no shell from user input, separate admin plane | Call an admin route as a normal user: expect 403 |

## Boundary crossings to examine

- Internet to edge (gateway, load balancer, CDN).
- Edge to application; application to datastore; application to queue.
- Service to service, and service to third-party API or webhook receiver.
- Human to model, model to tool, tool to external system.
- Build and deploy pipeline to production; developer machine to repository.
- Tenant A to tenant B in any shared component.

## Rating guide

| Rating | Likelihood | Impact |
|---|---|---|
| High | attack needs little skill or access and is likely to be tried | broad data exposure, money loss, full outage, safety effect |
| Medium | needs some access or skill | limited exposure or partial outage |
| Low | needs rare conditions or insider access | minor or easily reversed effect |

Overall risk is the combination; explain it in one sentence. Do not average numbers into false precision.
