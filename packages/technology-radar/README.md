# @ideia/technology-radar

> Technology Radar — scanning, scoring, and recommendation engine for emerging technologies.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/technology-radar
```

## Usage

```typescript
import { TechnologyRadar, createTechnologyRadar } from '@ideia/technology-radar';

const radar = createTechnologyRadar(/* deps */);
const recommendations = await radar.scan();
```

## API

- `TechnologyRadar` — scan, score, and recommend technologies
- `createTechnologyRadar()` — factory function
- Types exported from `./types`

## License

MIT
