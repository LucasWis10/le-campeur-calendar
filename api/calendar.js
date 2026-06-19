export default async function handler(req, res) {
// CORS
res.setHeader("Access-Control-Allow-Origin", "*")
res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
res.setHeader("Access-Control-Allow-Headers", "Content-Type")
res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60")

```
if (req.method === "OPTIONS") {
    return res.status(200).end()
}

const calId = req.query.calId

if (!calId) {
    return res.status(400).json({
        error: "Missing calId parameter",
    })
}

const icalUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(
    calId
)}/public/basic.ics`

try {
    const response = await fetch(icalUrl)

    if (!response.ok) {
        return res.status(response.status).json({
            error: `Google returned ${response.status}`,
        })
    }

    const text = await response.text()

    if (!text.includes("BEGIN:VCALENDAR")) {
        return res.status(500).json({
            error: "Invalid iCal format",
        })
    }

    const blockedDays = []
    const blocs = text.split("BEGIN:VEVENT").slice(1)

    blocs.forEach((bloc) => {
        const dm = bloc.match(
            /DTSTART[^:]*:(\d{4})(\d{2})(\d{2})/
        )

        const fm = bloc.match(
            /DTEND[^:]*:(\d{4})(\d{2})(\d{2})/
        )

        if (!dm || !fm) return

        const start = new Date(
            Number(dm[1]),
            Number(dm[2]) - 1,
            Number(dm[3])
        )

        const end = new Date(
            Number(fm[1]),
            Number(fm[2]) - 1,
            Number(fm[3])
        )

        while (start <= end) {
            const y = start.getFullYear()
            const m = String(start.getMonth() + 1).padStart(2, "0")
            const d = String(start.getDate()).padStart(2, "0")

            blockedDays.push(`${y}-${m}-${d}`)

            start.setDate(start.getDate() + 1)
        }
    })

    return res.status(200).json({
        ok: true,
        blockedDays: [...new Set(blockedDays)].sort(),
        count: [...new Set(blockedDays)].length,
    })
} catch (err) {
    return res.status(500).json({
        error: err.message || "Fetch failed",
    })
}
```

}
