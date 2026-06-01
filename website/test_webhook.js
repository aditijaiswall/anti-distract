const url = 'https://jtnqrswupbjqobasrrjm.supabase.co/functions/v1/polar-webhook';

async function testWebhook() {
    const payload = {
        type: 'subscription.created',
        data: {
            id: 'test_sub_123',
            customer: {
                id: 'test_cust_123',
                email: 'test@example.com' // Replace dynamically if needed
            }
        }
    };

    try {
        console.log("Sending fake webhook to:", url);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Webhook-Signature': 'v1=fake_signature', // Omitted to test soft-fail
            },
            body: JSON.stringify(payload)
        });

        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Response:", text);
    } catch (err) {
        console.error("Error:", err);
    }
}

testWebhook();
