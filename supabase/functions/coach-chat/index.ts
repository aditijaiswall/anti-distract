// Supabase Edge Function: coach-chat
// Deploy with: supabase functions deploy coach-chat --project-ref jtnqrswupbjqobasrrjm
//
// Required secrets (set via Supabase Dashboard → Edge Functions → Secrets):
//   GEMINI_API_KEY = your Google Gemini API key

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        if (!GEMINI_API_KEY) {
            return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Verify auth
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing authorization" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { messages } = await req.json();

        // Convert to Gemini format
        const geminiContents = messages
            .filter((m) => m.role !== "system")
            .map((m) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }],
            }));

        const systemInstruction = messages.find((m) => m.role === "system")?.content || "";

        const geminiPayload = {
            contents: geminiContents,
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                maxOutputTokens: 4096,
            },
        };

        const models = [
            "gemini-2.5-flash-lite", // Primary
            "gemini-3.5-flash-lite"  // Fallback
        ];

        let finalRes = null;
        let lastErrText = "";
        let lastStatus = 500;

        for (const model of models) {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(geminiPayload),
                }
            );

            if (res.ok) {
                finalRes = res;
                break;
            } else {
                lastStatus = res.status;
                lastErrText = await res.text();
                // If 429 Quota Exceeded or others, loop to next
                console.error(`${model} failed with ${res.status}: ${lastErrText}`);
            }
        }

        if (!finalRes) {
            return new Response(JSON.stringify({ error: `All models failed. Last error: ${lastErrText}` }), {
                status: lastStatus,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const geminiData = await finalRes.json();
        const responseText =
            geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";

        return new Response(JSON.stringify({ response: responseText }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
