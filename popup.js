const collectBtn = document.getElementById("collectBtn");
const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");

const totalLeads = document.getElementById("totalLeads");
const newLeads = document.getElementById("newLeads");
const status = document.getElementById("status");

function updateStats() {
  chrome.storage.local.get(["leads"], (result) => {
    const leads = result.leads || [];

    totalLeads.textContent = leads.length;
    newLeads.textContent = "0";
  });
}

collectBtn.addEventListener("click", async () => {
  status.textContent = "Collecting leads from Google Maps...";

  try {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    const tab = tabs[0];

    if (!tab || !tab.url || !tab.url.includes("google.com/maps")) {
      status.textContent =
        "Please open Google Maps first.";
      return;
    }

    const response = await chrome.tabs.sendMessage(
      tab.id,
      {
        action: "collectLeads"
      }
    );

    if (!response) {
      status.textContent =
        "No response from Google Maps.";
      return;
    }

    const foundLeads = response.leads || [];

    chrome.storage.local.get(["leads"], (result) => {
      const oldLeads = result.leads || [];

      const existingKeys = new Set(
        oldLeads.map((lead) =>
          (lead.email || lead.website || lead.name)
            .toLowerCase()
            .trim()
        )
      );

      const uniqueNewLeads = foundLeads.filter((lead) => {
        const key =
          (lead.email ||
            lead.website ||
            lead.name)
            .toLowerCase()
            .trim();

        if (!key || existingKeys.has(key)) {
          return false;
        }

        existingKeys.add(key);
        return true;
      });

      const allLeads = [
        ...oldLeads,
        ...uniqueNewLeads
      ];

      chrome.storage.local.set(
        { leads: allLeads },
        () => {
          totalLeads.textContent = allLeads.length;
          newLeads.textContent =
            uniqueNewLeads.length;

          status.textContent =
            `${uniqueNewLeads.length} new lead(s) saved.`;
        }
      );
    });
  } catch (error) {
    console.error(error);

    status.textContent =
      "Could not collect leads. Refresh Google Maps and try again.";
  }
});

exportBtn.addEventListener("click", () => {
  chrome.storage.local.get(["leads"], (result) => {
    const leads = result.leads || [];

    if (leads.length === 0) {
      status.textContent =
        "There are no leads to export.";
      return;
    }

    const headers = [
      "Restaurant Name",
      "Email",
      "Website",
      "Address",
      "Google Maps URL"
    ];

    const rows = leads.map((lead) => [
      lead.name || "",
      lead.email || "",
      lead.website || "",
      lead.address || "",
      lead.mapsUrl || ""
    ]);

    const csv = [
      headers,
      ...rows
    ]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(
      [csv],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: url,
      filename: "sclom-leads.csv",
      saveAs: true
    });

    status.textContent =
      "CSV export started.";
  });
});

clearBtn.addEventListener("click", () => {
  const confirmed = confirm(
    "Are you sure you want to delete all saved leads?"
  );

  if (!confirmed) {
    return;
  }

  chrome.storage.local.set(
    { leads: [] },
    () => {
      updateStats();

      status.textContent =
        "All leads have been deleted.";
    }
  );
});

updateStats();
