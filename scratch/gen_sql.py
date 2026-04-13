import datetime

# Dados dos mensalistas com lacunas (IDs, tabelas, última data e recorrência)
# 1 = weekly, 2 = bi-weekly (weeks)
clients = [
    {
        "name": "Layla", 
        "id": "1e1fc680-44aa-49db-a46f-6191cec1be11", 
        "tab": "pet_movel_appointments", 
        "last": "2026-04-29 17:00:00", 
        "rec": "weekly"
    },
    {
        "name": "APOLLO", 
        "id": "71827ff5-246e-4242-b4e5-676b9fe830cf", 
        "tab": "agendamento_banhotosa", 
        "last": "2026-12-18 19:00:00", 
        "rec": "bi-weekly"
    },
    {
        "name": "Vicky", 
        "id": "a606f770-1a3e-4517-bfe9-44a831c35898", 
        "tab": "pet_movel_appointments", 
        "last": "2026-12-18 18:00:00", 
        "rec": "bi-weekly"
    },
    {
        "name": "Rocky", 
        "id": "951f8c55-d3f2-4bee-a58e-a7fb92f96302", 
        "tab": "pet_movel_appointments", 
        "last": "2026-04-18 12:00:00", 
        "rec": "bi-weekly"
    },
    {
        "name": "CACAU", 
        "id": "14af90f4-9ec3-4405-8589-10f3ed3514f3", 
        "tab": "pet_movel_appointments", 
        "last": "2026-12-24 13:00:00", 
        "rec": "bi-weekly"
    },
    {
        "name": "Tiny", 
        "id": "d40aa46f-0f22-42cc-9e11-09a83e784a35", 
        "tab": "pet_movel_appointments", 
        "last": "2026-04-18 12:00:00", 
        "rec": "bi-weekly"
    },
    {
        "name": "PANDORA", 
        "id": "d0e0f8f9-45e5-4f2a-9aa7-436ee145c128", 
        "tab": "pet_movel_appointments", 
        "last": "2026-04-22 14:00:00", 
        "rec": "weekly"
    },
    {
        "name": "BIJOU", 
        "id": "2a6388f1-0c04-40cb-af6c-5d770c94aa6c", 
        "tab": "pet_movel_appointments", 
        "last": "2026-04-24 18:00:00", 
        "rec": "bi-weekly"
    },
    {
        "name": "Frederico", 
        "id": "cdcadfe9-936a-4a4b-9b56-6a8ec39a01e0", 
        "tab": "agendamento_banhotosa", 
        "last": "2026-04-24 19:00:00", 
        "rec": "weekly"
    },
    {
        "name": "Pipoca", 
        "id": "c3541496-8b3d-451c-9178-b5c7538d85e4", 
        "tab": "pet_movel_appointments", 
        "last": "2026-12-18 12:00:00", 
        "rec": "bi-weekly"
    },
    {
        "name": "CLOE", 
        "id": "8ab7a8f4-7bd5-4eda-bd4b-89b9aab7dc03", 
        "tab": "pet_movel_appointments", 
        "last": "2026-12-24 12:00:00", 
        "rec": "bi-weekly"
    },
    {
        "name": "Maia", 
        "id": "cac59576-1caa-475b-b1af-7fe50063ecc0", 
        "tab": "pet_movel_appointments", 
        "last": "2026-04-18 13:00:00", 
        "rec": "bi-weekly"
    }
]

sql_template = """
-- Gerando agendamentos para {name}
INSERT INTO {tab} (monthly_client_id, appointment_time, pet_name, pet_breed, owner_name, owner_address, whatsapp, service, weight, price, status, condominium, extra_services)
SELECT 
    '{id}', 
    series_date,
    mc.pet_name, mc.pet_breed, mc.owner_name, mc.owner_address, mc.whatsapp, mc.service, mc.weight, mc.price, 'AGENDADO', mc.condominium, mc.extra_services
FROM generate_series(
    '{start_date}'::timestamp + interval '{interval}', 
    '2026-12-31 23:59:59'::timestamp, 
    '{interval}'
) as series_date
JOIN monthly_clients mc ON mc.id = '{id}'
WHERE NOT EXISTS (
    SELECT 1 FROM {tab} 
    WHERE monthly_client_id = '{id}' 
    AND ABS(EXTRACT(EPOCH FROM (appointment_time - series_date))) < 3600
);
"""

final_sql = "-- SCRIPT PARA COMPLETAR AGENDAMENTOS DE MENSALISTAS ATÉ 2026\n"

for c in clients:
    interval = "1 week" if c["rec"] == "weekly" else "2 weeks"
    final_sql += sql_template.format(
        name=c["name"],
        id=c["id"],
        tab=c["tab"],
        start_date=c["last"],
        interval=interval
    )

with open("generate_appointments.sql", "w", encoding="utf-8") as f:
    f.write(final_sql)

print("SQL gerado com sucesso em generate_appointments.sql")
