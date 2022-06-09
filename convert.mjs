import { readdir, writeFile, rename, rm, access } from "fs/promises";
import extract from "extract-zip";
import path from "path";
import mammoth from "mammoth";
import sharp from "sharp";
import slugify from "slugify";
import unusedFilename from "unused-filename";

// helper function that gets the header data from the .docx
function getParameter(text, parameter) {
    const parameterStart = text.indexOf(parameter) + parameter.length;
    const parameterEnd = text.indexOf("<", parameterStart);
    const value = text.substring(parameterStart, parameterEnd).trim();
    if (value === "") throw "Incorrect Header";
    if (parameter !== "Date:") {
        return '"' + value + '"';
    } else {
        return value;
    }
}

// why does JS not have this
function allIndexOf(str, toSearch) {
    var indices = [];
    for (
        var pos = str.indexOf(toSearch);
        pos !== -1;
        pos = str.indexOf(toSearch, pos + 1)
    ) {
        indices.push(pos);
    }
    return indices;
}

// conversion function
async function docsToHTML(source, docName) {
    console.log("[Info] Converting " + source);
    const options = {
        ignoreEmptyParagraphs: false,
        styleMap: ["p[style-name='Title'] => h1:fresh", "u => u"],
        convertImage: mammoth.images.imgElement(async function (element) {
            const imageBuffer = await element.read();
            const directory = source.substring(0, source.lastIndexOf("/"));
            const imageLocation = await unusedFilename(
                directory + "/" + docName.replace(".docx", ".jpeg")
            );

            const compressedImage = await sharp(imageBuffer)
                .jpeg({
                    quality: 60,
                    compressionLevel: 9,
                    adaptiveFiltering: true,
                    force: true,
                })
                .toBuffer();

            try {
                await writeFile(imageLocation, compressedImage);
            } catch {
                throw "Image could not be processed";
            }

            const imageSrc = imageLocation
                .replace("./src/", "/")
                .replace("src/", "/");
            console.log(imageSrc);
            return { src: imageSrc, class: "content-image" };
        }),
    };
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

        title = title.replace("&amp;", "&");
        author = author.replace("&amp;", "&");
    } catch (e) {
        console.log("[Error] " + e);
        throw "Could not complete " + source + " due to: " + e;
    }
    const headerEndPosition =
        toWrite.indexOf("</p>", toWrite.indexOf("---")) + 4;
    toWrite = toWrite.slice(headerEndPosition);
    toWrite =
        `---\nlayout: article.njk\ntitle: ${title}\nauthor: ${author}\ndate: ${date}\n---\n` +
        toWrite;

    let count = 0;
    while (true) {
        count++;
        const driveLinks = `<a href="https://drive.google.com/open?id=`;
        const position = toWrite.indexOf(driveLinks);
        if (position === -1 || count > 10) {
            break;
        }
        const id = toWrite.substr(position + driveLinks.length, 33);
        console.log("ID", id);
        const endPos = toWrite.indexOf("</a>", position);
        const firstHalf = toWrite.substring(0, position);
        const secondHalf = toWrite.substring(endPos + 4);
        toWrite = `${firstHalf}<iframe src="https://drive.google.com/file/d/${id}/preview" width="640" height="480" allow="autoplay"></iframe>${secondHalf}`;
    }
    toWrite = toWrite.replaceAll("<p></p>", "<br>");

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
                        await docsToHTML(
                            "./src/section/" + file.name + "/" + page,
                            page
                        );
                    }
                }
                makeCollection(
                    "./src/section/" + file.name + "/" + file.name + ".json",
                    file.name
                );
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
        } catch {
            exists = false;
        }
        if (exists) await rm("./src/section", { recursive: true });
        await rename("./src/Knightwatch Content/", "./src/section/");

        // slugify all filenames
        const files = await readdir("./src/section", { withFileTypes: true });
        for (const file of files) {
            if (file.isDirectory()) {
                const slug = slugify(file.name, { lower: true });
                await rename(
                    "./src/section/" + file.name,
                    "./src/section/" + slug
                );

                const subFiles = await readdir("./src/section/" + slug, {
                    withFileTypes: true,
                });
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
async function init() {
    var toUnzip = "";
    try {
        const files = await readdir(".");
        for (const file of files) {
            if (file.startsWith("Knightwatch") && file.endsWith(".zip")) {
                toUnzip = file;
            }
        }
        if (toUnzip === "") {
            console.log(
                "[Error] Please place the google drive zip in this folder."
            );
        } else {
            extractZip("./" + toUnzip);
        }
    } catch (err) {
        console.error(err);
    }
}
init();
