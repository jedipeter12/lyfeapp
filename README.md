# Lyfe

Lyfe is an early-stage life maintenance project for remembering, scheduling, and recording recurring responsibilities. It is intended to reduce the mental work of life administration rather than track habits.

## Status

The repository contains an Expo Router app for iOS and Android, plus product and engineering documentation. The [frozen Architecture v1.0](https://app.notion.com/p/41935ab73db381e585e8f6102f0991fc?pvs=204) is the approved MVP baseline. The older repository proposals are historical where they differ from it. Tasks, pets, vehicles, attachments, and the dashboard are implemented on merged branches. The L—13 recurrence migration is applied to the Lyfe development Supabase project; its hosted schema, transactional SQL, and authenticated Data API checks passed. L—21 still needs app and native device verification. L—14 reminders remain on a separate draft PR.

## Start here

- [Product direction and MVP proposal](docs/PRODUCT.md)
- [Current state and architecture proposal](docs/ARCHITECTURE.md)
- [Proposed domain and recurrence specification](docs/DOMAIN_MODEL.md)
- [Accepted decisions and open choices](docs/DECISIONS.md)
- [Current priorities](docs/ROADMAP.md) and [task backlog](docs/BACKLOG.md)
- [Local verification and contribution workflow](docs/DEVELOPMENT.md)
- [Standing coding-agent instructions](AGENTS.md)

Run `npm ci`, configure a development Supabase project as described in `docs/DEVELOPMENT.md`, then `npm start` for the Expo development server.
