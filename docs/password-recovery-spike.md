# Password Recovery Spike (CG-105)

## Goal
Understand the legacy recovery mechanism before deciding whether v1 should implement it.

## Current decision
Not implemented in the rewrite yet. Login/logout/`/auth/me` are in scope; password recovery remains a documented spike.

## What must be verified later
- legacy recovery entrypoint
- email delivery dependency
- password storage expectations
- whether a safe compatibility mode exists without broadening risk

## Current guidance
Do not ship an improvised recovery flow. Treat this as a follow-up investigation item.
