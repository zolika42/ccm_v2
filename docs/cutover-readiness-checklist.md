# Cutover Readiness Checklist (CG-194)

Use this before any production-facing switchover or controlled rollout.

## Environment
- [ ] Both legacy DB connections are healthy
- [ ] `LEGACY_DOWNLOAD_ROOT` or `LEGACY_DOWNLOAD_BASE_URL` is configured correctly
- [ ] Session cookie settings match the target environment
- [ ] CORS settings match the target web origin

## Functional
- [ ] Login/logout works
- [ ] Product list and PDP work
- [ ] Cart add/update/remove works
- [ ] Checkout validate/submit works
- [ ] Library list works
- [ ] At least one real downloadable purchase can be downloaded

## Operational
- [ ] `make legacy-refresh` passes on current dumps
- [ ] `make smoke` passes
- [ ] Frontend build passes
- [ ] Request IDs and API logs are visible

## Risk controls
- [ ] Payment routing decision is signed off
- [ ] Download bridge security review is accepted
- [ ] Rollback path is documented
- [ ] Known parking-lot items are explicitly out of scope
