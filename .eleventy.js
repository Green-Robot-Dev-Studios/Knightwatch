module.exports = function (eleventyConfig) {
  eleventyConfig.addShortcode("first_image", (post) => extractFirstImage(post));
  eleventyConfig.addShortcode("blurb", (post) => extractBlurb(post));

  eleventyConfig.addNunjucksFilter("deslug", (text) => deSlug(text));
  eleventyConfig.addNunjucksFilter("limit", (arr, max) => limit(arr, max));

  eleventyConfig.addPassthroughCopy("./src/css/");
  eleventyConfig.addWatchTarget("./src/css/");

  eleventyConfig.addPassthroughCopy("./src/assets/");
  eleventyConfig.addWatchTarget("./src/assets/");

  eleventyConfig.addPassthroughCopy("./src/icons/");
  eleventyConfig.addWatchTarget("./src/icons/");

  eleventyConfig.addPassthroughCopy("./src/*.js");
  eleventyConfig.addWatchTarget("./src/*.js");

  eleventyConfig.addPassthroughCopy("./src/section/**/*.png");
  eleventyConfig.addWatchTarget("./src/section/**/*.png");

  eleventyConfig.setUseGitIgnore(false);

  return {
    pathPrefix: "/Knightwatch/",
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

function extractFirstImage(doc) {
  if (!doc.hasOwnProperty("templateContent")) {
    console.warn(
      "[Warning] Failed to extract image: Document has no property `templateContent`."
    );
    return;
  }

  const content = doc.templateContent;

  if (content.includes("<img")) {
    const imgTagBegin = content.indexOf("<img");
    const imgTagEnd = content.indexOf(">", imgTagBegin);

    return content.substring(imgTagBegin, imgTagEnd + 1);
  }

  return "";
}

function extractBlurb(doc) {
  if (!doc.hasOwnProperty("templateContent")) {
    console.warn(
      "[Warning] Failed to extract image: Document has no property `templateContent`."
    );
    return;
  }

  const content = doc.templateContent;

  const pTagBegin = content.indexOf("<p>")+3;
  const pTagEnd = content.indexOf("</p>");

  return content.substring(pTagBegin, pTagEnd).split(" ").slice(0, 100).join(" ");
}