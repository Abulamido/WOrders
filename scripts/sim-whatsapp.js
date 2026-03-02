const payload = {
    "object": "whatsapp_business_account",
    "entry": [
        {
            "id": "12345",
            "changes": [
                {
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {
                            "display_phone_number": "15551234567",
                            "phone_number_id": "842079732331353"
                        },
                        "contacts": [
                            {
                                "profile": {
                                    "name": "Abu"
                                },
                                "wa_id": "2347019970002"
                            }
                        ],
                        "messages": [
                            {
                                "from": "2347019970002",
                                "id": "wamid.HBAXXXXXXX",
                                "timestamp": "1700000000",
                                "text": {
                                    "body": "Hi"
                                },
                                "type": "text"
                            }
                        ]
                    },
                    "field": "messages"
                }
            ]
        }
    ]
};

fetch("http://localhost:3000/api/webhooks/whatsapp", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
})
    .then(res => res.text())
    .then(text => console.log("Response:", text))
    .catch(err => console.error("Error:", err));
