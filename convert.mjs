import {
    readdir,
    writeFile,
    readFile,
    stat,
    rename,
    rm,
    access,
    mkdir
} from "fs/promises";
import {
    move,
    remove
} from "fs-extra";
import extract from "extract-zip";
import path from "path";
import mammoth from "mammoth";
import sharp from "sharp";
import slugify from "slugify";
import unusedFilename from "unused-filename";

// ====================================================
// Here lies the name of the google drive folder
// I should be able to figure this our programatically, but that's too much work,
// So it's a const
let ARCHIVE_NAME = "Knightwatch Content 2022-2023";
// let ARCHIVE_NAME = "Knightwatch Content";
// ====================================================


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
        var pos = str.indexOf(toSearch); pos !== -1; pos = str.indexOf(toSearch, pos + 1)
    ) {
        indices.push(pos);
    }
    return indices;
}

// conversion function
async function docsToHTML(source, docName, cache) {
    console.log("[Info] Converting " + source);
    cache = {
        ...cache
    };

    // Check cache to see if we have to re-generate it
    const stats = await stat(source);
    if (source.replace("src_new", "src") in cache) {
        // We have a cache entry
        // Check against cahe data
        const entry = cache[source.replace("src_new", "src")];
        if (stats.size == entry.size) {
            console.log("[Info] Re-using " + source);

            let failed = false;

            // Move in the old file
            try {
                await rename(source.replace("src_new", "src").replace("docx", "html"), source.replace("docx", "html"));
            } catch (e) {
                console.log("[Warning] Finn is lazy");
                console.log("[Info] Cache invalid, rebuilding");
                failed = true;

                // Remove it from cache
                cache[source.replace("src_new", "src")] = undefined;
            }

            if (!failed) {
                // Move in companion files
                for (let im of entry.images) {
                    await rename(im, im.replace("src", "src_new"));
                }

                return cache;
            }
        }
    }


    console.log("[Info] Generating " + source);

    let entry = {
        size: stats.size,
        mtime: stats.mtime,
        images: []
    };

    const options = {
        ignoreEmptyParagraphs: false,
        styleMap: ["p[style-name='Title'] => h1:fresh", "u => u"],
        convertImage: mammoth.images.imgElement(async function(element) {
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
                .replace("./src_new/", "/")
                .replace("src_new/", "/");
            console.log("[Info] Processed image " + imageLocation);

            // Add the image file to the cache
            entry = {
                ...entry,
                images: entry.images.concat([imageLocation.replace("src_new", "src")])
            };

            return {
                src: imageSrc,
                class: "content-image"
            };
        }),
    };

    const result = await mammoth.convertToHtml({
        path: source
    }, options);

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

        // Allow for things that should really be allowed
        // Like 2022-9-23
        let real_date = new Date(date);
        date = real_date.toISOString().slice(0, 10);

        title = title.replace("&amp;", "&") // .replace("\"", "\\\"");
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

    // Add entry to cache
    cache[source.replace("src_new", "src")] = entry;

    return cache;
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

async function loadCache() {
    let data;
    try {
        data = await readFile('./.cache.json');
    } catch (e) {
        return {
            "": {}
        };
    }

    return JSON.parse(data);
}

async function saveCache(cache) {
    await writeFile("./.cache.json", JSON.stringify(cache));
}

async function better_readdir(dir) {
    const files = await readdir(dir, {
        withFileTypes: true
    });

    return files.map((v) => {
        return {
            name: v.name,
            dir: v.isDirectory(),
            fullname: dir + "/" + v.name
        }
    });
}

// converts all .docx files to .html and calls makeCollection()
async function convert() {
    // Load cache
    let cache = await loadCache();

    try {
        const files = await readdir("./src_new/section", {
            withFileTypes: true
        });
        for (const file of files) {
            if (file.isDirectory()) {
                // Flatten contents of directory
                let queue = [];
                queue = queue.concat(await better_readdir("./src_new/section/" + file.name));
                while (queue.length > 0) {
                    const page = queue.pop();
                    if (page.name.endsWith(".docx")) {
                        cache = await docsToHTML(
                            page.fullname,
                            page.name,
                            cache
                        );
                    } else if (page.dir) {
                        queue = (await better_readdir(page.fullname)).concat(queue);
                    }
                }
                makeCollection(
                    "./src_new/section/" + file.name + "/" + file.name + ".json",
                    file.name,
                );
            }
        }
    } catch (e) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("[Error] " + e);
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    }

    await saveCache(cache);

    console.log("[Info] Cleaning up");

    await remove("./src/section");
    await move("./src_new/section", "./src/section");
    await remove("./src_new");
}

// extracts zip file to ./src_new/section/ and calls convert
async function extractZip(source, archiveZip) {
    console.log("[Info] Extracting " + source);
    try {
        await extract(source, {
            dir: path.resolve("./src_new/")
        });

        if (archiveZip !== "") {
            // Extract the archive as well 
            // Since it has probably been built before, it should be identical
            // And cached versions will be used
            console.log("[Info] Extracting " + archiveZip);
            await mkdir("./src_new/archive");
            await extract(archiveZip, {
                dir: path.resolve("./src_new/archive/archive")
            });

        }

        console.log("[Info] Extraction complete");

        // rename Knightwatch to section
        var exists;
        try {
            await access("./src_new/section");
            exists = true;
        } catch {
            exists = false;
        }
        if (exists) await rm("./src_new/section", {
            recursive: true
        });

        await rename(`./src_new/${ARCHIVE_NAME}/`, "./src_new/section/");
        await move(`./src_new/archive/`, "./src_new/section/archive/");

        // slugify all filenames
        const files = await readdir("./src_new/section", {
            withFileTypes: true
        });
        for (const file of files) {
            if (file.isDirectory()) {
                const slug = slugify(file.name, {
                    lower: true
                });

                if (file.name !== "archive") {
                    await rename(
                        "./src_new/section/" + file.name,
                        "./src_new/section/" + slug
                    );
                }

                const subFiles = await readdir("./src_new/section/" + slug, {
                    withFileTypes: true,
                });
                for (const subFile of subFiles) {
                    const base = "./src_new/section/" + slug + "/";
                    rename(
                        base + subFile.name,
                        base + slugify(subFile.name, {
                            lower: true
                        })
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
    var archiveZip = "";
    try {
        const files = await readdir(".");
        for (const file of files) {
            if (file.startsWith(ARCHIVE_NAME) && file.endsWith(".zip")) {
                toUnzip = file;
            }
            if (file.startsWith("Archive") && file.endsWith(".zip")) {
                archiveZip = file;
            }
        }
        if (toUnzip === "") {
            console.log(
                "[Error] Please place the google drive zip in this folder."
            );
        } else {
            extractZip("./" + toUnzip, archiveZip);
        }
    } catch (err) {
        console.error(err);
    }
}
init();
