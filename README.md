# Matchday

A planning agent for minor-league baseball promotions staff. Pick a club and it drafts a season of theme nights, giveaways, pre-game music, concession specials and local partners, based on what that club's city actually likes rather than what every city does.

In 2026, 96 of the 120 affiliated Minor League Baseball clubs ran a Star Wars night. Matchday uses [Qloo](https://qloo.com)'s taste graph to show where a city's taste departs from that national default, and why.

**Status:** in development for the Qloo Agentic Hackathon (Sep 30 – Oct 30, 2026).

## Run locally

```bash
npm install
cp .env.example .env.local   # add your Qloo hackathon key
npm run dev
```

## License

MIT, see [LICENSE](LICENSE).
