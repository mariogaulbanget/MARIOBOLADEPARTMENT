import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dataDir = resolve(root, "data");

const EXPECTED_LEAGUES = 12;

async function json(name) {
  return JSON.parse(
    await readFile(
      resolve(dataDir, name),
      "utf8"
    )
  );
}

function fail(message) {
  throw new Error(message);
}

async function main() {

  const s =
    await json("schedule.json");

  if (
    !Array.isArray(s.matches) ||
    !s.matches.length
  ) {
    fail(
      "schedule.json tidak memiliki matches"
    );
  }

  for (
    const [i, m]
    of s.matches.entries()
  ) {

    if (
      !m.date ||
      !m.time ||
      !m.homeTeam ||
      !m.awayTeam ||
      !m.competition
    ) {

      fail(
        `schedule.matches[${i}] tidak lengkap`
      );
    }
  }


  const p =
    await json("predictions.json");

  if (
    !Array.isArray(
      p.predictions
    )
  ) {

    fail(
      "predictions.json tidak memiliki predictions"
    );
  }


  const t =
    await json("teams.json");

  if (
    !Array.isArray(
      t.teams
    )
  ) {

    fail(
      "teams.json tidak memiliki teams"
    );
  }


  const st =
    await json("standings.json");

  if (
    !Array.isArray(
      st.leagues
    ) ||
    st.leagues.length !==
      EXPECTED_LEAGUES
  ) {

    fail(
      `standings.json harus memiliki ${EXPECTED_LEAGUES} liga; saat ini ${
        st.leagues?.length || 0
      }`
    );
  }


  const usable =
    st.leagues.filter(
      x =>
        Array.isArray(x.teams) &&
        x.teams.length
    ).length;


  console.log(
    `OK schedule: ${s.matches.length} matches`
  );

  console.log(
    `OK predictions: ${p.predictions.length}`
  );

  console.log(
    `OK teams: ${t.teams.length}`
  );

  console.log(
    `OK standings: ${usable}/${EXPECTED_LEAGUES} liga memiliki tabel`
  );


  if (
    usable === 0
  ) {

    fail(
      "Tidak ada tabel standings yang tersedia"
    );
  }

  console.log(
    "VALIDATION BERHASIL"
  );
}


main().catch(
  error => {

    console.error(
      "❌ VALIDATION ERROR:",
      error.message
    );

    process.exit(1);
  }
);
