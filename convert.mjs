import { readdir, writeFile, rename, rm, access } from "fs/promises";
import extract from "extract-zip";
import path from 'path';
import mammoth from 'mammoth';
import slugify from 'slugify';


// helper function that gets the header data from the .docx 
function getParameter(text, parameter) {
  const parameterStart = text.indexOf(parameter) + parameter.length;
  const parameterEnd = text.indexOf("<", parameterStart);
  const value = text.substring(parameterStart, parameterEnd).trim()
  if (value === "") throw "Incorrect Header";
  return value;
}

// conversion function
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

  writeFile(source.slice(0, -5) + ".html", toWrite, (err) => {
    if (err) {
      console.error("[Error]" + err);
      return;
    }
    console.log("[Info] Done converting " + source);
  });
}

// adds metadata to each generated HTML file
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

// converts all .docx files to .html and calls makeCollection()
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

// extracts zip file to ./src/section/ and calls convert
async function extractZip(source) {
  console.log("[Info] Extracting " + source);
  try {
    await extract(source, { dir: path.resolve("./src/") });
    console.log("[Info] Extraction complete");
    
    // rename Knightwatch to section
    var exists;
    try { 
      await access("./src/section");
      exists = true; 
    } 
    catch { 
      exists = false; 
    }
    if (exists) await rm("./src/section", { recursive: true });
    await rename("./src/Knightwatch/", "./src/section/");

    // slugify all filenames
    const files = await readdir("./src/section", { withFileTypes: true });
    for (const file of files) {
      if (file.isDirectory()) {
        const slug = slugify(file.name, { lower: true });
        await rename("./src/section/" + file.name, "./src/section/" + slug);

        const subFiles = await readdir("./src/section/" + slug, { withFileTypes: true });
        for (const subFile of subFiles) {
          const base = "./src/section/" + slug + "/";
          rename(
            base + subFile.name,
            base + slugify(subFile.name, { lower: true })
          );
        }
      }
    }

    console.log("[Info] Renamed the content directory.");
    convert();
  } catch (e) {
    console.log("[Error] " + e);
  }
}

// gets the path to the zip file and calls extractZip()
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