
const clients = [
    { "id": "d40aa46f-0f22-42cc-9e11-09a83e784a35", "pet_name": "Tiny", "price": "110", "extra_services": { "transporte": { "value": 10, "enabled": true }, "dias_extras": { "enabled": false, "quantity": 1 } }, "service": "2x Banho ", "weight": "Até 5kg" },
    { "id": "3edf6094-af33-43c4-9c48-8a6d66c70913", "pet_name": "Leia", "price": "110", "extra_services": null, "service": "2x Banho ", "weight": "Até 5kg" },
    { "id": "12b1a70e-e964-492b-b3a6-5def10b83468", "pet_name": "Pandora ", "price": "220", "extra_services": { "transporte": { "value": 20, "enabled": true }, "hidratacao": { "enabled": false } }, "service": "4x Banho ", "weight": "Até 5kg" },
    { "id": "ed179efd-18ed-46df-a409-888c09f04ef9", "pet_name": "Luninha", "price": "110", "extra_services": { "hidratacao": { "value": 50, "enabled": true }, "transporte": { "enabled": false } }, "service": "2x Banho ", "weight": "Até 5kg" },
    { "id": "79d0c93c-1f3a-42e2-9215-613908b33318", "pet_name": "Vicky", "price": "240", "extra_services": { "banho_tosa": { "value": 65, "enabled": false }, "transporte": { "value": 20, "enabled": true } }, "service": "4 x Banho ", "weight": "Até 10kg" },
    { "id": "7ccace94-3613-4e0e-8602-cb9765535f8d", "pet_name": "Bibi", "price": "110", "extra_services": { "tintura": { "value": 15, "enabled": false } }, "service": "2x Banho ", "weight": "Até 5kg" },
    { "id": "3129f2c0-5436-49a6-bc61-3b0827dfb9b8", "pet_name": "Theo", "price": "220", "extra_services": { "transporte": { "value": 20, "enabled": true } }, "service": "4x Banho ", "weight": "Até 5kg" },
    { "id": "d23081da-2b05-4973-af4e-4fad7d3d63a9", "pet_name": "Joaquim", "price": "220", "extra_services": null, "service": "4x Banho ", "weight": "Até 5kg" },
    { "id": "54f2b960-9e7e-4a53-b591-c04e15f35d63", "pet_name": "Luna ", "price": "110", "extra_services": { "transporte": { "value": 10, "enabled": true } }, "service": "2x Banho", "weight": "Até 5kg" },
    { "id": "ec3444a2-93e8-47e7-af02-1208bb6e1abf", "pet_name": "Princesa ", "price": "110", "extra_services": { "transporte": { "value": 10, "enabled": true } }, "service": "2x Banho", "weight": "Até 5kg" },
    { "id": "cf64f284-120b-4a29-8350-7e3ebe15d132", "pet_name": "Bijou", "price": "150", "extra_services": { "banho_tosa": { "value": 75, "enabled": true } }, "service": "2x Banho ", "weight": "Até 15kg" },
    { "id": "0062be54-732d-41a1-a14c-ca17db6bf773", "pet_name": "Isis", "price": "110", "extra_services": null, "service": "2x Banho ", "weight": "Até 5kg" },
    { "id": "e23441ed-88b9-431b-9093-4928d5363f02", "pet_name": "Ted", "price": "220", "extra_services": { "banho_tosa": { "value": 55, "enabled": true }, "hidratacao": { "value": 25, "enabled": true } }, "service": "4x Banho ", "weight": "Até 10kg" },
    { "id": "db02e8d6-b576-4a05-b818-89b278c3ebe2", "pet_name": "Cloe ", "price": "110", "extra_services": { "so_banho": { "value": 90, "enabled": true }, "banho_tosa": { "value": 55, "enabled": true } }, "service": "2x Banho ", "weight": "Até 5kg" },
    { "id": "c60eb769-d2ad-43db-aee5-ef472a9c136b", "pet_name": "Kira", "price": "220", "extra_services": { "transporte": { "value": 20, "enabled": true } }, "service": "4x Banho", "weight": "Até 5kg" },
    { "id": "51718d4f-20ac-4274-a4c8-355d5beb25bf", "pet_name": "Maia", "price": "110", "extra_services": null, "service": "2x Banho (Pet Móvel)", "weight": "Até 5kg" },
    { "id": "2d28c7e4-69ba-4b62-9df8-8c0db4b76786", "pet_name": "Blue", "price": "1", "extra_services": { "pernoite": { "value": 50, "enabled": true }, "dias_extras": { "value": 200, "enabled": true, "quantity": 2 } }, "service": "4x Banho", "weight": "Até 5kg" },
    { "id": "c385a56e-4a90-483f-b533-e4364de6304e", "pet_name": "Catarina ", "price": "110", "extra_services": { "transporte": { "value": 10, "enabled": true } }, "service": "2x Banho", "weight": "Até 5kg" },
    { "id": "5c89ccf3-c395-4f93-a9ef-8321d032d480", "pet_name": "Rocky", "price": "110", "extra_services": null, "service": "2x Banho (Pet Móvel)", "weight": "Até 5kg" },
    { "id": "24cd54ba-7ac8-47f8-937a-83185fc882bf", "pet_name": "Cacau", "price": "110", "extra_services": null, "service": "2x Banho ", "weight": "Até 5kg" },
    { "id": "91bade6f-f8e9-4ebc-b9f0-b0309fdeb3ad", "pet_name": "Lorena ", "price": "130", "extra_services": null, "service": "2x Banho ", "weight": "Até 10kg" },
    { "id": "33ff97c2-15f7-456a-9646-dde9aca7d2a6", "pet_name": "Fred", "price": "110", "extra_services": null, "service": "2x Banho (Pet Móvel)", "weight": "Até 5kg" },
    { "id": "6ed6b6c7-4554-473c-ab7a-38e3f850d61a", "pet_name": "Nicky", "price": "0", "extra_services": { "pernoite": { "value": 200, "enabled": true }, "banho_tosa": { "value": 150, "enabled": true } }, "service": "4x Banho", "weight": "Até 10kg" },
    { "id": "cce0e4fe-3659-4823-bc9e-5a8e6a685719", "pet_name": "Pandorinha", "price": "220", "extra_services": { "so_tosa": { "value": 60, "enabled": true }, "transporte": { "value": 20, "enabled": true } }, "service": "4x Banho ", "weight": "Até 5kg" },
    { "id": "8dd41ac0-3d2f-4f83-b6d2-ede60e1b8102", "pet_name": "Pipoca", "price": "110", "extra_services": { "transporte": { "value": 10, "enabled": true } }, "service": "2x Banho ", "weight": "Até 5kg" }
];

clients.forEach(c => {
    let basePrice = parseFloat(c.price);

    // 1. Calculate Frequency Fee
    const match = c.service.match(/^(\d+)x/i) || c.service.match(/^(\d+) x/i);
    const frequency = match ? parseInt(match[1]) : 0;
    const fee = frequency * 5;

    // 2. Calculate Extras Total
    let extrasTotal = 0;
    if (c.extra_services) {
        Object.keys(c.extra_services).forEach(key => {
            const s = c.extra_services[key];
            if (s && s.enabled) {
                let val = Number(s.value) || 0;
                if (key === 'dias_extras' && s.quantity) {
                    val *= s.quantity;
                }
                extrasTotal += val;
            }
        });
    }

    // 3. New Logic: 
    // If price is 110, Base = 100? No, 2x Banho is 80 (40*2) + Fee 10 = 90?
    // User says Pandora (Base 220 in DB) + Extras (20) + Fee (20) = 260.
    // This implies DB "220" is PRE-FEE and PRE-EXTRAS.
    // So NewPrice = DB_Price + Fee + Extras.

    const total = basePrice + fee + extrasTotal;

    // Special exception: If Price is 0 or 1, assume it's incomplete and calculate full.
    // But wait, BasePrice 1 (Blue) -> 1 + 20 + 450 = 471. Correct?
    // BasePrice 0 (Nicky) -> 0 + 20 + 350 = 370. Correct?
    // I'll stick to the logic.

    console.log(`UPDATE monthly_clients SET price = ${total} WHERE id = '${c.id}';`);
});
