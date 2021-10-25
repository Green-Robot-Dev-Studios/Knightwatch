module.exports = function (eleventyConfig) {
  eleventyConfig.addShortcode("first_image", (post) => extractFirstImage(post));
  eleventyConfig.addShortcode("blurb", (post) => extractBlurb(post));

  eleventyConfig.addNunjucksFilter("deslug", (text) => deSlug(text));
  eleventyConfig.addNunjucksFilter("limit", (arr, max) => limit(arr, max));
  eleventyConfig.addNunjucksFilter("imagesOnly", (arr) => imagesOnly(arr));
  eleventyConfig.addNunjucksFilter("textOnly", (arr) => textOnly(arr));
  eleventyConfig.addNunjucksFilter("shuffle", (arr) => shuffle(arr));
  eleventyConfig.addNunjucksFilter("splitInto", (arr, part) => split(arr, part));

  eleventyConfig.addPassthroughCopy("./src/css/");
  eleventyConfig.addWatchTarget("./src/css/");

  eleventyConfig.addPassthroughCopy("./src/assets/");
  eleventyConfig.addWatchTarget("./src/assets/");

  eleventyConfig.addPassthroughCopy("./src/icons/");
  eleventyConfig.addWatchTarget("./src/icons/");

  eleventyConfig.addPassthroughCopy("./src/*.js");
  eleventyConfig.addWatchTarget("./src/*.js");

  eleventyConfig.addPassthroughCopy("./src/section/**/*.jpeg");
  eleventyConfig.addWatchTarget("./src/section/**/*.jpeg");

  eleventyConfig.setUseGitIgnore(false);

  return {
    dir: {
      input: "src",
      output: "dist",
    },
  };
};

function limit(arr, max) {
  return arr.slice(0, max);
}

function deSlug(text) {
  return text.replaceAll("-", " ");
}

function split(arr, part) {
  const part1 = arr.slice(0, Math.floor(arr.length/2))
  const part2 = arr.slice(Math.floor(arr.length/2))

  if (part === 0) {
    console.log("Part1")
    return part1;
  } else if (part === 1) {
    console.log("Part2")
    return part2;
  } else {
    return [];
  }
}

function shuffleArray(array, seed) {                // <-- ADDED ARGUMENT
  var m = array.length, t, i;

  // While there remain elements to shuffle…
  while (m) {

    // Pick a remaining element…
    i = Math.floor(random(seed) * m--);        // <-- MODIFIED LINE

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
    ++seed                                     // <-- ADDED LINE
  }

  return array;
}

function random(seed) {
  var x = Math.sin(seed++) * 10000; 
  return x - Math.floor(x);
}

function shuffle(arr) {
  console.log(arr[0]["data"]["page"])
  console.log(arr[0]["data"]["collections"])
  const seed = new Date().getDate();
  console.log("SEED", seed)
  arr = Array.from(arr);
  console.log(arr.toString())
  arr = shuffleArray(arr, seed+1);
  console.log(arr.toString())

  return arr;
}

function imagesOnly(arr) {
  arr = arr.filter((doc) => {
    if (!doc.hasOwnProperty("templateContent")) {
      console.warn(
        "[Warning] Failed to extract image: Document has no property `templateContent`."
      );
      return false;
    }
  
    const content = doc.templateContent;
  
    if (content.includes("<img")) {
      return true;
    }
  
    return false;
  });

  return arr;
}

function textOnly(arr) {
  arr = arr.filter((doc) => {
    if (!doc.hasOwnProperty("templateContent")) {
      console.warn(
        "[Warning] Failed to extract image: Document has no property `templateContent`."
      );
      return false;
    }
  
    const content = doc.templateContent;
  
    if (!content.includes("<img")) {
      return true;
    }
  
    return false;
  });

  return arr;
}

function extractFirstImage(doc) {
  if (doc && !doc.hasOwnProperty("templateContent")) {
    console.warn(
      "[Warning] Failed to extract image: Document has no property `templateContent`."
    );
    return;
  }

  const content = doc.templateContent;

  if (content.includes("<img")) {
    const imgTagBegin = content.indexOf("<img");
    const imgTagEnd = content.indexOf(">", imgTagBegin);
    console.log(content.substring(imgTagBegin, imgTagEnd + 1))
    return content.substring(imgTagBegin, imgTagEnd + 1);
  }

  return "";
}

function extractBlurb(doc) {
  if (doc && !doc.hasOwnProperty("templateContent")) {
    console.warn(
      "[Warning] Failed to extract image: Document has no property `templateContent`."
    );
    return;
  }

  const content = doc.templateContent;
  //console.log(doc)
  let position = 0;
  let blurbs = [];
  while (true) {
    // no more paragraphs
    if (content.indexOf("<p>", position) === -1) {
      // console.log(blurbs)
      return blurbs.join("<br>").split(" ").slice(0, 100).join(" ") + " ...";
    } 

    const pTagBegin = content.indexOf("<p>", position);
    const pTagEnd = content.indexOf("</p>", position);
    position = pTagEnd + 1;
    
    if (content.substring(pTagBegin + 3, pTagEnd).includes("<img")) continue;

    var regex = /(<([^>]+)>)/ig;

    blurbs.push(content.substring(pTagBegin + 3, pTagEnd).replace(regex, ""));
  }
}