import { readFile, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const inputDir = resolve(root, "input");
const dataDir = resolve(root, "data");

const SCHEDULE_FILE = resolve(inputDir, "jadwal.txt");
const PREDICTION_FILE = resolve(inputDir, "prediksi.txt");

const SCHEDULE_OUTPUT = resolve(dataDir, "schedule.json");
const PREDICTION_OUTPUT = resolve(dataDir, "predictions.json");
const TEAMS_OUTPUT = resolve(dataDir, "teams.json");

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

function makeId(date, time, home, away) {
  return `${date}-${normalize(home)}-${normalize(away)}`
    .replace(/\s+/g, "-");
}

function parseDate(day, month) {
  const now = new Date();

  const year = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric"
  }).format(now);

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseMatches(text, mode = "schedule") {
  const lines = text
    .replace(/\r/g, "")
    .split("\n");

  const matches = [];

  let competition = "";

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) continue;

    /*
      Format:

      22/08 02:00 Arsenal VS Coventry City 0:1
    */

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
      value
    ] = match;

    const date = parseDate(day, month);

    const homeTeam = home.trim();
    const awayTeam = away.trim();

    const item = {
      id: makeId(
        date,
        time,
        homeTeam,
        awayTeam
      ),
      competition:
        competition || "FOOTBALL",
      date,
      time,
      status: "UPCOMING",
      homeTeam,
      awayTeam,
      homeCrest: "",
      awayCrest: "",
      venue: "TBA",
      handicap: mode === "schedule"
        ? value.trim()
        : "",
      prediction: "",
      predictionHome: null,
      predictionAway: null,
      featured: false,
      sortOrder: matches.length + 1,
      matchDetailUrl: "",
      liveStreamingUrl: "",
      source: "MarioBola daily TXT"
    };

    if (mode === "prediction") {
      const score = value.match(
        /^(\d+)\s*[:\-]\s*(\d+)$/
      );

      if (score) {
        item.prediction =
          `${score[1]}:${score[2]}`;

        item.predictionHome =
          Number(score[1]);

        item.predictionAway =
          Number(score[2]);
      }
    }

    matches.push(item);
  }

  return matches;
}

function mergePredictions(
  schedule,
  predictions
) {
  const predictionMap = new Map();

  for (const prediction of predictions) {
    predictionMap.set(
      prediction.id,
      prediction
    );
  }

  let matched = 0;

  for (const match of schedule) {
    const prediction =
      predictionMap.get(match.id);

    if (!prediction) continue;

    match.prediction =
      prediction.prediction;

    match.predictionHome =
      prediction.predictionHome;

    match.predictionAway =
      prediction.predictionAway;

    matched++;
  }

  return matched;
}

function buildTeamRegistry(matches) {
  const map = new Map();

  for (const match of matches) {
    for (const name of [
      match.homeTeam,
      match.awayTeam
    ]) {
      const key = normalize(name);

      if (!map.has(key)) {
        map.set(key, {
          name,
          normalized: key,
          logoUrl: "",
          country: "",
          confidence: 0,
          matchType: "PENDING"
        });
      }
    }
  }

  return [...map.values()];
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function build() {
  console.log("");
  console.log("======================================");
  console.log(" MARIOBOLA TXT DATA ENGINE");
  console.log("======================================");

  if (!(await fileExists(SCHEDULE_FILE))) {
    throw new Error(
      `File tidak ditemukan: ${SCHEDULE_FILE}`
    );
  }

  const scheduleText =
    await readFile(
      SCHEDULE_FILE,
      "utf8"
    );

  const predictionText =
    await fileExists(PREDICTION_FILE)
      ? await readFile(
          PREDICTION_FILE,
          "utf8"
        )
      : "";

  const matches =
    parseMatches(
      scheduleText,
      "schedule"
    );

  const predictions =
    predictionText
      ? parseMatches(
          predictionText,
          "prediction"
        )
      : [];

  if (!matches.length) {
    throw new Error(
      "Tidak ada pertandingan yang berhasil dibaca dari jadwal.txt."
    );
  }

  const matched =
    mergePredictions(
      matches,
      predictions
    );

  const teams =
    buildTeamRegistry(matches);

  const updatedAt =
    new Date().toISOString();

  const scheduleData = {
    updatedAt,
    source: "MarioBola daily TXT",
    inputFiles: [
      "input/jadwal.txt",
      "input/prediksi.txt"
    ],
    matches
  };

  const predictionData = {
    updatedAt,
    source: "MarioBola daily TXT",
    predictions
  };

  const teamsData = {
    updatedAt,
    total: teams.length,
    resolved: 0,
    pending: teams.length,
    teams
  };

  await writeFile(
    SCHEDULE_OUTPUT,
    JSON.stringify(
      scheduleData,
      null,
      2
    ) + "\n"
  );

  await writeFile(
    PREDICTION_OUTPUT,
    JSON.stringify(
      predictionData,
      null,
      2
    ) + "\n"
  );

  await writeFile(
    TEAMS_OUTPUT,
    JSON.stringify(
      teamsData,
      null,
      2
    ) + "\n"
  );

  console.log(
    `Jadwal        : ${matches.length}`
  );

  console.log(
    `Prediksi      : ${predictions.length}`
  );

  console.log(
    `Prediksi cocok: ${matched}`
  );

  console.log(
    `Team registry : ${teams.length}`
  );

  console.log("======================================");
  console.log("");
}

async function validate() {
  const schedule =
    JSON.parse(
      await readFile(
        SCHEDULE_OUTPUT,
        "utf8"
      )
    );

  if (
    !schedule ||
    !Array.isArray(schedule.matches)
  ) {
    throw new Error(
      "schedule.json tidak memiliki matches array."
    );
  }

  if (!schedule.matches.length) {
    throw new Error(
      "schedule.json tidak memiliki pertandingan."
    );
  }

  for (
    const [index, match]
    of schedule.matches.entries()
  ) {
    if (!match.id) {
      throw new Error(
        `Match ${index + 1}: ID kosong.`
      );
    }

    if (
      !match.homeTeam ||
      !match.awayTeam
    ) {
      throw new Error(
        `Match ${index + 1}: nama tim kosong.`
      );
    }

    if (!match.date) {
      throw new Error(
        `Match ${index + 1}: tanggal kosong.`
      );
    }

    if (!match.time) {
      throw new Error(
        `Match ${index + 1}: jam kosong.`
      );
    }
  }

  console.log(
    `Validasi OK: ${schedule.matches.length} pertandingan.`
  );
}

try {
  if (
    process.argv.includes(
      "--validate"
    )
  ) {
    await validate();
  } else {
    await build();
  }
} catch (error) {
  console.error("");
  console.error(
    "❌ MARIOBOLA ERROR"
  );
  console.error(error.message);
  console.error("");
  process.exit(1);
}
