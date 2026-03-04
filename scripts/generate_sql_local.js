const fs = require('fs');

const clients = [
    {
        "id": "e23441ed-88b9-431b-9093-4928d5363f02",
        "pet_name": "Ted",
        "owner_name": "Diego",
        "whatsapp": "(11) 94324-1340",
        "service": "4x Banho ",
        "price": "350",
        "recurrence_type": "weekly",
        "recurrence_day": 4,
        "recurrence_time": 12,
        "condominium": "Max Haus",
        "extra_services": {
            "so_tosa": { "value": 60, "enabled": true },
            "banho_tosa": { "value": 55, "enabled": true },
            "hidratacao": { "value": 50, "enabled": true },
            "dias_extras": { "enabled": false, "quantity": 1 }
        },
        "weight": "Até 10kg",
        "created_at": "2025-12-08 14:45:18.84625+00"
    },
    {
        "id": "2d28c7e4-69ba-4b62-9df8-8c0db4b76786",
        "pet_name": "Blue",
        "owner_name": "Monalize",
        "whatsapp": "(11) 98500-6557",
        "service": "4x Banho",
        "price": "0",
        "recurrence_type": "weekly",
        "recurrence_day": 5,
        "recurrence_time": 17,
        "condominium": "Nenhum Condomínio",
        "extra_services": {
            "pernoite": { "value": 50, "enabled": false },
            "dias_extras": { "value": 100, "enabled": false, "quantity": 2 }
        },
        "weight": "Até 5kg",
        "created_at": "2025-12-08 16:04:27.693245+00"
    },
    {
        "id": "4c6cbf6b-c697-4670-83b4-bc710b2f4f82",
        "pet_name": "princesa",
        "owner_name": "Ayrton",
        "whatsapp": "(11) 98150-9986",
        "service": "4x Banho (Pet Móvel)",
        "price": "120",
        "recurrence_type": "bi-weekly",
        "recurrence_day": 2,
        "recurrence_time": 11,
        "condominium": "Nenhum Condomínio",
        "extra_services": null,
        "weight": "Até 5kg",
        "created_at": "2025-10-24 13:00:00+00" // Faked so that start date logic generates from early 2026 correctly
    },
    {
        "id": "3129f2c0-5436-49a6-bc61-3b0827dfb9b8",
        "pet_name": "Theo",
        "owner_name": "Francisco",
        "whatsapp": "(11) 94726-3333",
        "service": "4x Banho ",
        "price": "280",
        "recurrence_type": "weekly",
        "recurrence_day": 5,
        "recurrence_time": 10,
        "condominium": "Paseo",
        "extra_services": {
            "transporte": { "value": 40, "enabled": true },
            "dias_extras": { "enabled": false, "quantity": 1 }
        },
        "weight": "Até 5kg",
        "created_at": "2025-12-08 15:04:30.67528+00"
    },
    {
        "id": "cf64f284-120b-4a29-8350-7e3ebe15d132",
        "pet_name": "Bijou",
        "owner_name": "Katia",
        "whatsapp": "(11) 96198-5186",
        "service": "2x Banho ",
        "price": "160",
        "recurrence_type": "bi-weekly",
        "recurrence_day": 4,
        "recurrence_time": 15,
        "condominium": "Max Haus",
        "extra_services": {
            "banho_tosa": { "value": 75, "enabled": true }
        },
        "weight": "Até 15kg",
        "created_at": "2025-12-08 15:29:04.580947+00"
    },
    {
        "id": "0062be54-732d-41a1-a14c-ca17db6bf773",
        "pet_name": "Isis",
        "owner_name": "Carol",
        "whatsapp": "(11) 98169-5508",
        "service": "2x Banho ",
        "price": "120",
        "recurrence_type": "bi-weekly",
        "recurrence_day": 5,
        "recurrence_time": 12,
        "condominium": "Paseo",
        "extra_services": null,
        "weight": "Até 5kg",
        "created_at": "2025-12-08 14:32:13.469794+00"
    },
    {
        "id": "c385a56e-4a90-483f-b533-e4364de6304e",
        "pet_name": "Catarina ",
        "owner_name": "Josue",
        "whatsapp": "(11) 96899-5457",
        "service": "2x Banho",
        "price": "150",
        "recurrence_type": "bi-weekly",
        "recurrence_day": 2,
        "recurrence_time": 11,
        "condominium": "Nenhum Condomínio",
        "extra_services": {
            "transporte": { "value": 10, "enabled": true }
        },
        "weight": "Até 5kg",
        "created_at": "2025-12-08 16:15:45.53099+00"
    },
    {
        "id": "c60eb769-d2ad-43db-aee5-ef472a9c136b",
        "pet_name": "Kira",
        "owner_name": "Paulo cardoso",
        "whatsapp": "(11) 99880-1600",
        "service": "4x Banho",
        "price": "240",
        "recurrence_type": "weekly",
        "recurrence_day": 5,
        "recurrence_time": 17,
        "condominium": "Paseo",
        "extra_services": null,
        "weight": "Até 5kg",
        "created_at": "2025-12-10 11:49:53.065369+00"
    },
    {
        "id": "7ccace94-3613-4e0e-8602-cb9765535f8d",
        "pet_name": "Bibi",
        "owner_name": "Fabiana",
        "whatsapp": "(11) 96171-7660",
        "service": "2x Banho ",
        "price": "120",
        "recurrence_type": "bi-weekly",
        "recurrence_day": 4,
        "recurrence_time": 16,
        "condominium": "Max Haus",
        "extra_services": null,
        "weight": "Até 5kg",
        "created_at": "2025-12-08 14:55:48.622953+00"
    },
    {
        "id": "e5353a85-0c08-4c92-8830-1fdcc67c293c",
        "pet_name": "Frederico",
        "owner_name": "Cesar",
        "whatsapp": "(11) 93250-1843",
        "service": "4x Banho (Pet Móvel)",
        "price": "260",
        "recurrence_type": "weekly",
        "recurrence_day": 5,
        "recurrence_time": 16,
        "condominium": "Nenhum Condomínio",
        "extra_services": null,
        "weight": "Até 5kg",
        "created_at": "2025-12-08 00:00:00+00" // Faked start date for backfiller script convenience
    },
    {
        "id": "12b1a70e-e964-492b-b3a6-5def10b83468",
        "pet_name": "Pandora ",
        "owner_name": "Keila",
        "whatsapp": "(11) 99889-0453",
        "service": "4x Banho ",
        "price": "280",
        "recurrence_type": "weekly",
        "recurrence_day": 3,
        "recurrence_time": 14,
        "condominium": "Vitta Parque",
        "extra_services": {
            "transporte": { "value": 40, "enabled": true }
        },
        "weight": "Até 5kg",
        "created_at": "2025-12-08 15:31:40.286544+00"
    },
    {
        "id": "ed179efd-18ed-46df-a409-888c09f04ef9",
        "pet_name": "Luninha",
        "owner_name": "Edilma",
        "whatsapp": "(11) 99505-4492",
        "service": "2x Banho ",
        "price": "120",
        "recurrence_type": "bi-weekly",
        "recurrence_day": 3,
        "recurrence_time": 15,
        "condominium": "Vitta Parque",
        "extra_services": {
            "hidratacao": { "value": 50, "enabled": false }
        },
        "weight": "Até 10kg",
        "created_at": "2025-12-08 14:51:21.857551+00"
    },
    {
        "id": "f96aa752-78b0-401b-b459-d360dba3b409",
        "pet_name": "Milly ",
        "owner_name": "Kathe ",
        "whatsapp": "(67) 99695-1302",
        "service": "4x Banho (Pet Móvel)",
        "price": "240",
        "recurrence_type": "weekly",
        "recurrence_day": 2,
        "recurrence_time": 9,
        "condominium": "Nenhum Condomínio",
        "extra_services": null,
        "weight": "Até 5kg",
        "created_at": "2025-12-08 00:00:00+00"
    },
    {
        "id": "3edf6094-af33-43c4-9c48-8a6d66c70913",
        "pet_name": "Leia",
        "owner_name": "Rosângela ",
        "whatsapp": "(11) 98443-2535",
        "service": "2x Banho ",
        "price": "120",
        "recurrence_type": "bi-weekly",
        "recurrence_day": 3,
        "recurrence_time": 9,
        "condominium": "Vitta Parque",
        "extra_services": null,
        "weight": "Até 5kg",
        "created_at": "2025-12-08 15:46:44.470674+00"
    },
    {
        "id": "24cd54ba-7ac8-47f8-937a-83185fc882bf",
        "pet_name": "Cacau",
        "owner_name": "Micheli",
        "whatsapp": "(11) 98727-3037",
        "service": "2x Banho ",
        "price": "140",
        "recurrence_type": "bi-weekly",
        "recurrence_day": 4,
        "recurrence_time": 10,
        "condominium": "Max Haus",
        "extra_services": {
            "transporte": { "value": 20, "enabled": true }
        },
        "weight": "Até 5kg",
        "created_at": "2025-12-08 15:39:31.145634+00"
    },
    {
        "id": "33ff97c2-15f7-456a-9646-dde9aca7d2a6",
        "pet_name": "Fred",
        "owner_name": "Carol",
        "whatsapp": "(11) 98169-5508",
        "service": "2x Banho (Pet Móvel)",
        "price": "120",
        "recurrence_type": "bi-weekly",
        "recurrence_day": 5,
        "recurrence_time": 11,
        "condominium": "Paseo",
        "extra_services": null,
        "weight": "Até 5kg",
        "created_at": "2025-12-12 11:50:55.002024+00"
    },
    {
        "id": "d23081da-2b05-4973-af4e-4fad7d3d63a9",
        "pet_name": "Joaquim",
        "owner_name": "Cintia",
        "whatsapp": "(11) 99333-5563",
        "service": "4x Banho ",
        "price": "240",
        "recurrence_type": "weekly",
        "recurrence_day": 5,
        "recurrence_time": 16,
        "condominium": "Paseo",
        "extra_services": null,
        "weight": "Até 5kg",
        "created_at": "2025-12-08 14:40:59.520412+00"
    },
    {
        "id": "5c89ccf3-c395-4f93-a9ef-8321d032d480",
        "pet_name": "Rocky",
        "owner_name": "Kathy",
        "whatsapp": "(11) 97400-7130",
        "service": "2x Banho (Pet Móvel)",
        "price": "120",
        "recurrence_type": "bi-weekly",
        "recurrence_day": 5,
        "recurrence_time": 9,
        "condominium": "Paseo",
        "extra_services": null,
        "weight": "Até 5kg",
        "created_at": "2025-12-12 11:30:33.705195+00"
    },
    {
        "id": "51718d4f-20ac-4274-a4c8-355d5beb25bf",
        "pet_name": "Maia",
        "owner_name": "Kathy",
        "whatsapp": "(11) 97400-7130",
        "service": "2x Banho (Pet Móvel)",
        "price": "120",
        "recurrence_type": "bi-weekly",
        "recurrence_day": 5,
        "recurrence_time": 10,
        "condominium": "Paseo",
        "extra_services": null,
        "weight": "Até 5kg",
        "created_at": "2025-12-12 11:29:36.990824+00"
    },
    {
        "id": "91bade6f-f8e9-4ebc-b9f0-b0309fdeb3ad",
        "pet_name": "Lorena ",
        "owner_name": "Rosângela ",
        "whatsapp": "(11) 98443-2535",
        "service": "2x Banho ",
        "price": "160",
        "recurrence_type": "bi-weekly",
        "recurrence_day": 3,
        "recurrence_time": 10,
        "condominium": "Vitta Parque",
        "extra_services": {
            "transporte": { "value": 10, "enabled": true }
        },
        "weight": "Até 10kg",
        "created_at": "2025-12-08 15:50:27.057325+00"
    },
    {
        "id": "8dd41ac0-3d2f-4f83-b6d2-ede60e1b8102",
        "pet_name": "Pipoca",
        "owner_name": "Karina",
        "whatsapp": "(11) 99741-2895",
        "service": "2x Banho ",
        "price": "140",
        "recurrence_type": "bi-weekly",
        "recurrence_day": 5,
        "recurrence_time": 9,
        "condominium": "Paseo",
        "extra_services": {
            "transporte": { "value": 20, "enabled": true }
        },
        "weight": "Até 5kg",
        "created_at": "2025-12-08 15:16:06.365979+00"
    },
    {
        "id": "d40aa46f-0f22-42cc-9e11-09a83e784a35",
        "pet_name": "Tiny",
        "owner_name": "Kathy",
        "whatsapp": "(11) 97400-7130",
        "service": "2x Banho ",
        "price": "140",
        "recurrence_type": "bi-weekly",
        "recurrence_day": 5,
        "recurrence_time": 9,
        "condominium": "Paseo",
        "extra_services": {
            "transporte": { "value": 20, "enabled": true }
        },
        "weight": "Até 5kg",
        "created_at": "2025-12-08 15:21:24.731755+00"
    },
    {
        "id": "cce0e4fe-3659-4823-bc9e-5a8e6a685719",
        "pet_name": "Pandorinha",
        "owner_name": "Veronica",
        "whatsapp": "(11) 98236-4274",
        "service": "4x Banho ",
        "price": "380",
        "recurrence_type": "weekly",
        "recurrence_day": 5,
        "recurrence_time": 14,
        "condominium": "Paseo",
        "extra_services": {
            "so_tosa": { "value": 60, "enabled": true },
            "transporte": { "value": 40, "enabled": true }
        },
        "weight": "Até 5kg",
        "created_at": "2025-12-08 15:53:46.456903+00"
    },
    {
        "id": "db02e8d6-b576-4a05-b818-89b278c3ebe2",
        "pet_name": "Cloe ",
        "owner_name": "Micheli",
        "whatsapp": "(11) 98727-3037",
        "service": "2x Banho ",
        "price": "120",
        "recurrence_type": "bi-weekly",
        "recurrence_day": 4,
        "recurrence_time": 9,
        "condominium": "Max Haus",
        "extra_services": {
            "banho_tosa": { "value": 55, "enabled": true }
        },
        "weight": "Até 5kg",
        "created_at": "2025-12-08 15:44:12.475161+00"
    },
    {
        "id": "54f2b960-9e7e-4a53-b591-c04e15f35d63",
        "pet_name": "Luna ",
        "owner_name": "Ayrton",
        "whatsapp": "(11) 98150-9986",
        "service": "2x Banho",
        "price": "140",
        "recurrence_type": "bi-weekly",
        "recurrence_day": 2,
        "recurrence_time": 10,
        "condominium": "Nenhum Condomínio",
        "extra_services": {
            "transporte": { "value": 20, "enabled": true }
        },
        "weight": "Até 5kg",
        "created_at": "2025-12-08 13:57:51.902588+00"
    },
    {
        "id": "79d0c93c-1f3a-42e2-9215-613908b33318",
        "pet_name": "Vicky",
        "owner_name": "Cida",
        "whatsapp": "(11) 96527-1775",
        "service": "4 x Banho ",
        "price": "140",
        "recurrence_type": "bi-weekly",
        "recurrence_day": 5,
        "recurrence_time": 15,
        "condominium": "Paseo",
        "extra_services": {
            "transporte": { "value": 20, "enabled": true }
        },
        "weight": "Até 10kg",
        "created_at": "2025-12-08 14:36:58.172432+00"
    }
];

const getNextDate = (currentDate, type, dayValue) => {
    const next = new Date(currentDate);
    if (type === 'weekly') {
        next.setDate(next.getDate() + 7);
    } else if (type === 'bi-weekly') {
        next.setDate(next.getDate() + 14);
    } else if (type === 'monthly') {
        next.setMonth(next.getMonth() + 1);
        next.setDate(dayValue);
    }
    return next;
};

let sqlStr = '';
let totalGenerated = 0;

for (const client of clients) {
    const recTime = parseInt(client.recurrence_time, 10);
    const recDay = parseInt(client.recurrence_day, 10);

    let startDate = new Date('2026-01-01T00:00:00Z');
    let clientCreated = new Date(client.created_at);
    clientCreated.setHours(0, 0, 0, 0);

    let candidate = new Date(Math.max(startDate, clientCreated));
    candidate.setHours(recTime, 0, 0, 0);

    if (client.recurrence_type === 'monthly') {
        if (candidate.getDate() > recDay) {
            candidate.setMonth(candidate.getMonth() + 1);
        }
        candidate.setDate(recDay);
    } else {
        const currentJsDay = candidate.getDay() === 0 ? 7 : candidate.getDay();
        let daysToAdd = recDay - currentJsDay;
        if (daysToAdd < 0) {
            daysToAdd += 7;
        }
        candidate.setDate(candidate.getDate() + daysToAdd);
    }

    let currentDate = candidate;
    for (let i = 0; i < 100; i++) {
        if (currentDate.getFullYear() !== 2026) break;

        // Generate starting strictly from today onwards, up to Dec 31
        if (currentDate >= new Date('2026-03-03T00:00:00Z')) {
            const petName = client.pet_name.replace(/'/g, "''");
            const ownerName = client.owner_name ? client.owner_name.replace(/'/g, "''") : null;
            const whatsapp = client.whatsapp ? `'${client.whatsapp}'` : 'NULL';
            const srv = client.service ? `'${client.service.replace(/'/g, "''")}'` : 'NULL';
            const price = client.price || 0;
            const appTime = currentDate.toISOString();
            const status = currentDate < new Date() ? 'CONCLUÍDO' : 'AGENDADO';

            let extraServices = 'NULL';
            if (client.extra_services) {
                extraServices = `'${JSON.stringify(client.extra_services).replace(/'/g, "''")}'::jsonb`;
            }

            const condo = client.condominium ? `'${client.condominium.replace(/'/g, "''")}'` : 'NULL';
            const weight = client.weight ? `'${client.weight.replace(/'/g, "''")}'` : 'NULL';

            sqlStr += `INSERT INTO appointments (monthly_client_id, pet_name, owner_name, whatsapp, service, price, appointment_time, status, extra_services, condominium, weight) VALUES ('${client.id}', '${petName}', '${ownerName}', ${whatsapp}, ${srv}, ${price}, '${appTime}', '${status}', ${extraServices}, ${condo}, ${weight});\n`;
            totalGenerated++;
        }

        currentDate = getNextDate(currentDate, client.recurrence_type, recDay);
    }
}

fs.writeFileSync('insert_backfill.sql', sqlStr);
console.log(`Generated ${totalGenerated} lines of SQL insertions! saved to insert_backfill.sql`);
