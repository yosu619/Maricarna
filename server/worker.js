export async function POST(request, env) {
    if (request.headers.get('origin') !== new URL(request.url).origin)
        return Response.json({ error: '送信元を確認できません。ページを開き直してください。' }, { status: 403 });
    if (!request.headers.get('content-type')?.includes('application/json'))
        return Response.json({ error: '送信形式が正しくありません。' }, { status: 415 });
    if (Number(request.headers.get('content-length') || 0) > 16000)
        return Response.json({ error: '入力内容が長すぎます。' }, { status: 413 });
    try {
        const raw = await request.text();
        if (raw.length > 14000)
            return Response.json({ error: '入力内容が長すぎます。' }, { status: 413 });
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object')
            throw new Error('Invalid request');
        const { name, email, type, message, consent, website } = data;
        if (website)
            return Response.json({ error: '送信を受け付けられません。' }, { status: 400 });
        if (typeof name !== 'string' || name.trim().length < 1 || name.length > 100 || typeof email !== 'string' || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email) || !['purchase', 'product', 'warranty', 'other'].includes(type) || typeof message !== 'string' || message.trim().length < 5 || message.length > 3000 || consent !== 'yes')
            return Response.json({ error: '必須項目・メールアドレス・同意をご確認ください。本文は5文字以上でご記入ください。' }, { status: 400 });
        const db = env.DB;
        const ip = request.headers.get('cf-connecting-ip') || 'local';
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
        const ipHash = Array.from(new Uint8Array(hash)).map(x => x.toString(16).padStart(2, '0')).join('');
        const recent = await db.prepare('SELECT COUNT(*) AS count FROM inquiries WHERE ip_hash = ? AND created_at > ?').bind(ipHash, Date.now() - 3600000).first();
        if (recent && recent.count >= 5)
            return Response.json({ error: '短時間に複数回送信されています。1時間ほどおいてお試しください。' }, { status: 429 });
        const id = crypto.randomUUID();
        await db.prepare('INSERT INTO inquiries (id,name,email,type,message,created_at,ip_hash) VALUES (?,?,?,?,?,?,?)').bind(id, name.trim(), email.trim(), type, message.trim(), Date.now(), ipHash).run();
        return Response.json({ id }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    }
    catch {
        return Response.json({ error: '送信できませんでした。時間をおいて再度お試しください。' }, { status: 503 });
    }
}

export default { async fetch(request, env) { const url = new URL(request.url); if (url.pathname === "/api/inquiries") { if (request.method !== "POST") return new Response("Method not allowed", {status:405, headers:{Allow:"POST"}}); return POST(request, env); } return env.ASSETS.fetch(request); } };
