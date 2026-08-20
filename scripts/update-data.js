import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dataFiles = ["schedule.json", "news.json"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function validateSchedule(data) {
  assert(data && Array.isArray(data.matches), "schedule.json: matches harus berupa array");
  for (const [index, match] of data.matches.entries()) {
    assert(match.id, `schedule.json matches[${index}]: id wajib diisi`);
    assert(match.date, `schedule.json matches[${index}]: date wajib diisi`);
    assert(match.homeTeam && match.awayTeam, `schedule.json matches[${index}]: nama tim wajib diisi`);
    assert(match.homeCrest && match.awayCrest, `schedule.json matches[${index}]: URL logo homeCrest dan awayCrest wajib diisi`);
  }
}

async function validateNews(data) {
  assert(data && Array.isArray(data.articles), "news.json: articles harus berupa array");
  for (const [index, article] of data.articles.entries()) {
    assert(article.id, `news.json articles[${index}]: id wajib diisi`);
    assert(article.title, `news.json articles[${index}]: title wajib diisi`);
    assert(article.publishedAt, `news.json articles[${index}]: publishedAt wajib diisi`);
  }
}

async function readData(fileName) {
  const filePath = resolve(root, "data", fileName);
  const data = JSON.parse(await readFile(filePath, "utf8"));
  return { filePath, data };
}

const validateOnly = process.argv.includes("--validate");

try {
  const schedule = await readData(dataFiles[0]);
  const news = await readData(dataFiles[1]);
  await validateSchedule(schedule.data);
  await validateNews(news.data);

  if (!validateOnly) {
    const updatedAt = new Date().toISOString();
    schedule.data.updatedAt = updatedAt;
    news.data.updatedAt = updatedAt;
    await writeFile(schedule.filePath, `${JSON.stringify(schedule.data, null, 2)}\n`);
    await writeFile(news.filePath, `${JSON.stringify(news.data, null, 2)}\n`);
  }

  console.log(validateOnly ? "Data valid." : `Data updated: ${new Date().toLocaleString("id-ID")}`);
} catch (error) {
  console.error(`Update gagal: ${error.message}`);
  process.exitCode = 1;
}
