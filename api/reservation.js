export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")

    if (req.method === "OPTIONS") return res.status(200).end()
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" })

    const RESEND_KEY = process.env.RESEND_API_KEY
    if (!RESEND_KEY) return res.status(500).json({ error: "RESEND_API_KEY not configured" })

    const d = req.body
    if (!d || !d.nom || !d.email || !d.dateDebut || !d.dateFin) {
        return res.status(400).json({ error: "Missing required fields" })
    }

    const fromEmail = d.fromEmail || "reservation@le-campeur.fr"
    const adminEmail = d.adminEmail
    if (!adminEmail) return res.status(400).json({ error: "Missing adminEmail" })

    const nbJours = d.nbJours || 0
    const pluriel = nbJours > 1 ? "s" : ""

    // ===== EMAIL ADMIN =====
    const adminHtml = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
    <h2 style="color:#1a1a1a;border-bottom:2px solid #E85D3C;padding-bottom:10px">🚐 Nouvelle demande de réservation</h2>
    
    <h3 style="color:#E85D3C;margin-top:20px">👤 Client</h3>
    <table style="width:100%;border-collapse:collapse;margin:10px 0">
        <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold;width:40%">Nom</td><td style="padding:8px 12px">${d.nom}</td></tr>
        <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold">Email</td><td style="padding:8px 12px"><a href="mailto:${d.email}">${d.email}</a></td></tr>
        <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold">Téléphone</td><td style="padding:8px 12px"><a href="tel:${(d.telephone || "").replace(/\\s/g, "")}">${d.telephone}</a></td></tr>
        <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold">Adresse</td><td style="padding:8px 12px">${d.adresse}</td></tr>
        <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold">Date permis B</td><td style="padding:8px 12px">${d.datePermis}</td></tr>
    </table>

    <h3 style="color:#E85D3C;margin-top:24px">📅 Séjour</h3>
    <table style="width:100%;border-collapse:collapse;margin:10px 0">
        <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold;width:40%">Départ</td><td style="padding:8px 12px">${d.dateDebut}</td></tr>
        <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold">Retour</td><td style="padding:8px 12px">${d.dateFin}</td></tr>
        <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold">Durée</td><td style="padding:8px 12px">${nbJours} jour${pluriel}</td></tr>
        <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold">Voyageurs</td><td style="padding:8px 12px">${d.voyageurs}</td></tr>
        <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold">Km prévus</td><td style="padding:8px 12px">${d.kmPrevus} (${d.kmInclus} inclus)</td></tr>
        <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold">Km supplémentaires</td><td style="padding:8px 12px">${d.kmSupp}</td></tr>
        <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold">Options</td><td style="padding:8px 12px">${d.options || "Aucune"}</td></tr>
    </table>

    <h3 style="color:#E85D3C;margin-top:24px">💰 Tarif estimé</h3>
    <table style="width:100%;border-collapse:collapse;margin:10px 0">
        <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold;width:40%">Location (${nbJours}j × ${d.sousTotal / nbJours}€)</td><td style="padding:8px 12px">${d.sousTotal}€</td></tr>
        <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold">Km supplémentaires</td><td style="padding:8px 12px">${d.coutKm}€</td></tr>
        <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold">Options</td><td style="padding:8px 12px">${d.coutOptions}€</td></tr>
        <tr style="font-size:18px"><td style="padding:12px;background:#E85D3C;color:white;font-weight:bold">TOTAL ESTIMÉ</td><td style="padding:12px;background:#E85D3C;color:white;font-weight:bold">${d.total}€</td></tr>
        <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold">Caution</td><td style="padding:8px 12px">${d.caution}€</td></tr>
    </table>

    ${d.message ? `<h3 style="color:#E85D3C;margin-top:24px">💬 Message</h3><p style="background:#f9f9f9;padding:12px;border-radius:8px;line-height:1.6">${d.message}</p>` : ""}

    <div style="margin-top:30px">
        <a href="tel:${(d.telephone || "").replace(/\\s/g, "")}" style="display:inline-block;padding:14px 24px;background:#E85D3C;color:white;text-decoration:none;border-radius:8px;font-weight:bold">📞 Appeler ${d.nom.split(" ")[0]}</a>
        <a href="mailto:${d.email}" style="display:inline-block;padding:14px 24px;background:#333;color:white;text-decoration:none;border-radius:8px;font-weight:bold;margin-left:10px">📧 Répondre par email</a>
    </div>
</div>`

    // ===== EMAIL CLIENT =====
    const clientHtml = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
    <h2 style="color:#1a1a1a">Merci ${d.nom.split(" ")[0]} !</h2>
    <p style="font-size:15px;line-height:1.6;color:#333">Votre demande de réservation a bien été reçue. Voici le récapitulatif :</p>

    <div style="background:#f9f9f9;border-radius:12px;padding:20px;margin:20px 0">
        <p style="margin:6px 0"><strong>📅 Dates :</strong> du ${d.dateDebut} au ${d.dateFin} (${nbJours} jour${pluriel})</p>
        <p style="margin:6px 0"><strong>👥 Voyageurs :</strong> ${d.voyageurs}</p>
        <p style="margin:6px 0"><strong>🚐 Km estimés :</strong> ${d.kmPrevus} (${d.kmInclus} inclus)</p>
        ${d.options && d.options !== "Aucune" ? `<p style="margin:6px 0"><strong>✅ Options :</strong> ${d.options}</p>` : ""}
        <p style="margin:12px 0 6px;font-size:18px"><strong>💰 Total estimé : ${d.total}€</strong></p>
        <p style="margin:6px 0;font-size:13px;opacity:0.7">Caution de ${d.caution}€ au départ (restituée au retour)</p>
    </div>

    <div style="background:#FFF3E0;border-left:4px solid #E85D3C;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
        <p style="margin:0;font-weight:bold;color:#E85D3C">⚠ Ceci n'est pas une réservation ferme.</p>
        <p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:#333">Votre demande va être étudiée et nous vous recontacterons dans les plus brefs délais pour :</p>
        <ul style="font-size:14px;color:#333;line-height:1.8;margin:8px 0 0;padding-left:20px">
            <li>Vérifier la disponibilité du véhicule</li>
            <li>Vous demander vos documents (carte d'identité + permis)</li>
            <li>Confirmer et finaliser la réservation</li>
        </ul>
    </div>

    <p style="font-size:14px;line-height:1.6;color:#666">En attendant, n'hésitez pas à nous écrire si vous avez des questions.</p>
    <p style="font-size:14px;color:#333;margin-top:24px">À très bientôt sur la route !<br><strong>Le Campeur</strong> — Louez, Roulez, Profitez !</p>
</div>`

    try {
        const adminRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
            body: JSON.stringify({
                from: fromEmail,
                to: adminEmail,
                reply_to: d.email,
                subject: `🚐 Nouvelle demande — ${d.nom} — ${d.dateDebut} au ${d.dateFin}`,
                html: adminHtml,
            }),
        })

        if (!adminRes.ok) {
            const err = await adminRes.json()
            return res.status(500).json({ error: "Admin email failed", details: err })
        }

        const clientRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
            body: JSON.stringify({
                from: fromEmail,
                to: d.email,
                reply_to: adminEmail,
                subject: `Votre demande de réservation — Le Campeur`,
                html: clientHtml,
            }),
        })

        if (!clientRes.ok) {
            const err = await clientRes.json()
            return res.status(500).json({ error: "Client email failed", details: err })
        }

        return res.status(200).json({ ok: true, message: "Both emails sent" })
    } catch (err) {
        return res.status(500).json({ error: err.message || "Send failed" })
    }
}
