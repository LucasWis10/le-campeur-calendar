export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60")

  if (req.method === "OPTIONS") return res.status(200).end()

  const calId = req.query.calId
  if (!calId) return res.status(400).json({ error: "Missing calId parameter" })

  const icalUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calId)}/public/basic.ics`

  try {
    const response = await fetch(icalUrl)
    if (!response.ok) return res.status(response.status).json({ error: `Google returned ${response.status}` })

    const text = await response.text()
    if (!text.includes("BEGIN:VCALENDAR")) return res.status(500).json({ error: "Invalid iCal format" })

    const events = []
    const blocs = text.split("BEGIN:VEVENT").slice(1)

    blocs.forEach((bloc) => {
      // Gère les deux formats : DATE (20250610) et DATETIME (20250610T143000Z)
      const dm = bloc.match(/DTSTART[^:]*:(\d{4})(\d{2})(\d{2})/)
      const fm = bloc.match(/DTEND[^:]*:(\d{4})(\d{2})(\d{2})/)
      const isAllDay = bloc.match(/DTSTART;VALUE=DATE:/)
      const summary = bloc.match(/SUMMARY:(.+)/)

      if (dm) {
        const start = `${dm[1]}-${dm[2]}-${dm[3]}`

        let end
        if (fm) {
          end = `${fm[1]}-${fm[2]}-${fm[3]}`
          // Pour les événements all-day, iCal met DTEND = jour suivant → on recule d'un jour
          if (isAllDay) {
            const d = new Date(`${end}T00:00:00`)
            d.setDate(d.getDate() - 1)
            end = d.toISOString().slice(0, 10)
          }
        } else {
          // Pas de DTEND → événement sur une seule journée
          end = start
        }

        events.push({
          start,
          end,
          title: summary ? summary[1].trim() : "",
        })
      }
    })

    // Expansion en jours individuels bloqués
    const blockedDaysSet = new Set()

    events.forEach(({ start, end }) => {
      const d = new Date(`${start}T00:00:00`)
      const last = new Date(`${end}T00:00:00`)

      // Inclut start ET end
      while (d <= last) {
        blockedDaysSet.add(d.toISOString().slice(0, 10))
        d.setDate(d.getDate() + 1)
      }
    })

    const blockedDays = Array.from(blockedDaysSet).sort()

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
