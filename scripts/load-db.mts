// Loads clubs, cached Qloo data (data/cache/clubs) and next season's home dates (data/raw) into Postgres.
// Safe to re-run: every row is an upsert. Run: npx --yes tsx scripts/load-db.mts [season]
import { existsSync, readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const sql = neon(env.DATABASE_URL);
const season = process.argv[2] ?? "2027";

for (const statement of readFileSync("db/schema.sql", "utf8").split(";").map((s) => s.replace(/--.*$/gm, "").trim()).filter(Boolean)) {
  await sql.query(statement);
}

interface Team { id: string; name: string; league: string; city: string; region: string | null; market: string; venue: string | null; lat: number | null; lng: number | null }
const teams: Team[] = JSON.parse(readFileSync("data/teams/baseball.json", "utf8")).teams;
let cached = 0;
for (const t of teams) {
  const file = `data/cache/clubs/${t.id}.json`;
  const c = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
  await sql`insert into clubs (id, name, league, city, region, market, venue, lat, lng, team_entity_id)
    values (${t.id}, ${t.name}, ${t.league}, ${t.city}, ${t.region}, ${t.market}, ${t.venue}, ${t.lat}, ${t.lng}, ${c?.teamEntityId ?? null})
    on conflict (id) do update set name = excluded.name, league = excluded.league, city = excluded.city, region = excluded.region,
      market = excluded.market, venue = excluded.venue, lat = excluded.lat, lng = excluded.lng, team_entity_id = excluded.team_entity_id`;
  if (c) {
    await sql`insert into club_qloo (club_id, fetched_at, city_brands, fan_brands, partners)
      values (${t.id}, ${c.fetchedAt}, ${JSON.stringify(c.city)}, ${JSON.stringify(c.teamCity)}, ${JSON.stringify(c.partners)})
      on conflict (club_id) do update set fetched_at = excluded.fetched_at, city_brands = excluded.city_brands,
        fan_brands = excluded.fan_brands, partners = excluded.partners`;
    cached++;
  }
}

const scheduleFile = `data/raw/schedule-${season}.json`;
let dates = 0;
if (existsSync(scheduleFile)) {
  const byClub = new Map<string, { date: string; dayNight: string | null }[]>();
  for (const g of JSON.parse(readFileSync(scheduleFile, "utf8"))) {
    const id = `mlb-${g.homeId}`;
    if (!byClub.has(id)) byClub.set(id, []);
    byClub.get(id)!.push({ date: g.date, dayNight: g.dayNight });
  }
  for (const [clubId, list] of byClub) {
    await sql`delete from home_dates where club_id = ${clubId} and extract(year from date) = ${Number(season)}`;
    const unique = [...new Map(list.map((d) => [d.date, d])).values()];
    await sql`insert into home_dates (club_id, date, day_night)
      select ${clubId}, d, n from unnest(${unique.map((d) => d.date)}::date[], ${unique.map((d) => d.dayNight)}::text[]) as t(d, n)`;
    dates += unique.length;
  }
}
console.log(`clubs ${teams.length}, cached Qloo data ${cached}, ${season} home dates ${dates}`);
