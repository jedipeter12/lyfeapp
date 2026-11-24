# Lyfe

Lyfe is an early-stage life maintenance project for remembering, scheduling, and recording recurring responsibilities. It is intended to reduce the mental work of life administration rather than track habits.

## Status

The repository contains an Expo Router app for iOS and Android, plus product and engineering documentation. The [frozen Architecture v1.0](https://app.notion.com/p/41935ab73db381e585e8f6102f0991fc?pvs=204) is the approved MVP baseline. The older repository proposals are historical where they differ from it. Tickets L—5, L—6, L—8, L—11, and L—13 and the task-only soft-deletion change are merged. The L—12 task screen supports core task flows. The Pets tab supports profiles and weight history; L—17 vehicle profile and mileage work is under review. Hosted app and device flows still need verification before release.

## Start here

- [Product direction and MVP proposal](docs/PRODUCT.md)
- [Current state and architecture proposal](docs/ARCHITECTURE.md)
- [Proposed domain and recurrence specification](docs/DOMAIN_MODEL.md)
- [Accepted decisions and open choices](docs/DECISIONS.md)
- [Current priorities](docs/ROADMAP.md) and [task backlog](docs/BACKLOG.md)
- [Local verification and contribution workflow](docs/DEVELOPMENT.md)
- [Standing coding-agent instructions](AGENTS.md)

Run `npm ci`, configure a development Supabase project as described in `docs/DEVELOPMENT.md`, then `npm start` for the Expo development server.
