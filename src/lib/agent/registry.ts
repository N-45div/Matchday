// One list of the desk's tools with the words a model sees, used by both the in-app agent and the MCP server.

import type { z } from "zod";
import { evidenceInput, findClubs, findClubsInput, getEvidence, nearbyPartners, partnersInput, planInput, planNextSeason, sponsorBoard, sponsorBoardInput } from "./tools";

export interface DeskTool<S extends z.ZodObject = z.ZodObject> {
  title: string;
  description: string;
  input: S;
  run: (input: z.infer<S>) => Promise<unknown>;
}

const define = <S extends z.ZodObject>(t: DeskTool<S>) => t as unknown as DeskTool;

export const DESK_TOOLS: Record<string, DeskTool> = {
  find_clubs: define({
    title: "Find a club",
    description:
      "Finds MLB and affiliated minor league baseball clubs (Triple-A to Single-A) by name, nickname or city, and returns each club's id. " +
      "Use it first: every other tool needs a club id.",
    input: findClubsInput,
    run: findClubs,
  }),
  sponsor_board: define({
    title: "Sponsor prospects",
    description:
      "Returns a club's sponsor prospects as two lists: local businesses a language model named for the club's market, and consumer brands " +
      "ranked with Qloo taste data for the club's city and fans, each with its evidence (its rank in the city, among the club's fans, and how " +
      "much stronger it is here than in a typical club city). Brands both lists contain are marked. Alcohol, gambling, tobacco, cannabis, " +
      "crypto and firearms brands are left off. Use for questions about who to pitch, presenting sponsors, or which brands fit a promotion night.",
    input: sponsorBoardInput,
    run: sponsorBoard,
  }),
  nearby_partners: define({
    title: "Food partners near the ballpark",
    description:
      "Lists restaurants, cafes and bakeries within 3 km of a club's ballpark (no bars, pubs or breweries), ranked by Qloo for the club's fans, with kind, distance, price level, " +
      "rating, phone, website and the weekdays they stay open through a night game (17:30-22:00). Use for co-promotions, ticket-stub deals " +
      "or a ballpark food night.",
    input: partnersInput,
    run: nearbyPartners,
  }),
  plan_season: define({
    title: "Plan next season's promotions",
    description:
      "Places a club's 2027 promotion nights (fireworks, bobblehead, other giveaway, theme) on its real 2027 home dates where measured " +
      "attendance lift adds the most fans, and compares that with the same nights on the weekdays the club used in 2026. Night counts default " +
      "to the club's own 2026 numbers; pass new counts or months to skip to re-plan. Returns the dated nights and estimated added fans.",
    input: planInput,
    run: planNextSeason,
  }),
  get_evidence: define({
    title: "How the desk was tested",
    description:
      "Returns the measured attendance lift of each promotion type (MLB and minor league, with 95% intervals), the results of the " +
      "pre-registered sponsor test against real presenting sponsors, and the desk's stated limits. Use when asked how sure the numbers are.",
    input: evidenceInput,
    run: getEvidence,
  }),
};
