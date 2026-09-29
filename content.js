function getText(element) {
  return element?.innerText?.trim() || "";
}

function getLink(element) {
  return element?.href || "";
}

function collectGoogleMapsLeads() {
  const leads = [];

  const links = Array.from(
    document.querySelectorAll('a[href*="/maps/place/"]')
  );

  const uniqueUrls = new Set();

  links.forEach((link) => {
    const mapsUrl = getLink(link);

    if (!mapsUrl || uniqueUrls.has(mapsUrl)) {
      return;
    }

    uniqueUrls.add(mapsUrl);

    const container =
      link.closest('[role="article"]') ||
      link.parentElement?.parentElement ||
      link.parentElement;

    const text = getText(container);

    const name =
      getText(link) ||
      text.split("\n")[0] ||
      "";

    if (!name) {
      return;
    }

    const websiteLink = Array.from(
      container?.querySelectorAll("a") || []
    ).find((a) => {
      const href = a.href || "";

      return (
        href &&
        !href.includes("google.com/maps") &&
        !href.startsWith("tel:")
      );
    });

    const website =
      websiteLink?.href || "";

    const emailMatch = text.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    );

    const email =
      emailMatch ? emailMatch[0] : "";

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const address =
      lines.find((line) =>
        /\b(UK|United Kingdom|England|Scotland|Wales|Northern Ireland)\b/i.test(
          line
        )
      ) || "";

    leads.push({
      name,
      email,
      website,
      address,
      mapsUrl
    });
  });

  return leads;
}

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    if (message.action === "collectLeads") {
      const leads = collectGoogleMapsLeads();

      sendResponse({
        success: true,
        leads
      });
    }

    return true;
  }
);
