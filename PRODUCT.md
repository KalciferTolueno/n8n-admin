# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmed by the requested build: Node.js 22, Express, `pg`, Docker Engine API through dockerode, and vanilla HTML, CSS, and JavaScript. The app is deployed from a Dockerfile to EasyPanel.

## Users

Internal operators responsible for a Docker Swarm n8n instance. They need to assess the service and execution queue quickly, then perform a small set of deliberate maintenance actions without SSH access or raw Docker commands.

## Product Purpose

n8n Admin safely exposes the operational controls needed to inspect n8n and PostgreSQL, clear only the stalled execution queue after confirmation, start or stop n8n, and change the production concurrency limit.

## Positioning

The product performs controlled, observable maintenance directly against the named Swarm service and n8n PostgreSQL database: it serializes dangerous work, confirms service convergence, and reports the outcome of each stage rather than providing a generic Docker console.

## Operating Context

The application runs as an internal EasyPanel app on the server hosting `rp_n8n` and `rp_n8n_db`. It uses the Docker socket and resolves the database by service hostname. Operators access a single protected browser page, often during an incident or a backlog investigation.

## Capabilities and Constraints

- Service identity comes exclusively from `N8N_SERVICE`; no client request can choose a Docker target.
- Queue data comes from the existing `execution_entity` table; no extra persistence or ORM is used.
- Queue clearing is always manual and confirmation-gated. It follows stop, confirm zero replicas, clean, verify, then start, with recovery in `finally` once the service was stopped.
- Start, stop, queue clean, and concurrency changes are mutually exclusive in-process operations.
- The app must keep running while n8n is stopped and PostgreSQL must remain untouched.
- HTTP Basic authentication protects the page and all API routes except `/health`; EasyPanel Basic Auth may be layered in front.
- Docker socket access is highly privileged and must be documented as a security boundary.
- **Inferred implementation choice:** this initial web surface is code-first because its value is operational clarity and reliable live states, not raster artwork.

## Brand Commitments

The interface is dark, professional, compact, responsive, and explicit about risk. It should never make a destructive action feel routine or automatic.

## Evidence on Hand

The user supplied the service names, configuration contract, endpoint payloads, SQL queries, operational sequence, and required UI copy. No logo, imagery, or external brand system has been supplied; future work must not fabricate usage claims or customer proof.

## Product Principles

1. Show the real current state before asking an operator to act.
2. Make destructive work intentional, reversible where possible, and visible while it runs.
3. Serialize maintenance so two well-meaning operators cannot race each other.
4. Treat Docker and database access as privileged implementation details, never as controls exposed to the client.
5. Keep the first release small, auditable, and ready to grow toward observational metrics.

## Accessibility & Inclusion

Status is expressed with text and iconography in addition to colour. Every control, modal, loading state, and error state must remain usable with keyboard navigation and adequate contrast.
