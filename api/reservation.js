function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
}

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")

    if (req.method === "OPTIONS") {
        return res.status(200).end()
    }

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "POST only",
        })
    }

    const RESEND_KEY = process.env.RESEND_API_KEY

    if (!RESEND_KEY) {
        return res.status(500).json({
            error: "RESEND_API_KEY not configured",
        })
    }

    const d = req.body

    if (
        !d ||
        !d.nom ||
        !d.email ||
        !d.telephone ||
        !d.dateDebut ||
        !d.dateFin
    ) {
        return res.status(400).json({
            error: "Missing required fields",
        })
    }

    /*
     * Idéalement, configure ces deux variables dans Vercel :
     *
     * RESEND_FROM_EMAIL=Le Campeur <reservation@le-campeur.fr>
     * ADMIN_EMAIL=adresse-de-reception@le-campeur.fr
     */
    const fromEmail =
        process.env.RESEND_FROM_EMAIL ||
        "Le Campeur <reservation@le-campeur.fr>"

    const adminEmail = process.env.ADMIN_EMAIL || d.adminEmail

    if (!adminEmail) {
        return res.status(400).json({
            error: "Missing adminEmail",
        })
    }

    const nbJours = Number(d.nbJours) || 0
    const pluriel = nbJours > 1 ? "s" : ""

    const nom = escapeHtml(d.nom)
    const prenom = escapeHtml(
        String(d.nom)
            .trim()
            .split(/\s+/)[0] || "Bonjour"
    )

    const email = escapeHtml(d.email)
    const telephone = escapeHtml(d.telephone)
    const telephoneLien = String(d.telephone || "").replace(/\s/g, "")

    const adresse = escapeHtml(d.adresse || "Non renseignée")
    const codePostal = escapeHtml(d.codePostal || "")
    const ville = escapeHtml(d.ville || "")
    const adresseComplete =
        [adresse, codePostal, ville].filter(Boolean).join(", ") ||
        "Non renseignée"

    const destination = escapeHtml(d.destination || "Non renseignée")
    const datePermis = escapeHtml(d.datePermis || "Non renseignée")
    const numeroPermis = escapeHtml(d.numeroPermis || "Non renseigné")

    const dateDebut = escapeHtml(d.dateDebut)
    const dateFin = escapeHtml(d.dateFin)
    const voyageurs = escapeHtml(d.voyageurs || "Non renseigné")
    const kmPrevus = escapeHtml(d.kmPrevus ?? 0)
    const kmInclus = escapeHtml(d.kmInclus ?? 0)
    const kmSupp = escapeHtml(d.kmSupp ?? 0)
    const options = escapeHtml(d.options || "Aucune")

    const sousTotal = Number(d.sousTotal) || 0
    const coutKm = Number(d.coutKm) || 0
    const coutOptions = Number(d.coutOptions) || 0
    const total = Number(d.total) || 0
    const acompte = Number(d.acompte) || 0
    const caution = Number(d.caution) || 0

    const dateAnnulationFR = escapeHtml(
        d.dateAnnulationFR || "Non renseignée"
    )

    const message = escapeHtml(d.message || "")
    const prixParJour =
        nbJours > 0 ? (sousTotal / nbJours).toFixed(2) : "0.00"

    // ===== EMAIL ADMINISTRATEUR =====
    const adminHtml = `
<div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:20px;color:#222">
    <h2 style="color:#1a1a1a;border-bottom:2px solid #E85D3C;padding-bottom:10px">
        🚐 Nouvelle demande de réservation
    </h2>

    <h3 style="color:#E85D3C;margin-top:24px">👤 Coordonnées du client</h3>

    <table style="width:100%;border-collapse:collapse;margin:10px 0">
        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold;width:40%">
                Nom complet
            </td>
            <td style="padding:9px 12px">${nom}</td>
        </tr>

        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold">
                Email
            </td>
            <td style="padding:9px 12px">
                <a href="mailto:${email}">${email}</a>
            </td>
        </tr>

        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold">
                Téléphone
            </td>
            <td style="padding:9px 12px">
                <a href="tel:${telephoneLien}">${telephone}</a>
            </td>
        </tr>

        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold">
                Adresse complète
            </td>
            <td style="padding:9px 12px">
                ${adresseComplete}
            </td>
        </tr>

        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold">
                Destination prévue
            </td>
            <td style="padding:9px 12px">
                ${destination}
            </td>
        </tr>
    </table>

    <h3 style="color:#E85D3C;margin-top:24px">
        🪪 Informations sur le permis
    </h3>

    <table style="width:100%;border-collapse:collapse;margin:10px 0">
        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold;width:40%">
                Date d'obtention du permis B
            </td>
            <td style="padding:9px 12px">
                ${datePermis}
            </td>
        </tr>

        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold">
                Numéro du permis
            </td>
            <td style="padding:9px 12px">
                ${numeroPermis}
            </td>
        </tr>
    </table>

    <div style="background:#FFF3E0;border-left:4px solid #E85D3C;padding:14px 16px;margin:18px 0;border-radius:0 8px 8px 0">
        <strong style="color:#E85D3C">
            Documents encore nécessaires
        </strong>

        <p style="margin:8px 0 0;line-height:1.5">
            Le client doit encore transmettre les photos recto et verso de sa
            pièce d’identité ainsi que de son permis de conduire.
        </p>
    </div>

    <h3 style="color:#E85D3C;margin-top:24px">📅 Séjour demandé</h3>

    <table style="width:100%;border-collapse:collapse;margin:10px 0">
        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold;width:40%">
                Départ
            </td>
            <td style="padding:9px 12px">${dateDebut}</td>
        </tr>

        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold">
                Retour
            </td>
            <td style="padding:9px 12px">${dateFin}</td>
        </tr>

        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold">
                Durée
            </td>
            <td style="padding:9px 12px">
                ${nbJours} jour${pluriel}
            </td>
        </tr>

        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold">
                Voyageurs
            </td>
            <td style="padding:9px 12px">${voyageurs}</td>
        </tr>

        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold">
                Destination
            </td>
            <td style="padding:9px 12px">${destination}</td>
        </tr>

        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold">
                Kilométrage prévu
            </td>
            <td style="padding:9px 12px">
                ${kmPrevus} km, dont ${kmInclus} km inclus
            </td>
        </tr>

        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold">
                Kilomètres supplémentaires
            </td>
            <td style="padding:9px 12px">
                ${kmSupp} km
            </td>
        </tr>

        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold">
                Options
            </td>
            <td style="padding:9px 12px">${options}</td>
        </tr>
    </table>

    <h3 style="color:#E85D3C;margin-top:24px">💰 Tarif estimé</h3>

    <table style="width:100%;border-collapse:collapse;margin:10px 0">
        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold;width:40%">
                Location (${nbJours} jour${pluriel} × ${prixParJour} €)
            </td>
            <td style="padding:9px 12px">${sousTotal.toFixed(2)} €</td>
        </tr>

        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold">
                Kilomètres supplémentaires
            </td>
            <td style="padding:9px 12px">${coutKm.toFixed(2)} €</td>
        </tr>

        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold">
                Options
            </td>
            <td style="padding:9px 12px">${coutOptions.toFixed(2)} €</td>
        </tr>

        <tr style="font-size:18px">
            <td style="padding:12px;background:#E85D3C;color:white;font-weight:bold">
                TOTAL ESTIMÉ
            </td>
            <td style="padding:12px;background:#E85D3C;color:white;font-weight:bold">
                ${total.toFixed(2)} €
            </td>
        </tr>

        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold">
                Acompte de 30 %
            </td>
            <td style="padding:9px 12px">${acompte.toFixed(2)} €</td>
        </tr>

        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold">
                Annulation gratuite avant
            </td>
            <td style="padding:9px 12px">${dateAnnulationFR}</td>
        </tr>

        <tr>
            <td style="padding:9px 12px;background:#f5f5f5;font-weight:bold">
                Caution
            </td>
            <td style="padding:9px 12px">${caution.toFixed(2)} €</td>
        </tr>
    </table>

    ${
        message
            ? `
                <h3 style="color:#E85D3C;margin-top:24px">
                    💬 Message du client
                </h3>

                <p style="background:#f9f9f9;padding:12px;border-radius:8px;line-height:1.6;white-space:pre-wrap">
                    ${message}
                </p>
            `
            : ""
    }

    <div style="margin-top:30px">
        <a
            href="tel:${telephoneLien}"
            style="display:inline-block;padding:14px 24px;background:#E85D3C;color:white;text-decoration:none;border-radius:8px;font-weight:bold;margin-right:8px"
        >
            📞 Appeler ${prenom}
        </a>

        <a
            href="mailto:${email}"
            style="display:inline-block;padding:14px 24px;background:#333;color:white;text-decoration:none;border-radius:8px;font-weight:bold"
        >
            📧 Répondre par email
        </a>
    </div>
</div>
`

    // ===== EMAIL CLIENT =====
    const clientHtml = `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:20px;color:#222">
    <h2 style="color:#1a1a1a">
        Merci ${prenom} !
    </h2>

    <p style="font-size:15px;line-height:1.6;color:#333">
        Votre demande de réservation a bien été reçue. Voici le récapitulatif
        des informations transmises.
    </p>

    <div style="background:#f9f9f9;border-radius:12px;padding:20px;margin:20px 0">
        <p style="margin:7px 0">
            <strong>📅 Dates :</strong>
            du ${dateDebut} au ${dateFin}
            (${nbJours} jour${pluriel})
        </p>

        <p style="margin:7px 0">
            <strong>👥 Voyageurs :</strong>
            ${voyageurs}
        </p>

        <p style="margin:7px 0">
            <strong>📍 Destination :</strong>
            ${destination}
        </p>

        <p style="margin:7px 0">
            <strong>🚐 Kilométrage estimé :</strong>
            ${kmPrevus} km, dont ${kmInclus} km inclus
        </p>

        ${
            options !== "Aucune"
                ? `
                    <p style="margin:7px 0">
                        <strong>✅ Options :</strong>
                        ${options}
                    </p>
                `
                : ""
        }

        <p style="margin:14px 0 7px;font-size:18px">
            <strong>💰 Total estimé : ${total.toFixed(2)} €</strong>
        </p>

        <p style="margin:7px 0">
            <strong>📋 Acompte estimé :</strong>
            ${acompte.toFixed(2)} € (30 % du total)
        </p>

        <p style="margin:7px 0;font-size:13px;color:#666">
            Annulation gratuite avec remboursement total de l’acompte avant le
            ${dateAnnulationFR}.
        </p>

        <p style="margin:7px 0;font-size:13px;color:#666">
            Caution de ${caution.toFixed(2)} € au départ, restituée au retour
            sous réserve de l’état du véhicule.
        </p>
    </div>

    <div style="background:#FFF3E0;border:2px solid #E85D3C;padding:20px;border-radius:12px;margin:24px 0">
        <p style="margin:0;color:#C74727;font-size:18px;font-weight:bold">
            🪪 Documents à envoyer maintenant
        </p>

        <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#222">
            Pour permettre l’étude de votre demande, merci de
            <strong>répondre directement à cet email</strong> en joignant des
            photos ou scans lisibles des documents suivants :
        </p>

        <ul style="font-size:15px;color:#222;line-height:1.8;margin:12px 0;padding-left:22px">
            <li>
                votre <strong>carte d’identité recto et verso</strong> ;
            </li>

            <li>
                votre <strong>permis de conduire recto et verso</strong>.
            </li>
        </ul>

        <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#C74727;font-weight:bold">
            Le numéro renseigné dans le formulaire ne remplace pas les copies
            des documents. Il est nécessaire de joindre les photos recto et
            verso en répondant à ce message.
        </p>
    </div>

    <div style="background:#FFF8F3;border-left:4px solid #E85D3C;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
        <p style="margin:0;font-weight:bold;color:#E85D3C">
            ⚠ Cette demande ne constitue pas encore une réservation ferme.
        </p>

        <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#333">
            Nous allons vérifier la disponibilité du véhicule, étudier les
            informations et les documents transmis, puis vous recontacter pour
            confirmer et finaliser la réservation.
        </p>
    </div>

    <p style="font-size:14px;line-height:1.6;color:#666">
        Pour envoyer vos documents ou poser une question, utilisez simplement
        le bouton « Répondre » de votre messagerie.
    </p>

    <p style="font-size:14px;color:#333;margin-top:24px">
        À très bientôt sur la route !<br>
        <strong>Le Campeur</strong> — Louez, Roulez, Profitez !
    </p>
</div>
`

    const adminText = `
Nouvelle demande de réservation

COORDONNÉES DU CLIENT
Nom : ${d.nom}
Email : ${d.email}
Téléphone : ${d.telephone}
Adresse complète : ${d.adresse || ""}, ${d.codePostal || ""} ${d.ville || ""}
Destination : ${d.destination || "Non renseignée"}

INFORMATIONS SUR LE PERMIS
Date d'obtention du permis B : ${d.datePermis || "Non renseignée"}
Numéro du permis : ${d.numeroPermis || "Non renseigné"}

DOCUMENTS À RECEVOIR
Le client doit transmettre les photos recto et verso de sa pièce d'identité et de son permis de conduire.

SÉJOUR
Départ : ${d.dateDebut}
Retour : ${d.dateFin}
Durée : ${nbJours} jour${pluriel}
Voyageurs : ${d.voyageurs}
Kilométrage prévu : ${d.kmPrevus} km
Kilométrage inclus : ${d.kmInclus} km
Kilomètres supplémentaires : ${d.kmSupp} km
Options : ${d.options || "Aucune"}

TARIF
Location : ${sousTotal.toFixed(2)} €
Kilomètres supplémentaires : ${coutKm.toFixed(2)} €
Options : ${coutOptions.toFixed(2)} €
Total estimé : ${total.toFixed(2)} €
Acompte : ${acompte.toFixed(2)} €
Caution : ${caution.toFixed(2)} €
Annulation gratuite avant : ${d.dateAnnulationFR || "Non renseignée"}

MESSAGE
${d.message || "Aucun message"}
`.trim()

    const clientText = `
Bonjour ${String(d.nom).trim().split(/\s+/)[0] || ""},

Votre demande de réservation a bien été reçue.

RÉCAPITULATIF
Dates : du ${d.dateDebut} au ${d.dateFin}
Durée : ${nbJours} jour${pluriel}
Voyageurs : ${d.voyageurs}
Destination : ${d.destination || "Non renseignée"}
Kilométrage estimé : ${d.kmPrevus} km
Total estimé : ${total.toFixed(2)} €
Acompte estimé : ${acompte.toFixed(2)} €

DOCUMENTS À ENVOYER MAINTENANT

Merci de répondre directement à cet email en joignant :

- une photo ou un scan de votre carte d'identité recto et verso ;
- une photo ou un scan de votre permis de conduire recto et verso.

Le numéro renseigné dans le formulaire ne remplace pas les copies des documents. Les photos recto et verso sont nécessaires pour étudier votre demande.

Cette demande ne constitue pas encore une réservation ferme. Nous vous recontacterons après vérification de la disponibilité et des documents.

Le Campeur
`.trim()

    try {
        const adminRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_KEY}`,
            },
            body: JSON.stringify({
                from: fromEmail,
                to: [adminEmail],
                reply_to: d.email,
                subject: `Nouvelle demande — ${d.nom} — ${d.dateDebut} au ${d.dateFin}`,
                html: adminHtml,
                text: adminText,
            }),
        })

        if (!adminRes.ok) {
            const details = await adminRes.json()

            return res.status(500).json({
                error: "Admin email failed",
                details,
            })
        }

        const clientRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_KEY}`,
            },
            body: JSON.stringify({
                from: fromEmail,
                to: [d.email],
                reply_to: adminEmail,
                subject:
                    "Votre demande de réservation et les documents à envoyer — Le Campeur",
                html: clientHtml,
                text: clientText,
            }),
        })

        if (!clientRes.ok) {
            const details = await clientRes.json()

            return res.status(500).json({
                error: "Client email failed",
                details,
            })
        }

        return res.status(200).json({
            ok: true,
            message: "Both emails sent",
        })
    } catch (error) {
        return res.status(500).json({
            error: error?.message || "Send failed",
        })
    }
}
