import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    },
});


export async function sendAutoReply(
    email: string,
    reply: string,
    category: string
): Promise<boolean> {
    if (!email) return false;
    if (process.env.AUTO_EMAIL !== "true") return false;

    let subject = "Thanks for contacting us";
    if (category === "support") subject = "Support request received";
    else if (category === "sales") subject = "Pricing & Sales inquiry";
    else if (category === "complaint") subject = "Complaint received";

    try {
        await transporter.sendMail({
            from: `"Support Team" <${process.env.EMAIL_USER}>`,
            to: email,
            subject,
            text: reply,
            html: `<p>${reply}</p>`,
        });
        return true;
    } catch (err) {
        console.error("Email send error:", err);
        return false;
    }
}
