module.exports = function (eleventyConfig) {
  eleventyConfig.addShortcode("first_image", (post) => extractFirstImage(post));
  eleventyConfig.addShortcode("blurb", (post) => extractBlurb(post));

  eleventyConfig.addPassthroughCopy("./src/css/");
  eleventyConfig.addWatchTarget("./src/css/");

  return {
    dir: {
      input: "src",
      output: "dist",
    },
  };
};

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

  const pTagBegin = content.indexOf("<p>");
  const pTagEnd = content.indexOf("</p>");

  return content.substring(pTagBegin, pTagEnd).split(" ").slice(0, 100).join(" ") + " ...</p>";
}