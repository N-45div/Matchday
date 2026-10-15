import { LEAGUE_ORDER, listClubs } from "@/lib/data/clubs";
import { ClubPicker } from "./club-picker";

export default async function Home() {
  const clubs = await listClubs();
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Plan next season&apos;s promotions and sponsors</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Pick a club. You get a 2027 promotion calendar placed where measured lift adds the most fans, a sponsor board that pairs the
        local businesses an assistant can name with the brands your city and fans actually like, and food and drink partners near the ballpark.
      </p>
      <div className="mt-6">
        <ClubPicker clubs={clubs} leagues={LEAGUE_ORDER} />
      </div>
    </div>
  );
}
