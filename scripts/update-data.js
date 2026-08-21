import {
  readFile,
  writeFile,
  mkdir
} from "node:fs/promises";

import {
  resolve,
  basename
} from "node:path";

const root = resolve(import.meta.dirname, "..");

const inputDir = resolve(root, "input");
const dataDir = resolve(root, "data");

const scheduleInput = resolve(inputDir, "jadwal-harian.txt");
const predictionInput = resolve(inputDir, "prediksi-harian.txt");

const scheduleOutput = resolve(dataDir, "schedule.json");
const predictionOutput = resolve(dataDir, "predictions.json");
const teamsOutput = resolve(dataDir, "teams.json");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeTeamName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeId(date, time, home, away) {
  return [
    date,
    time,
    normalizeTeamName(home),
    normalizeTeamName(away)
  ]
    .join("|")
    .replace(/\s+/g, "-");
}

function currentJakartaYear() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric"
  }).format(new Date());
}

function parseTxtDate(day, month) {
  const year = currentJakartaYear();

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/*
  FORMAT YANG DIBACA:

  SPAIN LA LIGA
  18/08 02:00 Deportivo La Coruna VS Elche 0:1/4

  ENGLISH CHAMPIONSHIP
  18/08 02:00 Cardiff City VS Wrexham 1/4:0
*/

function parseSchedule(text) {
  const lines = text
    .replace(/\r/g, "")
    .split("\n");

  const matches = [];
  let competition = "";

  for (let rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const match = line.match(
      /^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}:\d{2})\s+(.+?)\s+VS\s+(.+?)\s+(\S+)$/i
    );

    if (!match) {
      competition = line;
      continue;
    }

    const [
      ,
      day,
      month,
      time,
      home,
      away,
      handicap
    ] = match;

    const date = parseTxtDate(day, month);

    const cleanHome = home.trim();
    const cleanAway = away.trim();

    matches.push({
      id: makeId(date, time, cleanHome, cleanAway),
      date,
      time,
      competition: competition || "FOOTBALL",
      homeTeam: cleanHome,
      awayTeam: cleanAway,
      handicap: handicap.trim(),
      prediction: "",
      homeScore: null,
      awayScore: null,
      homeCrest: "",
      awayCrest: "",
      liveStreamingUrl: "",
      matchDetailUrl: "",
      featured: false,
      status: "UPCOMING",
      source: "TXT MARIOBOLA"
    });
  }

  return matches;
}

/*
  FORMAT PREDIKSI:

  ENGLISH PREMIER LEAGUE
  22/08 02:00 Arsenal VS Coventry City 3:0

  Jadi angka terakhir = prediction.
*/

function parsePredictions(text) {
  const lines = text
    .replace(/\r/g, "")
    .split("\n");

  const predictions = [];
  let competition = "";

  for (let rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const match = line.match(
      /^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}:\d{2})\s+(.+?)\s+VS\s+(.+?)\s+(\d+)\s*[:\-]\s*(\d+)$/i
    );

    if (!match) {
      competition = line;
      continue;
    }

    const [
      ,
      day,
      month,
      time,
      home,
      away,
      homeScore,
      awayScore
    ] = match;

    const date = parseTxtDate(day, month);

    const cleanHome = home.trim();
    const cleanAway = away.trim();

    predictions.push({
      id: makeId(date, time, cleanHome, cleanAway),
      date,
      time,
      competition: competition || "FOOTBALL",
      homeTeam: cleanHome,
      awayTeam: cleanAway,
      prediction: `${homeScore}:${awayScore}`,
      homeScore: Number(homeScore),
      awayScore: Number(awayScore)
    });
  }

  return predictions;
}

function mergePredictions(matches, predictions) {
  const predictionMap = new Map(
    predictions.map(item => [item.id, item])
  );

  let matched = 0;

  for (const match of matches) {
    const prediction = predictionMap.get(match.id);

    if (!prediction) {
      continue;
    }

    match.prediction = prediction.prediction;

    /*
      Jangan langsung memasukkan prediction sebagai hasil pertandingan.
      Prediction hanyalah prediksi.
    */

    matched++;
  }

  return matched;
}

function buildTeams(matches) {
  const map = new Map();

  for (const match of matches) {
    for (const team of [
      match.homeTeam,
      match.awayTeam
    ]) {
      const key = normalizeTeamName(team);

      if (!map.has(key)) {
        map.set(key, {
          name: team,
          normalized: key,
          logoUrl: "",
          country: "",
          confidence: 0,
          matchType: "PENDING"
        });
      }
    }
  }

  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

function validateSchedule(data) {
  assert(
    data && Array.isArray(data.matches),
    "schedule.json: matches harus berupa array"
  );

  assert(
    data.matches.length > 0,
    "schedule.json: tidak ada pertandingan"
  );

  for (const [index, match] of data.matches.entries()) {
    assert(
      match.id,
      `matches[${index}]: id wajib diisi`
    );

    assert(
      match.date,
      `matches[${index}]: date wajib diisi`
    );

    assert(
      match.time,
      `matches[${index}]: time wajib diisi`
    );

    assert(
      match.homeTeam && match.awayTeam,
      `matches[${index}]: nama tim wajib diisi`
    );

    assert(
      match.competition,
      `matches[${index}]: competition wajib diisi`
    );

    assert(
      typeof match.handicap === "string",
      `matches[${index}]: handicap harus string`
    );

    assert(
      typeof match.prediction === "string",
      `matches[${index}]: prediction harus string`
    );
  }
}

async function main() {
  await mkdir(dataDir, { recursive: true });

  const scheduleText = await readFile(
    scheduleInput,
    "utf8"
  );

  const predictionText = await readFile(
    predictionInput,
    "utf8"
  ).catch(() => "");

  const matches = parseSchedule(scheduleText);
  const predictions = predictionText
    ? parsePredictions(predictionText)
    : [];

  assert(
    matches.length > 0,
    `${basename(scheduleInput)} tidak menghasilkan pertandingan. Periksa format TXT.`
  );

  const matched = mergePredictions(
    matches,
    predictions
  );

  const teams = buildTeams(matches);

  const updatedAt = new Date().toISOString();

  const scheduleData = {
    updatedAt,
    source: "TXT MARIOBOLA",
    timezone: "Asia/Jakarta",
    totalMatches: matches.length,
    totalPredictions: predictions.length,
    matchedPredictions: matched,
    matches
  };

  const predictionData = {
    updatedAt,
    source: "TXT MARIOBOLA",
    timezone: "Asia/Jakarta",
    total: predictions.length,
    predictions
  };

  await writeFile(
    scheduleOutput,
    `${JSON.stringify(scheduleData, null, 2)}\n`
  );

  await writeFile(
    predictionOutput,
    `${JSON.stringify(predictionData, null, 2)}\n`
  );

  await writeFile(
    teamsOutput,
    `${JSON.stringify({
      updatedAt,
      total: teams.length,
      teams
    }, null, 2)}\n`
  );

  console.log("");
  console.log("======================================");
  console.log(" MARIOBOLA DATA ENGINE");
  console.log("======================================");
  console.log(`Jadwal          : ${matches.length}`);
  console.log(`Prediksi        : ${predictions.length}`);
  console.log(`Prediksi cocok  : ${matched}`);
  console.log(`Team Registry   : ${teams.length}`);
  console.log("======================================");
  console.log("");
}

async function validateOnly() {
  const schedule = JSON.parse(
    await readFile(scheduleOutput, "utf8")
  );

  validateSchedule(schedule);

  console.log(
    `Validasi OK: ${schedule.matches.length} pertandingan.`
  );
}

try {
  if (process.argv.includes("--validate")) {
    await validateOnly();
  } else {
    await main();
  }
} catch (error) {
  console.error("");
  console.error("❌ MARIOBOLA UPDATE ERROR");
  console.error(error.message);
  console.error("");
  process.exit(1);
}
