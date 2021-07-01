import { readdir, writeFile } from "fs/promises";
import extract from "extract-zip";
import path from 'path';
import mammoth from 'mammoth';

function getParameter(text, parameter) {
  const parameterStart = text.indexOf(parameter) + parameter.length;
  const parameterEnd = text.indexOf("<", parameterStart);
  const value = text.substring(parameterStart, parameterEnd).trim()
  if (value === "") throw "Incorrect Header";
  return value;
}

async function docsToHTML(source) {
  console.log("[Info] Converting " + source);
  const options = [
    "p[style-name='Title'] => h1:fresh"
  ];
  const result = await mammoth.convertToHtml({ path: source }, options);
  for (const msg of result.messages) {
    console.log("[Warning] " + msg.message);
  }
  // process html before writing to file
  var toWrite = result.value;
  let title, author, date;
  try {
    title = getParameter(toWrite, "Title:");
    author = getParameter(toWrite, "Author:");
    date = getParameter(toWrite, "Date:");
  } catch (e) {
    console.log("[Error] " + e);
    throw "Could not complete " + source + " due to: " + e;
  }
  const headerEndPosition = toWrite.indexOf("</p>", toWrite.indexOf("---")) + 4;
  toWrite = toWrite.slice(headerEndPosition);
  toWrite = `---\nlayout: base.njk\ntitle: ${title}\nauthor: ${author}\ndate: ${date}\n---\n` + toWrite;

  writeFile(source + ".html", toWrite, (err) => {
    if (err) {
      console.error("[Error]" + err);
      return;
    }
    console.log("[Info] Done converting " + source);
  });
}

async function makeCollection(location, name) {
  var toWrite = `{"layouts": "base.njk", "tags": "${name}"}`;
  writeFile(location, toWrite, (err) => {
    if (err) {
      console.error("[Error]" + err);
      return;
    }
    console.log("[Info] Done metadata " + source);
  });
}

async function convert() {
  try {
    const files = await readdir("./src/section", { withFileTypes: true });
    for (const file of files) {
      if (file.isDirectory()) {
        const pages = await readdir("./src/section/" + file.name);
        for (const page of pages) {
          if (page.endsWith(".docx")) {
            await docsToHTML("./src/section/" + file.name + "/" + page);
          }
        }
        makeCollection("./src/section/" + file.name + "/" + file.name + ".json", file.name);
      }
    }
  } catch (e) {
    console.error("[Error] " + e);
  }
}

async function extractZip(source) {
  console.log("[Info] Extracting " + source);
  try {
    await extract(source, { dir: path.resolve("./src/") });
    console.log("[Info] Extraction complete");
    // TODO: change file name to section instead of "Knightwatch"
    convert();
  } catch (err) {
    console.log("[Error] " + err);
  }
}

var toUnzip = "";
try {
  const files = await readdir(".");
  for (const file of files) {
    if (file.startsWith("Knightwatch") && file.endsWith(".zip")) {
      toUnzip = file;
    }
  }
  if (toUnzip === "") {
    console.log("[Error] Please place the google drive zip in this folder.")
  } else {
    extractZip("./" + toUnzip);
  }
} catch (err) {
  console.error(err);
}