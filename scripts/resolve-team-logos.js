import {
  readFile,
  writeFile
} from "node:fs/promises";

import {
  resolve
} from "node:path";

const root = resolve(import.meta.dirname, "..");

const scheduleFile = resolve(
  root,
  "data",
  "schedule.json"
);

const teamsFile = resolve(
  root,
  "data",
  "teams.json"
);

const logoDatabaseFile = resolve(
  root,
  "data",
  "football-teams.json"
);

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value) {
  return normalize(value)
    .replace(/\s+/g, "-");
}

function tokens(value) {
  return normalize(value)
    .split(" ")
    .filter(Boolean);
}

/*
  Nama yang sering berbeda antara sumber TXT dan database logo.
*/

const ALIASES = {
  "bayern munich": "bayern munchen",
  "bayern munchen": "bayern munchen",

  "man utd": "manchester united",
  "man united": "manchester united",

  "man city": "manchester city",

  "psg": "paris saint germain",

  "inter milan": "inter",
  "internazionale": "inter",

  "ac milan": "milan",

  "atletico madrid": "atletico madrid",

  "sporting lisbon": "sporting cp",

  "deportivo la coruna": "deportivo la coruna",

  "real sociedad": "real sociedad",

  "bk hacken": "hacken",

  "hacken": "hacken",

  "halmstads": "halmstad",

  "halmstads bk": "halmstad"
};

function aliasName(name) {
  const n = normalize(name);

  return ALIASES[n] || n;
}

function suffixClean(name) {
  return normalize(name)
    .replace(
      /\b(fc|cf|afc|sc|bk|if|fk|sk|ac|as|ud|cd|sv|us|ca|club)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function tokenScore(a, b) {
  const aa = new Set(tokens(a));
  const bb = new Set(tokens(b));

  if (!aa.size || !bb.size) {
    return 0;
  }

  let common = 0;

  for (const token of aa) {
    if (bb.has(token)) {
      common++;
    }
  }

  const union = new Set([
    ...aa,
    ...bb
  ]).size;

  return common / union;
}

function scoreTeam(inputName, candidateName) {
  const input = aliasName(inputName);
  const candidate = aliasName(candidateName);

  if (input === candidate) {
    return 1;
  }

  if (slug(input) === slug(candidate)) {
    return 0.98;
  }

  const cleanInput = suffixClean(input);
  const cleanCandidate = suffixClean(candidate);

  if (
    cleanInput &&
    cleanInput === cleanCandidate
  ) {
    return 0.96;
  }

  const token = tokenScore(
    cleanInput,
    cleanCandidate
  );

  if (token >= 0.80) return 0.91;
  if (token >= 0.66) return 0.82;
  if (token >= 0.50) return 0.70;

  return 0;
}

function competitionCountry(competition) {
  const c = normalize(competition);

  const rules = [
    [/england|english|championship|league one|league two/, "England"],
    [/spain|la liga|segunda/, "Spain"],
    [/france|ligue/, "France"],
    [/germany|bundesliga|dfb/, "Germany"],
    [/italy|serie a|serie b|coppa italia|italy cup/, "Italy"],
    [/netherlands|eredivisie/, "Netherlands"],
    [/belgium|belgian/, "Belgium"],
    [/turkey|turkiye/, "Turkey"],
    [/scotland/, "Scotland"],
    [/portugal/, "Portugal"],
    [/austria/, "Austria"],
    [/switzerland|swiss/, "Switzerland"],
    [/denmark/, "Denmark"],
    [/poland/, "Poland"],
    [/czech/, "Czech Republic"],
    [/croatia/, "Croatia"],
    [/romania/, "Romania"],
    [/russia/, "Russia"],
    [/sweden/, "Sweden"],
    [/norway/, "Norway"],
    [/finland/, "Finland"],
    [/greece/, "Greece"],
    [/israel/, "Israel"],
    [/ukraine/, "Ukraine"],
    [/argentina/, "Argentina"],
    [/mexico/, "Mexico"],
    [/chile/, "Chile"],
    [/paraguay/, "Paraguay"],
    [/uruguay/, "Uruguay"],
    [/costa rica/, "Costa Rica"],
    [/japan|j1/, "Japan"],
    [/brazil|brasileirao/, "Brazil"],
    [/usa|mls/, "Usa"]
  ];

  return (
    rules.find(([pattern]) =>
      pattern.test(c)
    )?.[1] || ""
  );
}

function findBestTeam(
  inputName,
  competition,
  database
) {
  const country =
    competitionCountry(competition);

  const candidates = database.filter(team => {
    if (!country) return true;

    return normalize(team.country) ===
      normalize(country);
  });

  const pool =
    candidates.length >= 2
      ? candidates
      : database;

  let best = null;

  for (const candidate of pool) {
    const score = scoreTeam(
      inputName,
      candidate.name
    );

    if (
      !best ||
      score > best.score
    ) {
      best = {
        candidate,
        score
      };
    }
  }

  /*
    Jangan mengambil logo secara sembrono.
    Minimal confidence 0.82.
  */

  if (!best || best.score < 0.82) {
    return {
      name: inputName,
      logoUrl: "",
      country: "",
      confidence: best
        ? best.score
        : 0,
      matchType: "PENDING"
    };
  }

  let matchType = "FUZZY";

  if (best.score >= 0.98) {
    matchType = "EXACT";
  } else if (best.score >= 0.90) {
    matchType = "ALIAS";
  }

  return {
    name: inputName,
    matchedName: best.candidate.name,
    logoUrl: best.candidate.logoUrl || "",
    country: best.candidate.country || "",
    confidence: Number(
      best.score.toFixed(2)
    ),
    matchType
  };
}

async function main() {
  const schedule = JSON.parse(
    await readFile(scheduleFile, "utf8")
  );

  const teamsData = JSON.parse(
    await readFile(teamsFile, "utf8")
  );

  const database = JSON.parse(
    await readFile(
      logoDatabaseFile,
      "utf8"
    )
  );

  if (!Array.isArray(database)) {
    throw new Error(
      "football-teams.json bukan array."
    );
  }

  const registry = new Map();

  for (const match of schedule.matches) {
    for (const side of [
      "homeTeam",
      "awayTeam"
    ]) {
      const teamName = match[side];

      const key = normalize(teamName);

      if (!registry.has(key)) {
        registry.set(
          key,
          findBestTeam(
            teamName,
            match.competition,
            database
          )
        );
      }
    }
  }

  let resolved = 0;
  let pending = 0;

  for (const match of schedule.matches) {
    const home =
      registry.get(
        normalize(match.homeTeam)
      );

    const away =
      registry.get(
        normalize(match.awayTeam)
      );

    match.homeCrest =
      home?.logoUrl || "";

    match.awayCrest =
      away?.logoUrl || "";

    if (home?.logoUrl) resolved++;
    if (away?.logoUrl) resolved++;
  }

  for (const team of registry.values()) {
    if (team.logoUrl) {
      // dihitung di bawah
    } else {
      pending++;
    }
  }

  const teams = [...registry.values()]
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );

  await writeFile(
    scheduleFile,
    `${JSON.stringify(
      schedule,
      null,
      2
    )}\n`
  );

  await writeFile(
    teamsFile,
    `${JSON.stringify({
      updatedAt:
        new Date().toISOString(),
      total: teams.length,
      resolved: teams.filter(
        x => x.logoUrl
      ).length,
      pending: teams.filter(
        x => !x.logoUrl
      ).length,
      teams
    }, null, 2)}\n`
  );

  console.log("");
  console.log(
    "======================================"
  );
  console.log(
    " MARIOBOLA LOGO ENGINE"
  );
  console.log(
    "======================================"
  );
  console.log(
    `Database logo : ${database.length}`
  );
  console.log(
    `Team MarioBola: ${teams.length}`
  );
  console.log(
    `Logo resolved : ${teams.filter(x => x.logoUrl).length}`
  );
  console.log(
    `Pending       : ${teams.filter(x => !x.logoUrl).length}`
  );
  console.log(
    "======================================"
  );
  console.log("");
}

main().catch(error => {
  console.error(
    "❌ Logo resolver gagal:"
  );
  console.error(error.message);
  process.exit(1);
});
