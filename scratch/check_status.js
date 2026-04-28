
const apiKey = "3cy1LU17sN6jHM1vDaVX9DsBDSjV2iaT";
const reference = "monthly_client-b44675ee-1e43-49e2-836e-05a661926107-1777405282255";
const url = `https://homologacao.focusnfe.com.br/v2/nfsen/${reference}`;

console.log(`Consultando nota na FocusNFe...`);
console.log(`URL: ${url}`);

const auth = Buffer.from(apiKey + ':').toString('base64');

fetch(url, {
    method: 'GET',
    headers: {
        'Authorization': `Basic ${auth}`,
    }
})
.then(response => {
    console.log(`Status HTTP: ${response.status}`);
    return response.json();
})
.then(data => {
    console.log(`Resposta da API:`, JSON.stringify(data, null, 2));
})
.catch(error => {
    console.error(`Erro na consulta:`, error);
});
