const fs = require("fs");

const feeds = [

  {
    category: "Music Admissions",
    query:
      '("Juilliard" OR "Curtis Institute of Music" OR "Eastman School of Music" OR "New England Conservatory" OR "Manhattan School of Music" OR "Colburn School" OR "Yale School of Music" OR "University of Michigan School of Music" OR "Butler School of Music" OR "Jacobs School of Music" OR "Peabody Institute" OR "USC Thornton" OR "Frost School of Music" OR "Shepherd School of Music" OR "Mannes School of Music" OR "College-Conservatory of Music" OR "Carnegie Mellon School of Music" OR "Oberlin Conservatory" OR "Boston Conservatory" OR "San Francisco Conservatory of Music" OR "Yong Siew Toh Conservatory" OR "Mahidol College of Music") when:30d'
  },

  {
    category: "International / Visa",
    query:
      '("F-1 visa" OR "student visa" OR SEVP OR "I-20" OR "international students") ("United States" OR U.S.) when:14d'
  },

  {
    category: "English Proficiency",
    query:
      '(TOEFL OR IELTS OR "Duolingo English Test" OR "English proficiency") (admissions OR university OR international students) when:30d'
  },

  {
    category: "Graduate Admissions",
    query:
      '("graduate admissions" OR "international admissions") (university OR conservatory OR "higher education") when:14d'
  }

];

function decodeEntities(value) {
  return (value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}


function stripTags(value) {
  return decodeEntities(
    (value || "").replace(/<[^>]*>/g, "")
  );
}


function getTag(block, tag) {
  const pattern = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  );

  const match = block.match(pattern);

  return match
    ? stripTags(match[1])
    : "";
}


function parseFeed(xml, category) {
  const items = [];

  const itemPattern =
    /<item>([\s\S]*?)<\/item>/gi;

  let match;

  while (
    (match = itemPattern.exec(xml)) !== null
  ) {
    const block = match[1];

    const title =
      getTag(block, "title");

    const link =
      getTag(block, "link");

    const date =
      getTag(block, "pubDate");

    const source =
      getTag(block, "source");

    if (
      !title ||
      !link
    ) {
      continue;
    }

    items.push({
      category: category,
      title: title,
      source: source || "News",
      date: date,
      url: link
    });
  }

  return items;
}


async function getFeed(feed) {
  const params =
    new URLSearchParams({
      q: feed.query,
      hl: "en-US",
      gl: "US",
      ceid: "US:en"
    });

  const url =
    "https://news.google.com/rss/search?" +
    params.toString();

  console.log(
    `Fetching ${feed.category}...`
  );

  const response =
    await fetch(url, {
      headers: {
        "User-Agent":
          "TJS Admissions News Dashboard"
      }
    });

  if (!response.ok) {
    throw new Error(
      `${feed.category}: ${response.status}`
    );
  }

  const xml =
    await response.text();

  return parseFeed(
    xml,
    feed.category
  );
}


function removeDuplicates(items) {
  const seen = new Set();

  return items.filter(
    function (item) {
      const key =
        item.title
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}


function chooseStories(items) {
  const sorted =
    items
      .slice()
      .sort(
        function (a, b) {
          return (
            new Date(b.date).getTime() -
            new Date(a.date).getTime()
          );
        }
      );

  const selected = [];
  const usedCategories =
    new Set();


  /*
     First pass:
     try to give the dashboard
     different categories.
  */

  for (const item of sorted) {
    if (
      selected.length >= 3
    ) {
      break;
    }

    if (
      !usedCategories.has(
        item.category
      )
    ) {
      selected.push(item);

      usedCategories.add(
        item.category
      );
    }
  }


  /*
     Second pass:
     fill any remaining spaces
     with the newest stories.
  */

  for (const item of sorted) {
    if (
      selected.length >= 3
    ) {
      break;
    }

    const alreadySelected =
      selected.some(
        function (story) {
          return (
            story.title ===
            item.title
          );
        }
      );

    if (!alreadySelected) {
      selected.push(item);
    }
  }


  return selected;
}


function chinaDate() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).format(
    new Date()
  );
}


async function main() {
  const results =
    await Promise.allSettled(
      feeds.map(getFeed)
    );

  let allItems = [];

  for (const result of results) {
    if (
      result.status ===
      "fulfilled"
    ) {
      allItems =
        allItems.concat(
          result.value
        );
    }
    else {
      console.error(
        result.reason
      );
    }
  }


allItems =
  removeDuplicates(
    allItems
  )
  .filter(
    isRelevant
  );

  function isRelevant(item) {

  const text =
    (
      (item.title || "") +
      " " +
      (item.source || "")
    ).toLowerCase();


  if (item.category === "Music Admissions") {

    const musicTerms = [
      "juilliard",
      "curtis",
      "eastman",
      "new england conservatory",
      "manhattan school of music",
      "colburn",
      "yale school of music",
      "university of michigan",
      "butler school of music",
      "jacobs school of music",
      "peabody",
      "usc thornton",
      "frost school of music",
      "shepherd school of music",
      "mannes",
      "college-conservatory of music",
      "ccm",
      "carnegie mellon",
      "oberlin conservatory",
      "boston conservatory",
      "san francisco conservatory",
      "yong siew toh",
      "mahidol",
      "conservatory",
      "school of music",
      "music admissions",
      "music audition",
      "prescreening"
    ];

    return musicTerms.some(
      term => text.includes(term)
    );
  }


  if (item.category === "International / Visa") {

    const visaTerms = [
      "f-1",
      "student visa",
      "sevp",
      "i-20",
      "state department",
      "u.s. embassy",
      "us embassy",
      "consular",
      "international student",
      "student visas"
    ];

    const exclude = [
      "australia",
      "canada",
      "united kingdom",
      "uk visa",
      "australian"
    ];

    return (
      visaTerms.some(
        term => text.includes(term)
      ) &&
      !exclude.some(
        term => text.includes(term)
      )
    );
  }


  if (item.category === "English Proficiency") {

    return [
      "toefl",
      "ielts",
      "duolingo english test",
      "english proficiency"
    ].some(
      term => text.includes(term)
    );
  }


  if (item.category === "Graduate Admissions") {

    return [
      "graduate admissions",
      "graduate admission",
      "international admissions",
      "graduate application",
      "graduate applicants"
    ].some(
      term => text.includes(term)
    );
  }


  return false;
}

  const selected =
    chooseStories(
      allItems
    );


  /*
     Do not destroy a previously
     working news.json if every
     external feed temporarily fails.
  */

  if (
    selected.length === 0
  ) {
    throw new Error(
      "No news stories were returned. Existing news.json left unchanged."
    );
  }


  const output = {
    updated: chinaDate(),
    items: selected
  };


  fs.writeFileSync(
    "news.json",
    JSON.stringify(
      output,
      null,
      2
    ) + "\n",
    "utf8"
  );


  console.log(
    `Saved ${selected.length} stories to news.json`
  );

  console.log(
    JSON.stringify(
      output,
      null,
      2
    )
  );
}


main().catch(
  function (error) {
    console.error(error);

    process.exit(1);
  }
);
