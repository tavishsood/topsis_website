import { Resend } from "resend";

const resendAPIKey = "re_2opsYyVT_ESiLjeU7jsFoUf7CmakqGPB1";
const resend = new Resend(resendAPIKey);

export async function POST(req) {
	try {
		const { email, html } = await req.json();

		if (!email || !html) {
			return new Response(
				JSON.stringify({ error: "Missing email or content" }),
				{ status: 400 },
			);
		}

		await resend.emails.send({
			from: "onboarding@resend.dev",
			to: email,
			subject: "TOPSIS Analysis Complete",
			html,
		});

		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (err) {
		console.error(err);
		return new Response(JSON.stringify({ error: "Failed to send email" }), {
			status: 500,
		});
	}
}
