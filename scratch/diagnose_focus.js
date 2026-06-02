const url = "https://api.focusnfe.com.br/v2/nfsen/monthly_client-b44675ee-1e43-49e2-836e-05a661926107-1780429361082";
const apiKey = "07o6yCyryqnH19y1MHRCnD4NumtC6iLF";

console.log("Consultando a FocusNFe de Produção para a nota: monthly_client-b44675ee-1e43-49e2-836e-05a661926107-1780429361082");

fetch(url, {
    method: 'GET',
    headers: {
        'Authorization': `Basic ${btoa(apiKey + ':')}`
    }
})
.then(async res => {
    console.log("HTTP Status:", res.status);
    const text = await res.text();
    try {
        const json = JSON.parse(text);
        console.log("JSON Response:\n", JSON.stringify(json, null, 2));
    } catch (e) {
        console.log("Raw Text Response:\n", text);
    }
})
.catch(err => console.error("Error:", err));
