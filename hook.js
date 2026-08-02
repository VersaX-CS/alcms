export default async function handler(req, res) {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Safely parse body if Vercel passes it as a string or object
    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            body = {};
        }
    }

    const { event, station, token, details } = body || {};
    
    console.log(`Received Event [${event || 'unknown'}] from Station: ${station || 'unknown'}`);
    console.log('Full Payload Data:', JSON.stringify(body, null, 2));

    // Set CORS headers for the actual response
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).json({ status: 'success', received: body });
}
