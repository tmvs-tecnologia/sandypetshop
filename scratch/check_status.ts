
const apiKey = "3cy1LU17sN6jHM1vDaVX9DsBDSjV2iaT";
const reference = "monthly_client-b44675ee-1e43-49e2-836e-05a661926107-1777405282255";
const url = `https://homologacao.focusnfe.com.br/v2/nfsen/${reference}`;

console.log(`Consultando nota na FocusNFe...`);
console.log(`URL: ${url}`);

try {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Basic ${btoa(apiKey + ':')}`,
        }
    });

    console.log(`Status HTTP: ${response.status}`);
    const data = await response.json();
    console.log(`Resposta da API:`, JSON.stringify(data, null, 2));
} catch (error) {
    console.error(`Erro na consulta:`, error);
}
