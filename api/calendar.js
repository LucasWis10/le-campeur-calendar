export default async function handler(req, res) {
    // CORS headers — allow any origin
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60")

    if (req.method === "OPTIONS") {
        return res.status(200).end()
    }

    const calId = req.query.calId
    if (!calId) {
        return res.status(400).json({ error: "Missing calId parameter" })
    }

    const icalUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calId)}/public/basic.ics`

    try {
        const response = await fetch(icalUrl)
        if (!response.ok) {
            return res.status(response.status).json({ error: `Google returned ${response.status}` })
        }

        const text = await response.text()

        if (!text.includes("BEGIN:VCALENDAR")) {
            return res.status(500).json({ error: "Invalid iCal format" })
        }

        // Parse iCal and return structured JSON
        const events = []
        const blocs = text.split("BEGIN:VEVENT").slice(1)

        blocs.forEach((bloc) => {
        const dm = bloc.match(
            /DTSTART[^:]*:(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/
        )
        
        const fm = bloc.match(
            /DTEND[^:]*:(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/
        )
            const summary = bloc.match(/SUMMARY:(.+)/)

            if (dm && fm) {
                events.push({
                    start: `${dm[1]}-${dm[2]}-${dm[3]}`,
                    end: `${fm[1]}-${fm[2]}-${fm[3]}`,
                    title: summary ? summary[1].trim() : "",
                })
            }
        })

        // Expand to individual blocked days
        const blockedDays = []
        events.forEach(({ start, end }) => {
        const startDate = new Date(start)
        const endDate = new Date(end)
        
        const d = new Date(startDate)
        
        // Si l'événement se termine après minuit,
        // on bloque également le jour de fin.
        const f = new Date(endDate)
        
        if (
            endDate.getHours() > 0 ||
            endDate.getMinutes() > 0 ||
            endDate.getSeconds() > 0
        ) {
            f.setDate(f.getDate() + 1)
        }
        
        while (d < f) {
                const y = d.getFullYear()
                const m = String(d.getMonth() + 1).padStart(2, "0")
                const day = String(d.getDate()).padStart(2, "0")
                blockedDays.push(`${y}-${m}-${day}`)
                d.setDate(d.getDate() + 1)
            }
        })

        return res.status(200).json({
            ok: true,
            events,
            blockedDays,
            count: events.length,
        })
    } catch (err) {
        return res.status(500).json({ error: err.message || "Fetch failed" })
    }
}
