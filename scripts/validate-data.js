import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");

function readJson(filename, required = true) {
  const file = path.join(DATA_DIR, filename);

  if (!fs.existsSync(file)) {
    if (required) {
      throw new Error(`File tidak ditemukan: data/${filename}`);
    }

    console.log(`INFO: data/${filename} tidak tersedia, dilewati.`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(
      `JSON rusak/tidak valid: data/${filename}\n${error.message}`
    );
  }
}

function isObject(value) {
  return value !== null && typeof value === "object";
}

function validateSchedule() {
  const data = readJson("schedule.json");

  if (!isObject(data)) {
    throw new Error("schedule.json bukan object JSON.");
  }

  if (!Array.isArray(data.matches)) {
    throw new Error("schedule.json tidak memiliki array 'matches'.");
  }

  console.log(
    `OK schedule.json — ${data.matches.length} pertandingan`
  );

  return true;
}

function validatePredictions() {
  const data = readJson("predictions.json", false);

  if (!data) {
    return true;
  }

  if (
    !Array.isArray(data) &&
    !Array.isArray(data.predictions) &&
    !Array.isArray(data.matches)
  ) {
    throw new Error(
      "predictions.json tidak memiliki struktur predictions/matches yang dikenali."
    );
  }

  const count =
    Array.isArray(data)
      ? data.length
      : Array.isArray(data.predictions)
        ? data.predictions.length
        : data.matches.length;

  console.log(
    `OK predictions.json — ${count} data prediksi`
  );

  return true;
}

function validateTeams() {
  const data = readJson("teams.json", false);

  if (!data) {
    return true;
  }

  console.log("OK teams.json");
  return true;
}

function validateStandings() {
  const data = readJson("standings.json");

  if (!isObject(data)) {
    throw new Error("standings.json bukan object JSON.");
  }

  if (!Array.isArray(data.leagues)) {
    throw new Error(
      "standings.json tidak memiliki array 'leagues'."
    );
  }

  if (data.leagues.length !== 10) {
    console.warn(
      `WARNING: ditemukan ${data.leagues.length} liga, target kita adalah 10 liga.`
    );
  }

  let successful = 0;
  let totalTeams = 0;

  for (const league of data.leagues) {
    if (!isObject(league)) {
      throw new Error("Ada entry liga yang tidak valid.");
    }

    if (!league.id || !league.name) {
      throw new Error(
        "Ada liga tanpa id atau name."
      );
    }

    if (league.status === "ok") {
      successful++;

      if (!Array.isArray(league.teams)) {
        throw new Error(
          `Liga ${league.name} berstatus OK tetapi tidak memiliki teams array.`
        );
      }

      totalTeams += league.teams.length;
    }
  }

  console.log(
    `OK standings.json — ${data.leagues.length} liga`
  );

  console.log(
    `Standings berhasil — ${successful}/${data.leagues.length} liga`
  );

  console.log(
    `Total team standings — ${totalTeams} team`
  );

  if (successful === 0) {
    throw new Error(
      "Tidak ada satu pun liga yang berhasil mengambil klasemen."
    );
  }

  return true;
}

function main() {
  console.log("");
  console.log("======================================");
  console.log(" MARIOBOLA DATA VALIDATION");
  console.log("======================================");
  console.log("");

  validateSchedule();
  validatePredictions();
  validateTeams();
  validateStandings();

  console.log("");
  console.log("======================================");
  console.log(" VALIDATION BERHASIL");
  console.log("======================================");
  console.log("");
}

try {
  main();
} catch (error) {
  console.error("");
  console.error("======================================");
  console.error(" VALIDATION ERROR");
  console.error("======================================");
  console.error("");
  console.error(error.message);
  console.error("");
  process.exit(1);
}
